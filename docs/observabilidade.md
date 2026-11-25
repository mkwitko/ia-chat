# Observabilidade

Como ver o que está acontecendo e o que deu errado. Tudo funciona sem conta nenhuma (logs no terminal e a lista "Erros recentes" no painel do operador); cada serviço externo acende quando a variável dele está preenchida.

## O que vai para onde

| O quê | Onde | Liga com |
|---|---|---|
| Logs da API e do worker (JSON, uma linha por evento) | saída padrão; Axiom também, se configurado | `AXIOM_TOKEN` e `AXIOM_DATASET` (os dois) |
| Erros não tratados e alertas | Sentry | `SENTRY_DSN` (API e worker), `VITE_SENTRY_DSN` (painel) |
| Traços das chamadas de IA | Langfuse | `LANGFUSE_PUBLIC_KEY` e `LANGFUSE_SECRET_KEY` |
| Problemas para o operador | tabela `ops_events`, tela `/operador`, bloco "Erros recentes" | sempre ligado |
| Saúde | `GET /health`, `GET /ready` (API); `GET /ready` (worker) | `WORKER_HEALTH_PORT` no worker |

Outras variáveis: `APP_RELEASE` e `VITE_RELEASE` (versão nos erros), `LOG_LEVEL` (padrão `info`). Os nomes estão em `.env.example`.

## Como ler um erro

1. Abra `/operador` e veja "Erros recentes": tipo do problema, código, fila e identificadores (cliente, conversa).
2. Procure o identificador nos logs. Toda linha traz `service` (`api` ou `worker`) e, quando existem, `requestId` (a API devolve o mesmo valor no cabeçalho `x-request-id`), `jobId`, `queue`, `tenantId`, `conversationId` e `turnId`.
3. No Sentry, cada tipo de alerta vira uma issue só (agrupada por evento, fila e código); o `tenantId` e os demais ids ficam como tags.

Alertas (`alert(evento, contexto)` em `packages/observability`): `dead_letter` (tarefa esgotou as tentativas), `delivery_failure` (falha de entrega, RF-25), `webhook_error`, `turn_aborted` (resposta passou de 45 s), `queue_error`, `job_failed`.

## Saúde

- `GET /health`: o processo responde.
- `GET /ready`: o banco e o pg-boss respondem. 200 ou 503, com o estado de cada verificação e nenhum detalhe do erro.
- Worker: com `WORKER_HEALTH_PORT` definida, `GET /ready` na porta faz as mesmas verificações. Sem ela, só o log `worker ready` na partida.

## O que nunca é registrado

Texto de mensagens, corpo de e-mail, telefones, e-mails, cookies, cabeçalhos de autorização, tokens e chaves. Nos logs a lista de redação é única (`packages/observability/src/scrub.ts`) e roda em toda linha; no Sentry o `beforeSend` tira usuário, corpo, cabeçalhos e cookies da requisição, texto das migalhas e qualquer telefone ou e-mail. O painel tem o mesmo filtro, em `apps/web/src/lib/sentry.ts`. Os testes provam isso. Alertas aceitam só identificadores e um código curto: qualquer outro campo é descartado.

## Não feito

- Traços OpenTelemetry da API e do worker para o Axiom: só a IA gera traços e ela já vai para o Langfuse. Quando houver o que traçar além disso, registrar um segundo exportador no provedor de `packages/ai/src/tracing.ts`.
- Regras de alerta no Sentry/Axiom, monitor externo em `/ready` e alertas de infraestrutura (WAL, disco): dependem das contas e do servidor (E-26).
