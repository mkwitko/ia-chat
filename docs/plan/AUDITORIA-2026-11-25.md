# Auditoria do código — 25/11/2026

Base da revisão do roadmap para pequenos negócios ([spec 11](../spec/11-pequenos-negocios.md)). Escopo: o que existe no repositório em `main` (commit `1148ec0`) frente às prioridades P0, P1 e P2 da atualização estratégica de 25/11/2026.

## Método e limites

- Leitura do código, do schema Prisma (`packages/db/prisma/schema/`), das migrations e das rotas. Cada afirmação abaixo aponta o arquivo.
- Busca por uso (`grep`) para provar ausência: "AUSENTE" significa que nenhum código lê ou grava aquilo, não só que a etapa está desmarcada.
- Os testes **não foram executados** nesta auditoria (a suíte de integração exige Postgres). Os números de testes são contagem estática: 66 arquivos de teste e cerca de 346 casos (`it(`/`test(`). Não afirmo que passam; o CI do repositório é a fonte disso.
- Nada foi chamado em provedor pago. Custos vêm da especificação, não de medição.
- Uma fatia vertical está **em andamento** em outro PR (tela Clientes com etapa de funil simples, origem do contato e registros de consentimento; Home "o que precisa de atenção"; Resultados com métricas do piloto; navegação Home, Conversas, Agenda, Clientes, Resultados, Configurações). Esta auditoria descreve o estado de `main` sem ela.

Legenda: **IMPLEMENTADO** (funciona e tem teste), **PARCIAL** (existe, falta parte relevante), **AUSENTE** (não há código), **PROBLEMÁTICO** (existe, mas conflita com a nova estratégia, com a spec ou com a lei; precisa de decisão ou correção antes de crescer). "Bloqueio" diz se o que falta é conta externa (Meta, Google, Asaas, R2, jurídico) ou só código.

## Resumo

| Status | Itens |
|---|---|
| IMPLEMENTADO | Serviços, horários, agendamento sem conflito e painel de agenda, agente e ferramentas, validação de saída, trava de envio, entrega natural, transferência para humano, caixa de entrada, RLS, papéis, filas, teste grátis, painel do operador, observabilidade |
| PARCIAL | Perfil do negócio, base de conhecimento, modelos de segmento, adaptador oficial, juízos, contatos, cancelamento, onboarding, uso e limites, Hoje, site e ajuda, testes, custos |
| AUSENTE | Adaptador por QR code, mídia e áudio, funil de leads, origem do lead, Google Calendar, lembretes e confirmações, lista de espera de agenda, sinal Pix, assinatura, recuperação de lead, indicações, avaliações, relatórios de resultado |
| PROBLEMÁTICO | Opt-in e opt-out, regras de saúde fixas no código compartilhado, texto livre do modelo em conhecimento e resumo, retenção de mensagens, Hoje com texto falso, perfil sem horário no prompt (ver "Achados críticos") |

## Achados críticos (PROBLEMÁTICO)

| # | Achado | Evidência | Risco | Ação (etapa em [TASKS](TASKS.md)) |
|---|---|---|---|---|
| 1 | Registro de opt-out grava `contacts.opt_out_at`, mas **nada lê** esse campo. `contacts.consents` (JSON) **nunca é gravado**. Não há registro de opt-in (data, origem, texto aceito) | `apps/worker/src/agent/respond.ts:92` grava; `grep optOutAt` não acha leitura; `consents` só aparece na migration | Hoje não há envio ativo, então nada é enviado indevidamente. Quando lembretes e recuperação existirem, enviariam a quem pediu para sair. Sem opt-in registrado não se prova consentimento (LGPD, política da Meta) | M-01 antes de qualquer envio ativo. **Atualização 25/11/2026:** o portão `proactiveGate` agora lê o opt-out e o histórico de consentimento antes de todo lembrete (E-22); ainda falta o registro de opt-in com texto e origem |
| 2 | Regras do agente e validação de saída têm **saúde fixa no código compartilhado**: "profissional de saúde" no prompt, lista `CLINICAL` de medicamentos e condutas, pré-filtro de urgência, enum fechado `Specialty` (4 áreas de saúde), tabela `specialty_policies` só com essas 4 | `packages/ai/src/agent/rules.ts`, `validate.ts` (`CLINICAL`), `packages/core/src/onboarding/steps.ts`, migration `20261125170000_onboarding` | Contraria "sem quiropraxia fixa na lógica compartilhada". Negócio que não é de saúde herdaria regras erradas (ou nenhuma política) | M-02 (modelo de template) |
| 3 | `registrar_duvida_sem_resposta` grava **texto livre escrito pelo modelo**, sem limite de tamanho nem filtro, em `knowledge_items.question` (aparece no painel em "Perguntas que o assistente não soube"). O resumo de conversa (`conversations.summary`) depende só de uma instrução no prompt ("não inclua informação de saúde") | `apps/worker/src/agent/tools.ts:44`, `packages/agent/src/shared-tools.ts:40`, `apps/worker/src/agent/summary.ts:6` | Texto clínico do paciente pode ser parafraseado e persistido em base de conhecimento e resumo, fora do lugar onde a política de retenção olha | M-03: limite, filtro com o juízo `informacao_de_saude` já existente, teste |
| 4 | `messages.text` guarda o conteúdo bruto de todas as mensagens, sem prazo de retenção nem rotina de exclusão. Exclusão de dados e retenção ainda são a E-26 | schema `conversation.prisma`; TASKS E-26 | Inevitável para a caixa de entrada, mas sem retenção definida o conteúdo clínico que o paciente escrever por conta própria fica para sempre | M-03 (política de retenção) e E-26 |
| 5 | Tela **Hoje** mostra sempre "A agenda ainda não está conectada" na seção de atendimentos do dia, embora a agenda do painel exista (E-19 e E-23 fechadas) | `apps/web/src/app/inbox/inbox-copy.ts:101`, `today-screen.tsx` | Texto falso para o dono: ele acha que o produto não vê a agenda | Resolvido pela fatia em andamento (Home); conferir ao fechar |
| 6 | O prompt do assistente **não recebe horário de funcionamento** (`hours: []`) nem regra de cancelamento (`cancellationRule: undefined`); só o primeiro profissional e o primeiro local entram no perfil | `packages/agent/src/profile.ts:63-69` | Pergunta mais comum de pequeno negócio ("abre sábado?") cai em "vou verificar" mesmo com a agenda cadastrada. Negócio com mais de um profissional ou local fica coberto pela metade | M-04 |

Observação de documentação: `docs/spec/README.md` tem a hipótese H-23 duplicada e pula H-20. Não renumerei, porque o código e outros arquivos citam essas numerações. Fica como pendência de limpeza (M-14).

## Inventário por capacidade

### Configuração do negócio

| Capacidade | Status | Onde | Como funciona e limites | Preservar | Evoluir | Bloqueio |
|---|---|---|---|---|---|---|
| Perfil do negócio | PARCIAL | `Tenant` (`platform.prisma`), `Professional`, `Location` | Nome, fuso, identidade e nome do assistente, tom de voz (quatro perguntas), endereço e instruções de chegada. Não há descrição do negócio, telefone, site, redes, segmento livre nem canal preferido | Tom em quatro perguntas; modo de identidade `assistant` como padrão; tela "Assistente" | Campos do perfil do negócio que o assistente cita e o dono aprova | Código |
| Serviços | IMPLEMENTADO | `Service`, `apps/api/src/setup/services-routes.ts` | Nome, duração, preço em centavos, visível ao paciente, ativo. Sem categoria, sem vínculo serviço-profissional, sem "sob consulta" | Preço em centavos e visibilidade; o modelo nunca é fonte de preço | Preço opcional ("a combinar"); vínculo com profissional | Código |
| Horários | IMPLEMENTADO | `AvailabilityRule`, `TimeOff`, `apps/api/src/agenda/availability-routes.ts`, `packages/core/src/agenda/slots.ts` | Regra semanal por profissional, no fuso do negócio, antecedência mínima e máxima, bloqueios e férias. Não existe "horário de funcionamento" do negócio separado da agenda; o prompt não o recebe (achado 6) | Cálculo de horários em `slots.ts` com teste | Derivar o horário de funcionamento para o prompt; feriados | Código |
| Base de conhecimento (FAQ) | PARCIAL | `KnowledgeItem`, `apps/api/src/setup/knowledge-routes.ts` | Pergunta e resposta aprovadas pelo dono; só itens `active` com resposta entram no prompt inteiro (sem busca vetorial). Origem `manual`, `unanswered` ou `history`; `history` nunca é produzida (E-24b ausente). Achado 3 sobre o texto de `unanswered` | "Base aprovada pelo dono é a única fonte"; base inteira no prompt | Filtro de saúde nas perguntas registradas; modelos por segmento | Código |
| Modelos de segmento | PARCIAL | `packages/core/src/onboarding/templates-data.ts`, `templates.ts` | Quatro modelos de saúde com dados fictícios, aplicados no onboarding (`apps/api/src/onboarding/apply-template.ts`). O tipo é reutilizável (`SpecialtyTemplate`), a chave é o enum de saúde (achado 2) | Dados fictícios marcados "(exemplo)"; o dono edita tudo | Chave aberta (segmento), campos por modelo (ver spec 11) | Código |

### WhatsApp, agente e conversa

| Capacidade | Status | Onde | Como funciona e limites | Preservar | Evoluir | Bloqueio |
|---|---|---|---|---|---|---|
| Adaptador oficial (Cloud API) | PARCIAL | `packages/channels/src/cloud-api/`, `apps/api/src/webhooks/whatsapp.ts` | Assinatura sobre corpo bruto, normalização, idempotência por id do provedor, envio de texto e template, status, reconciliação diária; testado com fixtures no formato da documentação. Nunca rodou com payload real | Interface `ChannelAdapter`; suíte de contrato | Gravar payloads reais; Embedded Signup | **Meta** (E-00b): conta, verificação do negócio, App Review |
| Adaptador por QR code | AUSENTE | `packages/channels` não tem o adaptador; `grep waha` sem resultado em código | Só especificado (E-09b, 7 tarefas abertas) | Decisão de não embutir Baileys | Seguir E-09b | Código e contêiner; **jurídico** (termo de ciência, E-00e). Para o piloto é o caminho mais rápido, pois não depende da Meta |
| Mídia e áudio | AUSENTE | sem código de download, R2 ou transcrição | Tipos não legíveis (imagem, documento etc.) recebem texto fixo pelo pré-filtro `unsupported` (`packages/agent/src/prefilter.ts:71`). Áudio passa pelo pré-filtro, mas não há transcrição: o modelo recebe a mensagem sem texto. A verificar com o piloto o que chega por áudio | Texto fixo seguro | E-10 | **R2** (E-00g) e chave de transcrição |
| Agente e ferramentas | IMPLEMENTADO | `apps/worker/src/agent/`, `packages/agent/`, `packages/ai/src/agent/` | Um agente com ferramentas: transferir, registrar dúvida, atualizar nome, consultar horários, agendar, remarcar, cancelar, listar. `tenant_id` vem do contexto, nunca do modelo; idempotência por turno | Um agente só; ferramentas como fonte de preço, horário e agendamento | Ferramenta de captura de lead (etapa e origem); ferramenta de pedido de retorno | Código |
| Validação de saída | IMPLEMENTADO | `packages/ai/src/agent/validate.ts` | Bloqueia preço fora do catálogo, horário sem ferramenta, afirmação de ação sem ferramenta, termo proibido e conduta clínica. Falha leva a transferência. Regras de saúde fixas (achado 2) | Verificação determinística antes de enviar | Mover listas clínicas para o modelo de segmento | Código |
| Trava de envio e turnos | IMPLEMENTADO | `apps/worker/src/conversation/turn.ts`, `packages/db/src/conversation/` | `control = 'ai'` e `turn_version` iguais antes de enviar; agrupamento de mensagens; mensagem do humano invalida o turno | Intocável (regra do CLAUDE.md) | Nada | Código |
| Entrega natural | IMPLEMENTADO | `apps/worker/src/conversation/pacing.ts` | Uma mensagem por turno, ritmo e indicador de digitação | Uma mensagem por turno (custo da Meta) | Nada | Código |
| Juízos (Jev) | PARCIAL | `packages/ai/src/agent/judgments.ts` | Perguntas e limiares medidos na bateria E-07 (urgência, pedido de humano, opt-out, orientação clínica, informação de saúde, frustração). Rodada final com modelos de produção pendente (H-12) | Falha segura | Rodar a bateria de segmentos novos | **Crédito no gateway** (aprovação para gasto) |
| Transferência para humano | IMPLEMENTADO | `apps/worker/src/conversation/handoff.ts`, `packages/db/src/conversation/control.ts` | Assistente passa a conversa, avisa o paciente, notifica por push sem conteúdo (RN-38), lembra após 2 h sem resposta; o profissional reassume e devolve. O texto livre `motivo` da ferramenta **não é gravado** (só o enum `ControlReason`) | Push sem conteúdo; motivo em enum | Lembrete em horário comercial (hoje é relógio corrido) | Código |
| Caixa de entrada | IMPLEMENTADO | `apps/web/src/app/inbox/`, `apps/api/src/conversations/` | Lista, conversa, rascunho para aprovar, composer, controle humano, tempo real por SSE | Aprovar antes de enviar como padrão | Filtros por etapa e origem (fatia em andamento) | Código |

### Contatos, funil e consentimento

| Capacidade | Status | Onde | Como funciona e limites | Preservar | Evoluir | Bloqueio |
|---|---|---|---|---|---|---|
| Contatos | PARCIAL | `Contact`, `apps/worker/src/inbound/contacts.ts`, `GET /api/patients` | Criado na primeira mensagem; resolve por BSUID e por telefone com nono dígito (RF-23b); só `name`, telefone, `consents`, `opt_out_at`. Sem origem, etapa, observação, etiqueta; vocabulário "paciente" na API e na interface | Chave de contato (RF-23b); RLS | Etapa, origem, consentimento (fatia em andamento); renomear para "cliente" na interface | Código |
| Funil de leads simples | AUSENTE | nenhum campo no schema | Nada; "lead" não existe como conceito | — | Em andamento (fatia 1) | Código |
| Origem do lead | AUSENTE | nenhum campo | Nada | — | Em andamento (fatia 1) | Código |
| Opt-in e opt-out | PROBLEMÁTICO | `respond.ts:92`, `prefilter.ts`, `Contact.optOutAt`, `Contact.consents` | Opt-out por palavra grava a data e responde texto fixo. Nada lê o campo; opt-in não é registrado (achado 1) | Opt-out por palavra determinístico, antes do modelo | Registro com data, origem e texto; checagem em todo envio ativo | Código; texto do aviso: **jurídico** |

### Agenda

| Capacidade | Status | Onde | Como funciona e limites | Preservar | Evoluir | Bloqueio |
|---|---|---|---|---|---|---|
| Agendamento | IMPLEMENTADO | `Appointment`, `packages/db/src/agenda/`, `apps/worker/src/agent/agenda-tools.ts` | Exclusion constraint `appointments_no_overlap` impede dois agendamentos no mesmo horário do profissional; reserva só de horário oferecido (`offered_slots`); remarcação atômica; confirmação do paciente conferida por código | Constraint no banco como árbitro (A-10); idempotência | Capacidade maior que 1 (aula em grupo) fica fora | Código |
| Painel de agenda | IMPLEMENTADO | `apps/web/src/app/agenda/`, `apps/api/src/agenda/` | Visão do dia e da semana, marcar, remarcar, cancelar, disponibilidade, bloqueios e férias; permissão `agenda` (`read`, `book`, `manage`) | Papéis (H-18) | **Marcar realizado e faltou**: `completed` e `no_show` existem no enum e na tela (rótulos), mas nenhuma rota da API grava esses estados (só criar, remarcar e cancelar). Sem isso não há taxa de falta (spec 11, métrica 6) | Código |
| Google Calendar | IMPLEMENTADO na E-21 (MVP: fonte de disponibilidade por freeBusy; sem sincronização completa). Linha abaixo é o estado de antes da E-21: AUSENTE | só a coluna `appointments.google_event_id` e `professionals.google_calendar_id` | Nenhum cliente, OAuth ou sincronização; E-21 com 6 tarefas abertas. A agenda interna é a fonte; "reservas confiáveis" já valem sem o Google | Agenda interna como fonte da verdade | E-21 (espelho com `external_busy`) | **Google** (E-00c: projeto, tela de consentimento, verificação do escopo) |
| Lembretes e confirmações | AUSENTE | `ScheduledMessage` e enums existem; só `control.ts` cancela e o seed cria. **Nenhum código cria nem envia** | Sem lembrete nem confirmação; E-22 com 5 tarefas abertas | Modelo `ScheduledMessage`; regra de parar em controle humano (RF-31) | E-22, com teste A-15 (opt-out) | **Meta** (templates aprovados para mensagem fora da janela de 24 h) |
| Cancelamento | PARCIAL | `cancelar` (ferramenta) e painel | Cancela pelo assistente e pelo painel com antecedência mínima (RF-44); não oferece reagendar nem avisa lista de espera | Antecedência só vale para o paciente | Oferecer remarcação; liberar horário para a lista | Código |
| Lista de espera de agenda | AUSENTE | `WaitlistEntry` é a lista de espera **do site** (cadastro antes do produto), não de horários | Nada para horários | — | M-09 | Código |
| Sinal Pix | AUSENTE | modelo `Payment` sem uso (só seed) | Fase 4; fora de P0 | `DepositProvider`; nunca guardar dinheiro de paciente | Fase 4 | **Mercado Pago / Asaas** (E-00d) |

### Plataforma

| Capacidade | Status | Onde | Como funciona e limites | Preservar | Evoluir | Bloqueio |
|---|---|---|---|---|---|---|
| Isolamento (RLS) | IMPLEMENTADO | `packages/db/prisma/migrations/`, `packages/db/src/rls.test.ts` | Toda tabela de negócio com `tenant_id` e RLS forçado; o teste lê o catálogo do banco e falha se uma tabela nova não tiver RLS, política, índice e linha de fixture; tabelas sem `tenant_id` estão numa lista justificada | Teste guiado pelo catálogo; `withTenant` | Incluir as tabelas novas (funil, consentimento) | Código |
| Papéis (RBAC) | IMPLEMENTADO | `apps/api/src/auth/access.ts`, `tenant-guard.ts` | Dono, profissional e recepcionista com permissões `billing`, `integrations`, `assistant`, `agenda`. Falta permissão para clientes/funil e resultados | Padrão conservador (H-10, H-14, H-18) | Permissões `customers` e `results` (M-05) | Código |
| Autenticação | IMPLEMENTADO | `apps/api/src/auth/`, Better Auth com organizações | E-mail verificado obrigatório; envio de e-mail real só vai para o log até a E-00f | — | — | **Conta de e-mail transacional** (E-00f) |
| Filas | IMPLEMENTADO | `packages/db/src/queue/`, pg-boss; `apps/worker/` | Turnos, entrada, notificações, resumo noturno, varredura do teste, lembretes de abandono | pg-boss sem Redis | Jobs de lembrete e recuperação | Código |
| Onboarding | PARCIAL | `packages/core/src/onboarding/`, `apps/api/src/onboarding/`, `apps/web/src/app/onboarding/` | Oito passos (conta, serviços, local, tom, simulador, WhatsApp, Google, ativação); WhatsApp e Google podem ser pulados; ativar mantém autonomia em "aprovar"; funil de passos para o operador. Falta o passo de perfil do negócio e de horário de funcionamento; a IA não ajuda a preencher; E-24 tem 6 tarefas abertas | "Dono aprova antes de ativar" já é o comportamento | Passo de perfil; IA que sugere (nunca grava sozinha); modelo por segmento | **Meta** e **Google** para os passos que pulam |
| Uso e limites | PARCIAL | `UsageCounter`, `AiUsage`, `apps/api/src/usage/`, `apps/web/src/app/usage/` | Franquia, excedente em centavos com teto, modo restrito, avisos de 80% e 100% por push | Teto de excedente; mensagem fixa em modo restrito | Previsão de fim de mês (H-17) | **Asaas** para cobrar excedente (E-25) |
| Teste grátis | IMPLEMENTADO | `packages/core/src/trial/`, `apps/worker/src/trial/`, `apps/api/src/trial/` | 14 dias, teto de 100 conversas, um teste por documento, lembretes de abandono, varredura de fim do teste | — | Exclusão após 30 dias não existe (E-26) | Código; e-mail real depende da E-00f |
| Assinatura | AUSENTE | sem `BillingProvider` | Só "em breve" na tela (E-25) | — | E-25 | **Asaas** (E-00d: CNPJ) |
| Painel do operador | IMPLEMENTADO | `apps/api/src/operator/` | Agregados sem dados pessoais; conteúdo só com concessão registrada (motivo e prazo) | Concessão auditada (RN-35) | — | Código |
| Observabilidade | IMPLEMENTADO | `packages/observability/`, `ops_events` | Redação de conteúdo, telefone e e-mail em log e Sentry (`scrub.ts`); `alert()` grava `ops_events` só com ids e códigos; `/health` e prontidão | RN-38 | Alertas de produção (E-26) | **Sentry e Axiom** (E-00g) |
| Dashboard Hoje | PARCIAL | `apps/web/src/app/inbox/today-screen.tsx` | Lista conversas que precisam do profissional; atendimentos do dia são texto fixo (achado 5) | Foco em "o que precisa de você" | Home (fatia em andamento) | Código |
| Site e ajuda | PARCIAL | `apps/site/` | Página inicial, preços, calculadora, status, 17 artigos de ajuda. Todo o texto fala em "profissionais de saúde autônomos"; S-01, S-03, S-07 e S-08 têm tarefas abertas | Linguagem clara; ajuda por passo | Página por segmento só depois do piloto (P2) | Código; nome e domínio (E-00f) |
| Testes | PARCIAL | 66 arquivos, cerca de 346 casos (contagem estática) | Cobrem RLS, agenda, agente, validação, webhook, operador, teste grátis. Bateria de IA e A-11 com ferramenta falhando pedem chamadas pagas e não rodaram. Sem teste de ponta a ponta no navegador | Teste primeiro nas regras | Testes para funil, consentimento e métricas | **Gasto com IA** exige aprovação |
| Custos | PARCIAL | `packages/ai/src/prices.ts`, spec 07, `custos.xlsx` | Custo de IA por chamada em `ai_usage`; tarifa da Meta e câmbio por hipótese (H-09). Nunca medido com cliente real | Custo por conversa visível ao operador | Medir no piloto | Piloto |

## O que depende de conta ou parecer externo

| Bloqueio | O que trava | Etapa |
|---|---|---|
| Meta (CNPJ, verificação do negócio, App Review, templates) | Adaptador oficial com payload real; lembretes fora da janela de 24 h; coexistência | E-00b, E-09, E-22 |
| Google (OAuth, verificação do escopo) | Espelho da agenda | E-00c, E-21 |
| Asaas (CNPJ) | Assinatura e excedente | E-00d, E-25 |
| Mercado Pago | Sinal Pix | E-00d |
| R2, Sentry, Axiom, e-mail transacional | Mídia, backup, alertas, e-mail real | E-00f, E-00g, E-26 |
| Parecer jurídico | Termo do QR code, contrato de operador, texto de opt-in, política da Meta para saúde, retenção | E-00e |
| Crédito no gateway de IA | Bateria final e A-11 | E-07, E-20 |
| Só código | Funil, origem, consentimento, perfil, horário no prompt, Home, Resultados, lista de espera, indicação, relatórios | M-xx |

Para o piloto, o canal padrão é o oficial com Coexistence (decisão de 25/11/2026: os dois canais ficam, o QR code é alternativo e opcional, ver `docs/spec/11-pequenos-negocios.md`). O caminho mais curto sem conta externa é o adaptador por QR code (E-09b) com agenda interna. Ele depende do termo de ciência, que é jurídico, mas não da Meta nem do Google.

## Riscos de dado de saúde encontrados

| Onde | Risco | Situação |
|---|---|---|
| `knowledge_items.question` via `registrar_duvida_sem_resposta` | Texto livre do modelo, sem filtro | Achado 3 |
| `conversations.summary` | Só instrução de prompt impede condição de saúde | Achado 3 |
| `messages.text` | Conteúdo bruto do paciente, sem retenção | Achado 4 |
| `contacts.name` via `atualizar_nome_do_contato` | Texto livre até 80 letras vindo do modelo | Baixo; validar que parece nome |
| Funil e observações (fatia em andamento) | Campo de nota livre no cliente viraria prontuário | Proibir nota livre de saúde: ver spec 11, "Limite de dado de saúde" |
| Origem e indicação | "Indicado por Fulano" revela relação de cuidado | Guardar só o nome de quem indicou, nunca o motivo |
| Push, log, Sentry | Sem conteúdo (RN-38, `scrub.ts`) | OK |
| Controle humano | `motivo` da transferência não é gravado | OK |
| Operador | Acesso a conteúdo só com concessão | OK |

## O que preservar

Isolamento por `tenant_id` com teste guiado pelo catálogo; trava de envio; ferramentas como fonte de preço, horário e agendamento; validação determinística de saída; constraint de não sobreposição; push sem conteúdo; redação de logs; autonomia "aprovar" como padrão; concessão auditada do operador; ritmo de uma mensagem por turno.

## O que precisa evoluir

Perfil do negócio e horário no prompt; modelo de segmento aberto no lugar do enum de saúde; registro de opt-in e uso do opt-out; funil, origem e indicação; lembretes e confirmação; lista de espera; Home, Clientes e Resultados; filtro de saúde em tudo que o modelo grava; vocabulário "cliente" em vez de "paciente" na interface (o nome do produto é decisão em aberto: spec 11).
