# 11 — Pequenos negócios: posicionamento, prioridades e métricas

Data: 25/11/2026. Atualização estratégica do dono. Onde este arquivo diverge dos arquivos 01 a 10, vale este; os outros serão ajustados no PR que implementar cada mudança. O inventário do código está em [../plan/AUDITORIA-2026-11-25.md](../plan/AUDITORIA-2026-11-25.md) e as etapas em [../plan/TASKS.md](../plan/TASKS.md) (Fase 6).

## Posicionamento

- **Mercado inicial:** donos de pequenos negócios, profissionais autônomos e pequenos negócios de serviço com hora marcada.
- **Primeiro piloto:** um quiropraxista, que pode indicar outros negócios locais.
- **Frase:** recepcionista com IA e assistente de crescimento para pequenos negócios. "Pare de perder clientes por mensagem sem resposta, retorno esquecido e agenda desorganizada."
- **Não é:** CRM corporativo, nem "sistema operacional de IA" genérico. Quem vende um produto maior perde o dono que só quer parar de perder cliente no WhatsApp.
- **Nome do produto:** "Consultório Aberto" é um nome de saúde. É **decisão em aberto do dono** se o nome muda, e quando. Nada é renomeado neste PR (ver H-30). Enquanto isso, o texto novo da interface usa "cliente" e "negócio".

## Prioridades

Cada linha aponta o que existe hoje (inventário completo na auditoria) e a etapa. **M-xx** são as etapas novas da Fase 6 em TASKS.

### P0 — sem isso não há piloto de pequeno negócio

| Capacidade | Hoje | Etapa |
|---|---|---|
| Configuração do perfil do negócio | FEITO (H-38) | M-04 |
| Serviços e horários | IMPLEMENTADO | E-17, E-19 |
| Assistente no WhatsApp | PARCIAL: oficial sem conta Meta; QR code ausente | E-09, E-09b |
| FAQ a partir de informação aprovada | PARCIAL | M-03, M-04 |
| Cadastro de lead e contato | PARCIAL (contato sim, origem não) | M-06 (em andamento) |
| Funil simples de leads | AUSENTE | M-06 (em andamento) |
| Gestão de agendamentos | IMPLEMENTADO; falta marcar realizado e faltou | E-20, E-23, M-08 |
| Agenda externa ou reserva confiável | Reserva confiável: IMPLEMENTADO. Google como fonte de disponibilidade (freeBusy na oferta e antes de gravar, evento com id determinístico): IMPLEMENTADO na E-21; sincronização completa (watch, syncToken): fica para depois | E-21 |
| Transferência para humano | IMPLEMENTADO | E-12 |
| Painel básico | PARCIAL | M-07 (em andamento) |
| Registro de opt-in e opt-out | PROBLEMÁTICO | M-01 |
| Isolamento entre clientes e controle de acesso | IMPLEMENTADO; falta permissão de Clientes e Resultados | E-02, E-04, M-05 |

### P1 — logo depois do piloto abrir

| Capacidade | Hoje | Etapa |
|---|---|---|
| Lembretes e confirmações | AUSENTE | E-22 |
| Gestão de cancelamento | PARCIAL | M-09 |
| Lista de espera de agenda | AUSENTE | M-09 |
| Recuperação de lead | AUSENTE | M-10 |
| Follow-up | AUSENTE (tipo `follow_up` existe, sem job) | M-10, Fase 4 |
| Indicações | AUSENTE | M-11 |
| Avaliações | AUSENTE | M-12 |
| Origem do lead | AUSENTE | M-06 (em andamento) |
| Relatórios simples | AUSENTE | M-07 (em andamento), M-12 |

### P2 — só com dado do piloto

Gerador de página, Google Meu Negócio, acompanhamento de campanha, automações avançadas, insights de IA, modelos de outros segmentos além do primeiro (M-13). Nada disso entra antes de o piloto provar as métricas abaixo.

## Navegação

Seis itens: **Início, Conversas, Agenda, Clientes, Resultados, Configurações.**

| Item | Conteúdo | Hoje |
|---|---|---|
| Início | O que precisa de atenção agora: conversas esperando, agendamentos de hoje, leads sem resposta | Tela Hoje (parcial) |
| Conversas | Caixa de entrada e controle humano | Existe |
| Agenda | Dia e semana, marcar, remarcar, cancelar, marcar realizado e faltou | Existe, menos o último |
| Clientes | Lista com etapa do funil, origem e consentimento | Ausente (em andamento) |
| Resultados | Métricas do piloto (abaixo) | Ausente (em andamento) |
| Configurações | Perfil do negócio, serviços e horários, FAQ, assistente, WhatsApp, equipe, plano e uso | Hoje espalhado em "Mais" |

**Divulgação progressiva:** o dono novo vê só o que já configurou. Funil, indicação, lista de espera e relatório aparecem quando há dado ou quando ele liga o recurso. Configuração avançada (autonomia por situação, tom, limites) fica atrás de "Mais opções". [10-painel-e-interface.md](10-painel-e-interface.md) é atualizado pelo PR da fatia em andamento, que muda a navegação.

## Cadastro (onboarding)

1. Essencial primeiro: nome do negócio, o que faz, serviços com duração, dias e horários, endereço ou "atendo no cliente", telefone do WhatsApp.
2. A IA pode **sugerir** (a partir de um site ou do Google Maps que o dono informar, ou do texto colado da bio) nome, endereço, telefone, horário, serviços, pacotes e descrição (H-40). Tudo entra como rascunho numa tela de revisão.
3. **Nada vale até o dono aprovar.** A ativação exige aprovar o resumo do que o assistente vai dizer. A autonomia começa em "aprovar antes de enviar" (já é o padrão: H-22).
4. Passos que dependem de conta externa (WhatsApp, Google) podem ser pulados e retomados.

## Modelo de template por segmento

O segmento é uma chave aberta de template (registro em `packages/core/src/onboarding/templates-data.ts`) e a política é uma linha de `specialty_policies` (coluna `specialty` guarda a chave; `rules` guarda `sensitivity`, `vocabulary`, `followUps`, `funnelStages`). Sem linha de política, vale `sensitivity = health` e "paciente" (o mais conservador). Para atender outros negócios sem código novo por segmento:

| Campo do template | Para que serve | Exemplo (fictício) |
|---|---|---|
| `id`, `label` | Chave aberta e nome na tela | `salao-de-beleza`, "Salão de beleza" |
| `services` | Serviços iniciais (nome, duração, preço) | Dados fictícios "(exemplo)" |
| `faq` | Perguntas e respostas iniciais para o dono editar | "Aceita cartão?" |
| `policy.pricesForbidden` | Proibir preço por mensagem | `false` |
| `policy.urgencyTerms` | Termos que levam a transferência imediata | Lista curta |
| `policy.forbiddenTerms` | Promessas que o assistente nunca faz | "garantido", "100%" |
| `policy.sensitivity` | `none` ou `health`: liga o limite de dado de saúde (próxima seção) | `none` |
| `vocabulary` | Como chamar quem é atendido ("cliente", "paciente", "aluno") | "cliente" |
| `followUps` | Intervalos sugeridos de retorno e lembrete | Desligado até o dono ligar |
| `funnelStages` | Nomes das etapas, sobre as etapas fixas do sistema | Ver abaixo |

Regras:

- Lógica compartilhada (agente, validação, funil, métricas) **não** conhece nenhum segmento pelo nome. Ela lê o template. Quiropraxia é um template, não um `if`.
- O prompt de plataforma deixa de dizer "profissional de saúde": a frase de papel e as listas clínicas (`CLINICAL`, termos de urgência) passam a vir do template, com `sensitivity = health` ligando-as. Feito em M-02: `HEALTH_RULES` (`rules.ts`), a lista clínica e o juiz clínico (`validate.ts`, `checked.ts`) e o piso de urgência (`HEALTH_URGENCY_TERMS` em `prefilter.ts`) só valem com `sensitivity = health`; o termo de urgência próprio do template vale sempre. Falta rodar de novo a bateria de avaliação (gasto pago: precisa de aprovação).
- Etapas do funil têm um conjunto fixo no sistema para as métricas serem comparáveis; o template só renomeia.
- Dados de exemplo continuam fictícios e marcados para o dono editar (H-23, quarta linha de políticas).
- Primeiro template: quiropraxia (o piloto). Salão, estética, clínica de outro tipo e aulas só depois (P2).

## Funil simples de leads

Etapas fixas: `novo` → `conversando` → `agendado` → `atendido`; saídas: `perdido` e `sem_resposta`. Regras:

- Um contato nasce `novo` na primeira mensagem. Vira `agendado` quando há agendamento ativo e `atendido` quando o atendimento é marcado como realizado.
- A mudança de etapa é registrada com data e autor (assistente, dono, recepcionista). O assistente só move por fatos de ferramenta (agendou, cancelou), nunca por interpretação de conversa.
- Sem campo de nota livre no cliente na primeira versão (ver limite de dado de saúde).

## Limite de dado de saúde

Vale para todo segmento com `sensitivity = health` e, por segurança, como padrão para qualquer um.

1. **Sem dado clínico em CRM nem em memória.** Ficam fora: queixa, sintoma, diagnóstico, exame, medicamento, histórico clínico, resultado de tratamento. Cliente guarda nome, telefone, etapa, origem, consentimento, agendamentos e serviço contratado.
2. **O assistente não diagnostica, não indica tratamento, não faz triagem, não promete resultado.** Se o cliente descreve sintoma, acolhe em uma frase e oferece a avaliação com o profissional (regra já no prompt).
3. **Dado mínimo:** o que não é preciso para agendar e lembrar não é coletado.
4. **Pergunta clínica vai para uma pessoa:** transferência para humano; o assistente não responde nem registra o conteúdo.
5. **Tudo que o modelo grava passa por filtro:** `registrar_duvida_sem_resposta`, `atualizar_nome_do_contato` e o resumo de conversa passam pelo juízo `informacao_de_saude` (já medido na E-07) e têm limite de tamanho; se positivo, não grava o texto e registra só "pergunta de saúde".
6. **Retenção:** conteúdo de mensagem tem prazo definido (E-26); resumo não guarda o que a mensagem não pode guardar.
7. **Política do WhatsApp para saúde:** validar a política da Meta para o segmento **antes de ativar** qualquer cliente de saúde na conexão oficial. Bloqueio jurídico e de conta (E-00b, E-00e), não de código.

## Modelo de indicação

Meta: o crescimento vem de quem já usa.

- **Código e link por cliente (negócio assinante):** cada consultório ou negócio tem um código curto e um link com ele, para dar a outro negócio.
- **Registro:** quando alguém se cadastra com o código, grava-se quem indicou, a data e o estado (cadastrou, ativou, assinou). Ligação feita pelo cadastro, não por mensagem.
- **Proibido:** o produto **não envia mensagem a um negócio indicado sem permissão** dele. O dono compartilha o link pelos próprios meios. Nada de importar contatos para disparo.
- **Dado:** guarda-se o nome do negócio indicador e o código. Nada sobre o motivo da indicação.
- **Recompensa:** não definida (H-27). Não prometer desconto antes de decidir.
- **Indicação entre clientes finais (paciente indica amigo):** fora do P0. Quando entrar, usa o mesmo princípio: link do cliente, sem disparo por nós.

## Métricas do piloto

Princípio: **medir antes de afirmar.** O piloto começa com uma linha de base e nenhuma meta de porcentagem inventada; as metas são decididas pelo dono depois de ver a linha de base. A coluna "Fonte" diz de onde o dado sai hoje; "Falta" diz o que não existe no código.

| # | Métrica | Fórmula | Fonte | Falta |
|---|---|---|---|---|
| 1 | Tempo até a primeira resposta | Mediana de (primeira mensagem de saída − primeira mensagem de entrada) por conversa nova, em minutos, separando resposta do assistente e do humano | `messages` (`direction`, `author`, `created_at`) | Nada: consulta |
| 2 | Conversas sem resposta | Contagem de conversas com `pending_since` anterior a N horas, hoje; N definido pelo dono (padrão 2 h) | `conversations.pending_since`, `control` | Nada |
| 3 | Conversas novas | Contatos criados no período com ao menos uma mensagem de entrada | `contacts.created_at`, `messages` | Nada |
| 4 | Conversas resolvidas sem humano | Conversas com resposta do assistente e **sem** transferência no período, dividido pelas conversas com resposta do assistente | `messages`, `audit_log` (`conversation.control_changed`, motivo `agent_handoff`) | Nada |
| 5 | Taxa de transferência | Conversas com `agent_handoff` ÷ conversas com mensagem de entrada | `audit_log` | Nada |
| 6 | Agendamentos criados | Contagem de `appointments` criados no período, por `created_by` (`ai` ou `human`) | `appointments` | Nada |
| 7 | Conversão de lead em agendamento | Contatos novos do período com ao menos um agendamento não cancelado ÷ contatos novos do período | `contacts`, `appointments` | Nada |
| 8 | Cancelamentos | Agendamentos `cancelled` ÷ agendamentos do período; remarcações contadas à parte | `appointments.status` | Remarcação não tem marca própria: hoje altera o horário |
| 9 | Faltas (no-show) | `no_show` ÷ (`completed` + `no_show`) de agendamentos já passados | `appointments.status` | **Nenhuma rota grava `completed`/`no_show`** (M-08) |
| 10 | Leads por origem | Contatos novos agrupados por origem | `contacts` | Campo de origem (M-06, em andamento) |
| 11 | Leads por etapa | Contatos por etapa do funil, e tempo na etapa | `contacts` + histórico de etapa | Etapa (M-06, em andamento) |
| 12 | Leads recuperados (P1) | Leads em `sem_resposta` ou `perdido` que voltam a `conversando` ou `agendado` após uma mensagem de recuperação ÷ leads que receberam a mensagem | `contacts`, histórico de etapa, `scheduled_messages` | M-10 |
| 13 | Indicações (P1) | Cadastros com código ÷ códigos distribuídos; ativados e assinantes à parte | tabela de indicação | M-11 |
| 14 | Avaliações pedidas e recebidas (P1) | Pedidos enviados e avaliações públicas obtidas; sem nota inventada | `scheduled_messages`; avaliação lançada à mão | M-12 |
| 15 | Custo por conversa | Custo de IA em reais ÷ conversas do período (câmbio H-09) | `ai_usage` | Nada |
| 16 | Dinheiro recuperado (H-41) | Soma de `services.price_cents` dos agendamentos `created_by = ai` com `status = completed` e início no período; com o consultório fechado: criados fora de toda `availability_rules` na hora local | `appointments`, `services`, `availability_rules` | Nada |

**Linha de base** (antes de ligar o assistente, 14 dias):

1. Entrevista com o dono: quantas mensagens chegam por semana, quantas ficam sem resposta, quantas faltas e cancelamentos, por estimativa dele. Registrado como estimativa, não como medida.
2. Se o canal estiver conectado com a autonomia em "desligado" ou "aprovar", as métricas 1, 2, 3 e 6 saem dos dados reais do período (hipótese H-26: o canal grava a entrada com o assistente desligado).
3. A tela Resultados mostra "linha de base" e "depois" lado a lado, com o número de conversas ao lado de cada taxa. Com poucas conversas, mostra a contagem e não a porcentagem.
4. Nenhum relatório compara com mercado nem projeta ganho.

## Hipóteses novas

H-25 a H-30 em [README.md](README.md).

## Canais de WhatsApp (decisão do dono em 25/11/2026)

Os dois canais continuam no produto, atrás do mesmo `ChannelAdapter`:

- **Oficial (padrão):** Cloud API com Coexistence, mantendo o número e o aplicativo WhatsApp Business do profissional. É o canal recomendado e o único usado em mensagens fora da janela de 24 horas (templates).
- **Alternativo (opcional):** conexão por QR code via gateway externo (WAHA), para quem não pode ou não quer passar pelo processo da Meta. Não é autorizado pela Meta e o número pode ser bloqueado; só é ativado com o termo de ciência assinado (RF-27), com limites de envio e sem mensagem ativa em massa (RF-28), como já está em `03-whatsapp-e-conversa.md` e na E-09b.

O piloto começa no canal oficial assim que a conta Meta existir; o alternativo serve de ponte se a aprovação da Meta atrasar, sempre com o risco explicado ao profissional.
