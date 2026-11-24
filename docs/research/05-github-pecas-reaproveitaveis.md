# 05 - Peças reaproveitáveis e código de referência (GitHub/web)

Data da pesquisa: 2026-11-24. Método: `gh api` (metadados: stars, `pushed_at`, SPDX) + leitura de código/README via API + páginas oficiais (Meta, Better Auth, pg-boss). Stars e datas são do dia da pesquisa. "Último commit" = `pushed_at` do repositório.

Legenda de licença para SaaS fechado e pago: OK = pode usar/copiar com aviso de copyright; CUIDADO = condição relevante; NÃO = não usar no produto. "não verificado" = não consegui confirmar.

Limitação: a busca de repositórios do GitHub retorna pouco para consultas longas. Para tópicos de nicho (Google Calendar sync, exclusion constraint, datasets pt-BR) a cobertura é fraca e está marcada.

---

## Decisões de arquitetura que esta pesquisa muda ou reforça

1. **Identidade do contato não pode ser só o telefone.** O Chatwoot tem issues fechadas em 2026: contatos duplicados no Brasil por causa do 9º dígito com coexistence (#13986) e "BSUID" (Business-Scoped User ID) exigido antes de junho/2026 (#13837, #15530: contatos identificados só por BSUID somem de lista/busca). Modelar `contact_identity` (wa_id, BSUID quando vier, telefone normalizado com e sem 9º dígito) desde o dia 1. Verificar na doc da Meta o estado atual do BSUID (não verificado por mim).
2. **Evalite está deprecado** (repo arquivado; README recomenda Langfuse). Tirar da lista. CI de evals: promptfoo (MIT, ativo) e/ou vitest-evals (Sentry, Apache-2.0, harness para AI SDK). Langfuse para datasets/observabilidade.
3. **Drizzle: `latest` do npm ainda é 0.45.4; a 1.0 está em beta/RC (`1.0.0-rc.6`).** Projetos novos (ex.: cella) já usam `1.0.0-rc.5`. Decidir e fixar versão; RLS (`pgPolicy`, `pgRole`, `.enableRLS()`) deve ser testado na versão escolhida. Conferir changelog antes de travar.
4. **Não existe SDK oficial do Asaas para Node** (achei só SDKs comunitários pequenos e antigos). Fazer cliente fino próprio com Zod sobre `fetch` + validar webhooks. Os SDKs comunitários servem de mapa dos endpoints.
5. **`fluent-ffmpeg` está arquivado** (2025-05). Usar `child_process.spawn('ffmpeg', ...)` direto.
6. **pg-boss 12.x já traz dashboard oficial (`@pg-boss/dashboard`) e queue policies** (`short`, `singleton`, `stately`, `exclusive`, mais `singletonKey`). Não precisa de dashboard terceiro. Exige Node >= 22.12.
7. **Chatwoot não precisa ser forkado**, mas é a melhor referência pública de tratamento de `smb_message_echoes` + Embedded Signup coexistence (ver seção 2).
8. **`date-holidays` tem dados sob CC-BY-SA-4.0** (licença npm: `(ISC AND CC-BY-SA-4.0)`). Para feriados prefira lista própria curta (nacionais fixos + móveis calculados + feriados estaduais/municipais configuráveis pelo profissional) ou use o dado de `joaopbini/feriados-brasil` (MIT).
9. **Typebot é FSL-1.1-Apache-2.0** (não é OSI; proíbe uso competitivo, vira Apache após 2 anos). Só para estudo; não copiar código.
10. **Hiberius/whatsapp-receptionist declara no próprio README que RLS "nunca é exercitado em runtime"** (usa filtros por tenant no repositório). Lição: teste de RLS precisa rodar com role não-superuser e sem `BYPASSRLS`. Ver seção 3.

---

## 1. WhatsApp Cloud API em TypeScript

| Repo | Stars | Último commit | Licença | Reusar |
|---|---|---|---|---|
| https://github.com/Secreto31126/whatsapp-api-js | 358 | 2026-11-23 | MIT (OK) | Tipos de payload de webhook + parser + verificação `x-hub-signature-256`, sem dependências. npm `whatsapp-api-js` 6.3.0. Melhor candidato para tipos/assinatura. |
| https://github.com/froggy1014/meta-cloud-api | 37 | 2026-11-24 | MIT (OK) | SDK com 22 módulos (Messages, Flows, Calling, Payments), adapters de webhook para Fastify/Express/Hono/Next. npm 3.13.0. Muito novo e poucos stars: ler como referência, avaliar antes de depender. |
| https://github.com/great-detail/WhatsApp-JS-SDK | 42 | 2026-09-22 | MIT (OK) | SDK alternativo (Node/Deno/Bun). Referência secundária. |
| https://github.com/MarcosNicolau/whatsapp-business-sdk | 169 | 2026-02-15 | MIT (OK) | Conector TS. Menos ativo. Só referência. |
| https://github.com/gokapso/whatsapp-cloud-api-js | 222 | 2026-10-29 | **repo sem arquivo LICENSE** (API do GitHub retorna null; `package.json` diz MIT) | Cliente TS (`@kapso/whatsapp-cloud-api` 0.4.0). Ambíguo: não copiar código até haver LICENSE no repo. |
| https://github.com/gokapso/whatsapp-cloud-inbox | 814 | 2026-10-30 | MIT (OK) | Inbox estilo WhatsApp Web em Next.js para a Cloud API; referência de UI de conversa. |
| https://github.com/gokapso/flowso | 20 | 2026-10-29 | MIT (OK) | Emulador local de WhatsApp Flows (render, validar). Útil para desenvolver Flows sem enviar à Meta. |
| https://github.com/WhatsApp/WhatsApp-Nodejs-SDK | 274 | 2023-06-07 | NOASSERTION, **arquivado** | SDK oficial antigo, abandonado. Não usar; só histórico (o meta-cloud-api tem guia de migração dele). |
| https://github.com/fbsamples/whatsapp-business-jaspers-market | 748 | 2026-09-24 | Apache-2.0 (OK) | Sample oficial da Meta (bot Node, `app.js`, `services/`, `test/`). Referência de fluxo de webhook + idempotência por `wamid` (README recomenda dedup por id de mensagem). |
| https://github.com/fbsamples/whatsapp-api-examples | 299 | 2026-07-23 | "Other"/NOASSERTION (verificar texto da LICENSE antes de copiar) | Samples oficiais; pasta `signature-validation-with-webhooks-payloads` e `receive-webhook-js` servem de referência para HMAC. |
| https://github.com/fbsamples/WhatsApp-Business-API-Postman-Collection | 306 | 2022-03-29 | NOASSERTION | Coleção Postman oficial antiga (2022). Desatualizada; coleção atual no workspace público da Meta: não verificado. |
| https://github.com/WhiskeySockets/Baileys | 11.711 | 2026-11-22 | MIT | **Fora de escopo**: é WhatsApp Web não oficial (viola a decisão de usar só Cloud API). Listado apenas para você não adotar por engano. |

**Coexistence (verificado na doc da Meta, pt-BR, página "Onboarding de usuários do app Business")**: três webhooks:
- `smb_message_echoes`: mensagens que o cliente envia pelo app WhatsApp Business depois da integração.
- `smb_app_state_sync`: contatos novos e existentes do cliente.
- `history`: mensagens anteriores (sincronização de até 180 dias a partir da integração; a página também fala em "últimos seis meses").
- Mensagens enviadas/recebidas são espelhadas entre a Cloud API e o app.

Código de referência com esses campos: Chatwoot (abaixo); `melgarafael/DeskcommCRM` (`lib/channels/meta/webhook.ts`, `ingest.ts`; MIT); `saleszera/ruby-whatsapp` e `yvfl/api-whatsapp-docs` (docs e specs de `smb_app_state_sync`, licença não verificada); `pocha/whatsapp-coexistence` (2 stars, MIT, app mínimo de onboarding+handoff); `pedroherpeto/oauth-hub-zdg` (36 stars, **AGPL-3.0, NÃO**).

Embedded Signup / Tech Provider: não encontrei sample oficial da Meta mantido em `fbsamples` (os nomes que tentei retornam 404). Referências comunitárias: `Hub-Ventures/watahub` (5 stars, MIT, gateway Cloud API self-hosted com Embedded Signup), `euron-sde-team/euron-open-whatsapp-gateway` (1 star, MIT, multi-tenant), `belovedinla-lg/Meta-Tech-Provider` (1 star, MIT). Todos com pouca tração: usar só para ver o fluxo de `FB.login` + troca de `code` por token. O Chatwoot (`embedded_signup_service.rb`, `useWhatsappEmbeddedSignup.js`) é a referência mais sólida.

Fixtures de payload para teste: não achei repositório dedicado. Melhor fonte: specs do Chatwoot (`spec/jobs/webhooks/whatsapp_events_job_spec.rb`, `spec/services/whatsapp/incoming_message_whatsapp_cloud_service_spec.rb`, incluindo echoes) e `test/` do jaspers-market. Chatwoot tem licença MIT fora de `enterprise/` (CUIDADO: ver seção 2); specs ficam fora de `enterprise/`.

---

## 2. Inbox/CRM para estudar (não forkar)

| Projeto | Stars | Último commit | Licença | O que faz bem |
|---|---|---|---|---|
| https://github.com/chatwoot/chatwoot | 40.465 | 2026-11-24 (release v4.20.1 em 2026-11-20) | MIT + diretório `enterprise/` proprietário (SPDX "NOASSERTION"). Copiar código de fora de `enterprise/` é OK com aviso; Captain (IA) é enterprise: NÃO | Modelo de dados maduro (account, inbox, contact, contact_inbox, conversation, message). Estados `open/resolved/pending/snoozed`. Agent bot: `agent_bots` por inbox, recebe `message_created` etc. por webhook; conversa nasce `pending` e `bot_handoff!` passa para `open` e dispara evento. |
| https://github.com/matiasbattocchia/open-bsp-api | 660 | 2026-11-24 | Unlicense (domínio público, OK) | Plataforma WhatsApp/Instagram multi-tenant em Deno + Supabase (Postgres + RLS), agentes de IA, coexistence, MCP e plugin do Claude Code. Provavelmente a referência mais próxima em modelo de dados multi-tenant + IA. Stack diferente (Deno/Supabase), então estudar schema e migrations. |
| https://github.com/Hiberius/whatsapp-receptionist | 35 | 2026-11-03 | MIT (OK) | Produto quase idêntico: recepcionista IA no WhatsApp com Google Calendar, texto e áudio, escalonamento humano (status, e-mail ao operador com deep link, aviso ao cliente), guardrails de assuntos sensíveis, 22 tabelas com RLS, dinheiro em centavos inteiros, 544 testes + 56 E2E. Next.js + Supabase + Claude. Ler schema, fluxo de handoff e guardrails. **Atenção ao próprio aviso dele sobre RLS não exercitado.** |
| https://github.com/melgarafael/DeskcommCRM | 5.533 | 2026-11-24 | MIT (OK) | CRM com agentes IA em WhatsApp, em pt-BR, Next.js 16 + Supabase. Já trata `smb_app_state_sync`/echoes (`lib/channels/meta/`). Útil por ser em português e Brasil-específico (usa até migrations com termos BR). Qualidade do código: não verificado. |
| https://github.com/baptisteArno/typebot.io | 10.645 | 2026-11-07 | FSL-1.1-Apache-2.0 (CUIDADO, ver acima) | Construtor visual de fluxos; bom para ideias de estado de sessão de conversa e blocos. Só estudo. |
| https://github.com/papercups-io/papercups | 6.120 | 2024-02-15 | MIT (OK) | Inbox de chat em Elixir. Abandonado desde 2024. Só histórico de modelagem. |
| https://github.com/chaskiq/chaskiq | 3.583 | 2026-06-30 | NOASSERTION (arquivo LICENSE não lido; provável GPL-3.0: não verificado) | Chat/suporte/marketing em Rails. Não usar código. |
| https://github.com/vobase/vobase | 61 | 2026-08-05 | MIT (OK) | Framework TS (Bun, Hono, Drizzle, Postgres, Better Auth) feito para agentes de código. Mesma família de stack; ler estrutura. Maturidade baixa. |

### Chatwoot: coexistence, Embedded Signup e agent bot (verificado no código em 2026-11-24)

- **Embedded Signup: sim.** `app/services/whatsapp/embedded_signup_service.rb`, `channel_creation_service.rb`, `reauthorization_service.rb`, composable `useWhatsappEmbeddedSignup.js`, com feature flag.
- **Coexistence: sim, em parte.** O serviço aceita `is_coexistence`, chama `setup_webhooks(is_coexistence:)`, pula health check em signup coexistence.
- **`smb_message_echoes`: tratado.** `whatsapp_events_job.rb` detecta `field == 'smb_message_echoes'`, inverte `from`/`to` e cria a mensagem como `outgoing_echo` (mensagem enviada pelo app aparece no inbox).
- **`smb_app_state_sync` (contatos) e `history`: não implementados no código principal.** Busca por `smb_app_state_sync` no repo: 0 resultados. PR #12149 "WhatsApp coexistence app syncing" aberto desde 2025-08; PR #15713 "import business app chat history" aberto; #15695 "coexistence onboarding via QR" aberto. #14547 (mensagens indisponíveis de coexistence) já foi mergeado em 2026-05.
- **Problemas conhecidos abertos/recentes**: #12469 (sync de coexistence corrompe o app Business), #16680 (mensagem real redelivered com mesmo `wamid` após evento 131060 "unsupported" é descartada), duplicatas BR por 9º dígito (#13986, fechada), BSUID (#13837 fechada, #15530 fechada).
- **Agent bot API: sim.** Controller `agent_bots_controller.rb`, modelo `agent_bot.rb`, listener `agent_bot_listener.rb` (eventos de mensagem e status). Handoff: `Conversation#bot_handoff!` (pending -> open). Reusável como desenho: bot só fala enquanto a conversa está `pending`; humano assume e bot silencia.

Conclusão: Chatwoot cobre o caminho feliz de coexistence (onboarding + echoes) mas não a sincronização de contatos/histórico, que é justamente o que seu produto precisaria para "puxar" agenda de pacientes existentes. Referência de schema e de handoff; não substituto.

Newer TypeScript WhatsApp inbox com tração real: não encontrei. O mais próximo é `gokapso/whatsapp-cloud-inbox` (814 stars, só UI) e DeskcommCRM (Next.js).

---

## 3. Postgres RLS + Drizzle, Better Auth organizations, starters

| Repo | Stars | Último commit | Licença | Reusar |
|---|---|---|---|---|
| https://github.com/cellajs/cella | 458 | 2026-11-22 | MIT (OK) | `backend/src/db/tenant-transaction-opening.ts`: abre transação, `SELECT set_config('app.tenant_id', ..., true)` (local à transação) numa só ida ao banco, com validação do id contra alfabeto. Stack: Hono + Drizzle 1.0 RC + RLS. Melhor padrão encontrado para `withTenant(tx)`. |
| https://github.com/neondatabase/social-wall-drizzle-neon-rls | 5 | 2026-04-08 | MIT (OK) | Exemplo oficial Neon de Drizzle + RLS com `pgPolicy`/roles. Específico do Neon; usar só o lado do schema/policies. |
| https://github.com/rphlmr/drizzle-supabase-rls | 115 | 2024-10-30 | Apache-2.0 (OK) | Padrões de RLS + Drizzle (Supabase). Antigo; ler como ideia. |
| https://github.com/TowerTKL/multi-tenant-rls | 0 | 2026-10-15 | MIT | PoC Drizzle + RLS; baixa tração, só leitura. |
| https://github.com/rajanaggarwal11/pgrls-action | 0 | 2026-11-22 | MIT | GitHub Action que falha o build se tabela não tem RLS. Ideia de CI; maturidade baixa (copiar a ideia como query em `pg_class.relrowsecurity`). |
| https://github.com/vobase/vobase | 61 | 2026-08-05 | MIT | Hono + Drizzle + Better Auth + Postgres (ver seção 2). |
| https://github.com/brandhaug/b2b-saas-starter | 54 | 2026-11-24 | MIT | Workspaces, membership/permissões, billing, API tokens, webhooks, auditoria. Mas é Cloudflare D1/TanStack Start/Effect: só a modelagem de workspace/permissões é aproveitável. |
| https://github.com/nextjs/saas-starter | 16.264 | 2025-12-11 | MIT | Next.js + Postgres + Drizzle + Stripe. Stack web diferente, sem RLS. Pouco útil. |
| https://github.com/ixartz/SaaS-Boilerplate | 7.492 | 2026-11-01 | MIT | Next.js + Clerk/Drizzle. Fora do seu stack. |
| https://github.com/better-auth/better-auth | 30.857 | 2026-11-24 | MIT (OK) | Plugin `organization`; npm `better-auth` latest 1.7.27. Docs: https://better-auth.com/docs/llms.txt (índice) e MCP oficial https://mcp.better-auth.com/mcp. |
| https://github.com/better-auth/skills | 229 | 2026-10-19 | sem licença (API retorna null) | Skills oficiais do Better Auth para agentes; ler antes de instalar (licença ausente). |

Nenhum starter encontrado em Fastify + Drizzle + Better Auth + RLS no mesmo repo. Estrutura a copiar vem de peças: cella (RLS), vobase (stack), brandhaug (permissões).

Padrão de teste de RLS (síntese, não copiado de um repo): (a) role da aplicação sem `BYPASSRLS` e sem ser dono das tabelas (ou `FORCE ROW LEVEL SECURITY`); (b) teste que cria dois tenants, abre transação com `set_config('app.tenant_id', A, true)`, e confirma 0 linhas de B em SELECT/UPDATE/DELETE e erro em INSERT com `tenant_id` de B; (c) teste que SEM `set_config` retorna 0 linhas (policy com `current_setting('app.tenant_id', true)` nulo falha fechado); (d) query de CI que lista tabelas com coluna `tenant_id` sem `relrowsecurity`. Usar `set_config(..., true)` (local) com pool, nunca `SET` de sessão.

---

## 4. Agendamento

| Repo | Stars | Último commit | Licença | Reusar |
|---|---|---|---|---|
| https://github.com/calcom/cal.diy | 50.353 | 2026-11-13 | MIT (OK; confirmei o texto MIT em `LICENSE`; presença de diretórios `ee`: não verificado) | `packages/features/schedules/lib/slots.ts` (cálculo de slots) e integração Google Calendar em `packages/app-store`. Referência de intervalos, buffers, antecedência mínima, fusos. Código grande e acoplado: ler, não importar. |
| https://github.com/js-temporal/temporal-polyfill | 798 | 2026-09-22 | ISC (OK) | Polyfill Temporal (spec-compliant). |
| https://github.com/fullcalendar/temporal-polyfill | 790 | 2026-11-04 | sem LICENSE detectado (npm `temporal-polyfill` 1.0.8) | Polyfill leve; verificar licença no pacote npm antes de usar. |
| https://github.com/jkbrzt/rrule | 3.753 | 2026-11-23 | BSD-3-Clause (SPDX aparece como NOASSERTION; arquivo LICENSE não lido: não verificado) | Recorrência de horários de trabalho. |
| https://github.com/googleapis/google-api-nodejs-client | 12.292 | 2026-11-18 | Apache-2.0 (OK) | Cliente oficial: `events.list` (`syncToken`/`nextSyncToken`), `events.watch`, `channels.stop`. |
| https://github.com/PRESSXF/agenda-slots | 0 | 2026-11-13 | NOASSERTION | Slots com feriados BR. Sem tração; só ideia. |

Não encontrei exemplo bom e mantido de sync bidirecional Google Calendar com watch channels em Node (a busca por `nextSyncToken` só retorna conectores genéricos: `metorial/metorial` e `fivestones/family-organizer` (MIT) têm cliente com syncToken; qualidade não verificada). Padrão conhecido da doc do Google (não reverificado hoje): canal `watch` expira (renovar por job pg-boss agendado), notificação push não traz dados (só dispara `events.list` com `syncToken`), HTTP 410 invalida o token e exige full sync.

Exclusion constraint: a busca no GitHub só devolveu artigos (`alextanhongpin/database-design`, docs). Padrão a aplicar: extensão `btree_gist` + `EXCLUDE USING gist (tenant_id WITH =, professional_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&) WHERE (status <> 'cancelled')`. Drizzle não modela `EXCLUDE`; entra em migration SQL customizada. Não verificado em exemplo de repo.

---

## 5. pg-boss

- https://github.com/timgit/pg-boss, 4.160 stars, último commit 2026-11-23, MIT (OK). Versão `12.39.0`; Node >= 22.12.
- **Debounce/throttle**: documentação lista queue policies `standard`, `short` (1 job em `created`, ativos ilimitados), `singleton` (1 ativo), `stately` (1 por estado), `exclusive` (1 em fila ou ativo), todos estendíveis por `singletonKey`. `send()` pode retornar `null` ao usar jobs únicos/throttling. Para "juntar mensagens do paciente em rajada": `short` + `singletonKey = conversation_id` + `startAfter` curto, e o worker lê todas as mensagens pendentes. Nomes exatos das opções de throttle/debounce (`singletonSeconds` etc.): confirmar em `docs/api/jobs.md`; não verificado por mim.
- **Delayed jobs**: `startAfter` aceita segundos, string de duração ('1 hour'), ISO com fuso, ou Date (`docs/api/jobs.md`).
- **Cron**: cada ocorrência é um job (`docs/api/scheduling.md`).
- **Testes**: `TestClock` para controlar o tempo (`docs/api/testing.md`).
- **Dashboard oficial**: `@pg-boss/dashboard` 1.14.0 (visão geral, filas, jobs, ações de retry/cancel, múltiplos schemas, responsivo). Alternativas terceiras: `ludicroushq/pg-bossman` (28 stars, sem licença), `lpetrov/pg-boss-admin-dashboard` (12 stars, MIT). Preferir o oficial.
- Existe pacote `proxy` e adapters (`docs/proxy.md`, `docs/api/adapters.md`): relevante se quiser rodar workers sem conexão direta ao banco; não verificado em detalhe.

---

## 6. Qualidade do agente de IA

| Ferramenta | Stars | Último commit | Licença | Uso |
|---|---|---|---|---|
| https://github.com/promptfoo/promptfoo | 27.616 | 2026-11-24 | MIT (OK) | Evals em CI via YAML + red teaming/injection. npm 0.126.0. Melhor custo-benefício para CI. |
| https://github.com/getsentry/vitest-evals | 366 | 2026-11-07 | Apache-2.0 (OK) | Evals dentro do Vitest; harness para `ai-sdk`, relatório local. Encaixa no seu pipeline de testes. |
| https://github.com/langfuse/langfuse | 37.788 | 2026-11-24 | MIT exceto `ee/` (OK para uso do SDK/self-host sem ee) | Datasets + traces + scores; SDK `@langfuse/client` 6.1.1. Evalite recomenda Langfuse. |
| https://github.com/braintrustdata/autoevals | 1.087 | 2026-11-19 | MIT (OK) | Scorers prontos (factualidade, LLM-as-judge). |
| https://github.com/mattpocock/evalite | 1.738 | 2026-11-09 | MIT, **arquivado/deprecado** | Não usar. |
| https://github.com/sierra-research/tau2-bench | 2.509 | 2026-11-21 | MIT (OK) | Referência de design de simulador de usuário + ferramentas + política (τ-bench). Python; copiar o desenho (usuário LLM com cenário e objetivo), não o código. |
| https://github.com/NVIDIA-NeMo/Guardrails | 7.566 | 2026-11-19 | Apache-2.0 (OK) | Guardrails programáveis; Python, pesado para stack TS. Referência de conceito. |
| https://github.com/guardrails-ai/guardrails | 7.640 | 2026-11-18 | Apache-2.0 | Python. Em TS, validar saída com Zod + checagens determinísticas é suficiente. |
| https://github.com/NVIDIA/garak | 10.158 | 2026-11-23 | Apache-2.0 | Scanner de vulnerabilidades de LLM (probes de prompt injection), Python, rodar offline contra seu endpoint. |
| https://github.com/protectai/llm-guard | 3.223 | 2026-07-08 | MIT, **arquivado** | Não usar. |
| https://github.com/PerryLink/Prompt-Attack-Dataset | 3 | 2026-10-09 | Apache-2.0 | Suite pequena de prompts de ataque; baixa tração, conferir conteúdo. |

Simulador de paciente pronto em TS: não encontrei. Receita: Vercel AI SDK com um agente "paciente" (persona, objetivo, regras de fala em pt-BR, regionalismos, áudio transcrito com erros) conversando com seu agente em loop até resolver/falhar; score por promptfoo/vitest-evals sobre o estado final do banco (agendamento criado, handoff acionado), não sobre texto.

Datasets pt-BR de atendimento/agendamento: **não encontrei nada utilizável** (busca no GitHub e na API do Hugging Face por "portuguese customer service", "pt-br dialogue", "ptbr chatbot" retornou vazio; "brazilian portuguese conversation" só trouxe `SpeechDataAI/brazilian-portuguese-conversational-speech`, 56 downloads, licença "other", áudio). Plano: gerar dataset sintético próprio e curar com casos reais anonimizados.

---

## 7. Brasil

| Item | Repo | Stars | Último commit | Licença | Nota |
|---|---|---|---|---|---|
| Asaas SDK (comunitário) | https://github.com/davevilela/asaas-node-sdk | 5 | 2025-01-24 | MIT | TS, não oficial. |
| | https://github.com/gusnips/asaas | 3 | 2026-11-14 | MIT | TS, não oficial, mais recente. |
| | https://github.com/eduardobernardo/asaas (npm `asaas` 1.1.0) | 51 | 2025-03-29 | sem licença no GitHub (npm: ISC) | Mais usado; licença ambígua. |
| Asaas oficial Node | não encontrado (org `asaas` no GitHub só tem repos Java/Erlang) | - | - | - | Fazer cliente próprio; doc oficial em docs.asaas.com (não consultada hoje). |
| CPF/CNPJ | https://github.com/theuves/cpf | 61 | 2026-11-21 | MIT | Valida/formata/gera CPF e CNPJ, **numérico e alfanumérico** (CNPJ alfanumérico foi confirmado no README). |
| | https://github.com/brazilian-utils/javascript (`@brazilian-utils/brazilian-utils` 2.5.0) | 1.687 | 2026-11-04 | MIT | Utilitários BR amplos (CPF, CNPJ, CEP, telefone, moeda). Suporte a CNPJ alfanumérico: não verificado. |
| Feriados | https://github.com/joaopbini/feriados-brasil | 192 | 2026-11-12 | MIT | Dados de feriados nacionais/estaduais/municipais. |
| | https://github.com/commenthol/date-holidays (npm 3.39.2) | 1.123 | 2026-11-19 | ISC + dados CC-BY-SA-4.0 (CUIDADO) | Cobre BR por estado; atenção à licença dos dados. |
| | https://github.com/feriados-dev/feriados-dev-oss | 9 | 2026-10-10 | MIT | API self-hosted; baixa tração. |
| Datas em linguagem natural | https://github.com/wanasit/chrono (npm `chrono-node` 2.10.3) | 5.303 | 2026-11-03 | MIT (OK) | **pt tem suporte parcial** (README). "amanhã à tarde" e "sexta que vem" precisam de pós-processamento. Alternativa: deixar o LLM extrair data/período em JSON (Zod) e validar no código; chrono só como fallback/teste. |
| Pix (BR Code/EMV) | busca não feita a fundo | - | - | - | Com Asaas gerando o QR Pix, biblioteca local de Pix é desnecessária. Não verificado. |

---

## 8. Voz

| Item | Repo | Stars | Último commit | Licença | Nota |
|---|---|---|---|---|---|
| Groq SDK | https://github.com/groq/groq-typescript | 269 | 2026-10-12 | Apache-2.0 | Cliente oficial; `audio.transcriptions.create`. Página de STT da Groq confirma limite de arquivo 25 MB (free) / 100 MB (dev) e modelo `whisper-large-v3-turbo`. |
| ElevenLabs | https://github.com/elevenlabs/elevenlabs-js | 456 | 2026-11-23 | MIT | SDK oficial (TTS, clonagem de voz). |
| | https://github.com/elevenlabs/examples | 637 | 2026-11-04 | MIT | Exemplos oficiais. |
| ffmpeg | https://github.com/fluent-ffmpeg/node-fluent-ffmpeg | 8.227 | 2025-05-22 | MIT, **arquivado** | Evitar; usar `spawn('ffmpeg')`. |

Fatos que não confirmei nesta sessão (marcar como não verificado): (a) áudio de voz recebido do WhatsApp vem como `audio/ogg; codecs=opus` e o Groq aceita `ogg` direto (provável, conferir lista de formatos na doc); (b) para enviar voice note (PTT) a Cloud API exige `audio/ogg` com codec Opus, mono; comando típico `ffmpeg -i in.mp3 -c:a libopus -b:a 32k -ac 1 -ar 48000 out.ogg`. Conferir na doc de mídia da Meta (a página que tentei buscar retornou conteúdo dinâmico sem o trecho). Nenhum repositório de referência específico "WhatsApp ogg/opus + Whisper em Node" com tração foi encontrado (resultados com 1-10 stars, ex.: `formeo/voice-to-text`, MIT, 7 stars, Telegram/WhatsApp com Whisper).

Atenção de produto (não é repo): clonagem de voz de profissional de saúde exige consentimento documentado e aviso de que é voz sintética; verificar política da Meta e LGPD (não verificado aqui; ver `01-meta-whatsapp-compliance.md`).

---

## 9. Dashboard

| Repo | Stars | Último commit | Licença | Reusar |
|---|---|---|---|---|
| https://github.com/shadcn-ui/ui | 128.923 | 2026-11-23 | MIT | Base de componentes; tem MCP e CLI oficiais. |
| https://github.com/Blazity/shadcn-chatbot-kit | 806 | 2026-02-26 | MIT | Componentes de chat sobre shadcn (mais para chat com IA que inbox). |
| https://github.com/kokonut-labs/kokonutui | 2.412 | 2026-11-21 | MIT | 100+ componentes de chat/agentes IA. |
| https://github.com/jakobhoeg/shadcn-chat | 1.620 | 2025-08-12 | MIT | Componentes de chat instaláveis por CLI. Parado desde 08/2025. |
| https://github.com/chatscope/chat-ui-kit-react | 1.788 | 2025-05-15 | MIT | Kit clássico de conversa (lista de conversas, mensagens). Parado desde 05/2025; visual datado, mobile razoável. |
| https://github.com/gokapso/whatsapp-cloud-inbox | 814 | 2026-10-30 | MIT | UI de inbox estilo WhatsApp (Next.js): copiar layout/estrutura. |
| https://github.com/schedule-x/schedule-x | 2.613 | 2026-11-23 | MIT (verificar se há módulos premium: não verificado) | Calendário moderno, leve. Candidato para agenda. |
| https://github.com/fullcalendar/fullcalendar | 20.791 | 2026-11-12 | MIT (pacotes "premium"/scheduler têm licença paga: CUIDADO) | Calendário completo. |
| https://github.com/lramos33/big-calendar | 1.073 | 2026-08-11 | MIT | Calendário em shadcn/Tailwind; boa base visual. |
| https://github.com/vite-pwa/vite-plugin-pwa | 4.312 | 2026-10-09 | MIT | PWA no Vite (service worker, manifest, injectManifest para push). |
| https://github.com/web-push-libs/web-push | 3.579 | 2026-11-23 | MPL-2.0 (SPDX NOASSERTION; confirmar) | Web Push com VAPID no Node. Atenção: iOS só recebe push em PWA instalado na tela inicial. |
| https://github.com/fastify/sse | 29 | 2026-11-20 | MIT (organização oficial Fastify) | SSE para Fastify. Alternativa: https://github.com/mpetrunic/fastify-sse-v2 (119 stars, 2026-10-28, MIT). |

Inbox mobile polido pronto: não encontrei kit de inbox (lista + thread) de qualidade mobile e licença permissiva além do `whatsapp-cloud-inbox`. Provável caminho: shadcn + componentes próprios.

---

## 10. Postgres autohospedado: backup e operação

| Repo | Stars | Último commit | Licença | Nota |
|---|---|---|---|---|
| https://github.com/pgbackrest/pgbackrest | 4.509 | 2026-11-23 | MIT (SPDX aparece NOASSERTION; arquivo não lido: não verificado) | Backup/PITR; suporta repositório S3-compatível (`repo1-type=s3`, endpoint e `repo1-s3-uri-style=path` para R2). Config exata com R2 não verificada por mim. |
| https://github.com/wal-g/wal-g | 4.348 | 2026-11-24 | Apache-2.0/MIT-style (NOASSERTION; não verificado) | `WALG_S3_PREFIX` + `AWS_ENDPOINT` para R2 (padrão S3-compatível; não testado). |
| https://github.com/woblerr/docker-pgbackrest | 112 | 2026-11-19 | MIT | pgBackRest em container. |
| https://github.com/vitabaks/pgbackrest_auto | 74 | 2023-11-30 | MIT | "Restore automático e validação": referência para script de restore-test (antigo). |
| https://github.com/ethos-link/postgres-backrest | 2 | 2026-10-27 | MIT | Imagem Postgres com pgBackRest embutido; pouca tração. |
| https://github.com/cloudnative-pg/cloudnative-pg | 9.656 | 2026-11-24 | Apache-2.0 | Operator Kubernetes; backup via Barman Cloud para S3/R2. Exige Kubernetes. |
| https://github.com/pgsty/pigsty | 5.972 | 2026-11-12 | Apache-2.0 | Distribuição Postgres completa (HA, PITR, monitoramento) para VMs; pesada para uma instância. |
| https://github.com/autobase-tech/autobase | 4.450 | 2026-11-24 | MIT | DBaaS auto-hospedado (Patroni). Para HA multi-nó. |
| https://github.com/supabase/supabase | 115.328 | 2026-11-24 | Apache-2.0 | Self-hosted do Supabase é uma pilha grande (Kong, GoTrue, etc.); excessivo se você só quer Postgres. |
| https://github.com/fly-apps/postgres-ha | 332 | 2023-05-19 | Apache-2.0 | Fly Postgres (Stolon), sem commits desde 2023; a própria Fly o chama de não gerenciado. Fly MPG (Managed Postgres): preço e PITR atuais não verificados. |

Não encontrei repo mantido com "pgBackRest + Cloudflare R2 + PITR + restore-test" pronto; os resultados do GitHub são de baixa tração. Recomendação de decisão (opinião, sem validação empírica minha): para uma única instância pequena, Postgres em VM/volume + pgBackRest (ou WAL-G) para R2 + job semanal de restore em instância descartável é o suficiente e o mais simples. CloudNativePG, Pigsty e Supabase self-hosted trazem mais peças do que a escala atual justifica; só vale se você já opera Kubernetes. Comparar o custo de um Postgres gerenciado (Fly MPG, Neon, Supabase) contra o tempo de operação: preços atuais não verificados.

---

## 11. Ferramentas Claude Code (MCP / skills)

| Item | URL | Oficial? | Licença/obs |
|---|---|---|---|
| Better Auth docs MCP | https://mcp.better-auth.com/mcp (anunciado em https://better-auth.com/llms.txt) | Sim (Better Auth) | Verificado no `llms.txt`. |
| Better Auth skills | https://github.com/better-auth/skills | Sim | 229 stars, sem licença no repo. |
| Playwright MCP | https://github.com/microsoft/playwright-mcp | Sim (Microsoft) | 40.085 stars, Apache-2.0, 2026-11-18. |
| Context7 | https://github.com/upstash/context7 | Sim (Upstash) | 65.367 stars, MIT. Você já usa. |
| Supabase MCP | https://github.com/supabase/mcp (antes supabase-community) | Sim (Supabase) | 3.025 stars, Apache-2.0. Só útil se usar Supabase; para Postgres puro, MCP genérico de Postgres: não pesquisado. |
| Stripe MCP/toolkit | https://github.com/stripe/ai | Sim | Fora de escopo (você usa Asaas). |
| shadcn MCP | oficial dentro do CLI do shadcn (`shadcn mcp`) segundo a doc do projeto: não verificado hoje. Comunitário: https://github.com/Jpisnice/shadcn-ui-mcp-server (3.104 stars, MIT, 2026-10-03) | Oficial: não verificado. Comunitário: não. | |
| Drizzle MCP | não encontrei MCP oficial mantido | - | Drizzle tem docs LLM-friendly; não verificado. |
| WhatsApp (Meta) Business MCP | não encontrei MCP oficial da Meta | - | Não verificado. Comunitários: `lharries/whatsapp-mcp` (6.944 stars, MIT, 2025-07-13) usa WhatsApp Web não oficial: NÃO combina com sua decisão. `lucianumm/whatsApp-meta-onboarding-mcp-server` (2 stars, MIT) "ensina o caminho de onboarding na API oficial". |
| OpenBSP plugin para Claude Code | https://github.com/matiasbattocchia/open-bsp-api (`claude plugin install openbsp --marketplace matiasbattocchia/open-bsp-api`) | Não (comunitário) | Unlicense; só útil se adotar OpenBSP. |
| PostHog / Sentry / Cloudflare MCP | já listados no seu ambiente | Sim | Sentry MCP útil para erros em produção. |

---

## Itens "não verificado"

- Estado atual do BSUID/usernames na Cloud API (só vi issues do Chatwoot, não a doc da Meta).
- Licença real de: Chaskiq, rrule, fullcalendar/temporal-polyfill, pgBackRest, WAL-G, web-push (SPDX retornou NOASSERTION ou nulo), `fbsamples/whatsapp-api-examples` (texto "Other"), gokapso/whatsapp-cloud-api-js (sem LICENSE no repo).
- Postman collection atual da Meta (só achei a de 2022); sample oficial de Embedded Signup/Tech Provider (não achei no `fbsamples`).
- Sample oficial de WhatsApp Flows da Meta (só comunitários).
- Nomes exatos das opções de debounce/throttle do pg-boss.
- Exemplo mantido de Google Calendar sync com watch channel + syncToken; exemplo de exclusion constraint em repo (só artigos).
- Datasets pt-BR de atendimento/agendamento (nenhum encontrado); simulador de paciente em TS.
- Formatos de áudio aceitos pelo Groq e parâmetros ffmpeg/Meta para voice note (conhecimento prévio, não conferido hoje).
- Configuração R2 de pgBackRest/WAL-G, restore-test pronto, preço/PITR do Fly MPG.
- Suporte a CNPJ alfanumérico em `@brazilian-utils` e a necessidade de biblioteca Pix local.
- Qualidade interna do DeskcommCRM, do meta-cloud-api (poucos stars) e do cella além do arquivo lido.
- Existência de MCP oficial para shadcn (CLI), Drizzle, Meta Business.
- Se há módulos pagos em schedule-x e se cal.diy contém diretório `ee`.
- Doc oficial do Asaas (endpoints/webhooks) não consultada.
