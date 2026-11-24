# 05 — Agenda e pagamentos

Fontes: [pesquisa 03](../research/03-banco-infra-pagamentos.md).

## Agenda

### Fonte da verdade

A tabela `appointments` no Postgres é a fonte da verdade. O Google Calendar é espelho: recebe nossos agendamentos e nos informa os compromissos que o profissional cria por fora.

### Sem agendamento duplicado

```sql
create extension if not exists btree_gist;

alter table appointments add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    during with &&
  ) where (status in ('confirmed', 'held'));
```

- `agendar` faz o insert direto. Violação da constraint vira o erro `slot_taken`, e o assistente oferece outro horário.
- Não há bloqueio de horário enquanto o assistente apenas lista opções. `held` só existe quando há sinal Pix pendente, com expiração (padrão 30 minutos); um job libera o horário vencido.

### Cálculo de disponibilidade

Função pura `availableSlots(rules, timeOff, appointments, externalBusy, service, range, now)`:

1. Gera janelas a partir de `availability_rules` no fuso do tenant.
2. Remove `time_off`, agendamentos `confirmed` e `held`, e períodos ocupados vindos do Google.
3. Fatia pela duração do serviço mais o intervalo configurado.
4. Aplica antecedência mínima (padrão 2 horas) e máxima (padrão 30 dias).

Por ser função pura, é o alvo principal dos testes unitários: mudança de horário de verão em outros fusos, virada de dia, serviço mais longo que a janela, feriado cadastrado como bloqueio.

O assistente recebe no máximo 6 opções por consulta, espalhadas em dias e períodos diferentes.

### Requisitos

| ID | Requisito |
|---|---|
| RF-40 | Regras de disponibilidade por dia da semana, com mais de um intervalo por dia |
| RF-41 | Bloqueios manuais e feriados pelo painel |
| RF-42 | Agendar exige serviço, início e nome do paciente; grava quem criou (assistente ou humano) |
| RF-43 | Remarcar é atômico: o horário antigo só é liberado se o novo foi gravado |
| RF-44 | Cancelamento respeita antecedência mínima configurada; fora do prazo, o assistente transfere para o profissional |
| RF-45 | Um paciente pode ter mais de um agendamento futuro; o limite é configurável (padrão 2) |
| RF-46 | Confirmação imediata ao paciente com data, hora, serviço, endereço e instruções |
| RF-47 | Lembrete em dois tempos, configurável (padrão 24 horas e 2 horas antes). O primeiro traz as opções de confirmar ou remarcar; o segundo só é enviado se a janela de conversa estiver aberta ou se o cliente ativar, porque cada um custa uma mensagem |
| RF-48 | Agendamento criado pelo profissional no painel segue as mesmas regras e constraints |

### Google Calendar

| Tema | Especificação |
|---|---|
| Autorização | OAuth do profissional. Pedir o menor escopo que permita ler ocupação e criar eventos num calendário escolhido. A verificação do app no Google pode levar semanas: iniciar já |
| Escrita | Cada agendamento confirmado vira evento com `google_event_id` gravado. Falha na escrita não desfaz o agendamento; entra em fila de nova tentativa e aparece como "não sincronizado" no painel |
| Leitura | Canal de notificação (watch) por calendário + sincronização incremental com token. O resultado alimenta uma tabela `external_busy` |
| Renovação | Canais expiram e não renovam sozinhos: job diário renova os que vencem em menos de 48 horas |
| Token de sincronização inválido (410) | Sincronização completa do intervalo de hoje até a antecedência máxima |
| Conflito externo | Evento criado no Google sobre um horário já agendado conosco não cancela nada; gera alerta ao profissional |
| Token revogado | Assistente para de oferecer horários, passa a transferir pedidos de agenda e o profissional é avisado para reconectar |
| Garantia adicional | Antes de confirmar, `agendar` consulta ocupação (freebusy) do horário. Se o Google estiver fora do ar, vale a tabela local |

Sem Google conectado, o plano Agenda funciona só com a agenda interna.

## Pagamentos

### Assinatura do SaaS

- Asaas, na conta principal (exige CNPJ nosso). Confirmado na pesquisa 06 contra sete alternativas: é o único que reúne assinatura por API, Pix Automático, cartão, boleto e nota fiscal de serviço nativa (R$ 0,49 por nota), com sandbox. Custo por assinatura de R$ 297: R$ 1,99 no Pix (0,67%) ou 2,99% + R$ 0,49 no cartão. Segunda opção: AbacatePay (Pix a R$ 0,80, suporte a excedente por uso), se a nota fiscal for resolvida por integração externa.
- A cobrança da assinatura fica atrás de uma interface `BillingProvider`, para permitir a troca.
- Excedente e mudança de plano no meio do ciclo: não verificado se o Asaas calcula. Calcular do nosso lado e lançar como item avulso na fatura seguinte.
- Ciclo mensal. Excedente de conversas entra na fatura seguinte.
- Webhook do Asaas atualiza `tenants.status`. Inadimplência: aviso no dia do vencimento, novo aviso em 3 dias, e em 7 dias o assistente entra em modo restrito (só avisa o paciente de que o profissional responderá). Os dados ficam preservados por 30 dias.
- A fila de webhooks do Asaas pausa após 15 falhas seguidas: monitorar e ter rotina de reconciliação diária por consulta à API.

### Sinal via Pix (módulo Pro)

Decisão revista em 24/11/2026 com a [pesquisa 06](../research/06-pagamentos.md). A subconta Asaas foi descartada para o sinal: exige período de avaliação limitado a 10 subcontas e depois homologação, pesado demais para profissional solo. Subcontas de Woovi e AbacatePay guardam o saldo na nossa conta, o que nos faria segurar dinheiro de paciente. Stripe proíbe Pix para serviços médicos (MCC 8099).

- **Provedor do sinal: Mercado Pago por OAuth.** O profissional autoriza com um clique a conta que já tem ou cria. A cobrança é criada na conta dele e o valor liquida lá. Não recebemos nem guardamos dinheiro de paciente. Pix a 0,99% (preço de vitrine), pago por ele.
- **Alternativa sem integração ("recebido manual"):** geramos o código Pix copia e cola com valor a partir da chave Pix do profissional, e ele confirma o recebimento com um toque no painel ou respondendo à notificação. Não tem confirmação automática nem expiração garantida. Serve para quem não quer conta no Mercado Pago e como primeira entrega do módulo.
- Os dois ficam atrás de uma interface `DepositProvider` (`createCharge`, `getStatus`, `parseWebhook`), como o canal de WhatsApp. Segunda opção de integração, se necessário: PagBank Connect.
- Fluxo:
  1. Paciente confirma horário. `agendar` cria o agendamento como `held`, com expiração.
  2. `criar_cobranca_sinal` gera a cobrança e devolve o código copia e cola.
  3. Webhook de pagamento confirmado muda para `confirmed` e dispara a confirmação ao paciente.
  4. Expirou sem pagar: horário liberado e paciente avisado, se a janela estiver aberta.
- O assistente só afirma que o pagamento foi recebido se `payments.status = 'paid'`, gravado pelo webhook. Comprovante enviado por imagem não confirma nada; o assistente responde que a confirmação é automática e transfere se o paciente insistir.
- Política de devolução do sinal é texto configurado pelo profissional. O estorno é feito por ele; o assistente não tem ferramenta de estorno.
- Webhooks validados por token e idempotentes por identificador do evento.

### Pontos em aberto

- Tributação da intermediação e emissão de nota: não verificado. Consultar contador antes de lançar o módulo.
- Split de taxa nossa sobre o sinal: não adotar no início. Mantém o modelo simples e evita enquadramento regulatório.
- A pesquisa 06 usou só páginas oficiais de preço e documentação. Reputação, suporte e histórico de bloqueio de saldo de todos os provedores não foram verificados: consultar Reclame Aqui e conversar com o comercial do Asaas e do Mercado Pago antes de integrar.
- Não verificado no Mercado Pago: taxa de Pix pela API, assinatura e novas tentativas de webhook, estorno por API.
