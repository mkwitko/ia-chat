# 03 — WhatsApp e ciclo da conversa

Fontes: [pesquisa 01](../research/01-meta-whatsapp-compliance.md). Itens marcados (nv) não foram confirmados em documentação oficial.

## Fatos da plataforma que moldam o desenho

| Fato | Consequência |
|---|---|
| Mensagem de atendimento custa R$ 0,035 acima de 1.000 por mês por número (desde 01/10/2026) | Uma mensagem por turno sempre que possível |
| Utility custa R$ 0,035, marketing R$ 0,3217 | Reativação é módulo com custo repassado |
| Sem forma de pagamento na Meta, a entrega para após a franquia | Onboarding só conclui com a nossa forma de pagamento ligada à conta do cliente (H-05) |
| Coexistência: respostas pelo celular chegam como `smb_message_echoes` | É o gatilho principal de controle humano |
| Coexistência desconecta após cerca de 14 dias sem abrir o app | Monitorar estado da conexão e alertar |
| Coexistência no Brasil (nv) | Confirmar no onboarding do piloto antes de qualquer promessa |
| Calling API exige número fora do app Business | Telefonia fora do escopo |
| Webhook: novas tentativas por até 7 dias, duplicados possíveis, ordem não garantida (nv) | Idempotência e ordenação por timestamp do provedor |
| Assinatura HMAC-SHA256 sobre o corpo bruto | Validar antes de qualquer processamento |
| Paciente identificado por BSUID; telefone pode vir omitido | Chave do contato é o BSUID |
| URL de mídia expira em 5 minutos | Baixar e gravar no R2 imediatamente |
| Indicador de digitação dura até 25 segundos ou até a resposta | Limita o atraso total do turno |
| Limite de 250 destinatários únicos por dia fora da janela até verificar a empresa | Lembretes do piloto cabem; reativação em massa não |
| Tech Provider: 10 onboardings por 7 dias antes das verificações, 200 depois | Iniciar verificação já |
| Política da Meta exige caminho claro para atendimento humano | RF-07 é obrigatório, não opcional |

## Duas formas de conexão

Decisão de 24/11/2026: o produto oferece conexão oficial e conexão por QR code. Isso revoga, para a conexão por QR code, o princípio inicial de não usar API não oficial em produção. A oficial é o padrão e a recomendada em todo o material de venda.

| | Oficial (Cloud API) | Por QR code (não oficial) |
|---|---|---|
| Implementação | Adaptador da Cloud API | Adaptador HTTP para um gateway em contêiner separado, com motor whatsmeow (Go). Piloto: WAHA com o motor GOWS (Apache-2.0). Ver "Motor da conexão por QR code" abaixo |
| Ativação | Embedded Signup, depende das verificações da Meta | Leitura de QR code, imediata |
| Custo por mensagem | Tabela da Meta, pago por nós | Nenhum |
| Risco de bloqueio do número | Baixo, dentro das políticas | Real e não mensurável: viola os termos do WhatsApp |
| Resposta do profissional pelo celular | Evento de eco da coexistência | Mensagem própria vinda de outro aparelho; mesmo evento interno `owner_echo` |
| Mensagens ativas | Templates aprovados | Só transacionais ligadas a um agendamento (confirmação e lembrete) |
| Reativação, campanhas, pedido de avaliação em massa | Sim, com opt-in | **Bloqueado pelo sistema** |
| Estabilidade | Contrato com a Meta | Pode cair para todos quando o WhatsApp muda o protocolo |

Requisitos da conexão por QR code:

| ID | Requisito |
|---|---|
| RF-27 | Termo de ciência aceito no painel antes de conectar, em linguagem direta: o número pode ser bloqueado pelo WhatsApp, sem recuperação garantida, e a escolha é do cliente. Aceite gravado em auditoria com data e usuário |
| RF-28 | Limites de envio por número: intervalo mínimo entre mensagens, teto por minuto e por dia, configurados de forma conservadora. Nenhuma mensagem para contato que nunca escreveu, exceto confirmação e lembrete de agendamento |
| RF-29 | Sessão cifrada em repouso, uma por canal, com um único processo dono por vez. Queda de sessão gera alerta e pedido de novo QR code; enquanto isso o assistente fica parado e o profissional é avisado |
| RF-29b | Versão do gateway fixada por digest e atualizada só depois de teste. Monitor de falha de conexão em massa, com aviso na página de status |
| RF-29c | Troca de conexão (QR code para oficial) preserva contatos, conversas e agendamentos. O painel oferece a migração quando a conta ficar apta à oficial |
| RF-29d | Site, anúncios e material de venda apresentam a conexão oficial. A por QR code aparece como opção dentro do onboarding, com o aviso de risco |

Identidade do contato na conexão por QR code: a biblioteca pode entregar um identificador interno no lugar do telefone. Vale a mesma regra de RF-23b: completar o registro existente, nunca duplicar.

### Motor da conexão por QR code

Decisão revista em 24/11/2026 com a [pesquisa 07](../research/07-whatsapp-nao-oficial.md). A escolha provisória do Baileys foi trocada.

| Opção | Situação | Papel |
|---|---|---|
| whatsmeow (Go, MPL-2.0) | Manutenção ativa; corrigiu a quebra de pareamento em cerca de 1 dia | Motor escolhido |
| WAHA com motor GOWS (Apache-2.0) | Servidor pronto com REST e webhooks sobre o whatsmeow; versão Core gratuita | **Piloto** |
| Gateway próprio em Go ou wuzapi (MIT) | Sessões com posse registrada no Postgres | **Acima de cerca de 1.000 números** |
| Baileys (MIT) | Manutenção fraca: sem versão estável da série 7, defeito de queda de conexão a cada 50 minutos aberto desde outubro, a mesma quebra de pareamento levou 7 semanas | Plano B, com versão fixada |
| Evolution API | Usa Baileys por baixo; a versão em Go exige licença | Fora |
| Bibliotecas baseadas em navegador (whatsapp-web.js, WPPConnect, open-wa) | Caras em memória; venom abandonado | Fora |
| Serviços hospedados (Z-API, W-API, Mega API e outros) | De R$ 20 a R$ 100 por número por mês; com 1.000 números, de R$ 30 mil a R$ 100 mil por mês | Só contingência |

- O adaptador fala HTTP com o gateway e recebe webhooks dele. Trocar WAHA por gateway próprio não mexe no domínio.
- O gateway roda na rede privada, sem porta pública, com imagem fixada por digest. Motivo: já houve pacote malicioso imitando o Baileys (`lotusbail`, mais de 56 mil downloads). Dependência desse tipo só entra com origem conferida.
- Não há medição confiável de memória por sessão em nenhuma opção: medir no piloto antes de dimensionar.
- A pesquisa não achou diferença de taxa de banimento entre bibliotecas. O que pesa é o comportamento: os códigos de erro documentados limitam contato com números novos. Isso confirma RF-28.
- Há relato de aviso de "conta em risco" até para cliente que só responde. O termo de ciência (RF-27) diz isso com todas as letras.
- Não verificado: como cada motor entrega a mensagem enviada pelo dono em outro aparelho e o identificador interno do contato. Testar os dois no primeiro dia de E-09b, porque o controle humano depende disso.

## Abstração de canal

`packages/channels` expõe uma interface única. O domínio nunca importa tipos da Meta.

```ts
interface ChannelAdapter {
  verifyWebhook(rawBody: Buffer, headers: Headers): boolean
  parseWebhook(rawBody: Buffer): InboundEvent[]
  sendText(to: ContactRef, text: string, opts?: { replyTo?: string }): Promise<SendResult>
  sendTemplate(to: ContactRef, template: TemplateRef, vars: Record<string, string>): Promise<SendResult>
  sendAudio(to: ContactRef, mediaKey: string): Promise<SendResult>
  markReadAndTyping(providerMessageId: string): Promise<void>
  downloadMedia(mediaId: string): Promise<{ bytes: Buffer; mime: string }>
}

type InboundEvent =
  | { kind: 'message'; providerMessageId: string; contact: ContactRef; at: Date; content: MessageContent }
  | { kind: 'owner_echo'; providerMessageId: string; contact: ContactRef; at: Date; content: MessageContent }
  | { kind: 'status'; providerMessageId: string; status: 'sent' | 'delivered' | 'read' | 'failed'; error?: ProviderError; at: Date }
  | { kind: 'channel_state'; state: 'connected' | 'disconnected' | 'restricted'; at: Date }

type MessageContent =
  | { type: 'text'; text: string }
  | { type: 'audio' | 'image' | 'document' | 'sticker'; mediaId: string; mime: string; caption?: string }
  | { type: 'location'; lat: number; lng: number }
  | { type: 'interactive_reply'; id: string; title: string }
  | { type: 'unsupported'; raw: string }
```

## Entrada de webhook

| ID | Requisito |
|---|---|
| RF-20 | Validar assinatura; inválida responde 401 e registra |
| RF-21 | Gravar o payload bruto em `inbound_events` e responder 200 em menos de 2 segundos. Nenhum processamento de IA na requisição |
| RF-22 | Idempotência: `messages.provider_message_id` é único por canal. Evento repetido é descartado sem efeito |
| RF-23 | Ordenar mensagens da conversa pelo timestamp do provedor, não pela chegada |
| RF-23b | Resolução do contato: procurar primeiro por BSUID; sem BSUID, por telefone normalizado em E.164, tratando celular brasileiro com e sem o nono dígito como o mesmo número. Quando um evento traz BSUID e telefone de um contato que só tinha um dos dois, completa o registro em vez de criar outro. Índice único por `(tenant_id, bsuid)` e por `(tenant_id, telefone normalizado)` |
| RF-24 | Mídia: job imediato baixa e grava no R2. Falha tenta 3 vezes; persistindo, a mensagem fica marcada como "mídia indisponível" e o assistente pede ao paciente para reenviar ou escrever |
| RF-25 | Evento de status atualiza a mensagem. `failed` com erro de janela expirada ou de pagamento gera alerta ao operador |
| RF-26 | Reconciliação diária: mensagens enviadas sem status após 1 hora são listadas para o operador |

Implementação (E-09, 24/11/2026):

- **Roteamento.** O webhook chega sem tenant, só com o `phone_number_id` (ou o id da WABA, em `account_update`). A tabela de plataforma `channel_routes` (sem RLS, só leitura e inclusão pelo app) liga cada conta da Meta a um único canal. Conta sem rota: responde 200 e registra aviso, sem gravar nada.
- **Corpo bruto por tenant.** Uma entrega pode trazer números de tenants diferentes. Cada tenant grava em `inbound_events` só o trecho do próprio número, nunca o corpo inteiro. A reentrega tem o mesmo hash e não é enfileirada de novo.
- **Uso da Meta (24/11/2026).** O status da Cloud API traz o objeto `pricing` (`billable`, `category`, `type`). O job grava uma linha por mensagem entregue em `meta_message_usage` (tenant, canal, mês, categoria `service`/`utility`/`marketing`/`authentication`/`other`, cobrável, tipo), idempotente por `(tenant, canal, id da mensagem)`: os status repetidos (sent, delivered, read) não duplicam. Só metadados, sem texto. Preços em `packages/core/src/meta/pricing.ts`, em milésimos de centavo (centavos x 1000, inteiro, sem float): R$ 0,035 = 3.500; R$ 0,3217 = 32.170. Estimativa = respostas de atendimento acima de 1.000 por número no mês + utility cobrável + marketing cobrável, arredondada a centavos só na exibição. É informação: quem paga a Meta somos nós (H-05).
- **Processamento.** Job `inbound.process` (pg-boss) dentro de `withTenant`: resolve o contato (RF-23b), grava a mensagem com `skipDuplicates` na chave única (RF-22), ordena pelo horário do provedor (RF-23) e só deixa o status avançar (lida não volta a entregue).
- **Eco do dono.** Gravado como mensagem do profissional (`human`, de saída). A troca do controle para `human` na mesma transação é da E-12.
- **Envio a BSUID (nv).** Quando o paciente esconde o telefone, o cliente envia para o BSUID. Confirmar com o número de teste da Meta.
- **Alertas (RF-25 e RF-26).** Falha com erro 131047 (janela expirada) ou 131042 (pagamento) gera log de erro para o operador; reconciliação diária às 7h de São Paulo lista mensagens de saída sem status há mais de 1 hora, por tenant, sem conteúdo.

Tratamento por tipo de conteúdo:

| Tipo | Conduta |
|---|---|
| Texto | Entra no turno |
| Áudio | Transcreve; a transcrição entra no turno marcada como áudio. Acima de 3 minutos: transcreve os 3 primeiros e avisa |
| Imagem, documento | Não interpreta. Responde que recebeu e que o profissional verá; notifica o profissional. Evita processar exame ou laudo |
| Figurinha | Ignora se vier junto de texto; sozinha, não gera turno |
| Localização | Registra; não gera resposta própria |
| Não suportado | Pede que o paciente escreva |

## Entrega natural (`NaturalResponseDelivery`)

Objetivo: responder ao conjunto do que o paciente escreveu, uma vez, em tempo plausível, sem fingir presença humana.

### Agrupamento de entrada

- Ao chegar uma mensagem com a conversa em controle da IA, agenda-se (ou reagenda-se) o job `turn:{conversationId}` para **6 segundos** depois.
- Cada mensagem nova dentro da janela reagenda o job, até o limite de **20 segundos** desde a primeira mensagem do grupo.
- Se o paciente envia mensagem enquanto o turno está sendo gerado, o turno em curso é invalidado (ver "trava de envio") e um novo começa com todas as mensagens.
- Parâmetros configuráveis por tenant, com esses padrões.

### Execução do turno

1. Marca a última mensagem como lida e liga o indicador de digitação.
2. Executa o agente (modelo e ferramentas).
3. Calcula o atraso alvo: `alvo = limitar(1,5 s + caracteres / 40 por segundo, 1,5 s, 8 s)`.
4. Espera `max(0, alvo − tempo já gasto no processamento)`. Se o processamento já passou do alvo, envia de imediato.
5. Passa pela trava de envio e envia.

Regras:

- **Uma mensagem por turno é o padrão.** Dividir em duas só quando há um bloco reutilizável separado (endereço com instruções, ou dados de pagamento), e nunca mais de duas.
- Sem atraso artificial acima de 8 segundos.
- Se o processamento passar de 20 segundos, o indicador é reenviado uma vez. Passando de 45 segundos, o turno é abortado, o paciente recebe uma mensagem fixa ("Só um instante, já te respondo") e o profissional é notificado.
- O indicador não é usado em mensagens ativas (lembretes).
- Nada disso muda a identificação do assistente como virtual.

## Controle da conversa

### Estados

| Estado | Quem responde | Entrada no estado |
|---|---|---|
| `ai` | Assistente | Padrão; ou retomada explícita; ou expiração da pausa |
| `human` | Profissional | Eco de mensagem do dono; botão "assumir" no painel; pedido de transferência feito pelo assistente; regra de urgência |

Campos: `control`, `control_reason` (owner_echo, dashboard, agent_handoff, safety, system), `control_changed_at`, `pause_expires_at` (nulo por padrão).

### Regras

| ID | Requisito |
|---|---|
| RF-30 | Evento `owner_echo` muda a conversa para `human` na mesma transação em que a mensagem é gravada |
| RF-31 | Em `human`: nenhum turno é gerado; jobs de follow-up e recuperação da conversa são suspensos. Lembrete de consulta já agendada continua, porque é transacional e independe da conversa |
| RF-32 | Retomada: botão "devolver ao assistente" no painel. Expiração automática é opcional por tenant e desligada por padrão; quando ligada, conta a partir da última mensagem do profissional |
| RF-33 | Ao voltar para `ai`, o assistente não responde ao histórico. Só reage à próxima mensagem do paciente |
| RF-34 | Toda mudança de controle gera `audit_log` e evento no inbox |
| RF-35 | Transferência pedida pelo assistente envia ao paciente uma mensagem dizendo que o profissional responderá, e notifica o profissional (push no painel e, se configurado, mensagem em número pessoal) |
| RF-36 | Se a transferência não é atendida em tempo configurável (padrão 2 horas em horário comercial), o profissional recebe novo aviso. O assistente não reassume sozinho |

### Trava de envio

Impede resposta atrasada depois que o humano assumiu ou que o paciente escreveu de novo.

- Cada conversa tem `turn_version`, incrementado a cada mensagem do paciente, a cada eco do dono e a cada mudança de controle.
- O turno lê a versão ao começar. O envio ocorre dentro de uma transação que faz `select ... for update` na conversa e confere: `control = 'ai'` **e** `turn_version` igual ao lido. Diferente, a resposta é descartada e registrada como `discarded`.
- A mesma verificação vale para mensagens agendadas ligadas à conversa. Exceção (E-22, RF-31): confirmação e lembretes de agendamento seguem mesmo com a conversa em controle humano; eles tomam o `for update` da conversa e passam por `proactiveGate`, mas não conferem `control` nem `turn_version`.
- Efeitos de ferramentas já executados (um agendamento criado) não são desfeitos pelo descarte. O turno seguinte recebe no contexto o que foi feito.

Implementação (E-11 e E-12, 24/11/2026):

- `conversations.pending_since` guarda a primeira mensagem do paciente ainda sem resposta. Cada mensagem agenda o job `conversation.turn` para `min(6 s, pending_since + 20 s − agora)`, com chave `(conversa, versão)`. Um job de versão antiga encontra outra versão e não roda.
- O turno reivindica todas as mensagens do paciente desde `pending_since`, gera a resposta fora de transação e só envia sob `select ... for update`. Descartado, `pending_since` continua, e o turno seguinte responde a tudo.
- O agendamento do turno acontece depois do commit da transação que gravou a mensagem, para o job nunca ver a versão antiga.
- `setControl` (em `@app/db`) é o único caminho de troca de controle: sobe a versão, zera `pending_since`, cancela follow-ups ao ir para `human` e grava `audit_log`. A API (`POST /api/conversations/:id/control`) e o worker (eco, transferência, expiração) usam a mesma função.

### Eventos perdidos

- Estado `disconnected` do canal ou ausência de qualquer webhook por período anormal em horário comercial gera alerta ao operador e aviso ao profissional para abrir o app.
- Com o canal desconectado, o painel mostra aviso de que respostas pelo celular podem não pausar o assistente. `ponytail:` não há como detectar eco perdido; a mitigação é o alerta e o botão no painel.

## Templates e mensagens ativas

| Uso | Categoria esperada (nv) | Momento |
|---|---|---|
| Confirmação de agendamento | Utility | Imediato; se dentro da janela, vai como texto comum |
| Lembrete de consulta | Utility | 24 horas antes, configurável |
| Pedido de avaliação | Utility ou marketing | Módulo Pro |
| Reativação | Marketing | Módulo Pro, com opt-in registrado |

- Templates são cadastrados por nós em cada WABA no onboarding, com texto padrão por especialidade.
- Opt-out: palavras como "parar" ou "sair" marcam `contacts.opt_out` e bloqueiam mensagens ativas. Regra determinística, antes do modelo. Cada mudança de consentimento (opt-in na primeira mensagem, opt-out por palavra ou pelo painel) também grava uma linha em `consent_events` (tipo, categoria, origem, quem, quando); ver H-32.
- Mensagem ativa dentro da janela de 24 horas vai como texto livre, sem template.

## Onboarding do canal

1. Embedded Signup em modo coexistência; o profissional lê o QR code no app Business.
2. Sistema grava `phone_number_id`, WABA e assina os webhooks, incluindo `smb_message_echoes`.
3. Ligamos a nossa forma de pagamento à conta WhatsApp do profissional (H-05). O onboarding verifica e só então ativa o assistente.
4. Envio de mensagem de teste para um número do próprio profissional.
5. Histórico sincronizado pela coexistência não é usado para gerar respostas. Fica disponível só como contexto do inbox.

Enquanto não formos Tech Provider verificados, o piloto pode entrar pelo limite de 10 onboardings por semana, por um BSP ou pela conexão por QR code, com o termo de ciência (RF-27).

Implementação do inbox (E-16 e E-18b, 25/11/2026):

- `lockConversation`, `turnMayDeliver` e `recordOutbound` (em `@app/db`) são a trava de envio de todos os caminhos: turno do worker, mensagem do painel e decisão sobre rascunho. O rascunho só vale com `turn_version` igual ao da conversa e `control = 'ai'`, conferidos sob o lock; rascunho velho volta 409.
- Tempo real: gatilhos no banco fazem `pg_notify('inbox_changes', {t, c})` (só ids) em `conversations`, `messages` e `turns`; a API escuta numa conexão própria e entrega por SSE (`GET /api/events`) apenas ao tenant do usuário.
- Aviso ao profissional: Web Push (`push_subscriptions`, chaves VAPID no `.env`), sem conteúdo de mensagem. Rascunho parado e transferência sem resposta agendam jobs de lembrete.
