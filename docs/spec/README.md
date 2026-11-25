# Especificação — Consultório Aberto: recepção com IA para profissionais de saúde

Data de referência: 24/11/2026. Status: v1.0, fechada para implementação. Mudanças a partir daqui entram no mesmo PR do código que as motiva.

Esta pasta é a especificação do produto (spec-driven development). Nada foi implementado. O master prompt recebido estava cortado no meio da seção 9; o que vinha depois não está coberto.

## Como ler

| Arquivo | Conteúdo |
|---|---|
| [01-produto-e-planos.md](01-produto-e-planos.md) | Escopo, personas, planos, módulos, MVP |
| [02-arquitetura.md](02-arquitetura.md) | Decisões de stack, componentes, multi-tenancy, modelo de dados |
| [03-whatsapp-e-conversa.md](03-whatsapp-e-conversa.md) | Canal, normalização, entrega natural, controle humano |
| [04-agentes-e-ia.md](04-agentes-e-ia.md) | Arquitetura de agentes, AI Gateway, modelos, proteções, avaliação |
| [05-agenda-e-pagamentos.md](05-agenda-e-pagamentos.md) | Agendamento, Google Calendar, Pix, assinatura |
| [06-seguranca-e-lgpd.md](06-seguranca-e-lgpd.md) | Isolamento, LGPD, regras por especialidade, auditoria |
| [07-custos.md](07-custos.md) | Modelo financeiro; planilha em [custos.xlsx](custos.xlsx) |
| [08-roadmap-e-aceite.md](08-roadmap-e-aceite.md) | Fases, critérios de aceite, testes, riscos |
| [09-site-aquisicao-suporte.md](09-site-aquisicao-suporte.md) | Site, SEO, cadastro sozinho, central de ajuda, suporte |
| [10-painel-e-interface.md](10-painel-e-interface.md) | Telas do painel, navegação, estados, notificações, processo de design |
| [../plan/IMPLEMENTACAO.md](../plan/IMPLEMENTACAO.md) | Fases, etapas, decisões e diferenciais |
| [../plan/TASKS.md](../plan/TASKS.md) | Tarefas de cada etapa do MVP |
| [../research/](../research/) | Pesquisas com fontes e itens não verificados |

Requisitos têm identificador (`RF-` funcional, `RN-` não funcional). Hipóteses têm identificador `H-` e estão listadas abaixo.

## Decisões principais

| Tema | Decisão | Motivo curto |
|---|---|---|
| WhatsApp | Duas conexões: oficial (Cloud API, coexistência, Embedded Signup), que é o padrão, e por QR code (não oficial, gateway com motor whatsmeow; WAHA GOWS no piloto), com termo de ciência do risco e sem mensagens ativas em massa | A oficial não tem risco de bloqueio; a por QR code ativa na hora e não depende da Meta. Ver [03](03-whatsapp-e-conversa.md) |
| Agentes | Um agente de conversa com ferramentas; supervisão e relatórios em lote | Uma chamada de LLM por turno; multiagente aqui só soma custo e latência |
| Modelo | Tier econômico como principal, tier intermediário para escalada, escolhidos por avaliação própria | Não há benchmark confiável em pt-BR |
| Fonte da verdade | Postgres para preços, horários, agendamentos e pagamentos | A IA lê por ferramenta e nunca decide esses dados |
| Banco | Postgres em servidor próprio no Brasil, backup contínuo (WAL) no R2, schema compartilhado, `tenant_id` + RLS | Mais barato no início; Postgres puro permite migrar para gerenciado depois. Requisitos RN-10 a RN-16 em [02](02-arquitetura.md) |
| Juízos | Jev (TypeSafe) para decisões tipadas com probabilidade: urgência, confirmação, validação semântica, confiança da resposta | US$ 0,042 por milhão de tokens; falha segura; sujeito a passar na avaliação em português |
| Autonomia | Três níveis por cliente: automático, aprovar antes de enviar, desligado | Um só produto; não há robô de menu separado |
| ORM | Prisma 7 com adaptador `pg`; RLS, constraints e tipos que o Prisma não modela em migration SQL | Decisão do dono em 24/11/2026, na E-02 |
| Execução | Fastify em contêineres (API e worker) em servidor no Brasil, na mesma rede privada do Postgres; fila pg-boss | BullMQ não roda em Workers; Redis fica para quando a fila pedir |
| Conhecimento | Base inteira no prompt em cache; pgvector só acima de ~15 mil tokens | Base de profissional solo é pequena |
| Pagamentos | Assinatura: Asaas. Sinal Pix do paciente: Mercado Pago por OAuth na conta do próprio profissional, ou chave Pix dele com confirmação manual | O dinheiro do paciente não passa pela nossa conta. Ver [pesquisa 06](../research/06-pagamentos.md) |
| Voz | Transcrição de áudio no MVP; resposta em áudio e voz clonada do próprio profissional na Fase 5, com termo de consentimento | Custo baixo na entrada; o paciente segue informado de que é assistente virtual |
| Linguagem | TypeScript em Node | Carga de espera, não de CPU; Go ou Rust não mudam o gargalo. Ver [plano](../plan/IMPLEMENTACAO.md) |
| Telefonia | Fora do roadmap inicial | Calling API é incompatível com coexistência |

## Onde discordo do master prompt

1. **Nove agentes viram um.** Reception, Knowledge, Scheduling, Qualification e Payment são ferramentas e blocos de instrução do mesmo agente. Follow-up é agendador com templates. Voice é pré e pós-processamento. Só Quality Supervisor e Business Intelligence são execuções separadas, em lote. Detalhe em [04](04-agentes-e-ia.md).
2. **Redis, BullMQ e Cloudflare Workers saem do início.** pg-boss no Postgres cobre o volume até cerca de 1.000 clientes.
3. **RAG vetorial sai do MVP.** Entra com o módulo de documentos.
4. **API não oficial entrou como segunda conexão**, por decisão posterior, contra o princípio 11 do master prompt. Fica como opção com termo de ciência; a oficial segue como padrão.
5. **Dividir a resposta em várias mensagens custa dinheiro.** Desde 01/10/2026 a Meta cobra R$ 0,035 por mensagem de atendimento acima de 1.000 por mês por número. A entrega natural privilegia uma mensagem por turno.
6. **A mensagem atual do piloto pede "o que está sentindo".** A política da Meta e a LGPD recomendam que o agente não solicite informação de saúde. O agente trata só do administrativo.

## Hipóteses a validar com o cliente piloto

| ID | Hipótese | Impacto se falsa | Como validar |
|---|---|---|---|
| H-01 | Usa WhatsApp Business (app) no número de atendimento | Sem coexistência; precisa migrar para o app Business antes | Perguntar e pedir captura da tela de configurações |
| H-02 | Aceita usar Google Calendar como espelho da agenda | Precisa de integração com outro sistema ou só agenda interna | Perguntar qual agenda usa hoje |
| H-03 | Não é fisioterapeuta registrado no COFFITO | Se for, divulgação de preço fica restrita | Perguntar formação e registro |
| H-04 | Recebe entre 150 e 400 conversas por mês | Muda franquia e custo de Meta | Pedir contagem aproximada de uma semana |
| H-05 | Aceita cadastrar forma de pagamento na Meta | Mensagens param após a franquia gratuita | Explicar no onboarding com estimativa de valor |
| H-06 | Aceita que o assistente se identifique como virtual na primeira mensagem | Conflito com transparência exigida; não negociável | Mostrar exemplo de conversa |
| H-07 | Sessões têm duração fixa por serviço e sem sobreposição | Precisa de regra de capacidade | Levantar serviços e durações |
| H-08 | Tem ou aceita abrir conta no Mercado Pago | Sinal Pix só com confirmação manual | Perguntar que conta usa para receber Pix hoje |
| H-09 | Câmbio de R$ 5,50 por dólar | Muda custos em reais | Atualizar na planilha |
| H-10 | Só o dono vê e altera cobrança; profissional altera integrações; recepcionista só lê integrações (RN-34, padrão conservador adotado na E-04) | Ajustar a tabela de papéis em `apps/api/src/auth/access.ts` | Perguntar ao piloto quando houver equipe |
| H-11 | Em urgência, a recepção pode dar orientação básica de segurança junto do encaminhamento ao SAMU ou CVV (não ficar sozinho, pedir que alguém acompanhe, não dirigir, não movimentar quem caiu); qualquer outra orientação de saúde segue proibida | Ajustar prompt e avaliador se o profissional discordar | Validar com o piloto |
| H-12 | Modelos provisórios da E-07: Luna na conversa com Haiku de reserva (mesmo preço), Terra na escalada, Sol na avaliação de qualidade | Trocar a tabela de roteamento (`AI_ROUTES`, sem deploy) | Rodada final da bateria com cada caso duas vezes, quando houver crédito no gateway |
| H-13 | Modo de identidade `professional` (o assistente fala em nome do profissional) é aceitável para o cliente e para o paciente, com a regra de dizer a verdade quando perguntado | Remover o modo ou exigir aviso no perfil do WhatsApp | Revisão jurídica (LGPD, CDC, conselho da especialidade) antes de oferecer o modo em escala |
| H-14 | Autonomia, identidade e nome do assistente falam com o paciente: dono e profissional alteram, recepcionista só vê (padrão conservador adotado na tela "Assistente") | Ajustar `assistant` em `apps/api/src/auth/access.ts` | Perguntar ao piloto quando houver equipe |
| H-15 | Rascunho não aprovado em 30 minutos gera um lembrete único por push; nada é enviado sozinho (RF-13). Tempo fixo no código até haver configuração por cliente | Tornar configurável por tenant | Validar com o piloto |
| H-16 | Enviar mensagem pelo painel assume a conversa (spec 10); o texto do push nunca traz conteúdo da mensagem, só o motivo e o link (RN-38) | Perguntar ao piloto se prefere ver o nome do paciente | Validar com o piloto |
| H-17 | Uso (E-18): o mês é o mês civil em UTC; "conversa" nova quando a última mensagem da conversa tem mais de 24 h; teto de excedente é em centavos por mês, vazio = sem teto, e o modo restrito começa quando o excedente passa do teto (não quando iguala); em modo restrito o assistente envia a mensagem fixa mesmo em "aprovar" e passa a conversa ao profissional (a notificação é a de transferência); avisos de 80% e 100% vão só por push (WhatsApp ao profissional fica para depois); sem previsão de fim de mês nem troca de plano na tela | Perguntar ao piloto se o mês deve seguir o ciclo de cobrança; decidir a previsão com o Asaas (E-25) | Validar com o piloto |
| H-18 | Agenda (E-23): a recepcionista vê a agenda e marca, remarca e cancela pelo painel; disponibilidade, bloqueios, férias e o horário do resumo noturno são do dono e do profissional (permissão `agenda`: `read`, `book`, `manage`). Quem marca pelo painel não fica preso à antecedência mínima de cancelamento, que existe para o paciente (RF-44) | Perguntar ao piloto se a recepção pode bloquear horários | Validar com o piloto |
| H-19 | Resumo noturno (RF-15, E-22b): dia seguinte sem atendimentos não gera notificação; o padrão é 20:00 no fuso do consultório; o push traz só a quantidade e o link, sem nome de paciente (RN-38) | Perguntar ao piloto se quer o aviso também em dia vazio | Validar com o piloto |
| H-20 | Políticas iniciais por especialidade (migration da E-24): preço proibido em fisioterapia (COFFITO restringe), psicologia (CFP não verificado) e nutrição (CFN veda); permitido só em quiropraxia (sem lei federal). Termos de urgência e proibidos são listas curtas e conservadoras, não revisadas por conselho. Modelos de serviços e respostas são exemplos fictícios, marcados "(exemplo)" e "[Exemplo, edite]" para o profissional editar | Editar a linha em `specialty_policies` e os modelos em `packages/core/src/onboarding/templates-data.ts` | Revisar a norma de cada conselho antes de abrir a especialidade (spec 01) |
| H-21 | Tradução de erros da Meta e do Google (RF-85, `provider-errors.ts`): só códigos das listas públicas que conheço (WhatsApp Cloud API, OAuth e Calendar do Google), escritos de memória e não conferidos contra a documentação viva nesta sessão; o resto cai na mensagem genérica | Acrescentar códigos em `META_ERRORS` e `GOOGLE_ERRORS` | Conferir com a documentação oficial e com erros reais quando houver conta Meta e Google (E-00b, E-00c) |
| H-22 | Onboarding (E-24): progresso salvo em `tenants.onboarding_progress`; só os passos de WhatsApp e Google podem ser pulados ("em breve"); ativar mantém a autonomia em "aprovar"; a mensagem de teste é o simulador até haver canal | Exigir WhatsApp conectado antes de ativar quando a conexão existir | Revisar quando as conexões da E-24 forem feitas |

## Pendências que bloqueiam prazo

Começar já, em paralelo à implementação, porque dependem de terceiros:

1. Verificação do negócio e App Review na Meta (Tech Provider). Exige CNPJ.
2. Verificação OAuth do Google para o escopo de calendário.
3. Conta Asaas com CNPJ, para a assinatura. Aplicativo no Mercado Pago, para o OAuth do sinal Pix.
4. Parecer jurídico: contrato de operador (DPA), cláusulas-padrão da ANPD para transferência internacional, termos de uso, termo de ciência da conexão por QR code.
5. Nome do produto e domínio.
