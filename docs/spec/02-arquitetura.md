# 02 — Arquitetura

Fontes: [pesquisa 03](../research/03-banco-infra-pagamentos.md).

## Componentes

```
Meta Cloud API ──webhook──▶ API (Fastify) ──grava evento──▶ Postgres ──job──▶ Worker
                                 ▲                              ▲               │
Painel (React SPA) ──────────────┘                              │               ├─▶ AI Gateway ─▶ provedores de LLM
Google Calendar ◀──────────────────────────────────────────────────────────────┤
Asaas ──webhook──▶ API                                                          ├─▶ Meta (envio)
R2 (mídia) ◀────────────────────────────────────────────────────────────────────┘
```

| Componente | Responsabilidade | Onde roda |
|---|---|---|
| API | Webhooks (Meta, gateway de QR code, Asaas, Mercado Pago, Google), API do painel, autenticação, SSE do inbox | Contêiner Node em servidor no Brasil, 2 instâncias |
| Worker | Turnos de conversa, envio de mensagens, lembretes, sincronização de agenda, transcrição, tarefas em lote | Contêiner Node no mesmo servidor ou rede privada, mesma imagem, comando diferente |
| Postgres | Todos os dados e a fila (pg-boss) | Servidor próprio no Brasil, na mesma rede privada da API; backup contínuo no R2 |
| Armazenamento | Mídia recebida e documentos | Cloudflare R2, URLs assinadas |
| Gateway de WhatsApp por QR code | Sessões da conexão não oficial; fala HTTP e webhooks só com a API | Contêiner WAHA (motor GOWS) na rede privada, sem porta pública |
| Painel | Aplicação React estática | Cloudflare Pages |
| Site | Páginas estáticas em Astro | Cloudflare Pages |
| Borda | DNS, TLS, WAF, limite de taxa nos webhooks | Cloudflare |
| Observabilidade | Erros, logs, traços de IA | Sentry, Axiom, Langfuse Cloud |

Um único repositório (monorepo pnpm): `apps/api`, `apps/worker`, `apps/web`, `packages/core` (domínio), `packages/channels`, `packages/ai`, `packages/db`.

## Decisões de stack

### Banco: Postgres em servidor próprio

| Critério | Supabase | Neon | Firestore |
|---|---|---|---|
| Transações e bloqueios | Sim | Sim | Limitado |
| Exclusion constraint com `tstzrange` | Sim | Sim | Não existe |
| RLS | Sim | Sim | Regras próprias, não SQL |
| Região São Paulo | Sim | Verificar | Não verificado |
| Recuperação em ponto no tempo | Adicional de US$ 100 por mês | Incluída por janela | Sim |
| Latência previsível | Instância sempre ligada | Escala a zero gera partida a frio | Boa |
| Portabilidade | Postgres padrão | Postgres padrão | Baixa |

- **Firestore descartado.** O domínio é relacional e o agendamento precisa de constraint de intervalo.
- **Decisão de 24/11/2026: Postgres em servidor próprio no Brasil**, com backup contínuo no Cloudflare R2. A comparação acima fica como referência para a migração futura. Motivo: economiza cerca de US$ 125 por mês no início (instância mais PITR), e como usamos só Postgres puro, migrar para Supabase ou Neon depois é dump e restore.
- **Banco por cliente:** não. Reavaliar só para cliente do plano Clínica com exigência contratual.
- **Gatilho para migrar a um serviço gerenciado:** receita cobrindo o custo com folga, ou primeiro incidente de disponibilidade, ou mais de 50 clientes, o que vier primeiro.

Requisitos do Postgres próprio. São dados de saúde e de agenda, então nenhum é opcional:

| ID | Requisito |
|---|---|
| RN-10 | Arquivamento contínuo de WAL no R2 com pgBackRest ou WAL-G, mais backup completo semanal e diferencial diário. Isso dá recuperação em ponto no tempo. Backup só diário não é aceito: perderia até 24 horas de agendamentos |
| RN-11 | Backups cifrados, com a chave guardada fora do servidor |
| RN-12 | Restauração testada por script todo mês num servidor descartável, com verificação de contagem de linhas. Falha gera alerta |
| RN-13 | Alerta se o último WAL arquivado tiver mais de 15 minutos |
| RN-14 | Postgres sem porta pública: acesso só pela rede privada da API e do worker. TLS entre eles. Disco cifrado |
| RN-15 | Monitoramento de disco, conexões e replicação; atualizações de segurança automáticas do sistema |
| RN-16 | Procedimento escrito de recuperação total (servidor perdido) com tempo alvo de 2 horas |

`ponytail:` um único servidor é ponto único de falha. Aceito no piloto por causa de RN-10 a RN-16; réplica em espera entra junto com o gatilho de migração.

### ORM: Prisma

- Prisma 7 na versão estável, com o gerador `prisma-client` e o adaptador `@prisma/adapter-pg`. Troca do Drizzle pelo Prisma decidida pelo dono em 24/11/2026, na E-02.
- O Prisma não modela `tstzrange` nem exclusion constraint. `appointments` guarda `starts_at`/`ends_at` (`timestamptz`) e a constraint `appointments_no_overlap` usa `tstzrange(starts_at, ends_at)` na expressão, só na migration (E-20); o Prisma lê e grava as duas colunas normalmente.
- `withTenant` usa transação interativa do Prisma (`$transaction(async (tx) => ...)`); a primeira instrução é o `set_config`.
- Policies de RLS, exclusion constraint e extensões ficam em migrations SQL escritas à mão, versionadas junto.
- Toda consulta de negócio roda dentro de `withTenant(tenantId, fn)`, que abre transação e executa `select set_config('app.tenant_id', $1, true)`. Não usar `SET` de sessão: o pool de conexões reaproveita conexões entre requisições, com ou sem PgBouncer.

### Execução: contêineres, não Workers

- Fastify e workers de longa duração rodam em Node comum. BullMQ não roda em Cloudflare Workers, e o atraso máximo do Cloudflare Queues é 24 horas, insuficiente para lembretes.
- API, worker, Postgres e gateway de WhatsApp ficam no mesmo provedor, no Brasil, em rede privada. O provedor é escolhido na etapa E-26 pelos critérios: datacenter no Brasil, rede privada, volume persistente com snapshot, e custo. Candidatos: Fly.io em GRU com volume, ou VPS em São Paulo com Docker Compose.
- **Provedor da E-26 (nota de 25/11/2026; ainda não escolhido).** O pacote de produção (`docker-compose.prod.yml`, `docs/ops/producao.md`) roda em qualquer VPS Linux com Docker. Máquina de referência: 2 vCPU, 4 GB, disco de 80 GB ou mais, São Paulo. Preços de lista consultados em 25/11/2026, sem criar conta em nenhum:

  | Opção | Preço por mês (2 vCPU, 4 GB) | Observação |
  |---|---|---|
  | AWS Lightsail, sa-east-1 | US$ 24 (IPv4 público); US$ 20 só com IPv6 | Preço da página oficial; São Paulo traz metade da franquia de transferência (2 TB). Snapshots à parte |
  | Vultr, São Paulo (VC2 compartilhada) | cerca de US$ 30 | Dado de agregadores (Cloud Mercato, Valebyte); confirmar em vultr.com. Alta frequência: cerca de US$ 36 |
  | Magalu Cloud, São Paulo | não verificado | A página de preços é uma calculadora dinâmica; cobra em reais. Pedir cotação |

  Custo adicional comum a todas: R2 para os backups (poucos GB: menos de US$ 1 por mês) e snapshot do disco do provedor, se quiser. Critério de desempate: cobrança em reais e suporte em português (Magalu) contra maturidade e snapshot fácil (Lightsail, Vultr). Qualquer um serve porque nada no pacote depende do provedor; trocar é restaurar o backup (RN-16).
- **Fila: pg-boss.** Jobs transacionais no mesmo banco, sem Redis. `ponytail:` teto estimado em algumas centenas de jobs por segundo; migrar para Redis + BullMQ se a latência de fila passar de 2 segundos no p95.
- Timers por conversa (agrupamento de mensagens) são jobs com `startAfter` e chave única por conversa.

### Demais escolhas

| Camada | Escolha | Observação |
|---|---|---|
| Validação | Zod | Mesmos schemas para API, ferramentas do agente e formulários |
| Contrato da API | OpenAPI gerado dos schemas Zod | |
| Autenticação do painel | Better Auth no próprio Postgres | Clerk com um tenant por organização sairia caro |
| Tempo real do inbox | SSE no Fastify + `LISTEN/NOTIFY` | Sem serviço extra |
| Frontend | React, TypeScript, Tailwind, React Query, componentes acessíveis (Radix) | Design system próprio fica para depois do piloto |
| IA | Vercel AI SDK por trás de um AI Gateway interno | Ver [04](04-agentes-e-ia.md) |
| Logs, erros e traços | Logs pino → stdout, mais Axiom com `AXIOM_TOKEN`; erros no Sentry com `SENTRY_DSN`; traços de IA no Langfuse | Mudança: sem OpenTelemetry → Axiom por ora (só a IA gera traços, e o Langfuse já os recebe). Ver [observabilidade](../observabilidade.md) |

## Multi-tenancy

| ID | Regra |
|---|---|
| RN-01 | Toda tabela de negócio tem `tenant_id uuid not null` e policy RLS `tenant_id = current_setting('app.tenant_id')::uuid` |
| RN-02 | A aplicação conecta com um papel sem `BYPASSRLS` e que não é dono das tabelas. Migrations usam outro papel |
| RN-03 | Jobs carregam `tenant_id` no payload; o worker entra em `withTenant` antes de qualquer leitura |
| RN-04 | Webhooks resolvem o tenant pelo identificador do número (Meta), da sessão (gateway de QR code), do cliente (Asaas), da conta conectada (Mercado Pago) ou do canal (Google), numa tabela de roteamento sem dados de paciente |
| RN-05 | Chaves de cache, de prompt e caminhos no R2 começam com `tenant_id` |
| RN-06 | Teste automatizado obrigatório: para cada tabela, uma sessão do tenant A não lê nem altera linha do tenant B |

## Modelo de dados (núcleo)

| Tabela | Campos principais |
|---|---|
| `tenants` | plano, status, fuso, `specialty_policy_id`, limites |
| `users`, `memberships` | usuários do painel e papel por tenant. Formato definido pelo Better Auth (E-04) |
| `professionals` | nome, tom de voz, exemplos de mensagens, `google_calendar_id` |
| `channels` | `phone_number_id`, WABA, modo de coexistência, estado da conexão |
| `services` | nome, duração, preço em centavos, visível ao paciente |
| `availability_rules` | dia da semana, início, fim, intervalo, antecedência mínima e máxima |
| `time_off` | bloqueios manuais |
| `locations` | endereço, instruções de chegada |
| `knowledge_items` | pergunta, resposta, fonte, ativo |
| `contacts` | `bsuid`, telefone (pode ser nulo), nome, consentimentos, opt-out |
| `conversations` | contato, `control` (ai, human), `control_changed_at`, `pause_expires_at`, `window_expires_at`, contadores |
| `messages` | direção, autor (patient, ai, human, system), tipo, texto, mídia, `provider_message_id` único, status |
| `inbound_events` | payload bruto do webhook, hash, processado em |
| `turns` | conversa, versão, mensagens agrupadas, estado, modelo, custo |
| `appointments` | profissional, contato, serviço, `starts_at`, `ends_at`, status, `google_event_id` |
| `scheduled_messages` | tipo (lembrete, confirmação, follow-up), template, quando, estado |
| `payments` | agendamento, valor, provedor (`mercado_pago` ou `pix_manual`), `provider_charge_id`, status, pago em. O Asaas é só da nossa assinatura |
| `ai_usage` | tenant, conversa, turno, tarefa, modelo, tokens (entrada, cache, saída), custo em micro-dólares |
| `usage_counters` | tenant, mês, conversas, mensagens por categoria |
| `audit_log` | quem, o quê, antes, depois, quando |
| `specialty_policies` | regras por especialidade |

Tabelas de plataforma, sem `tenant_id` e sem RLS, numa lista explícita do teste de isolamento: `tenants`, `specialty_policies` (catálogo global, só leitura para a aplicação) e as tabelas de autenticação. Toda referência entre tabelas de negócio é FK composta `(tenant_id, x_id) → (tenant_id, id)`, para que o banco recuse ligação entre tenants. `audit_log` só aceita inserir e ler pelo papel da aplicação.

Dinheiro sempre em centavos inteiros. Horários sempre `timestamptz`; o fuso do tenant é usado só para exibir e interpretar.

## Auditoria

`RN-07`: geram linha em `audit_log` — criação, alteração e cancelamento de agendamento; mudança de controle da conversa; alteração de preço, serviço, disponibilidade e tom de voz; criação e confirmação de cobrança; acesso do operador da plataforma a dados de um tenant; exportação e exclusão de dados.
