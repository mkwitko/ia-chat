# Recepção Inteligente — SaaS multi-tenant de atendimento por WhatsApp

Assistente de IA no WhatsApp para profissionais de saúde autônomos no Brasil. Atende pacientes, agenda, lembra, cobra. Cliente piloto: um quiropraxista.

## Antes de qualquer trabalho

1. Leia `docs/spec/README.md` (decisões e hipóteses) e `docs/plan/IMPLEMENTACAO.md` (ordem das etapas).
2. Abra `docs/plan/TASKS.md` e execute uma etapa `E-xx` por vez, na ordem, marcando as tarefas concluídas. Leia os arquivos da especificação que a etapa cita antes de codar.
3. A especificação manda. Se o código precisar divergir, atualize a especificação no mesmo PR e diga por quê.

## Stack (decidida; não reabrir sem motivo novo)

- TypeScript estrito, Node LTS, pnpm, monorepo: `apps/api` (Fastify), `apps/worker`, `apps/web` (painel: React, Vite, Tailwind, React Query), `apps/site` (site público: Astro, estático), `packages/{core,channels,ai,db}`.
- Postgres em servidor próprio com backup contínuo no R2 (RN-10 a RN-16), Prisma (com `@prisma/adapter-pg`), migrations SQL à mão para RLS e constraints. Nada específico de Supabase ou Neon.
- Em desenvolvimento, o AI Gateway pode usar o Workers AI gratuito. A bateria de avaliação roda sempre nos modelos candidatos de produção.
- Fila: pg-boss. Sem Redis.
- Autenticação: Better Auth com organizações.
- IA: Vercel AI SDK atrás do AI Gateway interno (`packages/ai`).
- WhatsApp: dois adaptadores atrás de `ChannelAdapter`: Cloud API oficial (padrão) e conexão por QR code via gateway externo em contêiner (WAHA com motor GOWS no piloto), acessado por HTTP e webhooks. Não embutir Baileys. O domínio nunca sabe qual está em uso.
- Pagamentos: Asaas para a nossa assinatura (`BillingProvider`); Mercado Pago por OAuth ou chave Pix com confirmação manual para o sinal do paciente (`DepositProvider`). Nunca guardamos dinheiro de paciente.

## Regras que não se quebram

- Toda consulta de negócio roda em `withTenant(tenantId, fn)`. Toda tabela de negócio tem `tenant_id` e RLS, com teste de isolamento.
- O modelo nunca é fonte de preço, horário, agendamento ou pagamento. Esses dados vêm de ferramentas e passam pela validação de saída.
- Nenhuma mensagem sai sem passar pela trava de envio (`control = 'ai'` e `turn_version` igual).
- O assistente não pede informação de saúde e não dá orientação clínica.
- Logs não contêm conteúdo de mensagem. Segredos nunca em log nem no repositório.
- Dinheiro em centavos inteiros. Horário em `timestamptz`.
- Nunca usar dados reais de pacientes em desenvolvimento ou teste.

## Código limpo

O lint (`eslint.config.js`) barra no CI o que dá para medir; o resto é revisão.

- Arquivo com até 200 linhas (testes e dados fictícios, 300); função com até 40; complexidade cognitiva até 10; até 3 parâmetros (acima disso, objeto).
- Sem string ou número solto: comparação, `case`, nome de configuração, mensagem de erro e valor de domínio vêm de `const` nomeada ou de enum do Prisma. Dados fictícios ficam num `const` próprio (`seed-data.ts`).
- Schema do Prisma em arquivos por domínio (`packages/db/prisma/schema/`).
- Tipos: `unknown` em vez de `any`; validar na fronteira com Zod e confiar no tipo dali para dentro; `satisfies` em vez de `as`; uniões discriminadas para estados; `switch` exaustivo com `never`.
- Funções pequenas que fazem uma coisa; retorno antecipado em vez de `if` aninhado; nomes que dizem a intenção.
- Sem `console` no código da aplicação (só em `scripts/`); log estruturado.
- Referências: [clean-code-typescript](https://github.com/labs42io/clean-code-typescript) e a skill `typescript-best-practices` do Cursor (lida em 24/11/2026, não instalada).

## Forma de trabalhar

- Lógica com regra começa pelo teste. Uma etapa só termina com o "Pronto quando" verificado por comando executado.
- Dependência nova só quando poucas linhas não resolvem. Justifique no PR.
- Interface: siga `docs/spec/10-painel-e-interface.md` (o que cada tela contém) e `DESIGN.md` (aparência; criado na etapa E-08 com a skill `impeccable`). Mobile-first. Textos em português do Brasil, escritos para o profissional.
- Documentação e textos de produto em português. Código, identificadores e comentários em inglês.
- Requisito ambíguo: adote o padrão mais conservador e registre como hipótese em `docs/spec/README.md`.
