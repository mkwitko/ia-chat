# 02 - LLM, voz e custos (pesquisa em fontes oficiais)

Data da pesquisa: 2026-11-24. Escopo: recepcionista de IA no WhatsApp para profissionais de saúde autônomos (SaaS multi-tenant, Brasil).

Convenções:
- Todo número vem de página oficial do fornecedor, com URL ao lado. Tudo que não foi confirmado em fonte oficial está marcado **"não verificado"**.
- Preços em USD por 1M de tokens, salvo indicação. "Cache leitura" = tokens de entrada servidos do cache.
- Os nomes de modelos são os que as páginas oficiais listam hoje (Claude Haiku 5.5, GPT-6 Luna, Gemini 3.5 Flash-Lite etc.). Não usei conhecimento de treino para preços.
- Duas mudanças de preço já anunciadas afetam o modelo de custo (seção 1.3): Gemini 4 Carbon/Argon sobem em 01/12/2026 e Gemini 3.8 Flash sobe em 01/01/2027.

---

## 1. Preços de LLM

### 1.1 Tabela principal (tier Standard, API direta)

| Modelo | Entrada | Cache leitura | Cache escrita | Saída | Contexto | Batch | Fonte |
|---|---|---|---|---|---|---|---|
| **Claude Haiku 5.5** (≤100k tokens de prompt) | 0,10 | 0,01 | 0,125 (5 min) / 0,20 (1 h) | 0,50 | 1M | 50% (0,05 / 0,25) | [pricing](https://platform.claude.com/docs/en/about-claude/pricing), [modelo](https://platform.claude.com/docs/en/models/haiku-5-5/overview) |
| Claude Haiku 5.5 (>100k) | 0,50 | 0,05 | 0,625 / 1,00 | 2,50 | 1M | 0,25 / 1,25 | idem |
| **Claude Sonnet 5.5** | 2,00 | 0,10 | 2,50 / 4,00 | 10,00 | 1M | 50% (1 / 5) | [pricing](https://platform.claude.com/docs/en/about-claude/pricing) |
| Claude Opus 5.5 | 4,00 | 0,20 | 5,00 / 8,00 | 20,00 | 1M | 50% (2 / 10) | idem |
| Claude Fable 5.2 | 8,00 | 0,20 | 10,00 / 16,00 | 40,00 | 1M | 50% (4 / 20) | idem |
| **GPT-6 Luna** (nano/mini-class, "mais eficiente") | 0,10 | 0,01 | 0,125 (30 min) / 0,25 (12 h) | 0,50 | 1.050.000 | 50% (0,05 / 0,25) | [pricing](https://developers.openai.com/api/docs/pricing), [modelo](https://developers.openai.com/api/docs/models/gpt-6-luna) |
| **GPT-6.1 Terra** | 1,00 | 0,05 | 1,25 / 2,50 | 5,00 | não verificado | 50% (0,50 / 2,50) | [pricing](https://developers.openai.com/api/docs/pricing) |
| GPT-6.2 Sol | 2,00 | 0,10 | 2,50 / 5,00 | 10,00 | não verificado | 50% | idem |
| GPT-5.4 mini / nano (legado) | 0,75 / 0,20 | 0,075 / 0,02 | n/d | 4,50 / 1,25 | não verificado | 50% | idem |
| GPT-5 nano (legado) | 0,05 | 0,005 | n/d | 0,40 | não verificado | 50% | idem |
| **Gemini 3.5 Flash-Lite** | 0,30 | 0,03 (+ armazenamento 1,00/h por 1M, só cache explícito) | sem taxa de escrita no cache implícito | 2,50 (inclui thinking) | não verificado | 50% (0,15 / 1,25) | [pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| **Gemini 3.8 Flash** | 0,75 até 31/12/2026, depois 1,50 | 0,075 -> 0,15 | idem | 3,75 -> 7,50 | não verificado | 50% | idem |
| Gemini 4 Hydrogen (Flash-class) | 1,50 | 0,075 (só implícito) | n/a | 7,50 | 1M | 50% | idem |
| Gemini 4 Neon | 3,00 | 0,15 | n/a | 15,00 | 1M | 50% | idem |
| Gemini 4 Argon / Carbon (Pro-class) | 2,00 até 30/11/2026, depois 4,00 | 0,10 -> 0,20 | n/a | 10,00 -> 20,00 | 1M | 50% | idem |
| Gemini 3.1 Pro Preview | 2,00 (≤200k) / 4,00 | 0,20 / 0,40 | n/a | 12,00 / 18,00 | tier de 200k | 50% | idem |
| **Groq gpt-oss-120b** | 0,15 | não verificado | não verificado | 0,60 | 131.072 | não verificado | [Groq models](https://console.groq.com/docs/models) |
| Groq gpt-oss-20b | 0,075 | não verificado | n/d | 0,30 | 131.072 | não verificado | idem |
| Groq Qwen3.8-27B (preview) | 0,80 | n/d | n/d | 4,00 | 131.072 | n/d | idem |
| Groq Llama 3.1 8B / 3.3 70B | "Contact Sales" | n/d | n/d | n/d | 131.072 | n/d | idem |
| **DeepSeek-V4.1-Flash** (pico / fora de pico) | 0,30 / 0,15 | 0,006 / 0,003 | n/a | 1,20 / 0,60 | 1M | não verificado | [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing) |
| DeepSeek-V4-Pro | 1,32 / 0,66 | 0,044 / 0,022 | n/a | 3,96 / 1,98 | 1M | não verificado | idem |
| **xAI Grok 4.7** (<200k) | 2,00 | 0,50 | n/d | 6,00 | 500k | não verificado | [xAI](https://docs.x.ai/developers/pricing) |
| xAI Grok 4.3 (<200k) | 1,25 | 0,20 | n/d | 2,50 | 1M | não verificado | idem |
| **Mistral Large** | 0,50 | "até 90% menos" (valor exato não verificado) | n/d | 1,50 | não verificado | 50% | [Mistral](https://mistral.ai/pricing) |
| Mistral Medium / Small / Ministral | não verificado | não verificado | n/d | não verificado | não verificado | 50% | idem (página não lista) |

Observações por provedor (cache, TTL, mínimos):

- **Anthropic** ([doc de cache](https://platform.claude.com/docs/en/build-with-claude/prompt-caching)):
  - Mínimo cacheável de 512 tokens em Haiku 5.5, Sonnet 5.5 e Opus 5.5. Prompt menor não é cacheado e não dá erro.
  - TTL padrão 5 min. TTL de 1 h custa 2x a entrada. Escrita 5 min = 1,25x.
  - Leitura = 0,1x (Haiku), 0,05x (Sonnet 5.5 e Opus 5.5). Cada leitura renova o TTL sem custo. O TTL conta do início da requisição.
  - Há cache automático com um `cache_control` no topo da requisição, que move o ponto de corte conforme a conversa cresce. Não existe no Bedrock `bedrock-runtime`.
  - Tokenizador novo (Claude 4.7+) gera cerca de 30% mais tokens para o mesmo texto ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)). O mesmo texto pt-BR custa mais tokens no Claude do que o `tokens` nominal sugere. Comparação direta com tokenizadores OpenAI/Google: não verificado.
  - Tool use adiciona 286 tokens fixos de system prompt (Haiku, Sonnet, Opus 5.5, tool_choice auto) ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)).
- **OpenAI** ([cache](https://developers.openai.com/api/docs/guides/prompt-caching)):
  - A partir do GPT-5.6 há **taxa de escrita**: 1,25x para vida mínima de 30 min (padrão), 2,5x para 12 h (só Responses API). Leitura 0,1x, ou 0,05x em Astra/Sol/Terra.
  - Mínimo cacheável de 1.024 tokens.
  - Prompts com mais de 272k tokens pagam 2x entrada ([modelo Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)).
  - Chat Completions só suporta function calling com `reasoning_effort=none`. Para tools com raciocínio use a Responses API (mesma página).
- **Gemini** ([pricing](https://ai.google.dev/gemini-api/docs/pricing)): cache implícito (sem taxa de escrita) nos modelos 4.x. Cache explícito, com armazenamento por hora, nos 3.x. Mínimo de tokens para cache implícito: não verificado. O pricing diz que todo token conta, incluindo thinking tokens e declarações de funções em grounding.
- **Groq:** página de Prompt Caching existe na doc, mas preço e regras: não verificado.

### 1.2 Cobrança de reasoning

- **Claude:** thinking é cobrado como token de saída. Sonnet 5.5 tem thinking adaptativo e **não aceita `thinking: disabled`** (Models API: `thinking.types.disabled.supported=false`). Para chat sem raciocínio prévio use `thinking: {"type":"between_tools"}` com `effort` low/medium/high, ou baixe o `effort`. Haiku 5.5 padrão é `medium`; a doc recomenda `low` para chat curto ([overview](https://platform.claude.com/docs/en/models/overview), [effort](https://platform.claude.com/docs/en/build-with-claude/effort)).
- **OpenAI:** `reasoning.effort` aceita none/low/medium (padrão)/high/xhigh/max em Luna ([Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)). Tokens de raciocínio são tokens de saída (inferência da tabela de preços; cobrança explícita: não verificado).
- **Gemini:** preço de saída "inclui thinking tokens" ([pricing](https://ai.google.dev/gemini-api/docs/pricing)).
- **DeepSeek:** modo thinking é o padrão; dá para desligar ([pricing](https://api-docs.deepseek.com/quick_start/pricing)).
- Consequência para o custo: sem controle de effort, o custo de saída pode ser várias vezes o de 120 tokens/turno. Ver sensibilidade na seção 9.

### 1.3 Mudanças de preço já anunciadas

- Gemini 4 Carbon/Argon: 2,00/10,00 até 30/11/2026, 4,00/20,00 a partir de 01/12/2026 ([pricing](https://ai.google.dev/gemini-api/docs/pricing)).
- Gemini 3.8 Flash e 3.6 Flash: 0,75/3,75 até 31/12/2026, 1,50/7,50 a partir de 01/01/2027. Armazenamento de cache dobra (0,50 -> 1,00/h). Gemini 3.8 Flash TTS também dobra.
- Claude Sonnet 5: o preço "introdutório" de 2/10 virou padrão e o aumento para 3/15 em 01/09/2026 foi cancelado ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)).
- OpenAI GPT-5.6 Sol tem preço promocional até 30/11/2026 ([pricing](https://developers.openai.com/api/docs/pricing)).
- Regra prática para a spec: não fixar margem em cima de preço promocional. Usar o preço pós-promoção.

---

## 2. Por provedor: tools, latência, limites, retenção, treino, residência

### 2.1 Anthropic

- **Tool calling/structured outputs:** Structured outputs e strict tool use estão estáveis em Haiku 5.5, Sonnet 5.5, Opus 5.5 ([doc](https://platform.claude.com/docs/en/build-with-claude/structured-outputs)). Evidência independente de taxa de acerto em tool calling (BFCL, tau-bench) para esses modelos: não verificado. Só há depoimentos de clientes na página de anúncio ([Haiku 5.5](https://www.anthropic.com/claude-haiku-5-5)), que não são benchmark.
- **Latência:** a Anthropic classifica Haiku 5.5 como "Fastest" e Sonnet 5.5 como "Fast" (comparativo relativo, sem milissegundos) ([overview](https://platform.claude.com/docs/en/models/overview)). Medições de terceiros (Artificial Analysis, secundário):
  - Haiku 5.5: 259 tok/s ([AA](https://artificialanalysis.ai/models/claude-haiku-5-5)).
  - Sonnet 5.5: 153 tok/s ([AA](https://artificialanalysis.ai/models/claude-sonnet-5-5-high)).
  - O "time to first answer token" dessas páginas (168 s e 250 s) foi medido com esforço Max e não serve para chat. TTFT real em effort baixo: **não verificado**, precisa medir.
- **Limites (tier Start, entrada)** ([rate limits](https://platform.claude.com/docs/en/api/rate-limits)): Haiku 5.5 e Sonnet 5.5 têm 4.000 RPM, 2.000.000 ITPM e 400.000 OTPM. Teto de gasto mensal: Start US$ 500, Build US$ 1.000, Scale US$ 200.000. Organizações novas podem começar num tier "Evaluation" com limites menores. Tokens lidos do cache **não contam** no ITPM.
- **Retenção/treino:** os termos comerciais dizem "Anthropic may not train models on Customer Content from Services" ([termos](https://www.anthropic.com/legal/commercial-terms)). Entradas e saídas são apagadas do backend em até 30 dias, salvo acordo (ZDR), obrigação legal ou violação de política ([privacy center](https://privacy.claude.com/en/articles/7996866-how-long-do-you-store-my-organization-s-data)). ZDR é por acordo. Structured outputs é elegível a ZDR (só o schema fica em cache até 24 h).
- **Residência:**
  - API first-party: `inference_geo` aceita `us` ou `global`. `us` custa 1,1x ([data residency](https://platform.claude.com/docs/en/manage-claude/data-residency)). **Não há opção Brasil.**
  - **Bedrock sa-east-1 (São Paulo):** aparece na tabela de regiões **só com endpoint "Global"** (roteamento dinâmico para qualquer região) ([Bedrock](https://platform.claude.com/docs/en/build-with-claude/claude-in-amazon-bedrock)). Regiões com "In-region only" são Tóquio, Melbourne, Estocolmo, Irlanda, N. Virginia, Ohio, Oregon. Ou seja: usar Bedrock em sa-east-1 dá faturamento AWS e latência de entrada em SP, mas **não garante processamento no Brasil**. Os modelos com endpoint global listados: Haiku 5.5, Sonnet 5.5, Opus 5.5, Fable 5/5.1, Sonnet 5, Opus 5/4.8/4.7, Haiku 4.5. Endpoint regional tem +10%.
  - **Vertex AI:** endpoints regionais do Claude só atendem Sonnet 4.6 e anteriores; modelos novos usam global ou multi-região (us/eu) ([Vertex Claude](https://platform.claude.com/docs/en/build-with-claude/claude-models-on-google-cloud/google-managed)). Claude 5.5 em southamerica-east1: não verificado, mas a doc indica que não.
  - **Azure Brazil South:** Claude no Foundry segue apenas "US Data Zone" como opção de zona ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)). Brazil South para Claude: não verificado.

### 2.2 OpenAI

- **Tool calling:** Responses API suporta function calling e ferramentas embutidas. Em Chat Completions, function calling só com `reasoning_effort=none` ([Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)). Evidência independente de confiabilidade: não verificado.
- **Latência:** Artificial Analysis: GPT-6 Luna 114 tok/s ([AA](https://artificialanalysis.ai/models/gpt-6-luna)). TTFT em effort baixo: não verificado.
- **Limites de entrada:** a página mostra tier Free com teto de US$ 100/mês ([rate limits](https://developers.openai.com/api/docs/guides/rate-limits)). RPM/TPM por tier e modelo: não verificado.
- **Treino/retenção** ([your data](https://developers.openai.com/api/docs/guides/your-data)):
  - Dados da API não são usados para treino desde 01/03/2023, salvo opt-in.
  - Logs de abuso ficam até 30 dias. Application state (Responses `store=true`) também 30 dias.
  - **Zero Data Retention** e **Modified Abuse Monitoring** existem para clientes elegíveis (aprovação).
- **Residência** ([data residency](https://developers.openai.com/api/docs/guides/data-residency)): domínios regionais `us`, `eu`, `au`, `in`, `jp`. **Sem Brasil.** Uplift de 10% para modelos lançados após 05/03/2026. Luna tem processamento regional em AU/IN/JP e EU ([Luna](https://developers.openai.com/api/docs/models/gpt-6-luna)).
- **Azure Brazil South** (via Foundry): a página de modelos da Azure só mostra Brazil South na tabela de **treinamento** ([Azure](https://learn.microsoft.com/en-us/azure/ai-foundry/foundry-models/concepts/models-sold-directly-by-azure)). Disponibilidade de inferência dos modelos GPT-6 em Brazil South: **não verificado**.

### 2.3 Google Gemini

- **Tool calling:** não verificado (nenhuma fonte de evidência coletada).
- **Latência:** Artificial Analysis: Gemini 3.5 Flash-Lite 305 tok/s e "time to first answer token" de 4,81 s com effort padrão "minimal" ([AA](https://artificialanalysis.ai/models/gemini-3-5-flash-lite)). É o único TTFT de terceiros coletado, e é de terceiros.
- **Limites:** Tier 1 exige conta de faturamento e tem teto de gasto de US$ 250/mês (Tier 2: US$ 2.000, após US$ 100 pagos + 3 dias) ([rate limits](https://aistudio.google.com/docs/rate-limits)). RPM/TPM por modelo: não verificado.
- **Treino:** a tabela de preços mostra "Used to improve our products": **Sim no tier gratuito, Não no tier pago** ([pricing](https://ai.google.dev/gemini-api/docs/pricing)). **Nunca usar tier gratuito com dados de pacientes.**
- **Retenção/ZDR no Gemini API:** não verificado.
- **Residência, Vertex southamerica-east1 (São Paulo)** ([locations](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)): na tabela "Americas", SP marca disponibilidade para Gemini 2.5 Flash, `gemini-embedding-001`, "Embeddings for Text/Multimodal". **Gemini 3.x e 4.x não aparecem como disponíveis em São Paulo** (apenas Gemini 3.8 Flash, 3.5 Flash e 2.5 Pro aparecem em Montréal). Parsing da tabela HTML: confirmar no console antes de decidir.

### 2.4 Groq

- Modelos de produção: gpt-oss-120b (500 tok/s), gpt-oss-20b (1.000 tok/s), Llama 3.1 8B (560), Llama 3.3 70B (280) ([modelos](https://console.groq.com/docs/models)). Qwen3.8-27B é preview.
- **Limites (plano Developer):** gpt-oss-120b 250K TPM e 1K RPM; Whisper large-v3 200K ASH/300 RPM; v3 turbo 400K ASH/400 RPM; arquivo máx. 100 MB ([modelos](https://console.groq.com/docs/models)).
- **Retenção** ([your data](https://console.groq.com/docs/your-data)): por padrão não retém prompts/respostas. Pode logar até 30 dias para troubleshooting/abuso. **ZDR disponível a todos os clientes** (desliga batch). Dados retidos ficam em buckets GCP nos EUA. **A página não afirma se há treino ou não: não verificado.**
- **Residência:** sem região Brasil (não verificado em página de regiões; a doc de dados só cita EUA).
- **Tool calling/latência TTFT:** não verificado.
- Qualidade pt-BR de gpt-oss: não verificado (ver seção 3).

### 2.5 Outros (preço/qualidade)

- **DeepSeek-V4.1-Flash:** o mais barato com 1M de contexto, tool calls e JSON ([pricing](https://api-docs.deepseek.com/quick_start/pricing)). API hospedada na China; retenção, treino e residência: **não verificado**. Para dados de saúde sob LGPD isso é bloqueador até haver contrato. Os pesos são abertos e o modelo também aparece em Vertex/Mistral; hospedagem de terceiros fora do escopo.
- **xAI Grok 4.7:** US$ 2/6, cache 0,50, contexto 500k ([xAI](https://docs.x.ai/developers/pricing)). Sem vantagem de preço sobre Sonnet 5.5/Terra. Dados/privacidade: não verificado.
- **Mistral:** só Mistral Large (0,50/1,50) é listado na página de preços; o resto exige consultar a doc ([Mistral](https://mistral.ai/pricing)). Residência UE. Sem Brasil.

---

## 3. Qualidade em português do Brasil (atendimento ao cliente)

**Evidência fina. Não encontrei benchmark público que compare os modelos atuais em conversa de atendimento em pt-BR.**

O que existe:
- Open Portuguese LLM Leaderboard (foco pt-BR): nove benchmarks, majoritariamente provas e entailment, sem foco em conversa ([CLARIN-PT-LDB, arXiv](https://arxiv.org/abs/2603.12872), cita o leaderboard brasileiro). O CLARIN-PT-LDB mesmo é para português europeu.
- PoETa v2: mais de 40 tarefas em português, mais de 20 modelos, perfil acadêmico/exames ([arXiv](https://arxiv.org/html/2511.17808v2)).
- Sabiá-4 (Maritaca AI, relatório de fev/2026): traz o BRACEval, benchmark conversacional pt-BR com win-rate contra GPT-4o. Os comparativos do relatório são contra gpt-oss-120b e gpt-4.1-mini. É benchmark do próprio fornecedor ([resumo via busca](https://arxiv.org/html/2603.12872)). Não consegui confirmar números nem a presença de Claude/Gemini nele.
- Artificial Analysis Intelligence Index (inteligência geral, **não** pt-BR; indicador grosseiro de capacidade de seguir instruções e tools):
  - Claude Sonnet 5.5: 55 ([AA](https://artificialanalysis.ai/models/claude-sonnet-5-5-high)).
  - Claude Haiku 5.5: 36 ([AA](https://artificialanalysis.ai/models/claude-haiku-5-5)).
  - GPT-6 Luna: 28 ([AA](https://artificialanalysis.ai/models/gpt-6-luna)).
  - Gemini 3.5 Flash-Lite: 12 ([AA](https://artificialanalysis.ai/models/gemini-3-5-flash-lite)).
  - Uma busca devolveu 43 e 56 para Haiku/Sonnet via blog secundário. Os valores das páginas da AA diferem. Tratar como ordem de grandeza.
- Anthropic afirma "multilingual capabilities" para todos os modelos atuais ([overview](https://platform.claude.com/docs/en/models/overview)), mas sem número por idioma encontrado (MMMLU pt-BR: não verificado).

Conclusão: a escolha de modelo para pt-BR coloquial (tom, gírias, tratamento "você/senhor(a)", mensagens curtas de WhatsApp) deve ser feita com **eval próprio**: 50 a 100 conversas realistas por especialidade, juiz LLM com rubrica + revisão humana de uma amostra, rodando Haiku 5.5, Luna, Flash-Lite e Sonnet 5.5 como baseline. Isso custa poucos dólares (ver seção 9).

---

## 4. Embeddings

| Modelo | US$/1M tokens | Fonte | pt-BR |
|---|---|---|---|
| OpenAI text-embedding-3-small | 0,02 | [pricing](https://developers.openai.com/api/docs/pricing) | não verificado |
| OpenAI text-embedding-3-large | 0,13 | idem | não verificado |
| Gemini Embedding (gemini-embedding-001) | 0,15 (batch 0,075) | [pricing](https://ai.google.dev/gemini-api/docs/pricing) | não verificado. Disponível em southamerica-east1 ([Vertex](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations)) |
| Gemini Embedding 2 (multimodal) | texto 0,20; imagem 0,45; áudio 6,50 | [pricing](https://ai.google.dev/gemini-api/docs/pricing) | não verificado |
| Voyage voyage-4-lite | 0,02 | [Voyage](https://docs.voyageai.com/docs/pricing) | não verificado |
| Voyage voyage-4 | 0,06 | idem | não verificado |
| Voyage voyage-4-large | 0,12 (200M tokens grátis nos modelos 4) | idem | não verificado |
| Cohere Embed (multilingual/v4) | não verificado (a página de preços não trouxe o valor) | [Cohere](https://cohere.com/pricing) | não verificado |
| Mistral embed | não verificado | [Mistral](https://mistral.ai/pricing) | não verificado |
| Modelos abertos (bge-m3, multilingual-e5, etc.) | custo de infra próprio | não consultado | não verificado |

Para bases de conhecimento pequenas (dezenas de documentos por tenant), o custo de embedding é irrelevante: 1M de tokens a US$ 0,02 a US$ 0,15 cobre milhares de páginas. O critério de escolha é qualidade de recuperação em pt-BR (sem evidência pública coletada) e residência. **Fazer eval de recall@k com perguntas reais de pacientes.**

---

## 5. Speech-to-text para áudios de WhatsApp (ogg/opus, pt-BR)

| Serviço | Preço | Equivalente US$/min | Limites / formatos | Fonte |
|---|---|---|---|---|
| Groq whisper-large-v3-turbo | US$ 0,04/hora | 0,00067 | 100 MB, 400 RPM (Developer) | [Groq](https://console.groq.com/docs/models) |
| Groq whisper-large-v3 | US$ 0,111/hora | 0,00185 | 100 MB, 300 RPM | idem |
| OpenAI gpt-4o-mini-transcribe | US$ 0,003/min | 0,003 | 25 MB; formatos incluem `ogg`, `webm`, `m4a`, `mp3`, `wav` | [pricing](https://developers.openai.com/api/docs/pricing), [guia](https://developers.openai.com/api/docs/guides/speech-to-text) |
| OpenAI gpt-transcribe | US$ 0,0045/min | 0,0045 | idem | idem |
| OpenAI gpt-4o-transcribe / Whisper | US$ 0,006/min | 0,006 | idem | idem |
| ElevenLabs Scribe v2 / v3 | US$ 0,20/hora | 0,0033 | 90+ idiomas; v3 Live US$ 0,22/h | [ElevenLabs API](https://elevenlabs.io/pricing/api) |
| Deepgram Nova-3 multilíngue | US$ 0,0058/min (promo; era 0,0092) PAYG | 0,0058 | US$ 200 em créditos grátis; aba streaming vs pré-gravado ambígua na página | [Deepgram](https://deepgram.com/pricing) |
| Gemini 3.5 Transcribe | US$ 2,00/1M tokens de áudio ou US$ 0,003/min | 0,003 | "Gemini 3.5 Transcribe" fora de southamerica-east1 | [pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Google Cloud STT (padrão) | US$ 0,016/min (faixa 0-500k min); batch dinâmico US$ 0,003/min | 0,016 / 0,003 | aceita Chirp 2/3; preços Chirp não extraídos | [Google STT](https://cloud.google.com/speech-to-text/pricing) |
| xAI STT | US$ 0,10/h (REST), 0,20/h (streaming) | 0,0017 | não verificado | [xAI](https://docs.x.ai/developers/pricing) |
| DeepSeek ASR | US$ 0,116/h (lista; 0,058 em promo de tempo limitado) | 0,0019 | China | [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing) |

Precisão em pt-BR:
- Única evidência coletada: ElevenLabs publica FLEURS pt de 2,3% a 3,1% para Scribe (versão não declarada) contra Whisper large-v3 4,1%, Gemini Flash 2 3,3% e Deepgram Nova 2 10,5% ([ElevenLabs pt](https://elevenlabs.io/speech-to-text/portuguese)). É **benchmark do concorrente interessado**, em fala lida e limpa. FLEURS não representa áudio de WhatsApp com ruído, sotaque regional e jargão médico.
- Scribe v3: reduz o WER em 27% frente ao v2 em 102 idiomas, medido numa versão interna do FLEURS ([blog](https://elevenlabs.io/blog/scribe-v3)). Número específico para pt-BR: não verificado.
- OpenAI gpt-transcribe/gpt-4o-transcribe: afirmam superar Whisper v2/v3 no FLEURS, sem número pt-BR encontrado.
- Groq Whisper: suporte de `ogg` e WER pt-BR: não verificado.
- **Recomendação:** montar um conjunto de 100 áudios reais (ogg/opus, com termos clínicos e nomes de medicamentos) e medir WER entre as 3 opções mais baratas. O custo de STT é desprezível (US$ 0,001 a 0,006/min), então qualidade deve decidir.

---

## 6. TTS, clonagem de voz e voz em tempo real

### 6.1 TTS (preço por minuto de fala)

Conversão caractere -> minuto assume **900 caracteres de pt-BR por minuto de fala (premissa minha, não verificada)**. Os valores por minuto de Gemini usam a taxa oficial de 25 tokens de áudio por segundo.

| Serviço | Preço de lista | US$/min de fala | Fonte |
|---|---|---|---|
| ElevenLabs Eleven v4 | US$ 0,08 / 1K caracteres | ~0,072 | [ElevenLabs API](https://elevenlabs.io/pricing/api) |
| ElevenLabs v4 Turbo / Flash / v3 Conversational | US$ 0,04 / 1K caracteres | ~0,036 | idem |
| ElevenLabs v3 / v2 Multilingual | US$ 0,08 / 1K | ~0,072 | idem |
| OpenAI tts-1 | US$ 15 / 1M caracteres | ~0,0135 | [pricing](https://developers.openai.com/api/docs/pricing) |
| OpenAI tts-1-hd | US$ 30 / 1M caracteres | ~0,027 | idem |
| OpenAI gpt-4o-mini-tts | US$ 0,60 texto + 12,00 / 1M tokens de áudio | tokens/s: não verificado | idem |
| Gemini 3.8 Flash-Lite TTS | US$ 6,00 / 1M tokens de áudio (25 tok/s) -> US$ 12,00 em 01/01/2027 | 0,009 -> 0,018 | [pricing](https://ai.google.dev/gemini-api/docs/pricing), [Google TTS](https://cloud.google.com/text-to-speech/pricing) |
| Gemini 3.8 Flash TTS | US$ 9,00 -> 18,00 / 1M tokens de áudio | 0,0135 -> 0,027 | idem |
| Deepgram Aura-2 | US$ 0,030 / 1K caracteres | ~0,027 (pt-BR suportado? não verificado) | [Deepgram](https://deepgram.com/pricing) |
| xAI TTS | US$ 15 / 1M caracteres | ~0,0135 | [xAI](https://docs.x.ai/developers/pricing) |
| DeepSeek TTS | US$ 0,45 / 10k caracteres (50% off promo) | ~0,04 | [DeepSeek](https://api-docs.deepseek.com/quick_start/pricing) |
| Cartesia Sonic-3.6 | derivado dos planos: Pro US$ 5 = ~133 min; Scale US$ 299 = ~10.667 min | ~0,038 (Pro) / ~0,028 (Scale) | [Cartesia](https://cartesia.ai/pricing) |
| Groq Orpheus | US$ 22 / 1M caracteres (inglês), 40 (árabe) | **sem pt-BR** | [Groq](https://console.groq.com/docs/models) |

Qualidade/naturalidade do TTS em pt-BR: **não verificado** (nenhuma avaliação independente coletada). Ouvir amostras e testar com o público-alvo.

### 6.2 Clonagem de voz (ElevenLabs)

- Planos ([ElevenLabs pricing](https://elevenlabs.io/pricing)): Starter US$ 6/mês (30k créditos, **licença comercial, Instant Voice Cloning**). Creator US$ 22/mês (121k créditos, **Professional Voice Cloning**). Pro US$ 99/mês. Scale e Business US$ 990/mês (10 vozes profissionais, "TTS de baixa latência a partir de 5c/minuto"). Preços sujeitos a promoções de Black Friday na página.
- Preço de API: ver 6.1 (por 1K caracteres).
- Termos de consentimento ([voice cloning](https://elevenlabs.io/voice-cloning)): a página diz que clonar a voz de outra pessoa exige consentimento explícito e que há sistemas de verificação de voz para confirmar permissão; dados de voz "não são compartilhados nem usados para treino sem consentimento explícito". **O texto contratual (ToS / Prohibited Use Policy) não foi lido: não verificado.**
- Cartesia: clonagem instantânea no plano Pro (US$ 5), profissional no Startup (US$ 49) ([Cartesia](https://cartesia.ai/pricing)). Termos: não verificado.
- Implicação para o produto: clonar somente a voz do **próprio profissional**, com consentimento registrado e gravado. Avaliar LGPD (voz como dado pessoal, uso de TTS com dados de saúde em servidor no exterior): **não verificado, exige revisão jurídica**.

### 6.3 Voz em tempo real (ligações)

| Serviço | Preço | Fonte |
|---|---|---|
| OpenAI gpt-realtime-2.1 | áudio entrada US$ 32 / saída US$ 64 / entrada em cache US$ 0,40 por 1M tokens; texto 4 / 24 | [pricing](https://developers.openai.com/api/docs/pricing) |
| OpenAI gpt-realtime-2.1-mini | áudio 10 / 20 / 0,30 por 1M tokens; texto 0,60 / 2,40 | idem |
| OpenAI GPT-Live (gpt-live-1.1) | US$ 0,05/min ativo, US$ 0,02/min em espera; cobrança por segundo | idem |
| Gemini 3.8 Live | entrada de áudio US$ 3,00/1M tokens ou US$ 0,005/min; saída de áudio US$ 12,00/1M ou US$ 0,018/min; texto 0,75 / 4,50 | [pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| ElevenLabs Agents / Realtime v1 Mini / Max | US$ 0,08/min (+ uso do LLM nos modelos Realtime) | [ElevenLabs API](https://elevenlabs.io/pricing/api) |
| xAI voz speech-to-speech (grok-voice-3.0) | US$ 0,08/min | [xAI](https://docs.x.ai/developers/pricing) |
| Cartesia agentes gerenciados | página sugere US$ 0,03 a 0,06/min; leitura ambígua: não verificado | [Cartesia](https://cartesia.ai/pricing) |

Notas: o Gemini 3.8 Live custa cerca de US$ 0,023/min somando entrada e saída de áudio contínuas (0,005 + 0,018), de longe a opção mais barata. Qualidade em pt-BR, latência e telefonia (SIP/PSTN) incluída ou não: **não verificado**. Para este produto, ligações ficam fora do escopo do MVP. Voz no WhatsApp é nota de voz (STT + LLM + TTS), não realtime.

---

## 7. Camada de agente em TypeScript e gateways

### 7.1 Frameworks

| Item | Versão atual | Licença | Preço | Fonte |
|---|---|---|---|---|
| Vercel AI SDK (`ai`) | 7.0.181 | Apache-2.0 (npm) | grátis | [npm](https://www.npmjs.com/package/ai), [GitHub](https://github.com/vercel/ai) |
| Mastra (`@mastra/core`) | 1.85.0 | Apache-2.0 no pacote npm; GitHub reporta "NOASSERTION" (provavelmente diretórios `ee` com outra licença: não verificado) | núcleo grátis; cloud: não verificado | [npm](https://www.npmjs.com/package/@mastra/core), [GitHub](https://github.com/mastra-ai/mastra) |
| LangGraph.js (`@langchain/langgraph`) | 1.7.5 | MIT | grátis; LangGraph Platform/Deployment é pago (valor: não verificado) | [npm](https://www.npmjs.com/package/@langchain/langgraph), [GitHub](https://github.com/langchain-ai/langgraphjs) |

AI SDK: funcionalidades provider-agnostic (tool calling, saída estruturada, streaming, troca de provedor, integração com o AI Gateway): **não verificado nesta sessão**, só versão e licença foram confirmadas. Revisar a doc do AI SDK 7 antes de fechar a spec.

### 7.2 Gateways de LLM

| Gateway | Taxa | Observação | Fonte |
|---|---|---|---|
| Vercel AI Gateway | **sem markup nem taxa de plataforma**; preço de lista do provedor; US$ 5/mês de crédito grátis; BYOK também sem markup | ZDR, hospedagem regional e allowlist de provedores existem como recursos; detalhes não verificados | [Vercel](https://vercel.com/docs/ai-gateway/pricing) |
| OpenRouter | **5,5%** de taxa de plataforma (Standard), 8% (Business); BYOK: 25.000 dólares de inferência/mês sem taxa, depois 5%; Free: 50 req/dia | 600+ modelos | [OpenRouter](https://openrouter.ai/pricing) |
| Cloudflare AI Gateway | recursos básicos grátis em todos os planos; crédito de Unified Billing com 5% (US$ 100 -> US$ 105); sem markup no token; logs persistentes: Workers Free 100.000 logs total | DLP grátis | [Cloudflare](https://developers.cloudflare.com/ai-gateway/reference/pricing/) |
| LiteLLM | open source (selo "MIT license" na doc); 1.110.3 no PyPI; GitHub reporta NOASSERTION (pasta enterprise separada); preço enterprise: não verificado | Python; roda como proxy | [LiteLLM](https://docs.litellm.ai/), [GitHub](https://github.com/BerriAI/litellm) |
| Portkey | gateway open source MIT no GitHub; preço do SaaS: não verificado (a página não expôs valores) | | [GitHub](https://github.com/Portkey-AI/gateway), [site](https://portkey.ai/pricing) |

**Gateway próprio fino vs. terceiros.** Recomendação:
1. Começar com **gateway fino próprio** dentro do app (uma função `callModel(tenant, messages, tools)` em cima do AI SDK, com tabela de preços por modelo, registro de tokens/custo por tenant, timeout, 1 fallback e circuit breaker). São algumas centenas de linhas. Vantagem: controle de custo por tenant, sem terceiro tocando dados de saúde, sem taxa.
2. Só usar gateway de terceiros se precisar de fallback multi-provedor sem código. O Vercel AI Gateway (0% de markup) é o único que não adiciona custo; OpenRouter acrescenta 5,5%, que a margem de um plano barato sente.
3. Não rodar LiteLLM (Python, mais um serviço) numa stack TypeScript, a menos que haja necessidade clara.

Nota de risco: qualquer gateway de terceiros é mais um suboperador para LGPD.

---

## 8. Observabilidade e evals (por volta de 1M de traces/mês)

| Ferramenta | Preço relevante | Estimativa a 1M traces/mês | Observações | Fonte |
|---|---|---|---|---|
| **Langfuse Cloud** | Hobby grátis (50k units, 30 dias); Core US$ 29/mês com 100k units, +US$ 8 por 100k units (desconto por volume); Pro US$ 199/mês; Teams add-on US$ 300 | **~US$ 101** se 1 trace = 1 unit (1M units); **~US$ 500** se 1 trace + ~5 observations = 6M units (lista, antes de desconto de volume). Definição exata de "unit" não confirmada nesta sessão | Regiões: US (Oregon), UE (Irlanda), Japão (Tóquio), HIPAA (Oregon). **Sem Brasil** | [pricing](https://langfuse.com/pricing), [regiões](https://langfuse.com/security/data-regions) |
| **Langfuse self-host** | grátis; licença MIT no núcleo, diretórios `ee/` sob licença própria (chaves de licença para add-ons) | custo de infra | Requer Postgres, Redis/Valkey, **ClickHouse**, S3/blob, web + worker; Docker Compose só para teste (sem HA); produção em Kubernetes/Helm (inclui AWS) | [self-hosting](https://langfuse.com/self-hosting), [LICENSE](https://github.com/langfuse/langfuse/blob/main/LICENSE) |
| Braintrust | Starter US$ 0 (1 GB, retenção 14 dias); Pro US$ 249/mês (5 GB + US$ 3/GB, 50k scores + US$ 1,50/1k, retenção 30 dias) | depende do volume em GB: com 20 KB/trace (premissa minha) = 20 GB -> ~US$ 294. Não verificado | | [Braintrust](https://www.braintrust.dev/pricing) |
| LangSmith | Developer US$ 0 (5k traces base/mês); Plus US$ 39/assento (10k traces base/mês); traces base com retenção de 14 dias, estendidos 180 dias | preço por trace excedente: **não verificado** | | [LangChain](https://www.langchain.com/pricing) |
| Helicone | Hobby grátis (10k requisições, retenção 7 dias); Pro US$ 79/mês; Team US$ 799/mês; "usage-based" além do incluso | valor por requisição: **não verificado** | repositório Apache-2.0 | [Helicone](https://www.helicone.ai/pricing), [GitHub](https://github.com/Helicone/helicone) |
| PostHog LLM analytics | 100k eventos/mês de "AI Observability" grátis | preço acima do grátis: **não verificado** | integra com analytics/flags/replay | [PostHog](https://posthog.com/pricing) |

Leitura: com 1M de traces/mês, Langfuse (cloud ou self-host) é o mais previsível e o único com self-host MIT que permite ficar em `sa-east-1`. Para dados de saúde, **self-host em região Brasil** resolve residência. Gravar nos traces o mínimo (hash/ID de paciente, não texto livre) ou mascarar PII antes de enviar.

---

## 9. Estimativa de custo de uma conversa típica

### 9.1 Premissas

- 8 turnos do paciente. System prompt + definições de tools = 2.500 tokens, idêntico em todos os modelos (diferença de tokenizador ignorada; ver nota na seção 1.1).
- Cada mensagem do paciente: 40 tokens. Resposta do assistente: 120 tokens.
- **2 chamadas de ferramenta** (nos turnos 3 e 6): cada uma gera 1 requisição extra. Na requisição 1 o modelo emite o `tool_use` (60 tokens de saída). Na requisição 2 recebe o `tool_result` (300 tokens) e responde (120 tokens).
- Total: **10 requisições**, soma de entrada **34.600 tokens**, soma de saída **1.080 tokens** (8×120 + 2×60). O último prompt tem 4.380 tokens.
- Histórico cresce a cada requisição e é reenviado inteiro. RAG **não incluído** (adicionar chunks recuperados, ~500 a 1.000 tokens por turno, aumenta a entrada).
- **Reasoning desligado/mínimo.** Sem isso o custo sobe (ver 9.4).
- Com cache: o prefixo anterior inteiro (sistema + histórico) é lido do cache; só os tokens novos pagam escrita (Anthropic e OpenAI: 1,25x). No Gemini o cache é implícito e os tokens novos pagam preço normal de entrada; assume-se que o cache acerta (não é garantido: ver 9.4). Cache lido = 30.220 tokens, escrita/novos = 4.380 tokens.
- Requisitos de cache atendidos: o prompt de 2.500 tokens passa dos mínimos de 512 (Anthropic) e 1.024 (OpenAI).
- Sem cache: custo = 34.600 × preço_entrada + 1.080 × preço_saída.

### 9.2 Aritmética (US$ por conversa)

Fórmulas: `sem cache = (34.600 × P_in + 1.080 × P_out) / 1.000.000`. `com cache = (30.220 × P_leitura + 4.380 × P_escrita + 1.080 × P_out) / 1.000.000`.

**Claude Haiku 5.5** (0,10 / 0,50; leitura 0,01; escrita 0,125)
- Sem cache: 34.600 × 0,10 = 3.460; 1.080 × 0,50 = 540; total 4.000 / 1e6 = **US$ 0,0040**.
- Com cache: 30.220 × 0,01 = 302,2; 4.380 × 0,125 = 547,5; saída 540; total 1.389,7 / 1e6 = **US$ 0,00139** (35%).

**GPT-6 Luna** (0,10 / 0,50; leitura 0,01; escrita 0,125): mesmos preços do Haiku 5.5, resultado idêntico. Sem cache **US$ 0,0040**; com cache **US$ 0,00139**.

**Gemini 3.5 Flash-Lite** (0,30 / 2,50; leitura 0,03; sem taxa de escrita)
- Sem cache: 34.600 × 0,30 = 10.380; 1.080 × 2,50 = 2.700; total 13.080 / 1e6 = **US$ 0,01308**.
- Com cache: 30.220 × 0,03 = 906,6; 4.380 × 0,30 = 1.314; saída 2.700; total 4.920,6 / 1e6 = **US$ 0,00492** (38%).

**GPT-6.1 Terra** (1,00 / 5,00; leitura 0,05; escrita 1,25)
- Sem cache: 34.600 × 1,00 = 34.600; 1.080 × 5,00 = 5.400; total 40.000 / 1e6 = **US$ 0,0400**.
- Com cache: 30.220 × 0,05 = 1.511; 4.380 × 1,25 = 5.475; saída 5.400; total 12.386 / 1e6 = **US$ 0,01239** (31%).

**Claude Sonnet 5.5** (2,00 / 10,00; leitura 0,10; escrita 2,50)
- Sem cache: 34.600 × 2,00 = 69.200; 1.080 × 10,00 = 10.800; total 80.000 / 1e6 = **US$ 0,0800**.
- Com cache: 30.220 × 0,10 = 3.022; 4.380 × 2,50 = 10.950; saída 10.800; total 24.772 / 1e6 = **US$ 0,02477** (31%).

**Gemini 3.8 Flash** (0,75 / 3,75 até 31/12/2026; leitura 0,075)
- Sem cache: 34.600 × 0,75 = 25.950; 1.080 × 3,75 = 4.050; total 30.000 / 1e6 = **US$ 0,0300**.
- Com cache: 30.220 × 0,075 = 2.266,5; 4.380 × 0,75 = 3.285; saída 4.050; total 9.601,5 / 1e6 = **US$ 0,00960**.
- A partir de 01/01/2027 (1,50 / 7,50; leitura 0,15): sem cache **US$ 0,0600**; com cache **US$ 0,0192**.

**Groq gpt-oss-120b** (0,15 / 0,60): sem cache 34.600 × 0,15 = 5.190; 1.080 × 0,60 = 648; total 5.838 / 1e6 = **US$ 0,00584**. Preço de cache: não verificado.

### 9.3 Resumo (5 modelos mais plausíveis + 2 de referência)

| Modelo | Sem cache | Com cache incremental | Só system prompt em cache | Cache "frio" (expira entre turnos, reescreve tudo) | US$ por 1.000 conversas (com cache) |
|---|---|---|---|---|---|
| Claude Haiku 5.5 | 0,0040 | **0,00139** | 0,00204 | 0,00487 | 1,39 |
| GPT-6 Luna | 0,0040 | **0,00139** | 0,00204 | 0,00487 | 1,39 |
| Gemini 3.5 Flash-Lite | 0,01308 | **0,00492** | 0,00700 | 0,01308 | 4,92 |
| GPT-6.1 Terra | 0,0400 | **0,01239** | 0,01925 | 0,04865 | 12,39 |
| Claude Sonnet 5.5 | 0,0800 | **0,02477** | 0,03850 | 0,09730 | 24,77 |
| Ref.: Gemini 3.8 Flash (promo até 31/12/26) | 0,0300 | 0,00960 | 0,01481 | 0,0300 | 9,60 |
| Ref.: Groq gpt-oss-120b | 0,00584 | não verificado | não verificado | n/d | n/d |

Colunas: "Só system prompt em cache" = apenas os 2.500 tokens estáticos são lidos do cache nas 9 requisições seguintes (1 escrita). "Cache frio" = cada requisição reescreve o prompt completo (sem leitura), o pior caso em que o paciente responde depois do TTL.

### 9.4 Sensibilidades e riscos que mudam o resultado

- **TTL vs. ritmo do paciente (Anthropic).** TTL padrão 5 min. Paciente em WhatsApp costuma demorar mais entre mensagens. Cache expirado em toda requisição custa **mais** que não cachear (Haiku: 0,00487 vs 0,0040; escrita a 1,25x). Opções: TTL de 1 h (escrita 2x a entrada, vale a pena após 2 leituras) para o prefixo estático (system + tools) e deixar o histórico sem cache. OpenAI tem 30 min mínimos de cache por padrão ([doc](https://developers.openai.com/api/docs/guides/prompt-caching)), mais adequado a conversa lenta. O prefixo estático por tenant (2.500 tokens) é o que realmente se repete entre pacientes do mesmo tenant: mantê-lo quente.
- **Reasoning.** Se cada uma das 10 requisições gerar 300 tokens de thinking (premissa): custo extra de 3.000 tokens de saída = Haiku/Luna +US$ 0,0015, Flash-Lite +US$ 0,0075, Terra +US$ 0,015, Sonnet 5.5 +US$ 0,030. Para Sonnet 5.5 isso é +120% sobre o cenário com cache. Controle com `effort` baixo ou `between_tools` (Claude), `reasoning.effort=none` (OpenAI).
- **Cache implícito do Gemini** não garante acerto; sem acerto, usar a coluna "sem cache" (0,01308 para Flash-Lite).
- **Tokenizador do Claude** produz ~30% mais tokens que tokenizadores antigos para o mesmo texto ([pricing](https://platform.claude.com/docs/en/about-claude/pricing)); se o mesmo conteúdo em pt-BR gerar mais tokens no Claude do que no OpenAI, o custo efetivo do Haiku 5.5 sobe frente ao Luna, mesmo com preço de lista idêntico. Medir com contagem real de tokens.
- **Preço da conversa vs preço de voz.** 8 notas de voz de 20 s (2,7 min) em STT custam US$ 0,002 (Groq turbo) a US$ 0,016 (OpenAI whisper/4o-transcribe 0,006/min); 8 respostas de 20 s em TTS (2,7 min) custam US$ 0,024 (Gemini Flash-Lite TTS, 0,009/min) a US$ 0,19 (ElevenLabs v4, ~0,072/min). **Voz de saída pode custar mais que o LLM.** Voz de entrada (STT) é desprezível.
- **Batch API (-50%)** não serve para chat interativo. Serve para evals offline e relatórios.
- **Cenário de dados.** Cobrança mínima de residência: Anthropic `inference_geo=us` +10% ; OpenAI regional +10% ; Bedrock regional +10%.

---

## 10. Recomendação resumida para a spec

1. **Modelo padrão de conversa:** Claude Haiku 5.5 ou GPT-6 Luna (US$ 0,10/0,50, cerca de US$ 1,4 por 1.000 conversas com cache). Decidir por eval pt-BR próprio, tool-calling e latência medida. Gemini 3.5 Flash-Lite é a opção mais rápida por terceiros (305 tok/s) mas 3x mais cara por conversa e com índice geral muito menor (12).
2. **Modelo de escalonamento** para casos difíceis (reagendamento complexo, reclamações): Claude Sonnet 5.5 ou GPT-6.1 Terra, acionado por roteamento. Custo 9x a 18x maior por conversa.
3. **Residência no Brasil não está disponível de ponta a ponta** em nenhum fornecedor consultado: Anthropic (EUA/global), OpenAI (US/EU/AU/IN/JP), Gemini 3.x/4.x (sem SP), Groq (EUA). Bedrock sa-east-1 só entrega entrada regional com roteamento global. Tratar como risco jurídico (dado de saúde, LGPD) e levar a decisão ao DPO/jurídico: **não verificado**.
4. **Nunca** usar tier gratuito do Gemini nem do OpenRouter Free com dados de pacientes.
5. STT: medir WER de Groq turbo, gpt-4o-mini-transcribe e Scribe com áudios reais. TTS: preferir opções de US$ 0,01 a 0,04/min se a qualidade pt-BR passar no teste de ouvido.
6. Camada: Vercel AI SDK (Apache-2.0) + gateway fino próprio + Langfuse self-host (MIT) em `sa-east-1`.

---

## 11. Itens "não verificado" (consolidado)

- Qualquer benchmark pt-BR de atendimento comparando os modelos atuais; MMMLU pt-BR; resultados numéricos do BRACEval.
- Taxa de acerto de tool calling (BFCL, tau-bench) de qualquer modelo; TTFT real em effort baixo de qualquer modelo.
- Contexto máximo de GPT-6.1 Terra/Sol, Gemini 3.5 Flash-Lite/3.8 Flash.
- Preço de cache e regras da Groq; batch Groq; retenção/treino explícito na Groq; Groq `ogg` e WER pt-BR.
- Preços de Mistral Medium/Small/Ministral/Voxtral/embed; valor exato de cache Mistral.
- DeepSeek e xAI: retenção, treino, residência.
- Rate limits de entrada de OpenAI (RPM/TPM por tier) e Gemini (RPM/TPM por modelo); ZDR/retenção do Gemini API.
- Azure Brazil South para modelos de inferência (GPT e Claude); Claude 5.5 em Vertex southamerica-east1; confirmação visual da tabela de São Paulo na Vertex.
- Preço de Cohere Embed; qualidade pt-BR de todos os embeddings; modelos abertos.
- Equivalência exata de tokens de áudio por minuto para gpt-4o-mini-tts; chars/minuto de pt-BR (premissa de 900); qualidade/naturalidade de TTS pt-BR; suporte pt-BR no Deepgram Aura-2.
- Termos contratuais de clonagem de voz (ElevenLabs, Cartesia); aspectos LGPD de voz e de transferência internacional.
- Preço por trace de LangSmith, Helicone e PostHog acima do plano gratuito; tamanho em GB por trace no Braintrust; definição de "unit" do Langfuse.
- Recursos provider-agnostic do AI SDK 7, preço de Mastra Cloud, LangGraph Platform, LiteLLM enterprise e Portkey SaaS.
- Preço de GPT-Live/Realtime em conjunto com telefonia (SIP/PSTN); preço de agentes Cartesia.
