# 03 - Banco, infra, pagamentos, auth e observabilidade

Data da pesquisa: 2026-11-24. Valores em USD salvo indicação. Convenção: cada fato traz a URL da fonte oficial; o que não consegui confirmar em fonte oficial nesta sessão está marcado **não verificado**. Fatos de PostgreSQL "de manual" citam o manual oficial.

## 0. Premissas de dimensionamento (minhas, não fatos)

| Premissa | Valor |
|---|---|
| Conversas/mês por tenant (média) | 600 (faixa do enunciado: 300-3.000) |
| Mensagens por conversa | 10 -> 6.000 msgs/tenant/mês |
| Bytes por mensagem (linha + índices, payload cru expira em 30 dias ou vai para R2) | 2 KB -> 12 MB/tenant/mês |
| Retenção contada no custo | 12 meses acumulados -> 144 MB/tenant |
| Mídia | 10% das msgs, 150 KB -> 1,08 GB/tenant em 12 meses (R2) |
| RAG | ~200 chunks/tenant, 7 KB cada -> ~1,5 MB/tenant (irrelevante) |
| Disco provisionado | dados x 1,25 |

Resultado: dados Postgres em 12 meses = 14,4 GB (100 tenants), 43,2 GB (300), 144 GB (1.000), 432 GB (3.000). Mídia em R2 = 108 / 324 / 1.080 / 3.240 GB. Carga de pico: 3.000 tenants = 18M msgs/mês, ~7 msg/s médio; pico 10x ainda é pequeno para Node.

## 1. Banco: Supabase vs Neon vs Firestore

### 1.1 Preços (páginas oficiais, 2026-11)

**Supabase** (https://supabase.com/pricing)
- Pro US$25/mês, inclui US$10 de crédito de compute (cobre 1 Micro). Disco 8 GB por projeto, depois US$0,125/GB. Egress 250 GB, depois US$0,09/GB. Storage de arquivos 100 GB, depois US$0,0213/GB. Backups diários 7 dias. MAU Auth 100k, depois US$0,00325.
- Compute: Micro US$10 (1 GB, 60 conexões diretas, 200 no pooler), Small US$15 (2 GB, 90/400), Medium US$60 (4 GB, 120/600), Large US$110 (2 vCPU dedicadas, 8 GB, 160/800), XL US$210 (4 vCPU, 16 GB, 240/1.000), 2XL US$410 (8 vCPU, 32 GB, 380/1.500).
- PITR: a partir de US$100/mês por 7 dias de retenção. Branching: US$0,01344 por branch-hora. Team US$599/mês (SOC2 + ISO 27001, HIPAA como add-on pago, SSO).
- Região São Paulo `sa-east-1`: disponível, https://supabase.com/docs/guides/platform/regions

**Neon** (agora parte de "Lakebase", https://neon.com/pricing)
- Launch: US$0,106 por CU-hora, US$0,35/GB-mês de storage, branch US$0,002/branch-hora, histórico para instant restore US$0,20/GB-mês (sobre volume de mudanças na janela). Scale: US$0,222/CU-hora. 1 CU ~ 4 GB RAM. Egress 500 GB por projeto, depois US$0,10/GB. Pooler PgBouncer até 10.000 conexões. HIPAA só no Scale. SOC 2 auditado, ISO 27001/27701. Mínimo mensal do Launch: **não verificado** (a página mostra "gasto típico US$15").
- São Paulo `aws-sa-east-1`: disponível, https://neon.com/docs/introduction/regions
- Scale-to-zero após 5 min ocioso; retorno "tipicamente algumas centenas de ms" (https://neon.com/pricing, FAQ). Pagantes podem desligar. Documentação: https://neon.com/docs/introduction/scale-to-zero
- Object Storage Neon US$0,023/GB-mês, sem cobrança por operação (mesma página de preços).

**Firestore** (https://cloud.google.com/firestore/pricing, https://firebase.google.com/pricing)
- São Paulo (`southamerica-east1`) listada como região. Cota grátis: 1 GiB, 50k leituras/dia, 20k escritas/dia, 20k deletes/dia. Preço por 100k documentos na tabela estática: leituras US$0,03, escritas US$0,09, deletes US$0,01 (colunas por região não ficaram legíveis; **preço específico de São Paulo: não verificado**, tende a ser maior que o de EUA).
- Estimativa de ordem de grandeza (3.000 tenants): 18M msgs x ~3 escritas = 54M x US$0,09/100k = ~US$49; leituras de contexto 18M x 20 = 360M x US$0,03/100k = ~US$108; mais listeners do inbox. Ou seja ~US$200-400 só em operações, sem região SP confirmada.

### 1.2 Custo comparado por escala (só banco, sem realtime/auth/storage)

| Tenants | Dados / disco | Supabase (Pro + compute + disco) | Neon Launch (compute 24/7 + storage) |
|---|---|---|---|
| 100 | 14,4 / 18 GB | 25 + 15 (Small) - 10 crédito + (18-8)x0,125 = **US$31,25** | 0,5 CU x 730 h x 0,106 + 14,4 x 0,35 = **US$43,7** |
| 300 | 43,2 / 54 GB | 25 + 60 (Medium) - 10 + 46x0,125 = **US$80,75** | 1 CU: 77,4 + 15,1 = **US$92,5** |
| 1.000 | 144 / 180 GB | 25 + 110 (Large) - 10 + 172x0,125 = **US$146,5** | 2 CU: 154,8 + 50,4 = **US$205,2** |
| 3.000 | 432 / 540 GB | 25 + 210 (XL) - 10 + 532x0,125 = **US$291,5** | 4 CU: 309,5 + 151,2 = **US$460,7** |

Notas: Neon assume compute sem scale-to-zero (webhooks 24/7 impedem pausa) e média de CU estimada por mim. Supabase vira mais barato com volume por causa do disco a US$0,125/GB contra US$0,35/GB. PITR Supabase +US$100 fixo em todas as escalas; Neon cobra histórico por GB de mudanças (custo proporcional, mais barato em escala baixa). Branch de Neon custa US$0,002/h.

### 1.3 Transações, locks e booking sem double-booking

Tudo isso é Postgres puro, portanto vale igual em Supabase e Neon (e RDS etc.).
- Exclusion constraint com range: `EXCLUDE USING gist (c WITH &&)` documentado em https://www.postgresql.org/docs/current/ddl-constraints.html. Para booking: `EXCLUDE USING gist (tenant_id WITH =, professional_id WITH =, tstzrange(start_at, end_at) WITH &&) WHERE (status <> 'cancelled')`, exige `CREATE EXTENSION btree_gist` (extensão padrão do contrib; **disponibilidade em cada provedor não verificada nesta sessão**, ambos listam extensões amplas).
- `SELECT ... FOR UPDATE` e advisory locks funcionam em conexão direta e em sessão. Em pooler transaction mode, só `pg_advisory_xact_lock` (de transação) é seguro; locks de sessão vazam entre clientes (semântica de pooler; a página https://supabase.com/docs/guides/database/connecting-to-postgres diz que transaction mode não suporta prepared statements e outros recursos de estado de sessão).
- Recomendação: a constraint de exclusão é a fonte de verdade; o app só trata o erro SQLSTATE `23P01` e devolve outros horários. Lock/advisory serve para serializar o fluxo "checar Google Calendar + inserir".
- **Firestore**: não tem constraint de unicidade/overlap sobre intervalos. A saída é documentos de slot com ID determinístico (`prof_20261124T1400`) dentro de transação; funciona para slots fixos, quebra com durações variáveis e overlaps parciais. Transações do Firestore: limites exatos **não verificados**.

### 1.4 RLS com pooling

- RLS: dono da tabela, superuser e roles com BYPASSRLS ignoram as policies (https://www.postgresql.org/docs/current/ddl-rowsecurity.html). A role `postgres` do Supabase bypassa. Crie uma role de aplicação sem BYPASSRLS e use `FORCE ROW LEVEL SECURITY`. A role `service_role` do Supabase "bypassa RLS, mantenha server-side" (https://supabase.com/docs/guides/database/postgres/row-level-security).
- Padrão correto com pooler transaction mode: abrir transação, `SELECT set_config('app.tenant_id', $1, true)` (equivale a `SET LOCAL`), rodar queries, commit. O Prisma 8 documenta exatamente esse padrão (`set_config(..., true)` e "o setting dura a transação") em https://www.prisma.io/docs/orm/contract-authoring/advanced-postgresql. `SET` de sessão em transaction mode vaza entre clientes: **nunca use**.
- Toda query de request tem que passar por um wrapper `withTenant(tenantId, fn)`. Jobs e webhooks idem. Conexão de migração separada (owner).
- Supabase: pooler compartilhado é IPv4-only; conexão direta é IPv6 ou exige add-on IPv4 (https://supabase.com/docs/guides/database/connecting-to-postgres). Fly.io alcança IPv6 (**não verificado nesta sessão**); alternativa é o pooler em session mode (suporta prepared statements e advisory locks de sessão).
- Neon: PgBouncer, até 10.000 clientes (https://neon.com/docs/connect/connection-pooling).

### 1.5 Outras dimensões

| Item | Supabase | Neon | Firestore |
|---|---|---|---|
| pgvector | sim, https://supabase.com/docs/guides/database/extensions/pgvector (cuidado: filtro por tenant + índice HNSW/IVFFlat pode devolver menos linhas que o `LIMIT`; filtre com índice parcial ou particione) | sim ("pgvector e muitas outras", https://neon.com/pricing) | busca vetorial existe como recurso do produto; **não verificado** |
| Realtime | Realtime: Pro 500 conexões simultâneas (10.000 sem spend cap), 500 msgs/s, https://supabase.com/docs/guides/realtime/limits | não tem; use SSE/WebSocket no Fastify + LISTEN/NOTIFY | listeners nativos |
| Storage/uploads | 100 GB incluídos, URLs assinadas | Object Storage US$0,023/GB | Cloud Storage separado |
| Backup/PITR | diário 7 dias no Pro; PITR US$100/mês, https://supabase.com/docs/guides/platform/backups | instant restore por janela configurável, https://neon.com/docs/introduction/branch-restore | export gerenciado, **não verificado** |
| Branching | US$0,01344/h por branch | US$0,002/h, copy-on-write | não |
| Conexões | pooler Supavisor, 200-1.500 por tamanho | 10.000 via PgBouncer | n/a |
| Cold start | projeto Pro nunca pausa (tabela de preços) | scale-to-zero, centenas de ms | n/a |
| Compliance | SOC 2 Type 2, HIPAA add-on com BAA só no Team (https://supabase.com/docs/guides/security/soc-2-compliance). **DPA para LGPD: não verificado** | SOC 2, ISO 27001/27701, HIPAA no Scale (https://neon.com/pricing). **DPA: não verificado** | Google Cloud: DPA padrão, **não verificado** |
| Lock-in | baixo no banco (Postgres puro) se evitar Auth/Realtime/Edge Functions proprietários | baixo | alto (modelo de dados e queries proprietários) |

HIPAA não se aplica ao Brasil; o que importa é LGPD (dados de saúde = dado pessoal sensível). BAA/HIPAA aqui só ilustra o nível de controle contratual disponível. Região SP ajuda a manter dados no país, mas LGPD permite transferência internacional com base legal; consulta jurídica fora do escopo.

### 1.6 Alternativas Postgres gerenciado

- AWS RDS sa-east-1: preço **não verificado** (página dinâmica). Maior controle, sem realtime/auth, VPC com ECS.
- Fly.io Managed Postgres: a partir de US$4/mês (Developer), até US$1.922 (Performance); storage US$0,28/GB-mês nos demais planos; região GRU tem markup 1,615x nos Machines (https://fly.io/docs/about/pricing/, https://fly.io/docs/reference/regions/). Preço da Managed Postgres em GRU: **não verificado**.
- Railway: Pro US$20/mês, RAM US$10/GB-mês (https://docs.railway.com/reference/pricing/plans). Região São Paulo **não encontrada** na página de regiões (https://docs.railway.com/reference/deployment-regions).
- Render: Postgres a partir de US$6/mês (256 MB) a centenas; disco US$0,30/GB (https://render.com/pricing). Região São Paulo **não encontrada** (https://render.com/docs/regions).
- PlanetScale Postgres: single node a partir de US$5/mês, Metal a partir de US$50 (https://planetscale.com/pricing). Região SP: **não verificado**.
- Crunchy Bridge: **não verificado**.

### 1.7 Por que Firestore não encaixa

Contra: sem constraint de overlap (booking correto vira gambiarra de slots), sem RLS multi-tenant em SQL (regras de segurança valem só para SDK de cliente; Admin SDK ignora), RAG exigiria outro serviço ou vetor próprio, relatórios/analytics ruins, cobrança por leitura pune "carregar histórico da conversa para o LLM" (20 leituras por resposta), lock-in alto. A favor: listeners realtime nativos, zero ops, free tier generoso (1 GiB, 50k leituras/dia).
Veredicto: não use. O domínio é relacional e o requisito "sem double-booking" pede constraint de banco.

### 1.8 Recomendação (camada de banco)

Supabase Pro em `sa-east-1`, usando só Postgres + Storage opcional + Realtime Broadcast para o inbox; Auth fica fora (Better Auth). Motivos: disco barato, SP, pgvector, PITR, pooler, escala até 3.000 tenants em um XL. Neon é alternativa válida se você priorizar branching por PR e custo menor em escalas baixas (mas storage 2,8x mais caro por GB). Mantenha SQL puro/migrations versionadas para portar.

## 2. Prisma vs Drizzle (versões em 2026-11-24)

- npm `prisma`: dist-tag `latest` = 8.0.0-rc.35 (publicada 2026-11-23); última versão estável sem sufixo = 7.10.1 (2026-10-15). As docs já usam Prisma ORM 8 como padrão ("Prisma ORM 8 is here"), 7 fica em /orm/v7 (https://www.prisma.io/docs). Se 8 já é GA: **não verificado** (tag `latest` ainda é rc).
- npm `drizzle-orm`: `latest` = 0.45.4 (2026-10-08); v1.0 em `rc` = 1.0.0-rc.6 (2026-11-20). Docs de RLS já descrevem "In v1, .enableRLS() is deprecated; use pgTable.withRLS(...)" (https://orm.drizzle.team/docs/rls). Upgrade para v1: https://orm.drizzle.team/docs/upgrade-v1.

| Tema | Prisma 8 / 7 | Drizzle 0.45 / 1.0-rc |
|---|---|---|
| Arquitetura | Prisma 7 removeu o engine Rust (`prisma-client` Rust-free, driver adapters obrigatórios, `prisma.config.ts`); Prisma 8 introduz "contract" (PSL ou TypeScript) e API nova `db.transaction(...)` (https://www.prisma.io/docs/orm/more/upgrade-guides/upgrading-versions/upgrading-to-prisma-7, https://www.prisma.io/docs/orm/prisma-client/queries/transactions) | TypeScript puro, schema em TS, SQL-like |
| Migrations | Prisma Migrate; migrations editáveis (https://www.prisma.io/docs/orm/migrations/editing-a-migration) | drizzle-kit generate/migrate/push |
| Transações | interativas, com isolationLevel e timeout (`IsolationLevel.Serializable`, `transactionOptions`) | `db.transaction` com `isolationLevel` e savepoints aninhados (https://orm.drizzle.team/docs/transactions) |
| RLS | `@@rls` e `policy_select/update/...` no contract, role `app_user`, `set_config(...,true)` por transação (https://www.prisma.io/docs/orm/contract-authoring/advanced-postgresql). Para Prisma 7: a página de extensão RLS antiga retorna 404, padrão via `$extends`: **não verificado** | `pgPolicy`, `pgRole`, `.withRLS()`, `crudPolicy`; funciona com Neon e Supabase (https://orm.drizzle.team/docs/rls) |
| Exclusion constraint / tstzrange | não há sintaxe de exclusão no contract (docs listam RLS, índices parciais/expressão, check); usar migration SQL manual | `check()` existe (https://orm.drizzle.team/docs/indexes-constraints); sem `exclude` nas docs; usar migration SQL custom |
| SQL cru | `db.raw.sql` tipado (Prisma 8) | `sql\`...\`` template, ergonomia melhor |
| Edge/serverless | Rust-free + driver adapters melhoram bundle e cold start (texto do guia v7) | leve, drivers neon-http/postgres-js/Hyperdrive |
| Maturidade | muito alta, mas Prisma 7 -> 8 é migração dupla recente | 0.x por anos, v1.0 ainda rc (mudanças de relations v2, migrations) |

Armadilhas: Prisma com pooler transaction mode precisa desligar prepared statements; o adapter `pg` não tem timeout de conexão por padrão (aviso no guia v7); Drizzle com `postgres-js` precisa `prepare: false`.
**Recomendação**: Drizzle (0.45.4 estável, plano de migrar para 1.0 quando sair do rc), porque o projeto é SQL-pesado (exclusion constraint, RLS, advisory locks, tstzrange) e Drizzle não esconde o SQL. Constraint de exclusão e policies vão em arquivo SQL versionado de qualquer forma. Se preferir DX de schema, Prisma 8 também cobre RLS nativo, mas está em rc.

## 3. Runtime: Workers vs containers

### 3.1 Fastify + BullMQ em Cloudflare Workers?

- Workers tem 128 MB por isolate, subrequests 50/request (Free) e 10.000/request (Paid), CPU até 5 min (padrão 30 s) (https://developers.cloudflare.com/workers/platform/limits/, https://developers.cloudflare.com/workers/platform/pricing/). Node compat parcial: https://developers.cloudflare.com/workers/runtime-apis/nodejs/.
- BullMQ precisa de conexão TCP persistente a Redis e workers de longa duração com polling/blocking commands (https://docs.bullmq.io/). Isso **não cabe** em Workers (isolates efêmeros). Fastify roda com adaptação, mas não é o encaixe natural (Hono é).
- Conclusão: BullMQ não roda em Workers. Em Workers, o equivalente é Queues + Durable Objects + Workflows.

### 3.2 Opção (a): Workers + Queues + DO + Workflows + Hyperdrive

- Queues: US$0,40/milhão de operações (1M incluída), 3 ops por mensagem (escrita, leitura, deleção); retenção 4 dias padrão, até 14; **delaySeconds máximo 24 h**; 5.000 msgs/s por fila (https://developers.cloudflare.com/queues/platform/pricing/, https://developers.cloudflare.com/queues/platform/limits/). Reminders de 48h exigem reagendar em cadeia ou usar DO/Workflow.
- Durable Objects: 1 alarme por objeto, execução at-least-once com retry (https://developers.cloudflare.com/durable-objects/api/alarms/). Ótimo para debounce por conversa (um DO por conversa, `setAlarm` a cada mensagem). Preço: 1M requests grátis + US$0,15/M; 400.000 GB-s grátis + US$12,50/M GB-s (https://developers.cloudflare.com/durable-objects/platform/pricing/).
- Workflows: incluído nos planos Workers; cobrança de steps/armazenamento a partir de 2026-08-10, retenção de estado 7 dias no Paid (https://developers.cloudflare.com/workflows/reference/pricing/). Bom para fluxos "lembrete D-1, confirmação, follow-up".
- Hyperdrive: incluído nos planos Free e Paid (https://developers.cloudflare.com/hyperdrive/platform/pricing/). Pooling e cache; Smart Placement posiciona o Worker perto do banco (https://developers.cloudflare.com/workers/configuration/placement/). Região mais próxima de SP para placement: `aws:sa-east-1` **não verificado**.
- Workers Paid: US$5/mês mínimo, 10M requests incluídas + US$0,30/M, 30M ms de CPU + US$0,02/M ms (https://developers.cloudflare.com/workers/platform/pricing/).
- Estimativa 3.000 tenants (18M msgs/mês, ~46M requests incluindo dashboard): base 5 + requests (46-10) x 0,30 = 10,8 + CPU (46M x 7 ms = 322M - 30M) x 0,02/M = 5,8 + Queues (18M x 3 - 1M) x 0,40/M = 21,2 + DO (36M - 1M) x 0,15/M = 5,3 = **~US$48/mês** de compute (sem banco). Valores de CPU por request e nº de requests são premissas minhas.
- Contras: reescrever tudo em API Workers/DO; Postgres via Hyperdrive; debug distribuído; wrangler dev local OK mas DO/Queues locais têm diferenças (**não verificado**); latência Brasil: Cloudflare tem POPs no Brasil (**não verificado**), mas o banco fica em SP, então Smart Placement é obrigatório para evitar RTT US<->SP em cada query.

### 3.3 Opção (b): containers + Redis + BullMQ

- Fly.io (https://fly.io/docs/about/pricing/): shared-cpu-1x 256 MB US$2,19/mês; 1 GB US$6,70; shared-2x 2 GB US$13,39; performance-1x 2 GB US$33; performance-2x 4 GB US$66. Região GRU (São Paulo) tem markup **1,615** (https://fly.io/docs/about/pricing/, seletor de região). Egress América do Sul US$0,04/GB. IPv4 dedicado US$2.
  - GRU: 6,70 x 1,615 = US$10,82 (sh1x 1 GB); 13,39 x 1,615 = US$21,63 (sh2x 2 GB); 33 x 1,615 = US$53,31 (perf-1x 2 GB).
- Railway: Hobby US$5, Pro US$20 + uso (RAM US$10/GB-mês); sem SP confirmado. Render: Starter US$7, Standard US$25 (https://render.com/pricing); sem SP confirmado.
- AWS ECS/Fargate sa-east-1: preço por vCPU/GB-hora **não verificado** (página dinâmica, https://aws.amazon.com/fargate/pricing/). Em geral mais caro que Fly e com mais ops (VPC, ALB, ECR).
- Cloudflare Containers: cobrado por 10 ms ativos: vCPU US$0,000020/s, memória US$0,0000025/GiB-s, disco US$0,00000007/GB-s; no plano Paid inclui 375 vCPU-min, 25 GiB-h, 200 GB-h (https://developers.cloudflare.com/containers/pricing/). Instâncias lite a standard-3 (8 GiB) (https://developers.cloudflare.com/containers/platform-details/limits/). Latência para Brasil e região SP dos containers: **não verificado**.
- Operação: 2 process groups (api, worker), health checks, deploy rolling. Dev local: docker compose com Postgres + Redis, sem emulação especial.

### 3.4 Redis gerenciado

- Upstash (https://upstash.com/pricing/redis): Pay-as-you-go US$0,20/100k comandos, storage US$0,25/GB após 1 GB grátis; Fixed a partir de US$10/mês (250 MB); Free 256 MB/500k comandos/mês. BullMQ gera muitos comandos de polling: use plano Fixed. Preço dos Fixed 1 GB+: **não verificado**. Região SP: **não verificado**.
- Redis Cloud (https://redis.io/pricing/): Free 30 MB; Essentials a partir de US$5/mês (250 MB); Pro a partir de US$200/mês mínimo. Região SP: **não verificado**.
- Valkey/ElastiCache sa-east-1: preço **não verificado**.
- Alternativa autogerenciada: Redis em um Machine Fly (sh1x ~US$10,8 + volume US$0,15/GB).

### 3.5 pg-boss: dá para largar o Redis no início?

- pg-boss usa `SKIP LOCKED`, tem cron/RRULE, deferral, dashboard próprio (https://github.com/timgit/pg-boss). Versão npm 12.39.0; exige Node >= 22.12 e PostgreSQL 13+ (package.json). Debounce nativo por chave: **não verificado** (há `singletonKey`/throttle; confirmar no changelog).
- Vantagens: enfileira na mesma transação do booking (outbox atômico), um serviço a menos, tenant_id no payload. Carga: 18M msgs/mês ~ 7 jobs/s médio, folgado para Postgres.
- Limites: polling e vacuum geram carga em tabela quente; sem rate limiting/flows ricos do BullMQ; jobs concorrentes disputam o mesmo Postgres que serve o produto.
- **Recomendação**: comece com pg-boss (sem Redis), mantenha a interface de fila atrás de um módulo e migre para BullMQ+Redis se o p95 de jobs ou a CPU do banco incomodarem (~1.000+ tenants). Debounce de mensagens: `startAfter` + chave de singleton substituível, validar na prática antes de fixar.

### 3.6 Recomendação (runtime)

Containers Fastify em Fly.io GRU (api + worker), pg-boss, depois Redis/BullMQ se necessário. Cloudflare só na borda (DNS, WAF, R2, dashboard estático). Workers/DO/Workflows são a alternativa de menor custo (~US$48 vs ~US$246 de compute em 3.000 tenants) se aceitar reescrita e abandonar BullMQ; não vale no começo.

## 4. Object storage

| | Cloudflare R2 | AWS S3 sa-east-1 | Supabase Storage |
|---|---|---|---|
| Storage | US$0,015/GB-mês (Standard), US$0,01 (IA) | **não verificado** | 100 GB incluídos no Pro, depois US$0,0213/GB |
| Operações | Classe A US$4,50/M, Classe B US$0,36/M | não verificado | n/d |
| Egress | **grátis** | não verificado | 250 GB incluídos, US$0,09/GB depois (egress do projeto) |
| Signed URLs | S3-compatible presigned URLs (**não verificado nesta sessão**) | sim | sim |

Fonte R2: https://developers.cloudflare.com/r2/pricing/ ("não há cobrança de egress para nenhuma classe"). Supabase: https://supabase.com/pricing.
Custo R2 em 12 meses (mídia): 108 GB x 0,015 = US$1,62; 324 GB = US$4,86; 1.080 GB = US$16,20; 3.240 GB x 0,015 = US$48,60 + ops (1,8M escritas - 1M grátis = 0,8M x 4,50 = US$3,60) = US$52,20. Regra: bucket privado, URL assinada de curta duração, chave do objeto prefixada por tenant_id, lifecycle para apagar após retenção (LGPD).

## 5. Google Calendar API

- Quotas: 10.000 req/min por projeto, 600 req/min por usuário por projeto; janela deslizante; projetos criados a partir de 2026-05-01 sujeitos às novas quotas, com limite diário de faturamento detalhado "ainda em 2026" (https://developers.google.com/workspace/calendar/api/guides/quota). Detalhes de preço pós-limite: **não verificado**.
- `freebusy.query`: `calendarExpansionMax` máximo 50 calendários; escopos aceitos incluem `calendar.freebusy` e `calendar.events.freebusy` (https://developers.google.com/workspace/calendar/api/v3/reference/freebusy/query).
- Escopos (https://developers.google.com/workspace/calendar/api/auth): `calendar`, `calendar.readonly`, `calendar.freebusy`, `calendar.events`, `calendar.events.readonly`, `calendar.events.owned`, `calendar.events.owned.readonly`, `calendar.events.freebusy`, `calendar.app.created` (cria calendário secundário e gerencia só os eventos nele).
- Classificação sensitive/restricted por escopo: a página não rotula; **não verificado** por escopo. A regra geral: apps com escopos sensíveis ou restritos precisam verificação; os restritos acessados via servidor de terceiros exigem avaliação de segurança anual por avaliador aprovado, "várias semanas" (https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification, https://support.google.com/cloud/answer/13464321). Custo e prazo exatos da avaliação (CASA): **não verificado**. Estratégia para reduzir fricção: pedir o escopo mínimo (`calendar.events.freebusy` + `calendar.events.owned` ou `calendar.app.created` num calendário dedicado "Agenda IA") e confirmar a categoria no Cloud Console antes de projetar o fluxo.
- `events.insert` e conflito: a API não rejeita eventos sobrepostos (comportamento conhecido); **não verificado em doc nesta sessão**. Logo, a verdade do booking é seu Postgres (exclusion constraint); o Google é espelho e fonte de bloqueios externos.
- Push notifications (watch): canal HTTPS com `token` e `expiration` opcional; "atualmente não há forma automática de renovar" o canal, é preciso criar um novo antes de expirar (https://developers.google.com/workspace/calendar/api/guides/push). Notificação só avisa "mudou algo"; depois faça sync incremental. Cron diário para renovar canais.
- Sync incremental: `nextSyncToken` do full sync; token inválido responde 410 e exige descartar o store local e refazer full sync; resultados incluem eventos deletados (https://developers.google.com/workspace/calendar/api/guides/sync).
- Refresh token: pode expirar por ação do usuário/política e existe limite de refresh tokens por conta/cliente; tokens antigos param de funcionar ao exceder (https://developers.google.com/identity/protocols/oauth2). Armadilhas: apps em modo "Testing" têm refresh de 7 dias (**não verificado nesta página**), tratar `invalid_grant` como "reconectar Google" e alertar o profissional, guardar refresh cifrado.
- Service account: chamadas de service account contam como um único usuário na quota por usuário; domain-wide delegation só vale para Google Workspace (https://developers.google.com/workspace/calendar/api/guides/quota). Contas Gmail pessoais **não** aceitam delegação; o profissional teria de compartilhar a agenda com o e-mail da service account (isso limita a "ver/editar" via ACL, **não verificado** em detalhes). Para consumer Gmail, use OAuth do usuário.

## 6. Pagamentos no Brasil

### 6.1 Resumo por provedor

| Provedor | Pix | Cartão | Boleto | Assinatura | Subcontas / split | Fonte |
|---|---|---|---|---|---|---|
| Asaas | R$ 0,99 por Pix recebido (preço de tabela cheio mostra R$ 1,99 riscado; promoção/condição: confirmar) | crédito à vista R$0,49 + 2,99% (1,99% em condição promocional), 2-6x 3,49% | R$ 0,99 (R$1,99 riscado) | sim, cobranças recorrentes (Pix, boleto, cartão) | subcontas via API `POST /v3/accounts`, `walletId`, split fixo ou percentual | https://www.asaas.com/precos-e-taxas, https://docs.asaas.com/docs/criacao-de-subcontas.md |
| Stripe Brasil | 1,19% por Pix pago | 3,99% + R$0,39 nacional | R$3,45 | Billing; Pix recorrente/Automático em docs | Connect: disponibilidade no Brasil **não verificada** (página de países retornou 404) | https://stripe.com/br/pricing, https://docs.stripe.com/payments/pix |
| Efí | 1,19% (cobrança Pix via API); Pix Automático R$3,50 por Pix liquidado | 3,49% à vista | R$3,45 | Pix Recorrente/Automático | marketplace/split: **não verificado** | https://sejaefi.com.br/tarifas |
| AbacatePay | R$ 0,80 por Pix recebido; saque Pix R$0,80 (R$2,50 a partir do 21º/mês) | 3,5% + R$0,60 (D+7..); débito 2,5% + R$0,60 | R$2,50 | sim, ciclos semanal a anual, cartão ou Pix Automático | subcontas e split por vendedor (`POST /sub-accounts/create`) | https://www.abacatepay.com/pricing, https://docs.abacatepay.com/llms.txt |
| Mercado Pago | página de tarifas é dinâmica: **não verificado** | **não verificado** | **não verificado** | **não verificado** | **não verificado** | https://www.mercadopago.com.br/costs-section/ |
| Pagar.me | página dinâmica: **não verificado** | **não verificado** | **não verificado** | **não verificado** | recebedores/split: **não verificado** | https://pagar.me/precos/ |

Observações de limites: Pix no Stripe mínimo R$0,50, limite padrão por pagamento US$3.000 em BRL; contestação limitada a fraude/invasão (https://docs.stripe.com/payments/pix).

### 6.2 Asaas em detalhe (candidato principal)

- Subcontas: a conta-pai precisa ser CNPJ (Resoluções Conjuntas BCB nº 16 e 17 para BaaS; CPF não pode criar subcontas). Cada subconta tem clientes, cobranças, saldo e configurações próprios. A resposta traz `apiKey` e `walletId`. Modelos: não-BaaS (o profissional recebe acesso à interface Asaas e conclui KYC/documentação lá) ou BaaS (jornada na sua plataforma, exige configuração prévia). Novos clientes que criam subcontas via API passam por "período de avaliação regulatória" com limites (https://docs.asaas.com/docs/criacao-de-subcontas.md).
- Split: por `walletId`, `fixedValue` ou `percentualValue` (https://docs.asaas.com/docs/split-em-cobrancas-avulsas.md).
- Webhooks: após 15 falhas consecutivas a fila pode ser pausada, novos eventos deixam de ser enviados; resolver em até 14 dias para não perder eventos; há páginas sobre idempotência, retentativas e erro 408 (https://docs.asaas.com/docs/sobre-os-webhooks). Armadilha: responder 2xx rápido e processar assíncrono; deduplicar por id do evento.
- (a) Assinatura do seu SaaS: cobrança recorrente na sua conta-pai, com Pix/boleto/cartão (Asaas lista assinaturas na documentação; detalhes de Pix Automático no Asaas: **não verificado**).
- (b) Pix de sinal liquidando na conta do profissional: o caminho é criar a cobrança **na subconta do profissional** usando a `apiKey` dela (o valor entra no saldo/conta dela). Alternativa: cobrança na sua conta com split 100% para a `walletId` dela (você vira intermediário, ver 6.4). Tarifa fica com quem tem a conta emissora (subconta).

### 6.3 Qual atende (a) e (b)

- (a) cobrar sua assinatura: Asaas, AbacatePay (assinaturas + Pix Automático), Stripe Billing (cartão; Pix recorrente em docs), Efí (Pix Recorrente).
- (b) Pix direto para cada profissional: Asaas (subcontas) e AbacatePay (subcontas e split) são os que documentam esse modelo. Stripe Connect no Brasil e Efí/MP/Pagar.me para marketplace: **não verificado**.
- **Recomendação**: Asaas para ambos (assinatura SaaS na conta-pai + subcontas para o sinal Pix). AbacatePay (mais barato por Pix: R$0,80) é alternativa, mas é mais novo; avaliar onboarding KYC e SLA.

### 6.4 Nota tributária/regulatória

- Se o seu SaaS receber o dinheiro e repassar, você pode ser tratado como intermediador/subadquirente: obrigações do BCB (instituição de pagamento) e fiscais. A arquitetura com subconta (dinheiro nunca passa pela sua conta) reduz esse risco, e o Asaas aponta as Resoluções BCB 16/17 para BaaS. Lista de instituições de pagamento: https://www.bcb.gov.br/estabilidadefinanceira/instituicoespagamento (apenas referência, **não verificado em detalhe**).
- Tributos sobre sua mensalidade (ISS/ PIS/COFINS), obrigação de NFS-e, e a responsabilidade do profissional (cada um emite recibo/NF do serviço de saúde): **não verificado**, validar com contador.
- KYC: cada profissional precisa de CPF/CNPJ, dados de renda, endereço e documentação; ativação depende do Asaas (período de avaliação regulatória).

## 7. Auth do dashboard

| Opção | Preço | Multi-org | 3.000 tenants x ~3 usuários |
|---|---|---|---|
| Better Auth (self-hosted, plugin de organizações) | framework grátis e open source; infra gerenciada deles US$0/US$20 (https://www.better-auth.com/pricing) | sim (plugin), dados no seu Postgres | **US$0** + seu Postgres |
| Supabase Auth | incluído no Pro: 100k MAU, depois US$0,00325/MAU (https://supabase.com/pricing) | sem conceito nativo de org | **US$0** (9.000 MAU < 100k) |
| Clerk | Hobby grátis, 50.000 MRU incluídos por app, depois US$0,02 cada; orgs: 100 MRO incluídos e até 20 membros/org grátis, add-on "Enhanced" US$100/mês (US$85 anual) com 100 MRO + US$1/mês por MRO adicional (https://clerk.com/pricing). Preço base do plano Pro: **não verificado** (página renderizada por JS) | sim, nativo | usuários OK (9.000 < 50.000); **se cada tenant for uma Clerk org: ~100 + 2.900 x 1 = ~US$3.000/mês antes de descontos** (interpretação minha da página, confirmar) |
| WorkOS AuthKit | primeiros 1 milhão de usuários ativos grátis (https://workos.com/pricing); SSO/Directory Sync cobrados por conexão (a partir de US$125/conexão) | sim (organizations) | **US$0** se não usar SSO enterprise |

**Recomendação**: Better Auth no próprio Postgres, tabela `tenants` + `memberships` sua (RLS usa `tenant_id` do token). Evita cobrança por org do Clerk e mantém dados de saúde/identidade no mesmo banco. WorkOS é a segunda opção sem custo se quiser SaaS gerenciado.

## 8. Observabilidade

- Sentry (https://sentry.io/pricing/): Developer US$0 (1 usuário, 5k erros), Team US$26/mês (50k erros, usuários ilimitados), Business US$80/mês. Excedente pay-as-you-grow: **não verificado**.
- Grafana Cloud (https://grafana.com/pricing/): Free (10k séries ativas, 50 GB de logs ingeridos, retenção 14 dias); Pro US$19/mês + uso, 13 meses de métricas, 30 dias de logs/traces. Preço por GB acima do free: **não verificado**.
- Axiom (https://axiom.co/pricing): Free US$0 (500 GB/mês de ingestão, 25 GB de storage, 30 dias de retenção); Pro US$25/mês; carregamento US$0,12/GB na primeira faixa acima da cota.
- Better Stack (https://betterstack.com/pricing): uptime monitoring, logs e status page; preços detalhados por produto **não verificados** (US$29-34 aparecem para o plano pago de logs/telemetria; US$15/mês por monitor/página em outras faixas).
- Recomendação: Sentry (erros) + Axiom (logs/OTel) + Better Stack free para uptime. Custo: 100 tenants US$0 (Sentry Developer + Axiom Free); 300 e 1.000: Sentry Team US$26; 3.000: US$26 + Axiom Pro US$25 = US$51. Regra LGPD: **nunca** logar corpo de mensagem nem nome/telefone em claro; Sentry com `beforeSend` para limpar PII.

## 9. Custo mensal de infraestrutura (USD), sem LLM e sem WhatsApp

Setup recomendado: Supabase Pro (SP) com PITR, Fastify (api + worker) em Fly.io GRU, Redis Upstash Fixed (opcional, pg-boss no início), R2, Better Auth, Sentry + Axiom, Cloudflare Free (DNS/WAF/CDN).

Cálculo de compute Fly (GRU, markup 1,615): sh1x 1 GB = 10,82; sh2x 2 GB = 21,63; perf-1x 2 GB = 53,31.
- 100 tenants: api 2 x sh1x + worker 1 x sh1x = 3 x 10,82 = **32,47**
- 300: api 2 + worker 1 = 3 x sh2x = 3 x 21,63 = **64,89**
- 1.000: api 2 x perf-1x (106,62) + worker 2 x sh2x (43,26) = **149,88**
- 3.000: api 3 x perf-1x (159,93) + worker 4 x sh2x (86,52) = **246,44**

| Item | 100 | 300 | 1.000 | 3.000 |
|---|---|---|---|---|
| Supabase: Pro 25 + compute - crédito 10 + disco | 25+15-10+1,25 = 31,25 | 25+60-10+5,75 = 80,75 | 25+110-10+21,50 = 146,50 | 25+210-10+66,50 = 291,50 |
| PITR 7 dias | 100 | 100 | 100 | 100 |
| Fly.io GRU (api + worker) | 32,47 | 64,89 | 149,88 | 246,44 |
| Redis Upstash Fixed (premissa: 10, 10, 10, 20; tiers acima de 250 MB não verificados) | 10 | 10 | 10 | 20 |
| R2 (storage + ops) | 1,62 | 4,86 | 16,20 | 52,20 |
| Observabilidade (Sentry Team + Axiom) | 0 | 26 | 26 | 51 |
| Auth (Better Auth), Cloudflare Free | 0 | 0 | 0 | 0 |
| **Total com PITR** | **175,34** | **286,50** | **448,58** | **761,14** |
| Total sem PITR | 75,34 | 186,50 | 348,58 | 661,14 |
| Por tenant (com PITR) | 1,75 | 0,95 | 0,45 | 0,25 |

Não incluídos: egress Fly (US$0,04/GB), IPv4 do Supabase se necessário, domínio, backup adicional para R2, taxas do Asaas (cobradas por transação, não infra), custo de embeddings.
Cenários alternativos: Neon no lugar de Supabase + SSE próprio: banco US$43,7 / 92,5 / 205,2 / 460,7 (seção 1.2); runtime Cloudflare em 3.000 tenants: ~US$48 no lugar de US$246,44 + Redis 20 (seção 3.2), mas exige reescrita.
Se dispensar Redis (pg-boss): subtrair 10/10/10/20.

## 10. Armadilhas técnicas encontradas

1. RLS é ignorada por owner/superuser/BYPASSRLS: app precisa de role própria + `FORCE ROW LEVEL SECURITY` (https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
2. `SET` de sessão em pooler transaction mode vaza entre clientes; use `set_config(...,true)` dentro da transação; transaction mode também não suporta prepared statements (https://supabase.com/docs/guides/database/connecting-to-postgres).
3. Booking: exclusion constraint com `tstzrange` + `btree_gist` é a defesa real; Google Calendar não é fonte de verdade.
4. Pooler compartilhado do Supabase é IPv4-only; conexão direta é IPv6 (ou add-on IPv4).
5. Watch channels do Google expiram e não renovam sozinhos; sync token pode dar 410 (full resync) (https://developers.google.com/workspace/calendar/api/guides/push).
6. Verificação OAuth do Google (escopos sensíveis/restritos) pode levar semanas e, se restrito, exige avaliação anual de segurança (https://developers.google.com/identity/protocols/oauth2/production-readiness/restricted-scope-verification).
7. Fila de webhook do Asaas é pausada após 15 falhas; resolver em 14 dias (https://docs.asaas.com/docs/sobre-os-webhooks).
8. Asaas exige conta-pai CNPJ para subcontas e aplica período de avaliação regulatória (https://docs.asaas.com/docs/criacao-de-subcontas.md).
9. Clerk pode cobrar por organização ativa: 3.000 tenants como orgs viram ~US$3.000/mês (confirmar).
10. Queues da Cloudflare limitam delay a 24 h; BullMQ não roda em Workers; Prisma 8 e Drizzle 1.0 ainda estão em rc.
11. PITR do Supabase custa US$100 fixos, maior que o próprio compute em 100 tenants.
12. Retenção de mensagens e payload cru cresce rápido (432 GB em 3.000 tenants em 12 meses): defina expurgo/arquivamento em R2 desde o início (também LGPD).
13. Firestore: sem constraint de intervalo; cobrança por leitura pune carregar histórico de conversa.

## 11. Itens "não verificado" (consolidado)

AWS RDS/Fargate/ElastiCache/S3 sa-east-1 (preços); Crunchy Bridge; PlanetScale e Railway/Render regiões SP; Fly Managed Postgres em GRU; Firestore preço em SP e limites de transação/vetor; DPA/LGPD de Supabase, Neon e Google; disponibilidade de `btree_gist` por provedor; Neon mínimo do Launch; Prisma 8 GA e extensão RLS no Prisma 7; Drizzle exclusion constraint nativa; debounce nativo no pg-boss; Upstash tiers >250 MB e região SP; classificação sensitive/restricted por escopo do Calendar, custo/prazo CASA, comportamento do `events.insert` com sobreposição, refresh de 7 dias em modo Testing, service account em Gmail pessoal; Mercado Pago e Pagar.me tarifas; Stripe Connect no Brasil; Efí split; Asaas Pix Automático e promoção do Pix R$0,99 vs R$1,99; Clerk preço base Pro e interpretação de MRO; preços por GB de Grafana/Sentry acima do free; latência Cloudflare para o Brasil, Cloudflare Containers em SP e IPv6 Fly -> Supabase; aspectos tributários (ISS, NFS-e) e enquadramento BCB.
