# Tarefas do MVP

Detalha as etapas das fases 0 a 3 e da trilha de site de [IMPLEMENTACAO.md](IMPLEMENTACAO.md). O "pronto quando" de cada etapa está lá; aqui está o caminho até ele.

- Marque `[x]` ao concluir. Uma etapa só fecha com todas as tarefas marcadas e o "pronto quando" verificado por comando executado.
- Tarefas marcadas com **(teste primeiro)** começam pelo teste que falha.
- Fases 4 e 5 não têm tarefas aqui de propósito: serão detalhadas depois do piloto, com o que ele ensinar.
- "Spec" indica o que ler antes de começar a etapa.

## Dependências

```
E-01 → E-02 → E-03 → E-04
        E-02 → E-05
        E-02 → E-06 → E-07
E-01 → E-08 → S-01, S-02
E-03, E-05 → E-09, E-09b → E-10 → E-11 → E-12 → E-13 → E-14 → E-15 → S-03
E-04, E-08, E-12 → E-16 → E-17 → E-18 → E-18b
E-03 → E-19 → E-20 → E-21 → E-22 → E-22b → E-23
E-17, E-21 → E-24 → E-24b → S-05
E-18 → E-25 → S-04
tudo da fase 3 → E-26 → E-27 → E-28 → E-28b
```

Podem correr em paralelo: E-05 com E-06; E-08 com E-02 a E-07; E-09 com E-09b; E-19 a E-23 com E-16 a E-18b; a trilha S com o produto.

---

## Fase 0 — Desbloqueios externos

Não é código. Quem faz é você; começa já.

### E-00a Entrevista com o piloto
- [ ] Fazer as 10 perguntas de `docs/spec/08-roadmap-e-aceite.md`
- [ ] Pedir 10 a 15 mensagens reais dele e as perguntas mais frequentes
- [ ] Registrar as respostas nas hipóteses H-01 a H-08 de `docs/spec/README.md`
- [ ] Combinar com ele qual conexão de WhatsApp usar no piloto, com o risco explicado

### E-00b Meta
- [ ] Criar conta Business e aplicativo; iniciar a verificação do negócio (exige CNPJ)
- [ ] Pedir as permissões `whatsapp_business_management` e `whatsapp_business_messaging`
- [ ] Obter número de teste e enviar e receber uma mensagem por webhook
- [ ] Confirmar se a coexistência está disponível para a conta

### E-00c Google
- [ ] Criar projeto, tela de consentimento e credenciais OAuth
- [ ] Definir o menor escopo de calendário que atende e enviar o pedido de verificação

### E-00d Pagamentos
- [ ] Abrir conta Asaas com CNPJ e ativar o ambiente de testes
- [ ] Criar aplicativo no Mercado Pago para OAuth
- [ ] Olhar a reputação dos dois no Reclame Aqui e falar com o comercial (bloqueio de saldo, suporte)

### E-00e Jurídico
- [ ] Minutas: termos de uso, aviso de privacidade, contrato de operador, lista de suboperadores
- [ ] Cláusulas-padrão da ANPD com cada provedor de IA
- [ ] Termo de ciência da conexão por QR code
- [ ] Termo de consentimento do piloto para depoimento e uso de números

### E-00f Nome e contas
- [ ] Escolher o nome (a skill `founder-brand` ajuda) e conferir marca no INPI
- [ ] Registrar domínio; criar contas de GitHub, Cloudflare e e-mail transacional

### E-00g Chaves e acessos para desenvolver
Necessárias a partir de E-06. Vão num `.env` local, nunca no repositório.
- [ ] Chaves de API dos provedores de IA candidatos (dois de conversa, o de juízo, o de transcrição)
- [ ] Conta Cloudflare com R2; chave do Vercel AI Gateway
- [ ] Langfuse e Sentry
- [ ] Assinatura do Mobbin por um trimestre, para E-08

---

## Fase 1 — Fundação

### E-01 Repositório
Spec: `CLAUDE.md`, `02-arquitetura.md`.
- [x] `git init`, pnpm workspace com `apps/{api,worker,web,site}` e `packages/{core,channels,ai,db}`
- [x] TypeScript estrito compartilhado, ESLint, Prettier, Vitest
- [x] `pnpm-workspace.yaml` (no pnpm 12 o `.npmrc` só guarda registro e autenticação): lockfile obrigatório, scripts de instalação bloqueados, idade mínima de publicação
- [x] CI: instalar, lint, tipos, testes, auditoria de dependências
- [x] `docker-compose.yml` de desenvolvimento com Postgres
- [x] `.gitignore` incluindo `.env`, `.remember/` e `.playwright-mcp/`
- [x] `.env.example` e validação de variáveis de ambiente com Zod na inicialização

### E-02 Banco e isolamento
Spec: `02-arquitetura.md` (multi-tenancy, RN-01 a RN-06).
- [x] Papéis: `app_migrator` (dono) e `app_runtime` (sem `BYPASSRLS`, não dono)
- [x] Prisma com versão fixada; pasta de migrations SQL
- [x] **(teste primeiro)** `withTenant(tenantId, fn)` com `set_config('app.tenant_id', $1, true)`
- [x] **(teste primeiro)** Teste que prova que `SET` de sessão vaza entre transações no pool e `set_config` local não
- [x] Função auxiliar que falha se uma consulta de negócio rodar fora de `withTenant`

### E-03 Schema do núcleo
Spec: `02-arquitetura.md` (modelo de dados), `03` (RF-23b).
- [x] Tabelas de tenant, profissionais, canais, serviços, disponibilidade, bloqueios, locais, base de conhecimento (usuários e vínculos vêm com o Better Auth em E-04)
- [x] Tabelas de contatos, conversas, mensagens, eventos de entrada, turnos
- [x] Tabelas de agendamentos, mensagens agendadas, pagamentos, uso de IA, contadores, auditoria, políticas de especialidade
- [x] Policy RLS e índice por `tenant_id` em todas
- [x] Índices únicos de contato por BSUID e por telefone normalizado
- [x] **(teste primeiro)** Teste gerado a partir do catálogo do banco: para cada tabela, tenant A não lê nem altera tenant B. Tabela nova sem policy quebra o teste
- [x] Dados de exemplo para desenvolvimento, todos fictícios

### E-04 Autenticação
Spec: `06-seguranca-e-lgpd.md` (RN-33, RN-34).
- [x] Better Auth com Postgres, organizações como tenant, papéis dono, profissional e recepcionista
- [x] Cadastro, login por e-mail e por Google, verificação de e-mail, recuperação de senha. Google entra quando houver credencial (E-00c); e-mail real com o provedor de E-00f, até lá vai para o log em desenvolvimento
- [x] Middleware do Fastify que resolve usuário, tenant e papel e abre `withTenant`
- [x] Convite de membro
- [x] **(teste primeiro)** Recepcionista não acessa cobrança nem integrações; usuário de um tenant não acessa outro

### E-05 Fila
- [x] pg-boss no worker com esquema próprio, instalado pelo papel de migração (`pnpm db:migrate`); o papel do app só cria objetos no esquema `pgboss` (partições de estatística da manutenção)
- [x] Envelope de job com `tenantId` obrigatório e entrada em `withTenant`
- [x] **(teste primeiro)** Job com atraso e chave única executa uma vez com dois workers
- [x] Política de novas tentativas e fila de falhas com alerta

### E-06 AI Gateway
Spec: `04-agentes-e-ia.md` (AI Gateway, juízos tipados).
- [x] Interface `generate`, `judge`, `transcribe` sobre o Vercel AI SDK
- [x] Tabela de roteamento `tarefa → [principal, reserva]` em configuração
- [x] Tabela de preços versionada por data e cálculo de custo
- [x] Gravação em `ai_usage` de toda chamada
- [x] **(teste primeiro)** Tetos por turno, conversa e tenant
- [x] **(teste primeiro)** Reserva em timeout, erro e limite de taxa; `judge` devolve nulo sem lançar erro
- [x] Provedores pelo Vercel AI Gateway (uma chave); Workers AI descartado
- [x] Marcação de blocos de cache e esforço de raciocínio baixo nas tarefas de conversa
- [x] Langfuse com nome e telefone mascarados

### E-07 Avaliação
Spec: `04-agentes-e-ia.md` (avaliação).
- [x] Tenant fictício com serviços, preços, agenda e base de conhecimento
- [x] Simulador de paciente com persona e objetivo
- [x] 80 casos em português cobrindo a lista da especificação
- [x] Casos rotulados para cada pergunta de juízo
- [x] Verificações automáticas por caso; nota de tom por modelo avaliador
- [x] Comando único que roda a bateria e gera relatório por modelo, com custo (`pnpm eval`, com teto `--max-usd`)
- [x] Rodar nos candidatos e registrar na especificação o modelo de conversa, o de reserva e se o Jev passou em português (escolha provisória, H-12)
- [ ] Rodada final com cada caso duas vezes (`pnpm eval --models luna,haiku --repeat 2`), incluindo reservas baratas (Qwen 3.8 Flash, Mistral Small, Gemini 3.1 Flash-Lite), com aprovação do custo; pendente de crédito no gateway

### E-08 Direção visual
Spec: `10-painel-e-interface.md`, `IMPLEMENTACAO.md` (painel e identidade visual).
- [x] Coletar referências por tela (Nubank/Inter e WhatsApp Business, escolha do dono; Mobbin fora por ser pago)
- [x] Definir a direção com a skill `impeccable` e gravar `DESIGN.md` (padrão da categoria; marca Consultório Aberto em `docs/brand.md`)
- [x] Tokens no Tailwind; componentes de base acessíveis (shadcn/ui sobre Radix, tema trocado pelos tokens)
- [x] Casca do painel mobile-first, instalável (PWA)
- [x] Tela de login seguindo os tokens
- [x] Sua aprovação do `DESIGN.md` e das duas telas (24/11/2026)

---

## Fase 2 — Conversa

### E-09 Adaptador oficial
Spec: `03-whatsapp-e-conversa.md` (abstração de canal, RF-20 a RF-26).
- [x] Interface `ChannelAdapter` e tipos `InboundEvent` em `packages/channels`
- [x] Rota de webhook: grava o corpo bruto em `inbound_events` e responde 200 (roteamento por `channel_routes`, trecho bruto só do próprio tenant)
- [x] **(teste primeiro)** Verificação de assinatura sobre o corpo bruto
- [x] Normalização de mensagem, eco do dono, status e estado do canal, com fixtures no formato da documentação da Meta
- [ ] Gravar payloads reais do número de teste da Meta e rodar os mesmos testes sobre eles (depende das contas da Fase 0)
- [x] **(teste primeiro)** Idempotência por `provider_message_id` (A-01, parte da mensagem; o turno único é da E-11)
- [x] **(teste primeiro)** Resolução de contato por BSUID e telefone com nono dígito (RF-23b)
- [x] Envio de texto e de template; leitura e indicador de digitação (cliente da Cloud API, testado com Graph simulado)
- [x] Atualização de status e alerta em falha de entrega
- [x] Reconciliação diária de mensagens sem status

### E-09b Adaptador por QR code
Spec: `03-whatsapp-e-conversa.md` (duas formas de conexão, motor).
- [ ] Contêiner WAHA com motor GOWS na rede privada, imagem fixada por digest
- [ ] Primeiro dia: provar que chegam o eco do dono e o identificador do contato. Se não chegarem, parar e reavaliar o motor
- [ ] Adaptador HTTP e rota de webhook do gateway, com autenticação entre os dois
- [ ] Fluxo de QR code no painel, com o termo de ciência (RF-27) gravado em auditoria
- [ ] **(teste primeiro)** Limites de envio e bloqueio de mensagem ativa em massa (RF-28)
- [ ] Alerta de sessão caída e pedido de novo QR code (RF-29)
- [ ] A mesma suíte de contrato do E-09 passa neste adaptador

### E-10 Mídia e áudio
- [ ] Job imediato de download para o R2, com caminho por tenant e URL assinada
- [ ] Novas tentativas e estado "mídia indisponível"
- [ ] Transcrição pelo AI Gateway; corte em 3 minutos com aviso
- [ ] Conduta por tipo de conteúdo conforme a tabela da especificação

### E-11 Turnos
Spec: `03-whatsapp-e-conversa.md` (entrega natural).
- [x] **(teste primeiro)** Agrupamento: job por conversa com 6 segundos, reagendado até 20 (A-02)
- [x] **(teste primeiro)** `turn_version` incrementado por mensagem, eco e mudança de controle; turno em curso invalidado (A-03)
- [x] Registro do turno com estado, mensagens agrupadas, modelo e custo
- [x] Consumidor da fila `conversation.turn` ligado ao agente real (E-13)

### E-12 Controle humano
Spec: `03-whatsapp-e-conversa.md` (controle da conversa, RF-30 a RF-36).
- [x] **(teste primeiro)** Máquina de estados `ai` e `human` com motivos e auditoria
- [x] **(teste primeiro)** Trava de envio em transação com `select for update` (A-04)
- [x] Eco do dono muda o controle na mesma transação da mensagem
- [x] **(teste primeiro)** Em `human`, nenhuma chamada de LLM (A-05)
- [x] Devolução ao assistente sem responder ao histórico (A-06); expiração opcional
- [x] Transferência: muda o controle, devolve o aviso ao paciente e o lembrete enquanto ninguém responde (o envio do aviso entra com a ferramenta da E-13; o push, com a E-16)
- [x] Suspensão dos jobs de follow-up da conversa
- [x] Rota da API para "Assumir" e "Devolver ao assistente" (os botões entram no inbox, E-16)

### E-13 Agente de conversa
Spec: `04-agentes-e-ia.md` (fluxo de um turno, contexto, ferramentas).
- [x] Pré-filtros determinísticos (urgência, opt-out, figurinha, tipo não suportado)
- [x] Montagem do contexto em blocos, do mais estável ao mais volátil (prompt único em `packages/ai/src/agent`, o mesmo da bateria)
- [x] Ferramentas do Essencial: transferir, registrar dúvida sem resposta, atualizar nome
- [x] Identificação do assistente na primeira mensagem de cada conversa
- [x] Resumo do histórico acima de 20 mensagens
- [x] Tetos por turno e por conversa, com transferência ao estourar
- [x] Nível de autonomia (RF-13): "aprovar antes de enviar" vira rascunho; resposta fixa (urgência) sai sem esperar
- [x] Consumidor da fila `conversation.turn` com o agente e o envio pela Cloud API (sem token em desenvolvimento, só registra)
- [ ] Bateria: casos de preço, endereço, dúvida sem resposta e fora de escopo passam (chamada paga: com aprovação do custo)

### E-14 Validação e política
Spec: `04-agentes-e-ia.md` (validação da saída, proteções), `01` (expansão por especialidade).
- [x] **(teste primeiro)** Valores em reais conferidos com o catálogo (A-07)
- [x] **(teste primeiro)** Datas, horários e afirmações de ação conferidos com resultados de ferramenta (horários do próprio cadastro também valem)
- [x] **(teste primeiro)** Política por especialidade: preço proibido (A-08), termos proibidos
- [x] Juízos semânticos: orientação clínica, urgência (A-09), com falha segura (limiares da E-07)
- [x] Nova tentativa única e depois transferência
- [ ] Casos de segurança da bateria em 100% (chamada paga: com aprovação do custo)

### E-15 Entrega natural
- [ ] **(teste primeiro, relógio falso)** Atraso alvo, descontando o tempo de processamento
- [ ] Uma mensagem por turno; divisão em duas só nos casos previstos
- [ ] Reenvio do indicador aos 20 segundos; aborto aos 45 com mensagem fixa e notificação

### E-16 Inbox
Spec: `10-painel-e-interface.md`, `DESIGN.md`.
- [ ] SSE no Fastify com `LISTEN/NOTIFY`, filtrado por tenant
- [ ] Lista de conversas com estado de controle e não lidas
- [ ] Tela da conversa com autoria (paciente, assistente, profissional), mídia e transcrição
- [ ] Botões assumir e devolver; envio de mensagem pelo painel
- [ ] Notificação push do PWA
- [ ] Tela "Hoje" e faixa de alerta no topo
- [ ] Os quatro estados de cada tela (carregando, vazio, erro, com dados), conferidos em 360 px e 1280 px
- [ ] Revisão das telas com `impeccable`

### E-17 Configurações e simulador
Spec: `10-painel-e-interface.md`, `DESIGN.md`.
- [ ] Serviços e valores, endereço e instruções de chegada
- [ ] Base de conhecimento e lista "perguntas que o assistente não soube", com conversão em resposta num toque
- [ ] Tom de voz: mensagens de exemplo e as quatro perguntas
- [ ] Simulador: conversa com o assistente configurado, sem enviar nada ao WhatsApp
- [ ] Auditoria das alterações

### E-18 Uso e limites
- [ ] Contadores de conversa por mês e por categoria de mensagem
- [ ] **(teste primeiro)** Avisos de 80% e 100%; excedente com teto; modo restrito com resposta fixa
- [ ] Tela de uso do mês com estimativa de gasto na Meta

### E-18b Níveis de autonomia
Spec: `01-produto-e-planos.md` (RF-13).
- [ ] **(teste primeiro)** Em "aprovar", a resposta vira rascunho e nada sai sem toque do profissional
- [ ] Aprovar, editar e descartar no inbox; lembrete se ficar sem aprovação
- [ ] **(teste primeiro)** Em "desligado", nenhuma chamada de LLM; mensagem fixa de ausência
- [ ] Cliente novo começa em "aprovar"

---

## Fase 3 — Agenda e piloto

### E-19 Disponibilidade
Spec: `05-agenda-e-pagamentos.md`.
- [ ] **(teste primeiro)** `availableSlots` como função pura: regras, bloqueios, agendamentos, ocupação externa, duração, antecedência
- [ ] Casos: fuso, virada de dia, serviço maior que a janela, feriado
- [ ] Seleção de até 6 opções espalhadas

### E-20 Agendamentos
- [ ] Migration com `btree_gist` e exclusion constraint
- [ ] **(teste primeiro)** Dois agendamentos simultâneos no mesmo horário: um entra, o outro recebe `slot_taken` (A-10)
- [ ] Ferramentas consultar, agendar, remarcar, cancelar e listar
- [ ] **(teste primeiro)** Exigência de confirmação conferida pelo código e pelo juízo; idempotência por turno
- [ ] **(teste primeiro)** Remarcação atômica (A-14); antecedência mínima de cancelamento
- [ ] Bateria: casos de agenda em 95% ou mais; A-11

### E-21 Google Calendar
- [ ] OAuth, escolha do calendário, tokens cifrados
- [ ] Escrita de evento com nova tentativa e estado "não sincronizado"
- [ ] Leitura por canal de notificação e sincronização incremental em `external_busy` (A-12)
- [ ] Job diário de renovação dos canais; tratamento de token de sincronização inválido
- [ ] Token revogado: parar de oferecer horários e avisar (A-13)
- [ ] Alerta de conflito externo

### E-22 Confirmação e lembretes
- [ ] Templates por especialidade cadastrados no onboarding (conexão oficial)
- [ ] Confirmação imediata; lembrete em dois tempos (RF-47)
- [ ] **(teste primeiro)** Não enviar a contato com opt-out nem para agendamento cancelado (A-15)
- [ ] Opt-out determinístico por palavra
- [ ] Respostas de confirmar e remarcar tratadas pelo agente

### E-22b Férias e agenda do dia seguinte
- [ ] **(teste primeiro)** Modo férias: nenhum horário do período é oferecido; aviso ao paciente
- [ ] Resumo noturno ao profissional, em horário configurável

### E-23 Agenda no painel
Spec: `10-painel-e-interface.md`, `DESIGN.md`.
- [ ] Visão de dia e semana no celular (Schedule-X)
- [ ] Regras de disponibilidade e bloqueios
- [ ] Agendamento manual pelas mesmas regras e constraints
- [ ] Revisão com `impeccable`

### E-24 Onboarding
Spec: `09-site-aquisicao-suporte.md` (cadastro e ativação), `03` (onboarding do canal).
- [ ] Fluxo de oito passos com progresso salvo
- [ ] Telas de criar conta, confirmar e-mail e recuperar senha no painel (a API já faz os três desde a E-04; confirmação testada de ponta a ponta no navegador em 24/11/2026)
- [ ] Modelos de serviços e textos por especialidade
- [ ] Conexão oficial: Embedded Signup em coexistência e checagem de pagamento na Meta
- [ ] Conexão por QR code com o termo de ciência
- [ ] Conexão do Google
- [ ] Mensagem de teste e ativação em "aprovar antes de enviar"
- [ ] Erros da Meta e do Google traduzidos para linguagem comum
- [ ] Pessoa de fora da equipe ativa uma conta sem ajuda

### E-24b Onboarding pelo histórico (opcional)
- [ ] Autorização explícita do profissional
- [ ] Descarte de mensagens com informação de saúde antes da extração
- [ ] Sugestões de perguntas frequentes e de tom de voz para aprovar

### E-25 Assinatura
Spec: `05-agenda-e-pagamentos.md` (assinatura do SaaS).
- [ ] Interface `BillingProvider` e cliente Asaas próprio com tipos Zod
- [ ] Teste de 14 dias, assinatura, troca de plano, cancelamento pelo cliente
- [ ] Webhook idempotente e reconciliação diária
- [ ] Excedente calculado do nosso lado e lançado na fatura seguinte
- [ ] Régua de inadimplência até o modo restrito
- [ ] Nota fiscal de serviço
- [ ] Ciclo completo no sandbox

### E-26 Produção
Spec: `02-arquitetura.md` (RN-10 a RN-16), `06-seguranca-e-lgpd.md`.
- [ ] Escolher o provedor pelos critérios da especificação
- [ ] API, worker, Postgres e gateway na rede privada; deploy automatizado
- [ ] Arquivamento de WAL no R2, backup completo e diferencial, cifrados
- [ ] Script de restauração em ponto no tempo num servidor descartável, executado com sucesso
- [ ] Alertas: WAL atrasado, disco, fila parada, canal desconectado, falha de entrega, erro de webhook
- [ ] Segredos em cofre; Sentry e Axiom sem conteúdo de mensagem
- [ ] Procedimento de incidente e de recuperação total, escritos
- [ ] Teste de carga: rajada de webhooks de 100 clientes

### E-27 Painel do operador
- [ ] Lista de clientes com plano, estado das integrações e uso
- [ ] Custo real por cliente e por conversa, comparado à planilha
- [ ] Conversas com falha, descarte ou reprovação na validação
- [ ] Acesso a um tenant com motivo, prazo e auditoria (RN-35)
- [ ] Painel do pg-boss (`@pg-boss/dashboard`) só para o operador (movido de E-05: o papel de operador nasce aqui)

### E-28 Piloto
- [ ] Configurar a conta do piloto junto com ele e medir o tempo gasto
- [ ] Uma semana em "aprovar antes de enviar"; depois automático, se ele quiser
- [ ] Revisão semanal de conversas, custos e perguntas sem resposta
- [ ] Coletar os indicadores do piloto e o número de faltas antes e depois
- [ ] A-16 e A-19 medidos em produção
- [ ] Depoimento com autorização escrita

### E-28b Aprovação seletiva
- [ ] Rotular uma amostra das conversas do piloto
- [ ] Medir acerto e calibração do juízo de confiança
- [ ] Escolher o limiar, registrar na especificação e liberar como quarto nível de autonomia

---

## Trilha — Site, aquisição e suporte

Spec: `09-site-aquisicao-suporte.md`.

### S-01 Site e lista de espera
- [ ] `apps/site` em Astro no Cloudflare Pages, com os tokens do `DESIGN.md`
- [ ] Página inicial com os blocos da especificação, sem depoimento ou número inventado
- [ ] Lista de espera com Turnstile e confirmação por e-mail
- [ ] Medição de uso e banner de consentimento
- [ ] CI com Lighthouse: LCP abaixo de 2 segundos, acessibilidade 95 ou mais
- [ ] Revisão com `impeccable`

### S-02 Páginas legais
- [ ] Termos, privacidade, contrato de operador, suboperadores, cookies, a partir das minutas de E-00e

### S-03 Número de demonstração
- [ ] Tenant de consultório fictício num número nosso, pela conexão oficial
- [ ] Limites contra abuso e aviso de que é demonstração
- [ ] Botão e QR code no site

### S-04 Preços e calculadora
- [ ] Fonte única de planos e preços lida pelo site e pelo painel
- [ ] Página de preços com franquia, excedente e estimativa de gasto na Meta
- [ ] Calculadora de receita perdida

### S-05 Cadastro sozinho
- [ ] Teste de 14 dias sem cartão, com os limites de RF-81
- [ ] Lembretes de abandono em 1 e 3 dias e oferta de configuração assistida
- [ ] Funil medido passo a passo
- [ ] Fim do teste: assistente em "desligado", dados preservados por 30 dias

### S-06 Central de ajuda e status
- [ ] Artigos em Markdown para cada passo do onboarding e cada alerta
- [ ] Busca
- [ ] Página de status com histórico

### S-07 Suporte pelo próprio produto
- [ ] Tenant de suporte com a central de ajuda como base de conhecimento
- [ ] Botão no painel que abre o suporte com o contexto da conta
- [ ] Transferência para nós pelo inbox

### S-08 Busca
- [ ] Sitemap, canônicas, dados estruturados, imagens de compartilhamento, `llms.txt`
- [ ] Página da primeira especialidade e de três problemas
- [ ] Search Console configurado
