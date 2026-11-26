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

Fase 6 (pequenos negócios, spec 11): M-01 e M-03 antes de E-22 e de qualquer envio ativo; M-02 antes de M-04 e de segundo segmento; M-06 a M-08 em andamento em paralelo.

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
- [x] Minutas: termos de uso, aviso de privacidade, contrato de operador, lista de suboperadores (versão 1.0 aprovada pelo dono em 25/11/2026, sem advogado)
- [ ] Cláusulas-padrão da ANPD com cada provedor de IA
- [x] Termo de ciência da conexão por QR code
- [x] Termo de consentimento do piloto para depoimento e uso de números

### E-00f Nome e contas
- [ ] Escolher o nome (a skill `founder-brand` ajuda) e conferir marca no INPI
- [x] Registrar domínio; criar contas de GitHub, Cloudflare e e-mail transacional (consultorioaberto.com.br; e-mail pela Resend, `packages/core/src/trial/resend-sender.ts`)

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
- [x] Cadastro, login por e-mail e por Google, verificação de e-mail, recuperação de senha. Google entra quando houver credencial (E-00c); e-mail real pela Resend (`RESEND_API_KEY`); sem a chave vai para o log em desenvolvimento
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
- [x] Job imediato de download para o R2, com caminho por tenant e URL assinada
- [x] Novas tentativas e estado "mídia indisponível"
- [x] Transcrição pelo AI Gateway; corte em 3 minutos com aviso
- [x] Conduta por tipo de conteúdo conforme a tabela da especificação
- [ ] Transcrição real com áudio de paciente (chamada paga, precisa de aprovação): só os testes com modelo falso rodaram

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
- [x] **(teste primeiro, relógio falso)** Atraso alvo, descontando o tempo de processamento
- [x] Uma mensagem por turno; divisão em duas só nos casos previstos (sem bloco extra até existirem as ferramentas de endereço e pagamento)
- [x] Reenvio do indicador aos 20 segundos; aborto aos 45 com mensagem fixa e notificação (a notificação é Web Push, E-16)
- [ ] Indicador de digitação pelo canal real (cliente por canal, E-24); hoje o worker não envia

### E-16 Inbox
Spec: `10-painel-e-interface.md`, `DESIGN.md`.
- [x] **Bloqueio antes de qualquer paciente real:** Web Push ao profissional em urgência, transferência, turno abortado, rascunho e lembretes (chaves VAPID no `.env`; em produção o worker não sobe sem elas). A mensagem de emergência voltou a dizer "Já avisei o profissional". Mensagem no número pessoal: fora por ora (exige modelo aprovado pela Meta, E-24)
- [x] SSE no Fastify com `LISTEN/NOTIFY`, filtrado por tenant
- [x] Lista de conversas com estado de controle e não lidas
- [x] Tela da conversa com autoria (paciente, assistente, profissional); mídia e transcrição mostram aviso até existir o armazenamento de mídia (pendente)
- [x] Botões assumir e devolver; envio de mensagem pelo painel
- [x] Notificação push do PWA (service worker, assinatura por usuário e tenant, faixa de alerta para ativar)
- [x] Tela "Hoje" (o que precisa de você; atendimentos do dia esperam a agenda) e faixa de alerta no topo
- [x] Os quatro estados de cada tela (carregando, vazio, erro, com dados), conferidos em 360 px e 1280 px
- [ ] Revisão das telas com `impeccable`

### E-17 Configurações e simulador
Spec: `10-painel-e-interface.md`, `DESIGN.md`.
- [x] Serviços e valores, endereço e instruções de chegada
- [x] Base de conhecimento e lista "perguntas que o assistente não soube", com conversão em resposta num toque
- [x] Tom de voz: mensagens de exemplo e as quatro perguntas
- [x] Simulador: conversa com o assistente configurado, sem enviar nada ao WhatsApp
- [x] Auditoria das alterações

### E-18 Uso e limites
- [x] Contadores de conversa por mês e por categoria de mensagem
- [x] **(teste primeiro)** Avisos de 80% e 100%; excedente com teto; modo restrito com resposta fixa
- [x] Tela de uso do mês com estimativa de gasto na Meta

### E-18b Níveis de autonomia
Spec: `01-produto-e-planos.md` (RF-13).
- [x] **(teste primeiro)** Em "aprovar", a resposta vira rascunho e nada sai sem toque do profissional
- [x] Aprovar, editar e descartar no inbox; lembrete se ficar sem aprovação
- [x] **(teste primeiro)** Em "desligado", nenhuma chamada de LLM; mensagem fixa de ausência
- [x] Cliente novo começa em "aprovar" (padrão do banco desde a E-13)
- [x] Tela "Mais > Assistente": autonomia, identidade (com prévia da primeira mensagem e aviso no modo "como você") e nome, com auditoria; recepcionista só vê (H-14)

---

## Fase 3 — Agenda e piloto

### E-19 Disponibilidade
Spec: `05-agenda-e-pagamentos.md`.
- [x] **(teste primeiro)** `availableSlots` como função pura: regras, bloqueios, agendamentos, ocupação externa, duração, antecedência
- [x] Casos: fuso, virada de dia, serviço maior que a janela, feriado
- [x] Seleção de até 6 opções espalhadas

### E-20 Agendamentos
- [x] Migration com `btree_gist` e exclusion constraint
- [x] **(teste primeiro)** Dois agendamentos simultâneos no mesmo horário: um entra, o outro recebe `slot_taken` (A-10)
- [x] Ferramentas consultar, agendar, remarcar, cancelar e listar
- [x] **(teste primeiro)** Exigência de confirmação conferida pelo código; idempotência por turno
- [ ] Exigência de confirmação conferida pelo juízo (Jev): pede chamadas pagas; não executado
- [x] **(teste primeiro)** Remarcação atômica (A-14); antecedência mínima de cancelamento
- [ ] Bateria: casos de agenda em 95% ou mais; A-11 (pede chamadas pagas; não executada. A parte de A-11 com ferramenta forçada a falhar está coberta em `agenda-tools.test.ts`)

### E-21 Google Calendar
Decisão do dono (25/11/2026): para o piloto o **Google é a fonte oficial de disponibilidade**; sem sincronização paralela da agenda. Spec: `05-agenda-e-pagamentos.md` (seção Google Calendar). Escopos: `calendar.events.freebusy`, `calendar.events.owned`, `calendar.calendarlist.readonly`.
- [x] OAuth, escolha do calendário, tokens cifrados (AES-256-GCM, `GOOGLE_TOKEN_KEY`)
- [x] **(teste primeiro)** Oferta = regras menos `freeBusy`; nova consulta antes de gravar; reserva dupla: uma vence e o Google recebe um insert só
- [x] Escrita de evento com id determinístico (repetir não duplica) e estado "não sincronizado"; sem confirmação ao paciente se o Google falha
- [x] Remarcar e cancelar seguem o evento; painel e assistente usam o mesmo caminho
- [x] Token revogado: parar de oferecer horários, `alert()` e faixa "Reconectar" no painel (A-13)
- [ ] **Depois (não construir agora):** canal de notificação (watch) e sincronização incremental com `syncToken` em `external_busy` (A-12); job diário de renovação dos canais; tratamento de 410; alerta de conflito externo; job que repete eventos `calendar_sync = failed`
- [x] Passo do Google no onboarding (E-24) usar a seção "Google Agenda" da tela Disponibilidade Feito: a seção fica no passo de horários (H-39)
- [ ] Verificação do app no Google para uso público (E-00c; só usuários de teste conectam até lá)

### E-22 Confirmação e lembretes
- [ ] Templates por especialidade cadastrados no onboarding (conexão oficial) Feito: modelo de template (nome, idioma, corpo e variáveis) com textos pt-BR genéricos, sem termo de saúde, em `packages/core/src/reminders/templates.ts`; o envio fora da janela usa `ChannelAdapter.sendTemplate`. Falta: cadastrar na Meta (E-00b, bloqueio externo) e a tela de onboarding
- [x] Confirmação imediata; lembrete em dois tempos (RF-47) Feito: `bookAppointment` (agente e painel) grava as mensagens em `scheduled_messages` na mesma transação; remarcar e cancelar cancelam as pendentes; varredura `reminders.sweep` a cada minuto envia; deslocamentos por tenant em `tenants.reminder_offsets_minutes` (padrão 24 h e 2 h)
- [x] **(teste primeiro)** Não enviar a contato com opt-out nem para agendamento cancelado (A-15)
- [x] Opt-out determinístico por palavra (já feito no filtro `prefilter` da E-13; agora o envio ativo o respeita pelo portão)
- [x] Respostas de confirmar e remarcar tratadas pelo agente (nova ferramenta `confirmar_presenca`; "remarcar" usa `consultar_horarios` e `remarcar`, orientado em `PLATFORM_RULES`)

### E-22b Férias e agenda do dia seguinte
- [x] **(teste primeiro)** Modo férias: nenhum horário do período é oferecido; aviso ao paciente
- [x] Resumo noturno ao profissional, em horário configurável

### E-23 Agenda no painel
Spec: `10-painel-e-interface.md`, `DESIGN.md`.
- [x] Visão de dia e semana no celular (lista feita à mão em vez de Schedule-X, spec 10)
- [x] Regras de disponibilidade e bloqueios
- [x] Agendamento manual pelas mesmas regras e constraints
- [ ] Revisão com `impeccable`

### E-24 Onboarding
Spec: `09-site-aquisicao-suporte.md` (cadastro e ativação), `03` (onboarding do canal).
- [x] Fluxo de oito passos com progresso salvo (`/configuracao`; WhatsApp e Google aparecem como "em breve" e podem ser pulados)
- [x] Cadastro só por convite (H-37): convites no painel do operador (criar, copiar link, reenviar, cancelar), `/convite/:token`, cadastro por e-mail ou Google só com convite válido (uso único sob concorrência, testado), consultório aberto com o nome do convite; fluxo guiado em sequência (CPF/CNPJ, WhatsApp, Google, serviços, simulador, ativação) com barra de progresso e Voltar; ativação exige WhatsApp conectado; teste de 14 dias começa na conexão do WhatsApp (H-24); site e ajuda dizem que o acesso é por convite
- [x] Telas de criar conta, confirmar e-mail e recuperar senha no painel (a API já faz os três desde a E-04; confirmação testada de ponta a ponta no navegador em 24/11/2026) Feito: telas no painel. O passo "Seu consultório" saiu: o convite já abre o consultório (H-37).
- [x] Modelos de serviços e textos por especialidade (quiropraxia, fisioterapia, psicologia, nutrição; sem preço quando a política veda; H-20)
- [x] Conexão oficial: Embedded Signup em coexistência e checagem de pagamento na Meta (`/api/whatsapp`, Mais > Conexões e passo 6; falta o dono criar a configuração do Embedded Signup na Meta e preencher `META_APP_ID`, `META_ES_CONFIG_ID`, `META_TOKEN_KEY`)
- [ ] Conexão por QR code com o termo de ciência
- [ ] Conexão do Google
- [ ] Mensagem de teste e ativação em "aprovar antes de enviar" Feito: ativação mantém "aprovar"; teste pelo simulador. Falta: mensagem de teste pelo canal real (depende da conexão)
- [ ] Erros da Meta e do Google traduzidos para linguagem comum Feito: módulo `packages/core/src/onboarding/provider-errors.ts` com os códigos conhecidos (H-21). Ligado à tela de conexão do WhatsApp (E-24). Falta: conferir os códigos com a documentação e ligar à tela do Google
- [x] Fluxo refeito na ordem da pesquisa 09 (H-39): seis passos no próprio painel, pré-preenchimento por link ou texto colado (H-40), mensagem de boas-vindas colada, pacotes, grade de horários com sugestão, teste com perguntas sugeridas e "Boa/Ajustar", ativação com instalar e notificações, lista do Início depois da ativação. Execução roteirizada no celular (390 px) em 27 s de ponta a ponta, sem contar leitura humana
- [ ] Pessoa de fora da equipe ativa uma conta sem ajuda

### E-24b Onboarding pelo histórico (opcional)
- [ ] Autorização explícita do profissional
- [ ] Descarte de mensagens com informação de saúde antes da extração
- [ ] Sugestões de perguntas frequentes e de tom de voz para aprovar

### E-25 Assinatura
Spec: `05-agenda-e-pagamentos.md` (assinatura do SaaS).
- [x] Interface `BillingProvider` e cliente Asaas próprio com tipos Zod (`packages/core/src/billing/`); `ASAAS_API_KEY`, `ASAAS_BASE_URL` (padrão sandbox), `ASAAS_WEBHOOK_TOKEN`; sem chave, a cobrança fica desligada
- [x] Teste de 14 dias (o de S-05), assinatura, troca de plano, cancelamento pelo cliente (`/api/billing`, tela Mais > Assinatura)
- [x] Webhook idempotente (`POST /webhooks/asaas`, cabeçalho `asaas-access-token`, id do evento em `billing_events`) e reconciliação diária (fila `billing.reconcile`, 06:00 de Brasília)
- [x] Excedente calculado do nosso lado e lançado como cobrança avulsa com o vencimento da próxima fatura
- [x] Régua de inadimplência: aviso no vencimento, aviso em 3 dias, modo restrito em 7 (`status = restricted`; `isRestricted` já barra a chamada ao modelo)
- [ ] Nota fiscal de serviço
  - Feito: nada além deste registro. Falta emitir: precisa da conta Asaas real com a configuração municipal (inscrição, código de serviço, alíquota). Ponto de encaixe: `applyPayment` em `packages/db/src/billing/apply.ts`, no ramo de fatura paga. TODO: chamar a emissão da nota do Asaas (`POST /v3/invoices`) quando a conta estiver configurada.
- [x] Ciclo completo no sandbox: `node --env-file=.env apps/api/scripts/billing-sandbox.ts` (cliente, assinatura, pagamento simulado com `/sandbox/payment/{id}/confirm`, cobrança de excedente, troca de valor, cancelamento)
- Falta (precisa de conta ou servidor): cadastrar o webhook no painel do Asaas apontando para a URL pública da API com o `ASAAS_WEBHOOK_TOKEN`; chave de produção; apagar os dados 30 dias após o cancelamento ou a restrição (ainda não há rotina).

### E-26 Produção
Spec: `02-arquitetura.md` (RN-10 a RN-16), `06-seguranca-e-lgpd.md`.
- [x] Escolher o provedor pelos critérios da especificação
  - Decisão do dono (25/11/2026): o piloto roda no servidor próprio já existente (Oracle Cloud, ARM64, 2 vCPU, 12 GB), compartilhado com outros projetos; tráfego público só pelo Cloudflare Tunnel, sem porta aberta. Comparação original em `02-arquitetura.md`.
- [ ] API, worker, Postgres e gateway na rede privada; deploy automatizado
  - Feito no código: `docker/Dockerfile`, `docker/edge/` (Caddy em HTTP na rede interna), `cloudflared` no compose (Cloudflare Tunnel), `docker-compose.prod.yml` (nenhuma porta publicada, limites de memória, serviço `migrate`), `.github/workflows/deploy.yml` (imagens arm64 no runner ARM, GHCR; SSH desligado sem os segredos `DEPLOY_*`); o gateway de WhatsApp (WAHA) entra no compose quando o canal QR for ativado.
- [x] Arquivamento de WAL no R2, backup completo e diferencial, cifrados (pgBackRest, `docker/postgres/`; semanal completo, diário diferencial, 4 completos retidos)
- [x] Script de restauração em ponto no tempo num servidor descartável, executado com sucesso (`scripts/restore-pitr.sh`; ensaio completo contra MinIO local em `scripts/test-backup-drill.sh`, passou em 25/11/2026). Falta rodar contra o bucket real do R2 no primeiro deploy
- [ ] Alertas: WAL atrasado, disco, fila parada, canal desconectado, falha de entrega, erro de webhook
  - Feito no código: `alert(evento, contexto)` (log, Sentry e "Erros recentes" em `/operador`) para tarefa esgotada, falha de entrega, erro de webhook, turno abortado, erro de fila e rotina com falha; `GET /health` e `GET /ready` na API, `GET /ready` no worker (`WORKER_HEALTH_PORT`).
  - Falta (precisa de conta ou servidor): regras de alerta no Sentry/Axiom, monitor externo em `/ready`, e os alertas de WAL, disco e canal desconectado.
- [ ] Segredos em cofre; Sentry e Axiom sem conteúdo de mensagem
  - Feito no código: lista única de redação nos logs e `beforeSend` do Sentry (API, worker e painel), com testes. Falta: o cofre de segredos e criar as contas (`SENTRY_DSN`, `VITE_SENTRY_DSN`, `AXIOM_TOKEN`, `AXIOM_DATASET`).
- [ ] Retenção de `messages.text` (H-34, M-03): rotina que apaga o texto após `MESSAGE_TEXT_RETENTION_DAYS` (90) da última mensagem da conversa, mantendo os metadados, e exclusão sob pedido do titular; teste com relógio falso. Prazo final depende do parecer jurídico (E-00e)
- [ ] Procedimento de incidente e de recuperação total, escritos
  - Recuperação total e ensaio de restauração em `docs/ops/producao.md`; falta o procedimento de incidente.
- [x] Eliminação de contas encerradas após 30 dias (RF-63): rotina diária, testada (`apps/worker/src/retention`, spec 06)
- [ ] Teste de carga: rajada de webhooks de 100 clientes

### E-27 Painel do operador
- [x] Lista de clientes com plano, estado das integrações e uso
- [x] Custo real por cliente e por conversa, comparado à planilha
- [x] Conversas com falha, descarte ou reprovação na validação
- [x] Acesso a um tenant com motivo, prazo e auditoria (RN-35)
- [x] Uso da Meta por cliente (bloco na tela de uso) e agregado no painel do operador (`meta_message_usage`, spec 03)
- [ ] Painel do pg-boss (`@pg-boss/dashboard`) só para o operador (movido de E-05: o papel de operador nasce aqui)
  - Não feito: `@pg-boss/dashboard` (v1.14) existe e traz `handler` para montar em outro servidor, mas é um app React Router/Hono com servidor próprio; montá-lo atrás do guarda do Fastify não é barato. Por ora: rodar `pg-boss-dashboard` em processo separado, ligado só em localhost e acessado por túnel SSH.

### E-28 Piloto
- [ ] Configurar a conta do piloto junto com ele e medir o tempo gasto
- [ ] **Antes do primeiro paciente real:** ativar as notificações no celular do piloto, simular uma urgência e confirmar que o aviso chega. Sem aparelho com notificação ativa, a resposta de urgência não diz "Já avisei o profissional" (só orienta SAMU/CVV e diz que ele vai ver a mensagem)
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
- [x] `apps/site` em Astro no Cloudflare Pages, com os tokens do `DESIGN.md` (saída estática; `pnpm site:build`; o deploy fica para quando houver a conta e o domínio)
- [x] Página inicial com os blocos da especificação, sem depoimento ou número inventado (o botão da demonstração entra com S-03; até lá a ação principal é a lista de espera)
- [x] Lista de espera com Turnstile e confirmação por e-mail (`POST /api/waitlist`, tabela `waitlist_entries`, CORS só para `SITE_ORIGIN`)
- [ ] Medição de uso e banner de consentimento (não feito: a medição sem cookie ainda exige conta e token, por exemplo Cloudflare Web Analytics; sem medição, não há o que consentir)
- [ ] CI com Lighthouse: LCP abaixo de 2 segundos, acessibilidade 95 ou mais (não feito: exige Chrome no CI e um passo novo no workflow; as páginas são HTML estático sem fonte externa nem imagem)
- [ ] Revisão com `impeccable`

### S-02 Páginas legais
- [x] Termos, privacidade, contrato de operador, suboperadores e aviso ao paciente, renderizados de `docs/legal/` (`/termos`, `/privacidade`, `/contrato-de-operador`, `/suboperadores`, `/aviso-ao-paciente`, `/termo-conexao-qr`), com links no rodapé
- [ ] Política de cookies (só quando o site passar a usar cookies)

### S-03 Número de demonstração
- [ ] Tenant de consultório fictício num número nosso, pela conexão oficial
- [ ] Limites contra abuso e aviso de que é demonstração
- [ ] Botão e QR code no site

### S-04 Preços e calculadora
- [x] Fonte única de planos e preços lida pelo site e pelo painel (`PLANS` em `packages/core/src/plans.ts`; a implantação de R$ 497 ainda mora em `apps/site/src/lib/plans-view.ts`, hipótese da spec 07)
- [x] Página de preços com franquia, excedente e estimativa de gasto na Meta
- [x] Calculadora de receita perdida (`/calculadora` e bloco na página inicial; só repete os números digitados)

### S-05 Cadastro sozinho
- [x] Teste de 14 dias sem cartão, com os limites de RF-81 (desde 25/11/2026 começa na conexão do WhatsApp; antes disso o consultório fica em `setup`, H-24)
- [x] Lembretes de abandono em 1 e 3 dias e oferta de configuração assistida
- [x] Funil medido passo a passo
- [x] Fim do teste: assistente em "desligado", dados preservados por 30 dias

### S-06 Central de ajuda e status
- [x] Artigos em Markdown para cada passo do onboarding e cada alerta
- [x] Busca
- [x] Página de status com histórico

### S-07 Suporte pelo próprio produto
- [ ] Tenant de suporte com a central de ajuda como base de conhecimento
- [ ] Botão no painel que abre o suporte com o contexto da conta
- [ ] Transferência para nós pelo inbox

### S-08 Busca
- [ ] Sitemap, canônicas, dados estruturados, imagens de compartilhamento, `llms.txt`
- [ ] Página da primeira especialidade e de três problemas
- [ ] Search Console configurado

---

## Fase 6 — Pequenos negócios

Spec: [11-pequenos-negocios.md](../spec/11-pequenos-negocios.md). Inventário: [AUDITORIA-2026-11-25.md](AUDITORIA-2026-11-25.md). Não duplica etapas existentes: onde a capacidade já tem etapa E-xx ou S-xx, a linha só aponta para ela. "Bloqueio" é conta externa (Meta, Google, Asaas, R2, jurídico) ou código.

### Mapa sobre as etapas existentes

| Capacidade (spec 11) | Etapa existente | Situação |
|---|---|---|
| Serviços, horários, perfil de profissional | E-17, E-19 | Feitas; perfil do negócio em M-04 |
| WhatsApp assistente | E-09 (oficial, bloqueada pela Meta), E-09b (QR code, caminho do piloto) | Abertas |
| Transferência para humano, caixa de entrada | E-12, E-16 | E-12 feita; E-16 com 1 tarefa aberta |
| Agendamento e agenda no painel | E-20, E-23 | Quase feitas (E-20 com 2 e E-23 com 1 tarefa abertas); "realizado" e "faltou" em M-08 |
| Google Calendar | E-21 | MVP feito (fonte de disponibilidade); sincronização completa adiada; bloqueio Google (verificação do app) |
| Lembretes e confirmações | E-22 | Feita (PR E-22); falta o cadastro dos templates na Meta |
| Onboarding | E-24 | Em curso; passo de perfil em M-04 |
| Assinatura e produção | E-25, E-26 | Abertas; retenção e exclusão de dados em M-03 e E-26 |
| Piloto | E-28 | Aberta; métricas em M-07 |
| Follow-up, reativação, sinal Pix | Fase 4 (sem tarefas ainda) | M-10 detalha a reativação |

### M-01 Consentimento e opt-out (P0)
Spec: 11 (H-28), 03, 06. Bloqueio: código; texto do aviso, jurídico (E-00e).
- [x] **(teste primeiro)** Todo envio ativo (lembrete, follow-up, recuperação) checa `opt_out_at` e a ausência de consentimento; falha segura é não enviar Feito: `proactiveGate` (`packages/db/src/reminders/gate.ts`) lê `opt_out_at` e o último `consent_events` de categoria `all`; todo envio ativo passa por ele. Marketing exige opt-in registrado; lembrete de agendamento é transacional (H-36)
- [x] Registro de opt-in por contato: data, origem (conversa iniciada pelo cliente, formulário, importação do dono), texto exibido; migration com RLS e linha de fixture em `rls.test.ts` Feito: `consent_events` ganhou `notice_text` e as origens `form` e `owner_import` (migration `consent_optin_record`); a tabela já tinha RLS e linha de fixture; a primeira mensagem do cliente grava o opt-in de `service`. Formulário e importação ainda não existem; só a coluna e a origem estão prontas
- [x] Opt-out grava data e origem, desfaz o consentimento, aparece em Clientes; reativação só por pedido do próprio cliente Feito: a rota do painel só aceita opt-out; o cliente volta escrevendo "voltar" (pré-filtro `optIn`, grava `all`); Clientes mostra data, origem e texto. Opt-in de marketing: H-36
- [x] **(teste primeiro)** Marketing e follow-up exigem opt-in de `marketing` (`MessageCategory.marketing` em `proactiveGate`); lembrete de agendamento segue transacional (H-36)
- [x] Teste A-15 da E-22 passa a depender desta etapa
- Pronto quando: um contato com opt-out não recebe nenhum envio ativo em teste de integração, e o registro mostra quando e como consentiu.

### M-02 Template por segmento aberto (P0)
Spec: 11 ("Modelo de template"). Bloqueio: código; gasto com IA para rodar a bateria (precisa de aprovação).
- [x] Trocar o enum `Specialty` por chave aberta de template; migrar `specialty_policies` (campos `sensitivity`, `vocabulary`, `followUps`, `funnelStages`)
- [x] Tirar "profissional de saúde" de `PLATFORM_RULES`, e `CLINICAL` e urgência de `validate.ts`, para o template
- [x] **(teste primeiro)** Segmento sem saúde (`sensitivity = none`) responde sem as regras clínicas; segmento de saúde mantém todas
- [x] Quiropraxia vira só um template; os outros três de saúde seguem como estão
- [ ] Rodar de novo a bateria nos modelos candidatos de produção, com orçamento aprovado
- Pronto quando: `grep -rn "quiropraxia" packages/*/src` só acha dados de template, e os testes de validação e agente passam.

### M-03 Limite de dado de saúde (P0)
Spec: 11 ("Limite de dado de saúde"), 06. Bloqueio: código.
- [x] **(teste primeiro)** `registrar_duvida_sem_resposta`, `atualizar_nome_do_contato` e o resumo passam pelo juízo `informacao_de_saude`; se positivo não gravam o texto
- [x] Limite de tamanho nas duas ferramentas; nome só se parecer nome
  - Feito: `registrar_duvida_sem_resposta` (300 caracteres) e o resumo passam por `informacao_de_saude`; positivo ou falha do juízo = não grava, com log sem conteúdo (`health_guard.blocked`). `atualizar_nome_do_contato` grava só até 5 palavras de letras (sem número nem frase longa) e depois do mesmo juízo.
- [ ] Política de retenção do conteúdo de mensagem escrita na spec 06 e no aviso de privacidade (jurídico)
- [ ] Sem campo de nota livre em Clientes
- Pronto quando: um teste com texto clínico mostra que nada disso chega a `knowledge_items`, `conversations.summary` ou `contacts`.

### M-04 Perfil do negócio e horário no assistente (P0)
Spec: 11, 01, 09. Bloqueio: código.
- [x] Campos do perfil: descrição, telefone, site e rede social, formas de pagamento aceitas, política de cancelamento Feito: `tenants.business_profile` (H-38), tela Mais > Perfil do negócio (`/mais/perfil`), `GET/PUT /api/profile` com auditoria; também prazo de desmarcação, link de avaliação do Google, mensagem de boas-vindas e pacotes com valor exato aceito pela validação de saída
- [x] Horário de funcionamento derivado das regras de disponibilidade entra no perfil do prompt (`hours`, `cancellationRule`), com preço e horário ainda só vindos de ferramenta Feito: `packages/agent/src/profile.ts` e `hours.ts`; a pergunta "abre sábado?" na bateria ainda não foi conferida
- [x] Vários profissionais e locais no perfil, não só o primeiro Feito: `/api/locations` e `/api/professionals`; o prompt lista todos; o assistente marca só na agenda do primeiro e passa a conversa para os outros (H-38)
- [x] Passo de perfil no onboarding, com "a IA sugere, o dono aprova"; nada ativa sem aprovação do resumo Feito: passo 1 "Onde seus clientes acham você" com leitura da página, uma chamada de IA e a tela "Encontramos isto, confere?" (H-40); nada é salvo sem o toque
- [x] Texto novo da interface com "cliente" e "negócio" Feito nas telas novas (perfil e configuração guiada); as telas antigas mudam quando forem mexidas
- Pronto quando: a pergunta "abre sábado?" é respondida pelo perfil, sem ferramenta e sem "vou verificar", num caso da bateria.

### M-05 Permissões de Clientes e Resultados (P0)
Spec: 11, 06. Bloqueio: código.
- [ ] Permissões `customers` e `results` em `access.ts`; recepcionista lê e atualiza etapa, não exporta; padrão conservador, registrado como hipótese
- [ ] Teste de papéis para as rotas novas
- Pronto quando: a tabela de papéis tem as duas permissões com teste.

### M-06 Clientes, etapa do funil e origem (P0) — **em andamento**
Fatia vertical em outro PR. Spec: 11 ("Funil simples", H-25), 10.
- [x] Tela Clientes; etapa do funil com histórico; origem do contato; registros de consentimento (liga com M-01) Feito: `apps/web/src/app/customers`, com consentimento de M-01
- [x] Navegação Início, Conversas, Agenda, Clientes, Resultados, Configurações Feito: barra Início, Conversas, Agenda, Clientes e Mais (`nav-items.ts`); Resultados abre a partir de Início (`/resultados`) e Configurações fica em Mais
- Pronto quando: os critérios do PR da fatia; esta etapa só confere que M-01 e M-05 foram respeitados.

### M-07 Início e Resultados (P0) — **em andamento**
Fatia vertical em outro PR. Spec: 11 ("Métricas do piloto").
- [x] Início com "o que precisa de atenção" (substitui o texto falso de Hoje) Feito: `apps/web/src/app/home/attention-section.tsx`
- [ ] Resultados com as métricas 1 a 7, 10, 11 e 15 e a linha de base Feito: tela, rota `/resultados` e nota de linha de base. Falta: conferir cada número com a consulta de referência da spec 11
- Pronto quando: cada número da tela bate com a consulta de referência da spec 11 sobre dados fictícios.

### M-08 Realizado e faltou (P0)
Spec: 05, 11 (métrica 9). Bloqueio: código.
- [x] Rota para marcar `completed` e `no_show` (permissão `agenda: book`), com auditoria e teste Feito: `POST /api/agenda/appointments/:id/attendance` (`attendance-route.ts`), teste em `customers.test.ts`
- [ ] Botões na agenda; envia o cliente a "atendido" no funil (M-06) Feito: `AttendanceButtons` em Início e no histórico do cliente; o status "Cliente" vem derivado de compareceu (H-31). Falta: botões na tela Agenda
- Pronto quando: a taxa de falta da spec 11 sai de dados reais.

### M-09 Cancelamento com remarcação e lista de espera (P1)
Spec: 05, 11. Bloqueio: código; depende de E-22 e M-01.
- [ ] Ao cancelar, oferecer remarcação; marcar remarcação à parte (métrica 8)
- [ ] Lista de espera de horários: cliente entra, horário liberado avisa o primeiro, com checagem de opt-out; sem disparo em massa
- Pronto quando: um cancelamento libera o horário para o primeiro da lista em teste.

### M-10 Recuperação de lead e follow-up (P1)
Spec: 11, 03. Bloqueio: código; Meta para fora da janela de 24 h (E-00b); depende de M-01 e E-22.
- [ ] Regra simples: lead `conversando` sem resposta há N dias recebe uma mensagem aprovada pelo dono, uma vez
- [ ] Respeita controle humano (RF-31), opt-out e limite de envio
- Pronto quando: o envio só acontece com consentimento e o dono aprovou o texto.

### M-11 Indicação (P1)
Spec: 11 ("Modelo de indicação"), H-27. Bloqueio: código; recompensa é decisão do dono.
- [ ] Código e link por negócio assinante; registro de cadastro por código; tela mínima em Configurações
- [ ] **(teste primeiro)** Nenhum caminho de código envia mensagem a um indicado
- Pronto quando: um cadastro com código aparece como indicação do negócio que o gerou.

### M-12 Avaliações e relatório simples (P1)
Spec: 11 (métricas 13 e 14). Bloqueio: código; depende de M-08 e E-22.
- [ ] Pedido de avaliação depois do atendimento realizado, com consentimento; link do perfil público que o dono informa
- [x] Relatório semanal de uma tela, por e-mail ou push, com as métricas de Resultados Feito (H-41): segunda 08:00 no fuso do consultório, cinco linhas (conversas respondidas, agendamentos do assistente, comparecimentos, recuperado, perguntas sem resposta), e-mail ao dono e push; desliga em Mais > Notificações
- Pronto quando: o relatório do piloto sai sem número calculado à mão.

### M-13 Outros segmentos e P2 (depois do piloto)
Gerador de página, Google Meu Negócio, campanhas, automações avançadas, insights de IA, templates de outros segmentos. Sem tarefas até o piloto entregar a linha de base e a decisão do nome (H-30).

### M-14 Higiene da especificação (rápida)
- [x] Renumerar a hipótese H-23 duplicada e o buraco em H-20, varrendo as referências no código Feito: H-20 a H-24 únicas e em ordem no README; as referências no código (H-23, H-24) apontam para a linha certa
- [ ] Atualizar spec 01 e 10 com o posicionamento e a navegação novos quando a fatia M-06/M-07 fechar
### SMB-01 Clientes, Início e Resultados (fatia vertical do MVP enxuto)
- [x] Origem, log de consentimento e status derivado do cliente (migração `customers_pipeline`)
- [x] Presença (compareceu/faltou) no atendimento
- [x] API de clientes, Início e Resultados do mês, com testes
- [x] Telas Início, Clientes e Resultados; navegação de cinco itens
- [ ] Passada no navegador em 360 px e 1280 px (quatro estados por tela)

### SMB-02 Dinheiro recuperado e relatório semanal (pesquisa 09 #1 e #2)
- [x] **(teste primeiro)** Cálculo: agendados pelo assistente, "Compareceu", preço do serviço, por semana local, com o consultório fechado (`packages/db/src/results/recovered.test.ts`)
- [x] Início: "Recuperado este mês" com a contagem e "Como calculamos"; Resultados: total e detalhe por semana; "Ainda sem dados" abaixo de 5
- [x] Relatório semanal (fila `report.weekly`, migração `weekly_report`), e-mail e push, sem nome nem conteúdo; desligar em Mais
- Pronto quando: `vitest` do cálculo e do relatório passa e as telas mostram o valor com a fórmula.
