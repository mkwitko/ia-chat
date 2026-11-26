# 05 — Agenda e pagamentos

Fontes: [pesquisa 03](../research/03-banco-infra-pagamentos.md).

## Agenda

### Fonte da verdade

A tabela `appointments` no Postgres guarda os agendamentos e a constraint de exclusão decide o conflito entre eles. **Para o piloto, o Google Calendar é a fonte oficial de disponibilidade** (decisão do dono, 25/11/2026): horários oferecidos = nossas regras menos a ocupação do Google, consultada na hora. Não há sincronização paralela da agenda (sem `external_busy`, sem canais de notificação): o espelho completo é decisão posterior.

### Sem agendamento duplicado

```sql
create extension if not exists btree_gist;

alter table appointments add constraint appointments_no_overlap
  exclude using gist (
    professional_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled');
```

Implementação (E-20, 25/11/2026): o intervalo é `starts_at`/`ends_at` (`timestamptz`, legíveis pelo Prisma) e a constraint usa `tstzrange` só na expressão. Ela vale para tudo que não está cancelado; o status `held` ainda não existe e entra com o sinal Pix (Fase 4), quando a cláusula `where` for revista.

- `agendar` confere `availableSlots` e faz o insert. Horário já ocupado, ou violação da constraint (código 23P01, corrida entre dois pacientes), vira o erro `slot_taken`, e o assistente oferece outro horário. O insert é a decisão final.
- **Confirmação (código, não prompt):** `agendar` e `remarcar` só executam com `confirmado = true` e para um horário que `consultar_horarios` ofereceu numa rodada anterior da conversa (as ofertas ficam em `conversations.offered_slots`). Oferta e agendamento no mesmo turno são recusados: o paciente ainda não respondeu. `cancelar` exige `confirmado = true`. Hipótese: o padrão mais conservador custa uma mensagem a mais quando o paciente já chega dizendo o horário.
- **Idempotência:** cada chamada de escrita leva a chave `turno:ferramenta:alvo` (`appointments.idempotency_key`, única por tenant); repetir a chamada no mesmo turno devolve o primeiro resultado.
- **Remarcação** cancela o antigo e grava o novo na mesma transação; se o novo falhar, nada muda (A-14). Vale a mesma antecedência mínima do cancelamento.
- **Antecedência mínima de cancelamento:** `tenants.cancel_notice_minutes` (padrão 1440, hipótese de 24 horas). Dentro do prazo a ferramenta devolve `cancelamento_fora_do_prazo` e o turno marca a transferência para o profissional (RF-44). O motivo do cancelamento não é gravado (pode conter dado de saúde).
- Limite de agendamentos futuros por paciente (RF-45): 2, constante `MAX_FUTURE_APPOINTMENTS`; configurável fica para depois.
- Profissional: cada agendamento grava o seu; a constraint é por profissional, então dois profissionais podem atender no mesmo horário. Ver "Agenda por profissional".

- Não há bloqueio de horário enquanto o assistente apenas lista opções. `held` só existe quando há sinal Pix pendente, com expiração (padrão 30 minutos); um job libera o horário vencido.

### Agenda por profissional

Implementado em 26/11/2026 (H-45; substitui a transferência de H-38).

- Cada profissional tem as próprias regras semanais (`availability_rules`), bloqueios e férias (`time_off`) e agendamentos. A constraint `appointments_no_overlap` já separa por `professional_id`.
- `professional_services` liga serviço a profissional, com RLS. Profissional sem nenhuma ligação faz todos os serviços.
- `consultar_horarios(servico, a_partir_de, periodo?, profissional?)`: com `profissional`, só os horários dele (nome sem acento nem sobrenome serve; nome desconhecido devolve `profissional_nao_encontrado` e a lista de nomes). Sem, junta os horários livres de quem faz o serviço, uma opção por horário (empate fica com o profissional mais antigo), e cada opção traz `profissional` com o nome, que o assistente diz junto do horário. A oferta guarda o profissional.
- `agendar` e `remarcar` aceitam `profissional?`. O profissional do agendamento é o pedido (a oferta anterior precisa ter sido com ele) ou o da oferta. Sem nenhum dos dois (oferta da lista de espera, painel), o primeiro profissional que faz o serviço e está livre naquela hora. Remarcar sem profissional mantém o do agendamento original. Profissional que não faz o serviço: `profissional_nao_encontrado`.
- Aviso de férias (RF-14): só quando um profissional está em jogo (pedido ou único que faz o serviço).
- Google Agenda: continua um por consultório e vale para o primeiro profissional (ocupação e eventos); os outros usam só as regras do painel. Google por profissional fica para depois (H-45).
- Quantidade por plano: Essencial, Agenda e Pro, um profissional; Clínica inclui dois e aceita extras (R$ 147 cada, `EXTRA_PROFESSIONAL`). Criar além do limite devolve 409 `plan_limit`.

### Cálculo de disponibilidade

Função pura `availableSlots(rules, timeOff, appointments, externalBusy, service, range, now)`:

1. Gera janelas a partir de `availability_rules` no fuso do tenant.
2. Remove `time_off`, agendamentos `confirmed` e `held`, e períodos ocupados vindos do Google.
3. Fatia pela duração do serviço mais o intervalo configurado.
4. Aplica antecedência mínima (padrão 2 horas) e máxima (padrão 30 dias).

Implementação (E-19): `availableSlots` e `pickSpread` estão em `packages/core/src/agenda`, sem banco. Os horários saem de uma grade a partir do início da janela (duração mais intervalo); um agendamento fora da grade bloqueia os horários que toca, mas não desloca a grade. `external_busy` é entrada somente leitura de `availableSlots`; na E-21 ela vem de `freeBusy.query` no momento da oferta e de novo antes de gravar, sem tabela. Os horários devolvidos às ferramentas levam o fuso do tenant (`2027-01-04T09:00:00-03:00`).

Por ser função pura, é o alvo principal dos testes unitários: mudança de horário de verão em outros fusos, virada de dia, serviço mais longo que a janela, feriado cadastrado como bloqueio.

O assistente recebe no máximo 6 opções por consulta, espalhadas em dias e períodos diferentes.

### Férias e resumo noturno (E-22b)

- **Férias (RF-14):** um `time_off` com `kind = vacation` (`block` é o bloqueio comum). O período vai do primeiro dia, 00:00, ao dia seguinte ao último, 00:00, no fuso do consultório; `availableSlots` já o subtrai, então nenhum horário do período é oferecido. `consultar_horarios` devolve `ferias: { retorno, aviso }` sempre que um período de férias cai na janela de busca. A data de retorno (`retorno`, `dd/mm/aaaa`) sai do banco e o texto fixo está em `AgentCopy.vacation`; o modelo só repete, nunca calcula data.
- **Resumo noturno (RF-15):** `tenants.nightly_summary_minute` (minutos desde a meia-noite local, padrão 1200 = 20:00). O worker mantém uma agenda do pg-boss por consultório (fila `agenda.nightly_summary`, chave = tenant, fuso do consultório) e a recria a cada 15 minutos (`agenda.summary_sync`), o que aplica mudança de horário feita no painel. O job conta os atendimentos não cancelados do dia seguinte local e envia o push "Sua agenda de amanhã" com a quantidade e o link `/agenda?dia=AAAA-MM-DD`, sem nome de paciente (RN-38); dia vazio não envia (H-19). A lista fica no painel.
- `tenants` não tem RLS: leitura do consultório sempre por `id` (o `loadScope` antigo lia "o primeiro" e podia devolver o fuso de outro consultório; corrigido na E-22b).

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
| RF-46 e RF-47, implementação (E-22) | `bookAppointment` grava em `scheduled_messages`, na mesma transação, a confirmação (agora) e os lembretes (agenda menos cada deslocamento de `tenants.reminder_offsets_minutes`, padrão 24 h e 2 h; os que já passaram não entram). `remarcar` e `cancelar` cancelam as pendentes do agendamento antigo. O job `reminders.sweep` (a cada minuto, então "imediata" significa até um minuto) envia o que venceu. Todo envio passa por `proactiveGate` (opt-out, agendamento vivo e no futuro; A-15). Dentro da janela de 24 h vai texto livre; fora dela, o template (confirmação e primeiro lembrete); o segundo lembrete fora da janela é cancelado. O paciente que responde "confirmar" tem o agendamento marcado como `confirmed` pela ferramenta `confirmar_presenca`; "remarcar" segue o fluxo normal de remarcação |
| RF-48 | Agendamento criado pelo profissional no painel segue as mesmas regras e constraints (implementação E-23: mesma `bookAppointment`, mesma constraint; horário ocupado vira `slot_taken` com mensagem amigável; paciente novo exige telefone, que é a identidade do contato; só a antecedência mínima de cancelamento não vale para quem marca pelo painel, H-18) |

### Cancelamento, lista de espera e falta (M-09)

- **Remarcação depois do cancelamento.** Quando o cliente cancela pelo assistente, a ferramenta `cancelar` devolve `proximo_passo`, e o assistente pergunta na mesma conversa se ele quer remarcar (fluxo de `consultar_horarios`; se nada servir, oferece a lista de espera). Cancelamento pelo painel é do profissional: nada é enviado ao cliente.
- **Remarcação conta à parte (métrica 8).** `appointments.rescheduled_from_id` aponta para o agendamento cancelado que o novo substitui: preenchido ao remarcar e quando o mesmo cliente, depois de cancelar um horário futuro, marca outro (`rebookSource`, H-42). Resultados mostra Agendamentos feitos (sem remarcações), Remarcações e Cancelamentos (sem os remarcados).
- **Lista de espera.** O cliente pede para ser avisado se abrir um horário de um serviço entre duas datas; o assistente chama `entrar_lista_de_espera` só depois da confirmação (`slot_waitlist_entries`, uma por cliente e serviço enquanto aguarda; até 60 dias). Um agendamento futuro cancelado (pelo assistente, pelo painel ou por remarcação) libera o horário de início; a varredura de cada minuto oferece o horário à entrada mais antiga cuja janela cobre o horário, que nunca recebeu esse horário e cujo serviço cabe nele (`slot_offers`). Um horário tem no máximo uma oferta aberta (índice único parcial); a oferta vence em 30 minutos (`OFFER_TTL_MINUTES`) e o horário vai para a próxima entrada. A oferta grava o horário em `conversations.offered_slots`, e o "sim" do cliente agenda por `agendar`, com a mesma `bookAppointment` e a mesma constraint: quem confirmar primeiro fica com ele (inclusive quem recebeu antes e respondeu depois do prazo). Agendar dentro da janela fecha a entrada. O dono vê a lista por dia na Agenda e pode tirar alguém dela.
- **Mensagem de oferta e de falta.** Texto escrito pelo código, nunca pelo modelo. Passa pela trava de consentimento (`proactiveGate`; opt-out tira a pessoa da lista), só sai com o assistente no controle da conversa (RF-31, trava de envio) e só como texto livre dentro da janela de 24 h. Ainda não há template UTILITY aprovado para estas mensagens (E-00b): fora da janela ou em controle humano, a oferta é pulada e o profissional recebe uma notificação; no máximo 5 tentativas por horário por varredura, sem disparo em massa.
- **Falta.** Com o interruptor do dono ligado (`tenants.no_show_follow_up`, padrão desligado, em Mais > Perfil), marcar "Faltou" faz o assistente perguntar uma vez quando o cliente quer remarcar. Só na primeira falta do cliente: o que acontece na segunda (no piloto, a sessão é perdida) é decisão do dono, e o assistente não fala nada. O registro em `scheduled_messages` (`follow_up`) garante uma mensagem só.

### Google Calendar

Escopo do MVP (E-21, enxuto): o Google é a fonte de disponibilidade; não existe cópia local da agenda do Google.

| Tema | Especificação |
|---|---|
| Autorização | OAuth 2.0 de servidor web, acesso offline (`access_type=offline`, `prompt=consent`). Escopos mínimos que atendem: `calendar.events.freebusy` (ocupação), `calendar.events.owned` (criar, alterar e apagar eventos só em agendas do próprio usuário) e `calendar.calendarlist.readonly` (listar as agendas para escolher). Nenhum escopo amplo (`calendar`, `calendar.events`). `calendar.events.owned` é sensível: app público precisa de verificação do Google (semanas); até lá só "usuários de teste" conseguem conectar. O `state` é assinado e amarra tenant e usuário, vale 10 minutos |
| Credenciais | `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` (o mesmo cliente do login) e `GOOGLE_TOKEN_KEY` (32 bytes em base64). Sem os três, a integração fica desligada e a agenda usa só as regras próprias |
| Tokens | Cifrados em repouso com AES-256-GCM (`v1.iv.tag.texto`, chave fora do banco, RN-31); nunca em log. Tabela `calendar_integrations`, uma por tenant, com RLS. O token de acesso é renovado com o de atualização quando falta menos de 1 minuto |
| Calendário | Depois do consentimento o profissional escolhe uma agenda que seja dele (ex.: "Atendimentos"); só ids dessa lista são aceitos. Conectado sem agenda escolhida conta como indisponível |
| Oferta | `freeBusy.query` na janela oferecida: horários = regras próprias menos ocupação do Google (inclui os eventos que nós criamos, que coincidem com nossos agendamentos) |
| Antes de gravar | `bookAppointment` consulta `freeBusy` de novo dentro da mesma transação do agendamento; horário ocupado no Google vira `horario_indisponivel` e nada é gravado |
| Escrita | Depois que o banco aceita (constraint de exclusão), `events.insert` com id determinístico (o UUID do agendamento sem traços, que cabe no alfabeto base32hex do Google). Repetir a chamada não duplica (409 conta como sucesso). Grava `google_event_id` e `calendar_sync = synced` |
| Falha do Google | O paciente **não** recebe confirmação: a ferramenta devolve `agendamento_nao_sincronizado` e o turno transfere para o profissional. O agendamento fica no banco com `calendar_sync = failed` ("Não sincronizado com o Google" no painel). Repetir a mesma chamada (mesma chave de idempotência) tenta o evento de novo com o mesmo id |
| Remarcar e cancelar | Remarcar grava o novo agendamento (novo evento) e apaga o evento do antigo; cancelar apaga o evento. Falha ao apagar marca `calendar_sync = failed` no agendamento cancelado e não desfaz o cancelamento. Limitação: remarcar para um horário que sobrepõe o próprio horário antigo é recusado, pois o evento antigo ainda aparece como ocupado |
| Google fora do ar ou ilegível | `freeBusy` com erro (ou agenda não lida) nunca é tratado como livre: nada é oferecido nem gravado (`agenda_externa_indisponivel`) e o paciente é transferido (A-13). Isto muda a regra antiga "se o Google estiver fora do ar, vale a tabela local" |
| Token revogado ou expirado (`invalid_grant`, 401) | A integração vira `needs_reconnect` uma única vez, `alert()` registra `calendar_disconnected`, o assistente não oferece horários e transfere os pedidos de agenda, e o painel mostra a faixa "Reconectar" até o profissional voltar a conectar (a agenda escolhida é mantida) |
| Painel | Os mesmos caminhos: agendar, remarcar e cancelar pelo painel passam por `bookAppointment`, `rescheduleAppointment` e `cancelAppointment` com o mesmo vínculo de calendário; os horários livres do painel também descontam o Google |
| Fica para depois | Canal de notificação (watch) e sincronização incremental com `syncToken`, tabela `external_busy`, renovação diária de canais, tratamento de 410, alerta de conflito externo (evento criado por fora sobre horário já agendado), job que repete eventos `failed` |

Sem Google conectado, o plano Agenda funciona só com a agenda interna.

## Pagamentos

### Assinatura do SaaS

- Asaas, na conta principal (exige CNPJ nosso). Confirmado na pesquisa 06 contra sete alternativas: é o único que reúne assinatura por API, Pix Automático, cartão, boleto e nota fiscal de serviço nativa (R$ 0,49 por nota), com sandbox. Custo por assinatura de R$ 297: R$ 1,99 no Pix (0,67%) ou 2,99% + R$ 0,49 no cartão. Segunda opção: AbacatePay (Pix a R$ 0,80, suporte a excedente por uso), se a nota fiscal for resolvida por integração externa.
- A cobrança da assinatura fica atrás de uma interface `BillingProvider`, para permitir a troca.
- Excedente e mudança de plano no meio do ciclo: não verificado se o Asaas calcula. Calcular do nosso lado e lançar como item avulso na fatura seguinte. Implementado (E-25): no dia seguinte ao fechamento do mês, a rotina diária cria uma cobrança avulsa no Asaas com o vencimento da próxima fatura da assinatura, no valor das conversas acima da franquia do plano atual vezes o preço do excedente. O Asaas não aceita item avulso dentro da fatura da assinatura, então o excedente chega como uma cobrança separada com o mesmo vencimento. O uso do mês de assinatura durante o teste não gera excedente.
- Hipóteses de E-25: a troca de plano muda o valor da assinatura (a partir da próxima fatura, sem rateio) e a franquia na hora; o cancelamento (pelo cliente no painel ou pelo suporte no Asaas) encerra a assinatura na hora, sem novas faturas nem reembolso proporcional, e o assistente atende até o fim do mês já pago (vencimento da última fatura paga mais um mês, em `tenants.billing_ends_at`); o job diário põe o status em `cancelled` nessa data. Sem fatura paga, para na hora; no teste grátis, o teste segue até o fim e a varredura do teste o encerra. Assinar de novo antes dessa data mantém o assistente e a primeira fatura vence nela (decisão do dono em 25/11/2026: prática de mercado e menos risco de reclamação pelo CDC); uma fatura de excedente vencida não aciona a régua (só a fatura da assinatura aciona); o cliente escolhe Pix, boleto ou cartão na página da fatura (`billingType` indefinido); a primeira fatura vence ao fim do teste, ou no dia seguinte se o teste já acabou.
- Ciclo mensal. Excedente de conversas entra na fatura seguinte.
- Webhook do Asaas atualiza `tenants.status`. Inadimplência: aviso no dia do vencimento, novo aviso em 3 dias, e em 7 dias o assistente entra em modo restrito (só avisa o paciente de que o profissional responderá). Os dados ficam preservados por 30 dias.
- A fila de webhooks do Asaas pausa após 15 falhas seguidas: monitorar e ter rotina de reconciliação diária por consulta à API.

### Sinal via Pix (módulo Pro)

Decisão revista em 24/11/2026 com a [pesquisa 06](../research/06-pagamentos.md). A subconta Asaas foi descartada para o sinal: exige período de avaliação limitado a 10 subcontas e depois homologação, pesado demais para profissional solo. Subcontas de Woovi e AbacatePay guardam o saldo na nossa conta, o que nos faria segurar dinheiro de paciente. Stripe proíbe Pix para serviços médicos (MCC 8099).

- **Provedor do sinal: Mercado Pago por OAuth.** O profissional autoriza com um clique a conta que já tem ou cria. A cobrança é criada na conta dele e o valor liquida lá. Não recebemos nem guardamos dinheiro de paciente. Pix a 0,99% (preço de vitrine), pago por ele.
- **Implementado primeiro (H-52, decisão do dono de 26/11/2026): chave manual.** Detalhe abaixo, em "Sinal com chave manual".
- **Alternativa sem integração ("recebido manual"):** geramos o código Pix copia e cola com valor a partir da chave Pix do profissional, e ele confirma o recebimento com um toque no painel ou respondendo à notificação. Não tem confirmação automática nem expiração garantida. Serve para quem não quer conta no Mercado Pago e como primeira entrega do módulo.
- Os dois ficam atrás de uma interface `DepositProvider` (`createCharge`, `getStatus`, `parseWebhook`), como o canal de WhatsApp. Segunda opção de integração, se necessário: PagBank Connect.
- Fluxo:
  1. Paciente confirma horário. `agendar` cria o agendamento como `held`, com expiração.
  2. `criar_cobranca_sinal` gera a cobrança e devolve o código copia e cola.
  3. Webhook de pagamento confirmado muda para `confirmed` e dispara a confirmação ao paciente.
  4. Expirou sem pagar: horário liberado e paciente avisado, se a janela estiver aberta.
- O assistente só afirma que o pagamento foi recebido se `payments.status = 'paid'` (gravado pelo webhook ou, na chave manual, pelo toque do profissional). A validação de saída recusa "recebemos o Pix", "o sinal foi recebido" e parecidos sem uma ferramenta mostrar `situacao_sinal = pago`. Comprovante enviado por imagem não confirma nada (A-17); o assistente responde que o profissional confirma o recebimento.
- Política de devolução do sinal é texto configurado pelo profissional. O estorno é feito por ele; o assistente não tem ferramenta de estorno.
- Webhooks validados por token e idempotentes por identificador do evento.

### Sinal com chave manual (H-52)

Implementado em 26/11/2026, no plano Agenda (recurso `pix_deposit`, ver [01](01-produto-e-planos.md), "Recursos").

- **Configuração** (Conta > Recursos > Sinal por Pix, só o dono, `GET/PUT /api/deposits/settings`): chave Pix (CPF, CNPJ, celular com +55, e-mail ou aleatória, validada e normalizada), nome de quem recebe, cidade, prazo de reserva (padrão 30 minutos, de 10 minutos a 24 horas), regra de devolução em palavras e o valor do sinal de cada serviço (`services.deposit_cents`; vazio = sem sinal). Tabela `deposit_settings`, uma por consultório, com RLS. A chave não entra na auditoria.
- **Agendar com sinal:** com o recurso ligado, sinal no serviço e chave salva, `agendar` grava o agendamento (vivo, ocupa o horário e a constraint como qualquer outro, e cria o evento no Google) e um `payments` `pending` com `expires_at`. Confirmação e lembretes não são agendados. Divergência do fluxo acima: não há status `held` no agendamento; "segurado" é agendamento vivo com pagamento `pending`, para não mexer nas consultas que listam agendamentos vivos.
- **Código Pix:** BR Code estático (EMV do Banco Central, CRC-16/CCITT-FALSE) gerado em `packages/core/src/deposit/brcode.ts` com chave, nome e cidade (só ASCII, cortados em 25 e 15 caracteres), valor e o id do pagamento como referência (`txid`, 25 caracteres). Testado contra o exemplo do manual do Banco Central (CRC `1D3D`). Vai numa mensagem própria, logo depois da resposta, escrita pelo código; no modo "aprovar" vai no fim do rascunho. A ferramenta devolve ao modelo o valor, o prazo (`expira_em`) e a regra de devolução, e manda não escrever o código.
- **Confirmação:** a varredura de cada minuto avisa o profissional uma vez por sinal novo (push "Sinal para confirmar", sem conteúdo, abre `/sinais`). Em `/sinais` (`GET /api/deposits`) cada sinal tem "Recebi o Pix" (`POST /api/deposits/:id/confirm`, quem pode marcar agenda): o pagamento vira `paid` e a confirmação e os lembretes do agendamento são agendados na hora. Prazo vencido responde 409 `deposit_expired`.
- **Prazo vencido:** a mesma varredura marca o pagamento `expired`, cancela o agendamento (como o profissional, sem antecedência mínima; remove o evento do Google) e avisa o paciente com texto fixo só dentro da janela de 24 horas e com o assistente no controle (mesmo caminho da oferta da lista de espera).
- **Remarcar e cancelar:** remarcar leva o pagamento pendente para o novo agendamento (continua segurado, mesmo prazo); cancelar marca o pendente como `expired`. Sinal já pago fica no agendamento antigo (ponto em aberto: levar junto).
- Interface `DepositProvider` (`packages/core/src/deposit/provider.ts`) com `createCharge`; a implementação manual devolve `confirmsAutomatically = false`. O Mercado Pago entra atrás dela no plano Pro.

### Pontos em aberto

- Tributação da intermediação e emissão de nota: não verificado. Consultar contador antes de lançar o módulo.
- Split de taxa nossa sobre o sinal: não adotar no início. Mantém o modelo simples e evita enquadramento regulatório.
- A pesquisa 06 usou só páginas oficiais de preço e documentação. Reputação, suporte e histórico de bloqueio de saldo de todos os provedores não foram verificados: consultar Reclame Aqui e conversar com o comercial do Asaas e do Mercado Pago antes de integrar.
- Não verificado no Mercado Pago: taxa de Pix pela API, assinatura e novas tentativas de webhook, estorno por API.
