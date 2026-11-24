# 04 — Agentes e IA

Fontes: [pesquisa 02](../research/02-llm-voz-custos.md).

## Um agente de conversa, não nove

O master prompt lista nove agentes e ao mesmo tempo pede que não haja uma chamada de LLM por agente a cada mensagem. As duas coisas se resolvem assim:

| Agente candidato | Vira | Motivo |
|---|---|---|
| Reception, Qualification | Instruções do agente de conversa | São o próprio diálogo |
| Knowledge | Base no prompt + ferramenta `registrar_duvida_sem_resposta` | Base pequena cabe no contexto em cache |
| Scheduling | Ferramentas de agenda | A regra está no código, não no modelo |
| Payment | Ferramentas de cobrança (módulo Pro) | O pagamento é confirmado por webhook |
| Follow-up | Agendador + templates; o modelo só redige dentro da janela | Maior parte é determinística |
| Voice | Pré-processamento (transcrição) e pós-processamento (síntese) | Não decide nada |
| Quality Supervisor | Tarefa em lote, assíncrona | Não está no caminho da resposta |
| Business Intelligence | Consultas SQL + resumo em lote | Os números vêm do banco |

"Agente" no código é uma definição declarativa. Há três: `conversation`, `quality_review`, `insights`.

```ts
interface AgentDefinition {
  id: 'conversation' | 'quality_review' | 'insights'
  task: TaskType                 // usado pelo roteamento de modelo
  tools: ToolName[]              // filtradas pelo plano e pela política do tenant
  maxSteps: number               // chamadas de ferramenta por turno
  timeoutMs: number
  maxCostMicroUsd: number        // por execução
  fallback: 'retry_other_model' | 'handoff' | 'skip'
}
```

| Agente | Passos | Timeout | Teto de custo | Falha |
|---|---|---|---|---|
| `conversation` | 5 | 40 s | US$ 0,05 por turno; US$ 0,30 por conversa | Tenta outro modelo uma vez; depois transfere para humano |

Teto mensal de IA por tenant: US$ 15 como padrão conservador, ajustável por cliente (hipótese adotada na E-06; rever com o custo real do piloto).
| `quality_review` | 1 | 120 s | US$ 0,02 por conversa avaliada | Pula e registra |
| `insights` | 3 | 300 s | US$ 0,20 por relatório | Pula e registra |

Reavaliar a divisão em mais agentes só se a avaliação mostrar que o prompt único degrada com todos os módulos ligados.

## Fluxo de um turno

1. **Pré-filtros determinísticos**, sem modelo:
   - conversa em `human` → não gera turno;
   - opt-out → registra e encerra;
   - só figurinha ou tipo não suportado → resposta fixa ou nada;
   - franquia e tetos estourados → resposta fixa e notificação;
   - termos de urgência (lista por especialidade) → resposta fixa de emergência, transferência e notificação.
2. **Montagem do contexto** (abaixo).
3. **Uma chamada principal** com ferramentas. O modelo pode encadear até 5 passos.
4. **Validação da saída** (abaixo). Reprovou: uma nova tentativa com a correção; reprovou de novo: transfere.
5. **Entrega** pela `NaturalResponseDelivery` com trava de envio.
6. **Registro** de tokens, custo e traço.

Não há chamada separada de classificação de intenção. O modelo principal já decide o fluxo ao escolher a ferramenta. `ponytail:` adicionar classificador só se o custo do modelo principal subir a ponto de compensar.

## Contexto do prompt

Ordenado do mais estável para o mais volátil, para aproveitar o cache:

1. Regras da plataforma (iguais para todos): limites, segurança, formato.
2. Política da especialidade.
3. Perfil do tenant: identificação do assistente, tom de voz, exemplos de mensagens reais do profissional, serviços e preços, endereço e instruções, regras de agenda em linguagem natural, base de conhecimento.
4. Definições das ferramentas.
5. Estado da conversa: data e hora atual no fuso do tenant, dados do contato, agendamentos futuros dele, resumo do que foi feito em turnos anteriores.
6. Histórico recente (últimas 20 mensagens; acima disso, resumo).

Blocos 1 a 4 são marcados para cache. Preços aparecem no prompt para dar fluidez, mas a validação de saída é quem garante o valor.

O cache mais barato expira em 5 minutos. Paciente costuma demorar mais que isso. O modelo financeiro assume cache perdido em boa parte dos turnos. Verificar se o provedor escolhido oferece TTL de 1 hora e se compensa.

Implementação (E-13, 24/11/2026):

- O prompt de produção fica em `packages/ai/src/agent` (`conversationBlocks`) e recebe um perfil tipado. A bateria da E-07 monta o perfil da clínica fictícia e chama a mesma função: avaliar é sempre avaliar o prompt de produção.
- Nível de autonomia e nome do assistente ficam no tenant (`autonomy`, padrão `approve`; `assistant_name`). Em `approve`, o turno grava `turns.draft_text` e não envia; a aprovação entra com o inbox (E-16). Respostas fixas (urgência, opt-out) saem sem esperar aprovação.
- A ferramenta de transferência só marca a intenção. O turno troca o controle sob a trava de envio, depois de mandar o aviso ao paciente (RF-35); senão a própria troca descartaria o aviso.
- Identificação: se a primeira resposta da conversa não trouxer o nome do assistente, a frase de apresentação é acrescentada no início, de forma determinística.

- Desenvolvimento sem custo: `AI_DEV_PROVIDER=groq` troca as rotas para modelos gratuitos do Groq (`openai/gpt-oss-120b`, `gpt-oss-20b`, `whisper-large-v3-turbo`), com custo registrado zero. Recusado em produção. Serve para testar o fluxo; a escolha de modelo e a bateria continuam nos candidatos de produção. `pnpm dev:patient "mensagem"` simula um paciente pelo webhook assinado.

## Ferramentas

Todas têm schema Zod, validam `tenant_id` pelo contexto (nunca por argumento do modelo) e devolvem resultado estruturado. O modelo só pode afirmar que algo foi feito se a ferramenta devolveu sucesso.

| Ferramenta | Plano | Efeito |
|---|---|---|
| `consultar_horarios(servico, a_partir_de, periodo?)` | Agenda | Lê disponibilidade calculada; devolve até 6 opções |
| `agendar(servico, inicio, nome_paciente)` | Agenda | Cria agendamento; falha com `slot_taken` se houver conflito |
| `remarcar(agendamento, novo_inicio)` | Agenda | Transação: cria o novo e cancela o antigo |
| `cancelar(agendamento, motivo?)` | Agenda | Cancela; respeita antecedência mínima configurada |
| `listar_agendamentos_do_paciente()` | Agenda | Só os do contato atual |
| `criar_cobranca_sinal(agendamento)` | Pro | Cria cobrança Pix; devolve código copia e cola |
| `consultar_pagamento(agendamento)` | Pro | Lê status gravado pelo webhook |
| `transferir_para_humano(motivo)` | Todos | Muda controle e notifica |
| `registrar_duvida_sem_resposta(pergunta)` | Todos | Alimenta a lista "perguntas que o assistente não soube" |
| `atualizar_nome_do_contato(nome)` | Todos | Único dado de cadastro que o modelo altera |

Regras:

- `agendar`, `remarcar`, `cancelar` e `criar_cobranca_sinal` exigem que a mensagem anterior do paciente seja uma confirmação. O código confere que o turno anterior do assistente propôs exatamente aquele horário e serviço; não confere, a ferramenta devolve `needs_confirmation`.
- Ferramentas de escrita são idempotentes por `(turn_id, nome, argumentos)`.
- Não há ferramenta para alterar preço, serviço, disponibilidade ou configuração.

## Validação da saída

Determinística, antes do envio:

| Verificação | Ação se falhar |
|---|---|
| Todo valor em reais no texto existe no catálogo do tenant ou veio de ferramenta neste turno | Regerar; depois transferir |
| Toda data e hora citada como disponível ou agendada veio de ferramenta neste turno ou de agendamento existente | Regerar; depois transferir |
| Afirmação de agendamento, cancelamento ou pagamento confirmado tem resultado de ferramenta correspondente | Regerar; depois transferir |
| Especialidade proíbe preço e o texto contém valor | Remover e regerar |
| Termos proibidos da especialidade e termos clínicos de conduta (lista) | Regerar |
| Tamanho acima de 900 caracteres | Regerar pedindo concisão |
| Texto vazio ou com marcação de sistema | Regerar |

Implementação (E-14, 24/11/2026): `validateReply` em `packages/ai/src/agent/validate.ts`, função pura usada pelo agente. Horários permitidos: os que vieram de ferramenta neste turno e os que o próprio tenant escreveu no cadastro (horário de atendimento, base de conhecimento, instruções). Datas citadas ainda não são conferidas (entra com a agenda, E-19). Reprovou, uma nova tentativa recebe a lista do que foi barrado; reprovou de novo, a conversa vai para o profissional com o aviso fixo. Depois das regras, o Jev confere orientação clínica na resposta (limiar 0,85) e urgência na mensagem do paciente (0,50); fora do ar, valem só as regras.

## Juízos tipados (Jev)

Decisão de 24/11/2026: adotar o Jev (TypeSafe) como modelo de juízo, atrás do AI Gateway, na tarefa `judge`. Ele não gera texto: recebe um estado e perguntas, e devolve respostas tipadas com probabilidade (sim ou não, escolha entre opções, nota em escala). Não substitui o modelo de conversa.

Fatos verificados na documentação oficial em 24/11/2026: US$ 0,042 por milhão de tokens de entrada, saída gratuita; 64 mil tokens por requisição; várias perguntas sobre o mesmo estado rodam em paralelo numa requisição; não treina com dados de clientes; processamento nos Estados Unidos; retenção zero só para clientes enterprise; disponível pelo Vercel AI SDK. Não verificado: latência e qualidade em português.

Custo: um juízo sobre 1.500 tokens custa US$ 0,00006. Mesmo com três requisições por turno, soma menos de 5% do custo da conversa.

| Uso | Onde entra | Substitui ou complementa |
|---|---|---|
| Urgência, pedido de humano, opt-out, assunto fora do escopo | Pré-filtros | Complementa as listas de palavras, que continuam como piso |
| "O paciente confirmou exatamente o horário proposto?" | Ferramentas de escrita | Substitui a heurística de confirmação |
| "A resposta contém orientação clínica, promessa de resultado ou afirma algo que nenhuma ferramenta fez?" | Validação de saída | Complementa as regras de preço e data, que seguem determinísticas |
| Probabilidade de a resposta estar correta e dentro do escopo | Nível de autonomia | Permite um quarto comportamento: enviar sozinho quando a confiança é alta e pedir aprovação quando é baixa |
| Escalada para o modelo intermediário | AI Gateway | Complementa os gatilhos fixos |
| Nota de qualidade por conversa | `quality_review` | Permite avaliar 100% das conversas em vez de amostra |
| Mensagem contém informação de saúde? | Onboarding pelo histórico e minimização (RN-21) | Descarta antes de extrair perguntas frequentes |
| Origem do paciente, frustração | Relatórios e transferência | Novo |

Regras:

- **Falha segura.** Jev fora do ar ou lento (acima de 2 segundos) não bloqueia o turno: valem as regras determinísticas e, na dúvida, o comportamento mais conservador (pedir aprovação ou transferir).
- **Limiares calibrados nos nossos dados.** Nenhum limiar de exemplo da documentação é adotado sem medir. A bateria de avaliação ganha casos rotulados para cada pergunta, em português, e mede acerto e calibração antes de o juízo valer em produção.
- **Regras exatas ficam no código.** Preço, data, horário e pagamento nunca dependem de juízo probabilístico.
- **Suboperador.** Entra na lista de suboperadores e na transferência internacional ([06](06-seguranca-e-lgpd.md)). O estado enviado segue a minimização: só o trecho necessário da conversa.
- **Modelo novo** (lançado em setembro de 2026). A interface `judge` do AI Gateway permite trocar por um LLM econômico com saída estruturada se o Jev não passar na avaliação.

## Proteções

- **Injeção de prompt:** mensagens do paciente, transcrições e conteúdo da base de conhecimento entram como dados, delimitados. O perigo real é limitado pelo desenho: o modelo não tem ferramenta que leia dados de outro contato, altere configuração ou envie mensagem a terceiros.
- **Conteúdo de documentos não sobrepõe regras.** A base de conhecimento fica abaixo das regras da plataforma e da especialidade, e a validação de saída independe do que o documento diz.
- **Sem orientação clínica.** O assistente acolhe em uma frase e oferece agendamento ou transferência. Não registra sintoma em campo estruturado.
- **Identificação.** Conforme o modo do cliente ([01](01-produto-e-planos.md), "Limites do produto"): no modo `assistant`, a primeira mensagem de cada conversa nova traz a identificação do assistente virtual; no `clinic`, diz que é do consultório; no `professional`, não se apresenta. Em todos, perguntado diretamente se é humano ou o profissional, diz a verdade.
- **Escopo.** Assunto fora do consultório recebe recusa curta. A política da Meta proíbe assistente de uso geral.

## AI Gateway interno

Módulo `packages/ai`, fino, sobre o Vercel AI SDK. Os modelos são chamados pelo Vercel AI Gateway (decisão do dono em 24/11/2026, na E-06): uma chave só para todos os provedores, preço de tabela do provedor sem acréscimo, pedido de não retenção (`zeroDataRetention`) em toda chamada. Custos aceitos: um salto e um ponto de falha a mais, e a Vercel entra na lista de suboperadores ([06](06-seguranca-e-lgpd.md)). Roteamento, reserva, tetos e medição continuam no nosso módulo. O Jev fica fora do gateway, com chave própria.

```ts
type TaskType = 'conversation' | 'conversation_escalated' | 'judge' | 'summarize' | 'quality_review' | 'insights' | 'transcribe' | 'embed' | 'tts'

interface AiGateway {
  generate(req: {
    task: TaskType
    tenantId: string
    conversationId?: string
    turnId?: string
    system: CacheableBlock[]
    messages: Message[]
    tools?: ToolSet
    maxSteps?: number
  }): Promise<{ text: string; toolCalls: ToolCallRecord[]; usage: Usage; model: string }>
  transcribe(req: { tenantId: string; audio: Buffer; mime: string }): Promise<{ text: string; seconds: number }>
  // Typed judgments. Returns null per question on timeout or provider failure; callers must fail safe.
  judge<Q extends Record<string, JudgeQuestion>>(req: {
    tenantId: string
    conversationId?: string
    state: unknown
    questions: Q
    timeoutMs?: number
  }): Promise<{ [K in keyof Q]: JudgeAnswer<Q[K]> | null }>
}
```

Responsabilidades:

- **Roteamento:** tabela `task → [modelo principal, modelo de reserva]` em configuração, alterável sem deploy.
- **Reserva:** timeout, erro 5xx ou limite de taxa trocam para o modelo de reserva, de outro provedor. Nova tentativa só quando nenhuma ferramenta de escrita foi executada, ou com as execuções já feitas preservadas no contexto.
- **Orçamento:** confere tetos por turno, conversa e tenant antes de chamar.
- **Medição:** grava `ai_usage` com tokens de entrada, cache lido, cache escrito, saída, raciocínio, e custo calculado por tabela de preços versionada.
- **Controle de raciocínio:** esforço baixo ou desligado nas tarefas de conversa. Tokens de raciocínio são cobrados como saída.
- **Privacidade:** opção de não retenção quando o provedor oferece; nunca usar tier gratuito que treina com os dados.

## Modelos

Preços por milhão de tokens (entrada / cache lido / saída), conforme a pesquisa:

| Tarefa | Candidato principal | Reserva | Observação |
|---|---|---|---|
| Conversa | GPT-6 Luna (0,10 / 0,01 / 0,50) | Claude Haiku 5.5 (0,10 / 0,01 / 0,50) | Escolha provisória da E-07. Reserva em outro provedor e com o mesmo preço (dono, 24/11/2026): queda da OpenAI não multiplica a conta. A segurança mais fraca do Haiku fica coberta pelas travas que não dependem do modelo |
| Conversa escalada | GPT-6.1 Terra (1,00 / 0,05 / 5,00) | Claude Sonnet 5.5 (2,00 / 0,10 / 10,00) | Ver gatilhos abaixo |
| Resumo de histórico | GPT-6 Luna | Claude Haiku 5.5 (0,10 / 0,01 / 0,50) | |
| Avaliação de qualidade e insights | GPT-6.2 Sol (2,00 / 0,10 / 10,00) | Claude Sonnet 5.5 | Candidato incluído pelo dono em 24/11/2026; amostragem |
| Transcrição | `openai/gpt-transcribe` pelo gateway (US$ 0,0045 por minuto) | — | O Groq Whisper turbo custa US$ 0,00067 por minuto mas não está no gateway; reavaliar na E-10 com o volume de áudio do piloto |
| Embeddings | Adiado | — | Só com o módulo de documentos |
| Síntese de voz | Adiado | — | Módulo de voz |
| Áudio em tempo real | Fora do escopo | — | Telefonia |

Gatilhos de escalada para o modelo intermediário: validação de saída reprovou uma vez; ferramenta devolveu erro duas vezes no turno; conversa passou de 12 turnos sem agendamento nem transferência.

**Não fixar o modelo por tabela de preço.** A pesquisa não achou evidência confiável de qualidade em português nem de confiabilidade de chamada de ferramentas. A escolha sai da avaliação abaixo. Fable 5.2 e modelos de topo não são usados em atendimento.

Residência de dados: nenhum provedor processa de ponta a ponta no Brasil. Tratar como transferência internacional (ver [06](06-seguranca-e-lgpd.md)).

## Avaliação

### Antes de produção

- **Conjunto de casos:** no mínimo 80 conversas roteirizadas em pt-BR, com gíria, erro de digitação, mensagens picadas e áudio transcrito. Cobrem: preço, horário, agendar, remarcar, cancelar, endereço, pergunta sem resposta, pedido de humano, sintoma, urgência, assunto fora do escopo, tentativa de manipulação, pedido de desconto, horário inexistente, conflito de agenda, especialidade que proíbe preço.
- **Simulador de paciente:** um modelo faz o papel do paciente com objetivo e persona definidos, contra um tenant de teste com agenda fictícia.
- **Verificações automáticas por caso:** ferramenta certa chamada, argumentos corretos, nenhuma reprovação na validação de saída, estado final esperado no banco (agendamento existe ou não).
- **Nota por modelo avaliador** só para tom e naturalidade, com revisão humana de amostra.
- **Critério de liberação:** 100% nos casos de segurança (sintoma, urgência, manipulação, preço proibido); 95% ou mais nos casos de agenda; custo médio por conversa dentro do previsto em [07](07-custos.md).
- A mesma bateria compara os modelos candidatos e roda a cada mudança de prompt, ferramenta ou modelo.

### Resultado da avaliação (E-07, 24/11/2026)

Bateria de 80 casos por modelo, simulador `google/gemini-3.1-flash-lite`, avaliador `openai/gpt-6.2-sol`. Rodada válida com cada caso uma vez; prompt em rascunho (`packages/ai/eval/prompt.ts`). Resumo em [docs/eval/2026-11-24.md](../../docs/eval/2026-11-24.md).

| Modelo | Segurança | Agenda | Atendimento | Custo médio por conversa |
|---|---|---|---|---|
| GPT-6 Luna | 19/20 | 30/30 | 26/30 | US$ 0,0002 |
| GPT-6.2 Sol | 19/20 | 29/30 | 24/30 | US$ 0,0037 |
| GPT-6.1 Terra | 18/20 | 27/30 | 27/30 | US$ 0,0021 |
| Claude Sonnet 5.5 | 17/20 | 26/30 | 23/30 | US$ 0,0104 |
| Gemini 3.8 Flash | 13/20 | 28/30 | 17/30 | US$ 0,0063 |
| Claude Haiku 5.5 | 12/20 | 27/30 | 16/30 | US$ 0,0006 |

- Nenhum modelo atingiu 100% em segurança. A falha mais comum era citar valor calculado (por sessão do pacote, diferença, soma); o prompt passou a proibir, e a validação de saída já barra.
- Escolha provisória: Luna na conversa com Haiku de reserva, Terra na escalada, Sol na avaliação de qualidade (hipótese H-12). Reservas baratas a testar na rodada final: Qwen 3.8 Flash, Mistral Small, Gemini 3.1 Flash-Lite. Confirmar com a rodada final (cada caso duas vezes) antes do piloto.
- Variação entre rodadas é grande com 5 casos por categoria (Sonnet foi de 60% para 83% entre duas rodadas): decidir com `--repeat 2` ou mais.
- Toda rodada custa dinheiro: estimar e pedir aprovação do dono antes; o runner tem teto (`--max-usd`, padrão US$ 1) e para quando o gateway fica sem crédito.

**Jev em português: passou.** 82 casos rotulados em 8 perguntas, latência p50 0,2 s e p95 0,4 s (dentro dos 2 s). Limiares medidos, para valer em produção:

| Pergunta | Limiar | Acerto | Observação |
|---|---|---|---|
| urgente | 0,50 | 100% | Sem falso negativo; a lista de palavras continua como piso |
| pede_humano | 0,70 | 100% | |
| opt_out | 0,30 | 90% | Confunde "pare de me lembrar desta consulta" com sair da lista; pedir confirmação antes de descadastrar |
| fora_do_escopo | 0,55 | 100% | |
| confirmou_horario | 0,35 | 100% | Ferramentas de escrita seguem exigindo a conferência determinística |
| orientacao_clinica | 0,85 | 90% | Marca o encaminhamento ao SAMU como orientação; combinar com a regra de urgência |
| informacao_de_saude | 0,60 | 100% | |
| frustracao | 0,65 | 100% | |

O limiar é o meio da faixa de maior acerto (mais margem dos dois lados). Com 10 a 12 casos por pergunta, recalibrar com dados do piloto.

### Em produção

- `quality_review` avalia em lote uma amostra (padrão 10% das conversas, 100% das que tiveram transferência ou reprovação na validação): resposta sem fonte, tom, oportunidade perdida de agendar.
- Indicadores por tenant: taxa de agendamento por conversa, taxa de transferência, perguntas sem resposta, respostas descartadas, custo por conversa, tempo até a primeira resposta.
- Traços no Langfuse com telefone e nome mascarados. A máscara roda no nosso processo, antes do envio: telefone por padrão; nome pela lista de nomes que cada chamada declara (nome completo e cada parte), guardada por 10 minutos. Cobre a entrada e a saída das observações e os atributos `gen_ai.*` do AI SDK, que a máscara do SDK do Langfuse não alcança. Metadados de traço levam só ids. Um traço por chamada de tarefa, nomeado pela tarefa, com a conversa como sessão.
- `insights` gera resumo mensal a partir de consultas SQL. Todo número exibido vem de consulta; o modelo só redige.

## Tom de voz

- No onboarding o profissional cola de 5 a 15 mensagens reais dele e responde a 4 perguntas (formal ou informal, usa emoji, como cumprimenta, como se despede).
- Isso vira um bloco de estilo com exemplos. Não se faz fine-tuning.
- O painel tem um simulador: o profissional conversa com o assistente antes de ativar.
