# Pesquisa 01: Meta WhatsApp Business Platform e compliance Brasil

Data da pesquisa: 2026-11-24. Escopo: SaaS multi-tenant, recepcionista de IA no WhatsApp para profissionais de saude autonomos (piloto: quiropraxista). Somente API oficial.

Convencoes:
- "Verificado" = lido na fonte oficial citada, na data de acesso 2026-11-24 (a data "Updated" da pagina da Meta vem entre parenteses quando existe).
- "nao verificado" = nao confirmado em fonte oficial nesta sessao (inferencia, fonte secundaria ou fonte inacessivel). Lista consolidada no fim.
- Base das URLs Meta: `https://developers.facebook.com/documentation/business-messaging/whatsapp/` (abreviada `[WA]/`). As paginas foram lidas via sufixo `.md` (versao em ingles do mesmo conteudo).

---

## PARTE A: Meta / WhatsApp Cloud API

### 1. Coexistence (app WhatsApp Business + Cloud API no mesmo numero)

Fonte: `[WA]/embedded-signup/onboarding-business-app-users` (acesso 2026-11-24). A propria pagina diz: "This feature is sometimes referred to as 'Coexistence'".

**Disponibilidade no Brasil: nao verificado.** A pagina oficial nao traz lista de paises. Brasil nao esta na lista de paises restritos da Plataforma (`[WA]/support#country-restrictions`: apenas Cuba, Ira, Coreia do Norte, Siria e 3 regioes da Ucrania), mas isso nao e uma lista de coexistence. Fontes de terceiros (Zenvia, ManyChat, Chakra, Eazybe) indicam Brasil suportado; nenhuma e oficial. Confirmar no Embedded Signup com um numero real antes de prometer ao cliente.

**Requisitos (verificado):**
- App WhatsApp Business versao 2.24.17 ou superior.
- Voce precisa ser Solution Partner ou Tech Provider ("You must already be a Solution Partner or Tech Provider").
- Webhook que consiga ingerir os eventos; Embedded Signup com session logging.
- Embedded Signup v2 e v3 sao descontinuados em 2026-10-15; usar v4/v5. Na v5 o onboarding de app Business vem ligado por padrao; na v3/v4 e preciso `featureType: "whatsapp_business_app_onboarding"`.
- Apos o cliente concluir o fluxo, ha 24 h para sincronizar historico/contatos, senao precisa off-boarding e refazer o fluxo. O app deve ficar aberto durante a sincronizacao.

**Limites (verificado, citacao):** "business phone numbers that are in use with both the WhatsApp Business app and Cloud API have a fixed throughput of 20 mps." (tambem em `[WA]/throughput`). O limite padrao de Cloud API e 80 mps; 1.000 mps por upgrade automatico.

**Webhooks que reportam o que o dono envia pelo celular/dispositivo vinculado (verificado):**
- `smb_message_echoes`: "describes any new messages your client sends with the WhatsApp Business app after onboarding". Payload `message_echoes[]` com `from`, `to`/`to_user_id`, `id`, `timestamp`, `type`. Dispara tambem para dispositivos companheiros suportados.
- `history`: mensagens passadas. Fases 0 (dia 0 a 1), 1 (dia 1 a 90), 2 (dia 90 a 180). Ate 180 dias de conversas 1:1 (a tabela de recursos diz "most recent 6 months"). Midia do historico so tem asset ID para mensagens de ate 14 dias.
- `smb_app_state_sync`: contatos (sincronizacao inicial e mudancas posteriores).
- `account_update`: ciclo de vida, incluindo desconexao. `disconnection_info.reason`: `PRIMARY_INACTIVITY` (app principal inativo ~14 dias), `COMPANION_INACTIVITY` (~30 dias), `USER_RE_REGISTERED`, `BUSINESS_DOWNGRADE`, `CHANGE_NUMBER`, `ACCOUNT_DISCONNECTED`. Tambem `account_offboarded` e evento de reconexao.
- Erro `131060` (`unsupported`) e esperado em primeira mensagem de usuario recem-chegado e com dispositivo companheiro nao suportado (Windows e WearOS nao sao suportados; todos os companheiros sao desvinculados no onboarding).

**Funcoes desativadas/nao suportadas (verificado, tabela da Meta):**
- Mensagens temporarias desligadas; "view once" desligado; localizacao em tempo real desligada em chats 1:1.
- Listas de transmissao desligadas (existentes viram somente leitura; nao cria novas).
- Grupos: nao sincronizados nem suportados na API.
- Chamadas de voz/video: sem mudanca no app; **"Not supported" na Cloud API**.
- Catalogo, status, ferramentas de mensagem (saudacao, ausencia, respostas rapidas, etiquetas), perfil, Canais: seguem no app; nao suportados na API.
- Edicao/revogacao de mensagem passa a ser suportada.

**Janela de atendimento e preco (verificado):** a janela de 24 h so abre quando o usuario escreve para um numero ja onboarded na Cloud API. "Messages sent from the WhatsApp Business app are not subject to the customer service window and do not create, extend, or affect Cloud API conversation windows or Cloud API pricing." Mensagens enviadas pelo app seguem gratuitas; as enviadas pela API seguem o preco da Cloud API.

**Compativel com a Calling API? Nao.** Duas citacoes:
- Tabela de coexistence: "Voice and video calls | No change | Not supported" (na Cloud API).
- `[WA]/calling` (Step 1, prerequisitos): "Your business number is in use with Cloud API (not the WhatsApp Business app)."
Conclusao: numero em coexistence nao pode usar a Calling API. Interpretacao minha (nao verificado em pagina dedicada): o numero teria de migrar para Cloud API pura.

**Pontos de politica:** a Business Messaging Policy proibe falar de "Regulated Verticals" pelo app WhatsApp Business (secao 5). A lista de proibidos na secao 4 inclui "Medical and healthcare products" (produtos, nao servicos). Se servicos de quiropraxia caem em algum vertical regulado nao foi confirmado: nao verificado (https://www.whatsapp.com/legal/business-policy, "Last updated: September 23, 2026").

Implicacao de arquitetura: com coexistence o dono responde pelo celular; o agente precisa tratar `smb_message_echoes` como sinal de "humano assumiu" (pausar o bot naquela conversa), espelhar a mensagem na timeline e nao responder a si mesmo.

### 2. Indicador de digitacao e confirmacao de leitura

Fontes: `[WA]/typing-indicators` (acesso 2026-11-24) e `[WA]/messages/mark-message-as-read` (Updated 2026-10-15).

Requisicao exata (typing indicator, tambem marca como lida):
```
POST https://graph.facebook.com/<API_VERSION>/<PHONE_NUMBER_ID>/messages
Authorization: Bearer <ACCESS_TOKEN>
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "status": "read",
  "message_id": "<wamid recebido no webhook messages>",
  "typing_indicator": { "type": "text" }
}
```
Resposta: `{"success": true}`. Versao atual nos exemplos: v27.0.

Apenas ler (ticks azuis): mesmo corpo sem `typing_indicator`. Vale para mensagem individual e de grupo.

Duracao e expiracao (citacao): "The typing indicator will be dismissed once you respond, or after 25 seconds, whichever comes first. To prevent a poor user experience, only display a typing indicator if you are going to respond." Nao ha como renovar documentado: para respostas longas, reenviar a chamada com o mesmo `message_id` e comportamento: nao verificado.

### 3. Webhooks

Fontes: `[WA]/webhooks/overview`, `[WA]/webhooks/create-webhook-endpoint`, `[WA]/webhooks/reference/messages/status`, `[WA]/throughput`, `[WA]/support/error-codes` (acesso 2026-11-24).

- **Retry (verificado):** resposta diferente de HTTP 200 ou falha de entrega: "Meta retries delivery with decreasing frequency until the request succeeds, for up to 7 days." Em `[WA]/throughput`: "exponential backoff".
- **Duplicados (verificado):** retries "can result in duplicate webhook notifications". Logo, idempotencia por `messages[].id` (wamid) e por `statuses[].id + status`.
- **Ordem: nao documentada** (nenhuma garantia de ordem encontrada). Tratar status fora de ordem e usar `timestamp`. Existe caso documentado de status conflitantes (success e failure para a mesma mensagem, `[WA]/support#conflicting-message-delivery-status`).
- **Assinatura (verificado):** header `X-Hub-Signature-256: sha256=<hash>`. Hash = HMAC-SHA256 do corpo bruto com o app secret como chave. Comparar com tudo depois de `sha256=`. Validar sobre os bytes brutos, nao sobre JSON re-serializado.
- **Verificacao GET:** `hub.mode`, `hub.challenge`, `hub.verify_token`; responder 200 com o challenge.
- **TLS valido obrigatorio** (autoassinado nao). mTLS suportado (por app).
- **Tamanho:** ate 3 MB.
- **Latencia esperada do seu endpoint:** mediana ate 250 ms; menos de 1% acima de 1 s. Servidor deve suportar 3x o volume de saida em status. Concorrencia: Meta entrega webhooks de forma concorrente. Para o nosso volume e irrelevante, mas a regra pratica e: ack imediato (200) e processar em fila.
- **Retries vao para todos os apps inscritos** na mesma conta de mensagens.
- **Status de saida (verificado):** `sent`, `delivered`, `read`, `failed`; v. "played" para voice message (a partir de 2026-03-17). Se a mensagem e lida ao mesmo tempo em que e entregue, o `delivered` nao e enviado ("the 'delivered' webhook is not sent because it's implied"). `failed` omite `contacts`. O objeto `pricing` traz `category`, `type` (`regular`, `free_customer_service`, `free_entry_point`...) e `subtype` (`free_tier`, `paid_exempt`).
- **BSUID (verificado, `[WA]/business-scoped-user-ids`, ultima nota 2026-11-05):** payloads de mensagem trazem `user_id`/`from_user_id` (BSUID). Se o usuario adotou username, `wa_id`/`from` podem vir omitidos. "Supporting business-scoped user IDs (BSUID) is required for all partners and directly-integrated businesses". Arquitetura: identificar o paciente por BSUID, nao so por telefone; telefone vira atributo opcional.
- **Codigos de erro a tratar (verificado em `[WA]/support/error-codes`):**
  - `131047`: mais de 24 h desde a ultima resposta do usuario; enviar template.
  - `131026`: nao entregavel (nao e WhatsApp, nao aceitou ToS, versao antiga).
  - `131056`: pair rate limit (muitas mensagens para o mesmo usuario). Limite: 1 mensagem a cada 6 s por usuario (`[WA]/about-the-platform`).
  - `130429`: throughput excedido. `80007`: limite de taxa da conta.
  - `131048`: restricao por spam/qualidade. `131049`: marketing nao entregue por "ecosystem engagement".
  - `131051`: tipo nao suportado. `131052`: falha ao baixar midia do usuario (tambem arquivo acima de 100 MB). `131053`: falha no upload.
  - `131057`: conta em manutencao (upgrade de throughput). `133010`: numero nao registrado.
  - `190`: token expirado. `368`: WABA restrita/desabilitada por politica.
  - `132000`: numero de variaveis do template nao confere.

### 4. Midia

Fonte: `[WA]/business-phone-numbers/media`, `[WA]/messages/audio-messages`, `[WA]/webhooks/reference/messages/audio` (acesso 2026-11-24).

- **Recebimento:** webhooks `messages` com `type` = `audio`, `image`, `document`, `sticker`, `location` (cada um com referencia propria). Audio traz `mime_type` e `voice` (true quando gravado no cliente WhatsApp; exemplo oficial: `audio/ogg; codecs=opus`). Localizacao traz `latitude`, `longitude`, `name`, `address`.
- **Download (verificado):** 1) `GET /<MEDIA_ID>?phone_number_id=<ID>` com Bearer devolve `url`, `mime_type`, `sha256`, `file_size`. 2) `GET <url>` com Bearer. Citacao: "If you omit your token, the request will fail."
- **Expiracao (verificado):** URL de download expira em **5 minutos** (consultar o ID de novo). Media ID vindo em webhook expira em **7 dias**; ID retornado por upload expira em **30 dias**. Logo, o pipeline deve baixar e persistir o audio logo ao receber (para transcrever).
- **Limites (verificado):** audio 16 MB (aac, amr, mp3, m4a, ogg/opus; ogg somente OPUS e mono); imagem 5 MB (jpeg, png, webp estatico); documento 100 MB (pdf, doc(x), xls(x), ppt(x), txt); sticker 100 KB estatico e 500 KB animado; video 16 MB (mp4, 3gp). Tamanho maximo de qualquer midia recebida: 100 MB (erro 131052 acima disso).
- **Enviar audio como nota de voz (verificado):** `type: "audio"` com `"voice": true` e arquivo `.ogg` codec OPUS. Outro formato/codec faz a transcricao falhar. O icone de play so aparece se o arquivo tiver ate 512 KB; acima disso vira icone de download. Mostra a foto de perfil do negocio com microfone. Transcricao automatica aparece conforme preferencia do usuario.

### 5. Mensagens interativas e Flows

Fonte: `[WA]/messages/interactive-reply-buttons-messages`, `.../interactive-list-messages`, `[WA]/flows` (acesso 2026-11-24).

- **Botoes de resposta:** ate 3 botoes; rotulo ate 20 caracteres; corpo ate 1.024; rodape ate 60; id do botao ate 256.
- **Lista:** ate 10 secoes e 10 linhas no total; texto do botao ate 20; corpo ate 4.096; titulo de linha ate 24; descricao ate 72; cabecalho de texto ate 60; rodape ate 60.
- Tipos interativos sao mensagens de servico: so dentro da janela de 24 h (`[WA]/messages/send-messages`). Tambem existem CTA URL, pedido de localizacao e botao de ligacao.
- **Flows:** estrutura de formularios nativos. A Meta fornece um template "Book an Appointment" com endpoint de exemplo (`[WA]/flows/guides/implementingyourflowendpoint`). Util para agendamento (escolha de data/horario com disponibilidade vinda do nosso endpoint). Limites de componentes/telas do Flow, criptografia do endpoint e revisao: nao verificado nesta sessao. Flow enviado e uma mensagem interativa; fora da janela exige template com botao Flow (nao verificado).

### 6. Templates, janela de atendimento e preco

Fontes: `[WA]/templates/template-categorization`, `[WA]/templates/overview`, `[WA]/pricing` (Updated 2026-11-18), `[WA]/messages/send-messages`, https://www.whatsapp.com/legal/business-policy (acesso 2026-11-24).

**Categorias (verificado):** Marketing, Utility, Authentication. Mensagens nao-template dentro da janela = Service (ou "Meta Business Agent" se feitas pelo produto de IA da Meta).

**Regras:**
- Template aprovado em revisao automatica; revisao "can take up to 24 hours".
- Se voce pedir UTILITY e a Meta entender que e MARKETING, desde 2025-04-09 o template e aprovado como MARKETING. Ha recategorizacao automatica posterior e prazo de 60 dias para contestar.
- Utility exige: nao promocional E (especifico/solicitado pelo usuario OU essencial). Exemplos oficiais: confirmar/atualizar/cancelar pedido ou transacao com detalhes especificos; alertas sobre servico contratado; pesquisa de feedback sobre interacao especifica ("A general/generic survey or request for feedback will not be approved as utility"); continuar conversa iniciada em outro canal.
- Template sempre pode ser enviado; fora da janela de 24 h e a unica forma de iniciar. Politica: so e permitido iniciar conversas com template aprovado e so para usuarios que deram opt-in.

**Enquadramento dos nossos casos** (a Meta NAO lista "consulta/agendamento" nos exemplos; abaixo e inferencia minha, nao verificado):
- Confirmacao de consulta que o paciente acabou de marcar: Utility plausivel (especifica e solicitada).
- Lembrete de consulta: Utility plausivel se sem texto promocional; risco de reclassificacao para Marketing.
- Pedido de avaliacao (ex.: Google): provavel Marketing, ou Utility so se for feedback sobre o atendimento especifico e sem apelo promocional.
- Reativacao/retorno de paciente inativo: Marketing (exemplo "Retargeting" da Meta: ofertas ou chamadas a usuarios que ja interagiram; "These are marketing even if requested by users").

**Janela de atendimento (verificado):** 24 h, abre e reinicia a cada mensagem (ou chamada) do usuario. Dentro dela, mensagens nao-template; fora, so template.

**Preco atual da Meta (verificado, `[WA]/pricing`, Updated 2026-11-18; planilha "Cost per message in BRL ... effective October 1, 2026"):**

| Categoria | Brasil, BRL por mensagem entregue |
|---|---|
| Marketing | 0,3217 |
| Utility | 0,035 |
| Authentication | 0,035 |
| Service | 0,035 |
| Meta Business Agent | US$ 2,00 por 1 M de tokens (pagina diz ~4 a 5 centavos de USD por mensagem) |

- Cobranca por mensagem entregue, apenas de empresa para usuario. Mensagens do usuario sao gratuitas.
- Faturamento em BRL pela Facebook Brasil para contas em BRL (a partir de 2026-07-01; clientes elegiveis devem migrar todas as contas ate 2027-06-30).
- Descontos por volume so para Utility e Authentication; a planilha de faixas existe (`BRL volume tiers`); faixas alem da primeira nao foram detalhadas aqui: nao verificado.
- **Gratuidades (verificado):** apenas duas. (1) Janela de ponto de entrada gratuito (anuncio Click-to-WhatsApp, ate 7 dias; nao cobra marketing, utility, authentication nem service). (2) **Primeiras 1.000 mensagens de servico por mes por numero de telefone comercial**, sem acumulo.
- **Sua alegacao sobre 2026-10-01: CONFIRMADA** em `[WA]/pricing` (secao "Effective October 1, 2026"): "Meta resumed charging, on a per-message basis, for messages that were previously free: Service messages, which became free as of Nov. 1, 2024 ... Utility messages sent in response to users (thus in an open customer service window), which became free as of July 1, 2025." No webhook de status, `pricing.type` desses utility dentro da janela mudou de `free_customer_service` para `regular`. Servico: 1.000 gratis/mes/numero, a partir da 1.001a cobra. Aviso da Meta: sem forma de pagamento cadastrada, as mensagens de servico deixam de ser entregues apos a franquia. Excecao: organizacoes governamentais e sem fins lucrativos elegiveis (ate 2027-12-31).
- Impacto no custo: cada resposta do agente dentro da janela e "service" a R$ 0,035 depois das 1.000 do mes. Um paciente com 6 respostas do bot custa ~R$ 0,21. Utility fora da janela tambem R$ 0,035 (nao ha mais vantagem de custo entre as duas).
- **"AI Providers" (verificado, `[WA]/pricing/ai-providers`, atualizado 2026-10-15):** desde 2026-03-11 no Brasil, "AI Providers" pagam por mensagem de servico entregue a usuarios no Brasil (taxas em planilha propria, nao lida). Definicao dos Termos de 2026-01-15: "Providers and developers of artificial intelligence or machine learning technologies, such as large language models, generative artificial intelligence platforms, general-purpose artificial intelligence assistants, or similar technologies". Se a Meta classificar nosso SaaS como "AI Provider" o custo e outro: nao verificado (o texto dos Termos nao foi acessivel; a pagina e renderizada por JavaScript).

### 7. Limites de mensagens e qualidade

Fonte: `[WA]/messaging-limits`, `[WA]/throughput` (acesso 2026-11-24).

- Limite = numero de usuarios unicos para quem a empresa pode entregar mensagens **fora da janela de atendimento** em 24 h moveis; calculado no nivel do **portfolio empresarial** e compartilhado por todos os numeros dele. Portfolio novo: **250**.
- Para 2.000: verificar a empresa, ou verificacao conduzida pelo parceiro, ou enviar 2.000 mensagens entregues fora da janela a usuarios unicos em 30 dias com templates de alta qualidade.
- Depois, escala automatica (10.000, 100.000, ilimitado): qualidade alta e uso de pelo menos metade do limite nos ultimos 7 dias; aumento em ate 6 h.
- Resposta dentro da janela de 24 h nao conta nesse limite. Para um profissional autonomo, 250 pacientes distintos/dia fora da janela costuma bastar.
- Verificacao de empresa exige dados empresariais (CNPJ); verificacao pelo parceiro so para Solution Partner "Select" ou "Premier" (`[WA]/solution-providers/overview`).
- Qualidade: restricao por spam/feedback negativo; escalonamento de bloqueios (1 ou 3 dias para templates; 5, 7 ou 30 dias para qualquer mensagem; bloqueio de conta; desativacao) em `[WA]/policy-enforcement`. Qualidade de template: ativo alto/medio/baixo, pausado, desativado.
- Throughput: 80 mps padrao por numero; 20 mps em coexistence; pair rate 1 msg/6 s por usuario.

### 8. Tech Provider, Embedded Signup e BSP

Fontes: `[WA]/solution-providers/overview`, `.../get-started-for-tech-providers`, `[WA]/embedded-signup/overview`, https://360dialog.com/pricing, https://www.twilio.com/en-us/whatsapp/pricing, https://www.gupshup.ai/pricing (acesso 2026-11-24).

**Passos para Tech Provider (verificado):**
1. App Meta com caso de uso WhatsApp e portfolio empresarial.
2. **Verificar a empresa** (nome, endereco, telefone, e-mail, site; possivel envio de documentos).
3. **App Review** para acesso avancado a `whatsapp_business_messaging` e `whatsapp_business_management`; enviar 2 videos (mensagem enviada do app e recebida no WhatsApp; criacao de template), configuracoes do app (icone, politica de privacidade, categoria) e documentacao.
4. Implementar Embedded Signup (v4 ou v5), webhooks e tokens de negocio.
Prazos de verificacao e de App Review: nao verificado (a Meta nao os publica nas paginas lidas).

**Limite de onboarding (verificado):** por padrao, **10 novas contas WhatsApp em janela de 7 dias**. Com Business Verification, App Review e Access Verification, sobe automaticamente para **200** por 7 dias; acima disso, virar Meta Business Partner.

**Cobranca (verificado):** Tech Providers **nao tem linha de credito**. "clients onboarded by Tech Providers must provide their own payment method after onboarding is complete. Meta will then bill these clients for API usage, and the Tech Provider will bill for other services." Ou seja, a Meta cobra o consumo direto de cada cliente (em BRL via Facebook Brasil). Solution Partner tem linha de credito e pode faturar consumo, mas "becoming a Solution Partner is a lengthy process". Cada profissional precisa ter forma de pagamento valida no Billing Hub; sem isso as mensagens de servico param apos a franquia gratuita.

**Alternativa BSP (precos publicos, nao necessariamente para o Brasil):**
- **360dialog Marketplace:** EUR 99 por numero por mes + tarifas da Meta (80 mps incluidos). **Plataforma para parceiros:** Starter EUR 250/mes + EUR 49 por canal; Growth EUR 500/mes + EUR 25 por canal; Premium EUR 1.000/mes + EUR 15 por canal; todos mensais.
- **Twilio** (pagina em/us): US$ 0,005 por mensagem, entrada e saida, + tarifa da Meta. A calculadora da pagina estava com regiao errada para o Brasil; valores BRL: nao verificado.
- **Gupshup:** pagina carregou em INR (plano pay-as-you-go, plataforma INR 0/mes); preco para Brasil: nao verificado.

**Esforco:** Tech Provider = trabalho unico de verificacao + App Review + Embedded Signup (e manter webhooks/tokens/templates por cliente), sem taxa mensal a plataforma, e o cliente paga a Meta diretamente. BSP = onboarding mais rapido (o BSP ja passou pela Meta), custo recorrente por numero (360dialog EUR 99 por numero seria o custo fixo por cliente), dependencia do roteiro de recursos do BSP (coexistence, BSUID, Calling, etc.). Pelos precos publicados, o ponto de virada para fazer Tech Provider proprio ocorre em poucos clientes (1 cliente em 360dialog Marketplace = EUR 99/mes, 10 clientes = ~EUR 1.000/mes). Observacao: o numero acima so compara o preco de tabela; custo de engenharia nao estimado.

### 9. Calling API

Fonte: `[WA]/calling`, `[WA]/calling/pricing` (acesso 2026-11-24).

- **Disponibilidade:** chamadas iniciadas pelo usuario: "every location Cloud API is available" (inclui Brasil). Chamadas iniciadas pela empresa: todos os locais da Cloud API **exceto** EUA, Canada, Egito, Vietna e Nigeria; Brasil nao esta na lista de excecoes. A pagina traz tambem aviso de "Limited availability" para chamadas iniciadas pela empresa cujo texto completo nao foi lido: nao verificado.
- **Requisitos:** numero em Cloud API (nao no app Business, portanto fora de coexistence); inscrever o campo `calls`; permissao `whatsapp_business_messaging`; **limite diario de mensagens de pelo menos 2.000 destinatarios unicos**; habilitar configuracoes de chamada no numero; opt-in separado para ligar ao usuario (Business Policy).
- **Preco (verificado):** "All user-initiated calls are free." Chamadas da empresa cobradas por duracao em pulsos de 6 s, pelo pais do numero chamado, com faixas de volume mensal. Taxa em BRL: nao verificado (planilha BRL nao foi extraida). Chamada do usuario tambem abre a janela de 24 h.
- Para o piloto, e fora de escopo do MVP; chamadas continuam existindo no celular do profissional (em coexistence).

### 10. Politica da Meta sobre IA/chatbots

Fontes: https://www.whatsapp.com/legal/business-policy (Last updated 2026-09-23); `[WA]/pricing/ai-providers` (atualizado 2026-10-15); `[WA]/policy-enforcement` (acesso 2026-11-24). O texto integral dos Termos (https://www.whatsapp.com/legal/business-solution-terms) nao carregou (JavaScript); a definicao de "AI Providers" veio da pagina de preco da Meta.

- **Banimento (verificado indiretamente):** Termos atualizados em 2026-01-15: "AI Providers" so podem oferecer assistentes de IA de proposito geral na Plataforma onde a Meta for legalmente obrigada a permitir (pagina de AI Providers). A busca na imprensa (TechCrunch, 2025-10-18; nao oficial) diz que a Meta confirmou que o alvo sao provedores de modelos distribuindo assistentes, e nao empresas que usam IA no atendimento. Isso e coerente com o texto oficial, mas a clausula integral dos Termos: nao verificado.
- **Brasil:** a Meta lista o Brasil (+55) entre os mercados em que "AI Providers" podem enviar mensagens de servico e sao cobrados (desde 2026-03-11).
- **Agente de agendamento/FAQ de clinica:** nenhum trecho lido proibe. A Business Messaging Policy diz: "You may use automation when responding during the 24-hour window, but must also have available prompt, clear, and direct escalation paths." Caminhos aceitos: transferencia a agente humano no chat, telefone, e-mail, suporte web, visita presencial ou formulario. Conclusao: permitido, desde que o agente nao seja assistente de proposito geral (restringir escopo a agendamento e informacoes da clinica) e exista escalonamento humano visivel.
- **Divulgacao de que e IA:** a politica lida **nao exige** divulgacao explicita (nenhum texto encontrado). A propria documentacao de templates usa "I am the virtual assistant on WhatsApp" como exemplo. Exigencia de divulgacao vem de outras fontes (CDC, CFM 2.454/2026; ver Parte B), e a politica de privacidade/consentimento e responsabilidade do negocio.
- **Dados de saude (verificado, politica, secao 3):** "Don't use WhatsApp for telemedicine or to send or request any health related information, if applicable regulations prohibit distribution of such information to systems that do not meet heightened requirements to handle health related information." Tambem: "You are responsible for and must secure all necessary notices, permissions, and consents ... and maintaining a published privacy policy". Risco concreto para o produto: o agente nao deve pedir nem armazenar informacao clinica; apenas dados administrativos (nome, telefone, horario, motivo generico).

---

## PARTE B: Compliance Brasil

Aviso: ponto 11 a 13 e analise tecnica para o spec, nao parecer juridico. Artigos da LGPD conferidos no texto do Planalto (acesso 2026-11-24, https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm): 11, 20, 33, 42, 48. Os demais artigos citados vem do meu conhecimento e ficam como "nao verificado".

### 11. LGPD para dados de saude neste arranjo

- **Dado sensivel (art. 5 II; nao verificado na sessao):** dado referente a saude. Nome + telefone + "marcar consulta de quiropraxia" ja pode revelar condicao de saude. Mensagens de texto, audio e imagens enviadas por pacientes frequentemente trazem sintomas.
- **Bases legais (art. 11, verificado):** (I) consentimento especifico e destacado; (II)(f) "tutela da saude, exclusivamente, em procedimento realizado por profissionais de saude, servicos de saude ou autoridade sanitaria" (redacao da Lei 13.853/2019); (II)(d) exercicio regular de direitos (contrato). Legitimo interesse **nao** serve para dado sensivel (guia da ANPD sobre legitimo interesse; confirmado so em resumo de busca: nao verificado). Pratica recomendada: base do agendamento = art. 11 II (f) para o profissional de saude (controlador); para etapas fora da tutela da saude, como lembretes de marketing e reativacao, usar consentimento (e opt-in WhatsApp). Se o quiropraxista nao for "profissional de saude" regulado, a alinea (f) pode nao ser aplicavel: nao verificado (depende do ponto 12).
- **Papeis (nao verificado em guia da ANPD; interpretacao):** o profissional/clinica e **controlador**; nosso SaaS e **operador** (art. 5 VII; atua em nome do controlador, art. 39). Dai: so tratar sob instrucao documentada, nao usar dados do paciente para treinar modelos proprios nem para produto proprio (viraria controlador). Provedor de LLM e **suboperador**. Meta/WhatsApp tem papel proprio (nao tratamos como suboperador; fica fora do DPA, mas citar no aviso de privacidade).
- **Transferencia internacional (verificado):** art. 33 da LGPD permite, entre outros: pais adequado (I), garantias como clausulas contratuais especificas, **clausulas-padrao contratuais**, normas corporativas globais, selos/certificados (II), consentimento especifico e destacado (VIII). **Resolucao CD/ANPD no 19/2024** (23/08/2024, https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024): "transferencia" = operacao em que um agente de tratamento "transmite, compartilha ou disponibiliza acesso" a outro agente; art. 4: cabe ao controlador verificar se a operacao e transferencia internacional, se se submete a LGPD e se ha hipotese legal e mecanismo valido; operador auxilia. As clausulas-padrao do Anexo II devem ser incorporadas (adotadas integralmente, sem alteracao) no prazo de 12 meses da publicacao, ou seja, **ate 2025-08-23 (ja vencido)**. Segundo o portal da ANPD (busca, nao conferido na pagina), ate a data da consulta nao havia decisao de adequacao de pais nem clausulas equivalentes aprovadas: nao verificado atual. Consequencia: enviar texto/audio de pacientes a LLM no exterior exige (a) SCC da ANPD (Anexo II) assinadas com o provedor/exportador, ou (b) consentimento especifico e destacado (impraticavel como base unica), ou (c) provedor com processamento em regiao do Brasil, ou (d) minimizar/anonimizar antes do envio (remover nome, telefone, CPF). Como somos operador e o cliente e controlador, o contrato com o cliente precisa autorizar a transferencia e identificar o suboperador no exterior.
- **Direito a revisao (art. 20, verificado):** titular pode pedir revisao por pessoa natural de decisoes tomadas unicamente com base em tratamento automatizado que afetem seus interesses. Para agendamento nao e decisao relevante; mas o canal para falar com humano e exigido tambem pela Meta.
- **Incidentes (art. 48 verificado; prazos pela Resolucao CD/ANPD 15/2024):** o controlador comunica ANPD e titular em caso de risco ou dano relevante. O regulamento fixa **3 dias uteis** contados do conhecimento, para ANPD e titulares; complementacao em 20 dias uteis (confirmado so por paginas de orgaos publicos que reproduzem o texto; DOU nao conferido: nao verificado). Como operador, o DPA deve obrigar-nos a avisar o cliente em prazo muito menor (ex.: 24 h) para ele cumprir os 3 dias.
- **Responsabilidade (art. 42, verificado):** operador responde solidariamente quando descumpre a legislacao ou as instrucoes licitas do controlador.
- **Retencao:** a LGPD exige eliminar ao fim do tratamento, ressalvados guarda legal (art. 15 e 16; nao verificado). Prazo de guarda do prontuario (Lei 13.787/2018, 20 anos para prontuario eletronico; e normas de cada conselho): nao verificado. Decisao de arquitetura: o historico de conversas do agente NAO e o prontuario; reter o minimo (ex.: conversas por prazo curto definido pelo cliente), e o prontuario continua no sistema clinico do profissional.
- **Conteudo minimo do DPA com o cliente (checklist; art. 37, 39, 41, 46 a 48 nao verificados):** objeto, finalidades e dados tratados; instrucoes do controlador; confidencialidade; seguranca (criptografia em transito e repouso, isolamento por tenant, controle de acesso, logs); lista de suboperadores (LLM, transcricao de audio, hospedagem, Meta) com paises e mecanismo de transferencia (SCC ANPD); assistencia no atendimento aos direitos do titular; notificacao de incidente em prazo curto; auditoria; retencao e eliminacao/devolucao ao termino; indicacao de encarregado; responsabilidade; proibicao de uso proprio ou treino com dados do paciente; ciencia de que o cliente e o controlador e responsavel pelo aviso de privacidade e pela base legal.

### 12. Regras de conselhos profissionais: preco e automacao

**Quiropraxia (situacao regulatoria; busca em fontes secundarias, nao oficiais):** nao encontrei lei federal que regulamente a quiropraxia como profissao autonoma. COFFITO a reconhece como **especialidade do fisioterapeuta** (Resolucao COFFITO 220/2001; 399/2011 disciplina a especialidade), com validade contestada judicialmente (TRF-3, segundo a busca). Tramitam projetos de lei (PL 2850/2021, aprovado em comissao do Senado em 2025, segundo uma materia); CFM e outros conselhos se opoem. Conclusao: depende de quem e o piloto. Se for fisioterapeuta, vale COFFITO; se for quiropraxista sem formacao em fisioterapia, nao ha conselho que regule a publicidade, valendo CDC e vigilancia sanitaria local. Status atual do PL e das resolucoes COFFITO: nao verificado.

**Agente informar preco proativamente no WhatsApp, por conselho:**

| Conselho | Regra encontrada | Pode informar preco proativamente? |
|---|---|---|
| COFFITO (fisioterapia; inclui quiropraxia se especialidade) | Codigo de Etica, Res. 424/2013, art. 40 I (texto lido em https://www.normasbrasil.com.br/norma/resolucao-424-2013_257114.html): e proibido "afixar valor de honorarios fora do local da assistencia fisioterapeutica, ou promover sua divulgacao de forma incompativel com a dignidade da profissao ou que implique em concorrencia desleal". Res. 391/2011 proibe oferta em sites de compra coletiva. | Nao confirmado. Responder preco quando o paciente pergunta, em conversa 1:1, e menos arriscado do que anunciar; tratar como "informacao ao paciente" e nao como publicidade e interpretacao minha: nao verificado. Preco em lembretes/mensagens proativas: evitar. Vigencia atual da Res. 424/2013: nao verificado. |
| CFM (medicina) | Res. CFM 2.336/2023, art. 9 VI (texto lido): permitido "informar sobre valores de consultas, meios e formas de pagamento"; a mesma norma permite anunciar valor de consulta, procedimentos e exames "desde que estes nao dependam de diagnostico e avaliacao previa". Proibe oferta casada ("faca a consulta e ganhe o exame"). | Sim, valor de consulta, com cuidados (sem promocoes casadas, art. 9 VIII e seguintes). |
| CFN (nutricao) | Res. CFN 599/2018, art. 57 (texto lido em https://cfn.org.br/wp-content/uploads/resolucoes/Res_599_2018.html): e vedado "utilizar o valor de seus honorarios, promocoes e sorteios de procedimentos ou servicos como forma de publicidade e propaganda". Busca secundaria sugere que a Res. CFN 856/2026 pode ter revogado a 599: nao verificado. | Nao proativamente (como publicidade). Resposta a pergunta direta: mesma observacao do COFFITO. |
| CFO (odontologia) | Res. CFO 196/2019 liberou fotos de resultados; fonte secundaria diz que o Codigo (Res. CFO 118/2012, art. 44) ainda veda divulgar precos e formas de pagamento. Texto oficial nao conferido. | nao verificado (provavel nao). |
| CFP (psicologia) | Codigo de Etica (Res. CFP 010/2005) e Nota Tecnica CFP 1/2022 sobre publicidade em redes. Regra especifica sobre divulgar valor: nao localizada. | nao verificado. |

Regra geral aplicavel a todos (CDC verificado, Planalto): art. 6 III garante "informacao adequada e clara sobre os diferentes produtos e servicos, com especificacao correta de ... preco"; art. 37 proibe publicidade enganosa, incluindo por omissao, sobre preco. Entao, quando o agente informa preco, o valor tem de estar correto e atualizado: configurar preco como dado cadastrado pelo profissional, nunca gerado pelo modelo.

**Regras sobre IA/automacao nos conselhos:**
- **CFM:** Resolucao CFM 2.454/2026 (11/02/2026, DOU 2026-02-27, retificada em 2026-03-05; vigencia reportada pelo CFM em 2026-08-26). Texto lido (https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2026/2454_2026.pdf): art. 5, par. 1: "O paciente tem o direito de ser informado, de forma clara e acessivel, quando modelos, sistemas e aplicacoes de IA forem utilizados como apoio relevante em seu cuidado, diagnostico ou tratamento." Par. 2: "E vedado ao medico delegar a IA a comunicacao de diagnosticos, prognosticos ou decisoes terapeuticas, sem a devida mediacao humana." Anexo II classifica como **baixo risco** sistemas de IA para "agendamento de consultas" e "chatbots fornecendo informacoes gerais de saude (sem personalizar aconselhamento clinico)". So se aplica a medicos.
- **COFFITO, CFN, CFO:** nenhuma norma especifica sobre IA encontrada (busca): nao verificado.
- **CFP:** nota de posicionamento (jul/2025), grupo de trabalho e cartilhas (dez/2025) sobre IA; nenhuma resolucao vinculante localizada (busca; nao verificado em fonte primaria).
- Regra pratica para o produto: o agente nunca faz triagem clinica, diagnostico nem aconselhamento terapeutico; so agenda, informa horarios/endereco/preco cadastrado e encaminha ao humano.

### 13. Risco juridico: voz clonada e IA sem se identificar

- **IA que nao se identifica:** nao encontrei lei brasileira que exija identificar o chatbot em geral. Riscos: CDC art. 37 par. 1 (publicidade/informacao enganosa por omissao capaz de induzir a erro, texto verificado) e art. 6 III (informacao adequada e clara); LGPD principio da transparencia (art. 6 VI; nao verificado); CFM 2.454/2026 para medicos (art. 5 par. 1; verificado). A Meta nao exige divulgacao (ponto 10). Recomendacao: mensagem de abertura identificando assistente virtual do consultorio e como falar com a pessoa.
- **Voz clonada do profissional:** nao encontrei lei especifica sobre clonagem de voz por IA (busca; artigos de doutrina da AASP apontam ausencia de legislacao especifica, defendem responsabilidade objetiva; isso e tese, nao regra). Fundamentos ja aplicaveis (citados em artigos; textos nao conferidos): direito a imagem e a voz (CF art. 5 V e X; CC art. 20): nao verificado; LGPD: voz e dado pessoal (se usada para identificar unicamente a pessoa, pode ser dado biometrico sensivel): nao verificado. Riscos: (1) para o paciente: enganar quem acha que e o profissional falando (CDC 37 par. 1) e contaminar a relacao de confianca; (2) para o profissional: uso de sua propria voz exige autorizacao documentada e revogavel (LGPD art. 7 I / consentimento), e o consentimento deve cobrir uso por terceiro (nos) e provedores de TTS; (3) fraude: uso malicioso de vozes clonadas e hoje crime/golpe de alta atencao e ha tendencia de regulacao. Sugestao: nao clonar voz no MVP; usar voz sintetica generica rotulada ou texto.
- **Marco Legal da IA (PL 2338/2023):** aprovado no Senado, enviado a Camara em 2025-03-17; Comissao Especial; ultimo sinal encontrado: presidente da Camara disse em 2026-05-28 que votaria no ano, com relatorio previsto para 2026-06-09 (fontes jornalisticas, https://www.congressoemfoco.com.br e outras). **Nao encontrei votacao em plenario nem sancao**; tratar como **nao em vigor** ate confirmar em https://www.camara.leg.br. Status atual (nov/2026): nao verificado.

---

## Lista consolidada de itens "nao verificado"

Meta:
1. Coexistence esta disponivel no Brasil (a Meta nao publica lista; so terceiros).
2. Servicos de quiropraxia tratados como "regulated vertical" pela Business Policy.
3. Renovacao do typing indicator apos 25 s.
4. Ordem de entrega dos webhooks (nao documentada).
5. Calling no Brasil: aviso "Limited availability" nao lido; taxa BRL do Calling nao extraida.
6. Faixas de volume BRL alem da primeira (Utility/Authentication); taxas de "AI Providers" para o Brasil.
7. Enquadramento Meta de confirmacao, lembrete, pedido de avaliacao e reativacao (inferido da categorizacao).
8. Limites e regras dos Flows; template com botao Flow fora da janela.
9. Prazos de Business Verification e App Review.
10. Precos de Twilio e Gupshup para o Brasil.
11. Texto integral dos Termos de Servico (clausula de "AI Providers"); possibilidade de classificacao do SaaS como "AI Provider".

Brasil:
12. Artigos da LGPD alem de 11, 20, 33, 42, 48 (5, 6, 7, 15, 16, 37, 39, 41, 46).
13. Retencao de prontuario (Lei 13.787/2018) e prazos por conselho.
14. Papeis controlador/operador conforme guia da ANPD (interpretacao).
15. Situacao atual de decisoes de adequacao e de clausulas equivalentes na ANPD.
16. Texto oficial (DOU) da Resolucao CD/ANPD 15/2024 e prazos de 3 dias uteis.
17. Status regulatorio da quiropraxia (PL 2850/2021, Res. COFFITO 220/2001 e 399/2011 vigentes e validade judicial).
18. Vigencia da Res. COFFITO 424/2013 e interpretacao de resposta a pergunta direta sobre preco.
19. Regras de CFO (art. 44 do Codigo), CFP (valores) e vigencia da Res. CFN 599/2018 frente a suposta Res. CFN 856/2026.
20. Normas de IA de COFFITO, CFN, CFO; CFP so orientacao.
21. Base legal exata para voz como dado pessoal/biometrico, CC art. 20 e CF art. 5; ausencia de lei especifica sobre clonagem de voz.
22. Status do PL 2338/2023 apos junho de 2026.

## Fontes principais (acesso 2026-11-24)

- Meta, precos: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing (Updated 2026-11-18)
- Meta, AI Providers: https://developers.facebook.com/documentation/business-messaging/whatsapp/pricing/ai-providers
- Meta, coexistence: https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users
- Meta, webhooks: .../webhooks/overview, .../webhooks/create-webhook-endpoint, .../webhooks/reference/messages/status
- Meta, typing/read: .../typing-indicators, .../messages/mark-message-as-read (Updated 2026-10-15)
- Meta, midia e audio: .../business-phone-numbers/media, .../messages/audio-messages
- Meta, limites e throughput: .../messaging-limits, .../throughput
- Meta, templates: .../templates/template-categorization, .../templates/overview
- Meta, Tech Provider: .../solution-providers/overview, .../solution-providers/get-started-for-tech-providers, .../embedded-signup/overview
- Meta, calling: .../calling, .../calling/pricing
- Meta, BSUID: .../business-scoped-user-ids
- WhatsApp Business Messaging Policy (2026-09-23): https://www.whatsapp.com/legal/business-policy
- 360dialog: https://360dialog.com/pricing; Twilio: https://www.twilio.com/en-us/whatsapp/pricing; Gupshup: https://www.gupshup.ai/pricing
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm; CDC: https://www.planalto.gov.br/ccivil_03/leis/l8078compilado.htm
- ANPD Res. 19/2024: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-19-de-23-de-agosto-de-2024
- CFM 2.336/2023: https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2023/2336_2023.pdf; CFM 2.454/2026: https://sistemas.cfm.org.br/normas/arquivos/resolucoes/BR/2026/2454_2026.pdf
- COFFITO 424/2013: https://www.normasbrasil.com.br/norma/resolucao-424-2013_257114.html; CFN 599/2018: https://cfn.org.br/wp-content/uploads/resolucoes/Res_599_2018.html
