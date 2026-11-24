# 07 - Conexão não oficial do WhatsApp (QR code): Baileys vs gateways vs provedores hospedados

Data da pesquisa: 2026-11-24. Todos os números de GitHub foram lidos via `gh api` em 2026-11-24 (estrelas, issues abertas, `pushed_at`, releases, licença). Preços foram lidos das páginas oficiais na mesma data. Tudo que não foi confirmado em fonte primária está marcado **"não verificado"**. Anedota e documentação são separadas explicitamente.

## 0. Veredito curto

1. **A escolha "Baileys em processo gateway dedicado" não se sustenta como primeira opção em nov/2026. Recomendo overturn parcial**: manter a arquitetura (gateway dedicado atrás do channel adapter), mas trocar o motor.
2. Motivo principal, verificado: o upstream do Baileys está quase parado. Foram 3 commits desde 2026-10-01, a última release (`7.0.0-rc14`) é de 2026-07-29, nunca saiu um 7.0.0 estável, e um bug que derruba a conexão a cada ~50 min (ack de `<status>`) está aberto desde 2026-10-14 com 3 PRs de correção sem merge em 2026-11-24 (ver 4.1). O whatsmeow teve 19, 23 e 30 commits em jul, ago e out/2026 e corrigiu o passkey em ~1 dia (Baileys: ~7 semanas).
3. **Piloto agora**: gateway WAHA com engine **GOWS** (whatsmeow), ou wuzapi (MIT), atrás do adapter. **Escala (1.000+)**: gateway próprio fino em Go sobre whatsmeow (ou wuzapi como base), com lease de sessão no Postgres. Provedor hospedado só como contingência: a R$ 20-100 por instância/mês custa R$ 30 mil a R$ 270 mil/mês em 1.000-3.000 números.
4. **A conexão oficial deve continuar padrão, e ela resolve justamente os pontos fracos da não oficial** para este caso: o recurso "Coexistência" (app WhatsApp Business no celular + Cloud API no mesmo número) entrega `smb_message_echoes` (mensagens que o dono envia pelo celular) e histórico de até 180 dias (ver seção 9).
5. Nenhuma biblioteca ou provedor não oficial tem evidência de ser menos banível que outra. O risco é do protocolo e do comportamento de uso, não da biblioteca (ver seção 6).

## 1. Tabela comparativa

Legenda: Saúde = cadência de commits recente + releases (dados `gh api` de 2026-11-24). RAM/sessão: **sem benchmark primário em nenhuma fonte; os valores são estimativas/alegações de terceiros e precisam de teste de carga próprio**.

| Opção | Abordagem | Licença | Estrelas / issues abertas | Saúde (nov/2026) | RAM por sessão | Custo |
|---|---|---|---|---|---|---|
| **Baileys** (WhiskeySockets) | WebSocket multi-device (TS) | MIT | 11.711 / 350 | Baixa: 3 commits desde 2026-10-01; rc14 em 2026-07-29; bus factor ~1-2 (purpshell) | ~50 MB (blog de terceiro, não verificado) | grátis |
| **whatsmeow** (tulir) | WebSocket multi-device (Go) | MPL-2.0 | 7.931 / 83 | Alta: 19/23/30 commits em jul/ago/out; bus factor 1 (tulir, 1.279 commits) | 10-20 MB (alegação do wrapper whatsmeow-node; não verificado) | grátis |
| whatsmeow-node (nicastelo) | Binário Go via stdin/stdout JSON | MIT | 24 / 3 | v0.8.0 (2026-09-28); projeto de 1 pessoa | não verificado | grátis |
| neonize (krypton-byte) | Python sobre whatsmeow | Apache-2.0 | 773 / 70 | Ativo (v0.12.4, 2026-11-20) | não verificado | grátis |
| whatsapp-web.js | Browser (Puppeteer) | Apache-2.0 | 22.954 / 128 | Média: releases 1.34.8 (2026-11-12), 1 commit em jul e 0 em ago-out | Chromium por sessão: centenas de MB (não verificado) | grátis |
| WPPConnect (+wa-js, server) | Browser + injeção wa-js | LGPL-3.0 (wppconnect); Apache-2.0 (wa-js, server) | 3.540 / 32 (wppconnect); 1.070 / 45 (server) | Alta: server com 59 e 100 commits em ago e out | Chromium: não verificado | grátis |
| venom-bot | Browser | Apache-2.0 | 6.604 / 62 | Baixa: última release 5.3.0 em 2024-11-15; último push 2026-09-09 | Chromium | grátis |
| open-wa | Browser | Hippocratic + Do Not Harm 1.1, mais `licenseKey` para recursos | 3.680 / 234 | Alta (v5.12.1, 2026-11-23) | Chromium | licença paga para parte dos recursos (preço não verificado) |
| **Evolution API v2** | Baileys (REST) + Cloud API | Apache-2.0 com condições extras (ver 5) | 10.183 / 275 | Irregular: 2.3.7 (2025-12-05), 2.4.0-rc (mai/2026), 2.3.8 (2026-11-23); 0 commits jun-out | herda Baileys (+ Node/Prisma) | grátis |
| **Evolution Go** | whatsmeow (REST, Go) | Apache-2.0 + condições extras; **exige ativação de licença com heartbeat** | 1.008 / 150 | Baixa: 0.7.3 (2026-11-12); 1-2 commits no GitHub | não verificado | grátis, mas com licenciamento/heartbeat |
| **WAHA** | Glue Node sobre WEBJS, WPP, NOWEB (Baileys), GOWS (whatsmeow) | Apache-2.0 | 7.912 / 495 | Alta: 43/74/63 commits em jul/ago/out; release 2026.10.1 | não verificado | **Core gratuito** desde 2026.6; tier "Community" simbólico US$ 5/mês (ver 3.3) |
| wuzapi | whatsmeow (REST, Go) | MIT | 1.061 / 89 | Alta: 12/26/66 commits jul/ago/out; v1.1.1 (2026-11-13) | não verificado | grátis |
| go-whatsapp-web-multidevice | whatsmeow (REST, Go) | MIT | 5.082 / 28 | Alta (v9.10.0, 2026-11-18) | não verificado | grátis |
| WPPConnect Server | wppconnect (REST, Node) | Apache-2.0 | 1.070 / 45 | Alta (v2.10.81, 2026-11-13) | Chromium | grátis |
| CodeChat | Baileys (REST) | Apache-2.0 | 1.298 / 0 | Baixa (v1.3.7, 2026-05-15) | herda Baileys | grátis |
| Z-API | proprietário (lib interna não verificada) | proprietária | n/a | n/a | n/a | R$ 99,99/mês por canal (até 9); R$ 89,99 por canal com 10+ (Partner); SLA declarado 99,9% |
| W-API | proprietária, "API não oficial" | proprietária | n/a | n/a | n/a | LITE R$ 19,90/mês; PRO R$ 29,90/mês por instância |
| Mega API | proprietária | proprietária | n/a | n/a | n/a | R$ 69,90 a R$ 99,90/mês por instância (planos Start/Business) |
| Whapi.cloud | proprietária | proprietária | n/a | n/a | n/a | US$ 29-35/canal/mês; R$ 49/mês no plano BR; descontos por volume |
| Green API | proprietária | proprietária | n/a | n/a | n/a | página mostra US$ 0 (Developer), US$ 12 (Business), US$ 36 (Ultra), Partner US$ 0,40/dia; semântica dos planos não verificada |
| Maytapi | proprietária | proprietária | n/a | n/a | n/a | a partir de US$ 24/número/mês |
| Wassenger | página atual vende "WhatsApp Business API plans" | proprietária | n/a | n/a | n/a | €/US$ 39,90 a 99,90/mês; modelo (oficial vs não oficial) não verificado |
| UAZAPI, APIBrasil, Ultramsg, 2Chat | proprietárias | proprietárias | n/a | n/a | n/a | preço **não verificado** (páginas SPA/sem preço público acessível) |

Fontes da tabela:
- Repos: https://github.com/WhiskeySockets/Baileys , https://github.com/tulir/whatsmeow , https://github.com/wwebjs/whatsapp-web.js , https://github.com/wppconnect-team/wppconnect , https://github.com/wppconnect-team/wa-js , https://github.com/wppconnect-team/wppconnect-server , https://github.com/vynect/venom , https://github.com/open-wa/wa-automate-nodejs , https://github.com/krypton-byte/neonize , https://github.com/evolution-foundation/evolution-api , https://github.com/evolution-foundation/evolution-go , https://github.com/devlikeapro/waha , https://github.com/asternic/wuzapi , https://github.com/aldinokemal/go-whatsapp-web-multidevice , https://github.com/code-chat-br/whatsapp-api , https://github.com/nicastelo/whatsmeow-node
- npm Baileys: `npm view @whiskeysockets/baileys dist-tags` retorna `latest: 7.0.0-rc14`, `legacy: 6.7.24`, modificado em 2026-07-29 (https://www.npmjs.com/package/@whiskeysockets/baileys).
- Licença open-wa: https://github.com/open-wa/wa-automate-nodejs/blob/master/LICENSE.md e README (seção `licenseKey`). Licença wppconnect: https://github.com/wppconnect-team/wppconnect/blob/main/LICENSE.md (LGPL-3.0; GitHub classifica como "Other").
- Z-API: https://www.z-api.io/ ; W-API: https://w-api.app/ ; Mega API: https://mega-api.app.br/ ; Whapi: https://whapi.cloud/pt/price e https://whapi.cloud/price ; Green API: https://green-api.com/en/pricing/ ; Maytapi: https://maytapi.com/pricing ; Wassenger: https://wassenger.com/pricing
- RAM: https://nicastelo.github.io/whatsmeow-node/docs/comparison (alegação do próprio wrapper, 10-20 MB Go vs ~50 MB Baileys; não é benchmark independente). A discussão https://github.com/tulir/whatsmeow/discussions/979 ("10K devices") é só uma pergunta de usuário, não evidência.

## 2. Protocolo, recursos e sessões por servidor

### 2.1 Abordagem
- **Multi-device via WebSocket** (sem browser): Baileys, whatsmeow, neonize, wuzapi, gowa, Evolution Go, WAHA NOWEB/GOWS. A documentação do WAHA diz textualmente que WEBJS e WPP usam Chromium via Puppeteer e NOWEB/GOWS usam WebSocket sem browser (https://waha.devlike.pro/docs/how-to/engines/). O README do wuzapi afirma o mesmo para o whatsmeow e admite que mudanças de protocolo podem quebrar conexões até haver atualização da lib (https://github.com/asternic/wuzapi).
- **Browser**: whatsapp-web.js, WPPConnect, venom, open-wa, WAHA WEBJS/WPP. Custo por sessão é de um Chromium inteiro. Para 1.000+ números isso é inviável em um servidor só e não recomendo (RAM exata: não verificado).

### 2.2 RAM/CPU e sessões por servidor
**Não encontrei benchmark primário** (medição reproduzível) para nenhuma lib. Números disponíveis são alegações: ~50 MB/sessão Baileys vs 10-20 MB Go (docs do whatsmeow-node, link acima). A única evidência primária relevante é indireta: issues de memória/event loop no Baileys (#2090 memory leak 7.0.0-rc.8, #2520 `decryptWithSessions` bloqueia o event loop por 10-52 s e causa 408; https://github.com/WhiskeySockets/Baileys/issues/2520) e WAHA #1639 "[GOWS] RAM memory leak" (https://github.com/devlikeapro/waha/issues/1639). Trate como hipótese a ser medida: com perfil reply-only (150-1.200 conversas/mês, ~5-40 msgs/dia por número), a carga é dominada pelo estado idle de cada socket, não por throughput.

### 2.3 Escala horizontal e modelo de dono da sessão
- Um número = um socket por vez; duas conexões simultâneas com as mesmas credenciais geram `conflict`/`stream replaced` (aparece em Baileys #2707 e em WAHA #2317 como "stream replaced"). Logo precisa de **lease**: um único worker dono de cada sessão. Implementação simples com o stack: `pg_advisory_lock(hash(tenant_session))` ou linha `session_lease(owner, expires_at)` renovada por heartbeat; pg-boss entra para o trabalho assíncrono (envio, retries), não para posse de sessão. Isto é recomendação minha, não documentada por nenhuma lib.
- WAHA: o Core (gratuito) roda o motor dentro de um único processo/instância; escalar = várias instâncias WAHA, cada uma com um conjunto de sessões, e o seu roteador mantém o mapa tenant -> instância (sharding próprio). Documentação de escala específica: não encontrada (a URL `/docs/how-to/scaling/` retornou 404), **não verificado**.

### 2.4 Armazenamento de sessão
- **Baileys**: a API oferece `useMultiFileAuthState` (arquivos) e o próprio README manda escrever store SQL/NoSQL para produção e avisa que perder atualizações de `authState.keys` impede a entrega de mensagens (https://github.com/WhiskeySockets/Baileys README). Não há adaptador Postgres oficial no pacote; você escreve.
- **whatsmeow**: `sqlstore` com Postgres/SQLite como parte da lib (documentação pkg.go.dev: https://pkg.go.dev/go.mau.fi/whatsmeow ; confirmar versão, não li o código-fonte).
- **WAHA**: sessões em Local, **PostgreSQL**, e mídia em S3/Postgres para WEBJS, NOWEB e GOWS; MongoDB deprecado (https://waha.devlike.pro/docs/how-to/engines/).
- **Evolution API**: Postgres/MySQL via Prisma e Redis (conforme o README; detalhe de sessão por instância não verificado). **wuzapi**: SQLite ou Postgres (https://github.com/asternic/wuzapi README).

### 2.5 Reconexão e re-pareamento
- O Baileys documenta reconexão por `connection.update` com `DisconnectReason`; o fluxo pós-QR exige reiniciar o socket (código 515 "restart required"); 401 = logged out = re-pareamento obrigatório. Isso vem do enum e do README da lib (https://github.com/WhiskeySockets/Baileys), sem série histórica de frequência.
- **Frequência real de re-pareamento por motivo de protocolo**: não há métrica pública. Eventos documentados que forçaram intervenção: erro 405 "client outdated" (whatsmeow #941 em 2025-09-23, #1031 em 2025-12-09, ambos fechados no mesmo dia; Baileys #1913 de 2025-10-13 fechado em 2025-10-15); passkey (seção 4.2).
- Inatividade: a documentação da Meta para Coexistência lista `COMPANION_INACTIVITY` (~30 dias) e `PRIMARY_INACTIVITY` (~14 dias) como causas de desconexão (https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/). É o único valor oficial que achei sobre inatividade; para dispositivos vinculados fora da coexistência aplico por analogia, **não verificado** nessa forma. Implicação: o profissional precisa abrir o WhatsApp no celular pelo menos a cada ~14 dias.
- Limite de dispositivos vinculados: "4 por conta" aparece só na doc do whatsmeow-node (fonte secundária); página oficial do WhatsApp **não verificada**.

### 2.6 Cobertura de recursos
| Recurso | Baileys | whatsmeow / GOWS / wuzapi | Browser libs |
|---|---|---|---|
| Receber texto/áudio/imagem/documento | sim (README) | sim (README: "Receiving all messages", mídia) | sim |
| Enviar texto e voice note (PTT) | sim | sim | sim |
| Digitando/presença | sim | sim ("typing notifications" no README); WAHA expõe start/stopTyping e presence nos 4 engines (https://waha.devlike.pro/docs/how-to/engines/) | sim |
| Recibos de leitura | sim | sim ("delivery and read receipts") | sim |
| Eco `fromMe` do celular/outros aparelhos | Em teoria sim (mensagens do próprio número chegam em `messages.upsert` com `fromMe`); detalhe e confiabilidade **não verificados** em 2026 | idem, **não verificado** | idem |
| Histórico | `syncFullHistory` (README); issue #2452 mostra `fetchMessageHistory` on-demand sem resposta (2026-03-28, fechada) | `history sync` suportado; detalhe não verificado | n/d |
| Botões e listas | **Não confiar.** Issue #56 "buttons and lists stopped working" (2023, fechada); post do mantenedor "Buttons and lists get deprecated by many libraries" (https://dev.to/purpshell/buttons-and-lists-get-deprecated-by-many-libraries-54h); Evolution #2390 relata botões quebrados na 2.3.7 e funcionando na 2.3.6 (regressão de wrapper). Formatos "nativeFlow" circulam em forks sem validação independente. | idem, não verificado | idem |
| Reações | sim (API padrão); não verificado em 2026 | sim; não verificado | sim |
| Ignorar grupos | filtrar `remoteJid` terminando em `@g.us` no adapter | idem | idem |

Conclusão prática para este produto: não use botões/listas na conexão não oficial; use texto com opções numeradas.

### 2.7 Identidade: JID de telefone vs LID
- O WhatsApp migrou contatos para LID (`@lid`). Evidências de dor real: Baileys #1692 "sends messages to incorrect remoteJid (random number)" (2025-08-13), #1465 "lid groups", #2653 "Message sent but not received" (2026-06-19, 41 comentários); whatsmeow #1009 e #1018 (nov/2025: mensagens por LID mostrando "Waiting for this message" em iOS antigo), #1074 (erro 463 por contato, 29 comentários, aberta 2026-02-12 e fechada 2026-07-06), #1197 (novo contato após update de 2 jul; aberta 2026-07-08, fechada 2026-11-07); Evolution #2689 "mensagens para `@s.whatsapp.net` nunca entregam após re-pareamento" (2026-08-13, aberta).
- Como cada uma trata: o Baileys v7 (rc) trouxe mapeamento LID/PN e é um breaking change documentado ("https://whiskey.so/migrate-latest" no README); detalhe do store de mapeamento **não verificado**. whatsmeow tem suporte a LID no client; detalhe **não verificado**.
- **Decisão de modelo**: no Postgres, guarde `contact_key` interno + `lid` + `phone_e164` nulos e permita merge; nunca use o JID como chave primária da conversa.

## 3. Gateways self-hosted

### 3.1 Evolution API v2 / Evolution Go
- Repo mudou de dono: `EvolutionAPI/evolution-api` agora resolve para `evolution-foundation/evolution-api` (a API do GitHub retorna o novo nome; data e termos da transferência **não verificados**). Site e docs: https://evolutionfoundation.com.br e https://docs.evolutionfoundation.com.br.
- Licença do repo (arquivo LICENSE lido): Apache-2.0 **com condições adicionais**: (a) não remover logo/copyright dos componentes de frontend; (b) "Usage Notification Requirement": se Evolution API for usada em qualquer projeto, inclusive código fechado, é preciso exibir aviso visível a administradores e acessível na documentação/configurações, e o descumprimento "pode resultar na necessidade de uma licença comercial, a critério do produtor". Contato: suporte@evofoundation.com.br (https://github.com/evolution-foundation/evolution-api/blob/main/LICENSE). A mesma cláusula está no Evolution Go.
- **Evolution Go**: README diz "requires a license to operate", API responde 503 até ativar pelo Manager e "heartbeats are sent periodically to maintain activation" (https://github.com/evolution-foundation/evolution-go). Dependência de serviço externo de licenciamento num componente crítico: risco operacional e de continuidade. Preço da licença: **não verificado**.
- Saúde: release 2.3.8 (2026-11-23) corrige que instâncias Baileys ficavam `open` mas paravam de receber e caíam com `stream errored out` (ack class="status") a cada ~50 min, aplicando **patch-package sobre Baileys 7.0.0-rc.9** (https://github.com/evolution-foundation/evolution-api/releases/tag/2.3.8). Ou seja, o gateway mais popular depende de patch local porque o upstream não corrigiu. Issues guarda-chuva abertas: #2437 (QR/pareamento, 87 comentários, desde 2026-02-20), #2618 (passkey, desde 2026-06-30). Lacuna de release: 2.3.7 em 2025-12-05 até 2.3.8 em 2026-11-23.

### 3.2 WAHA
- Engines: WEBJS, WPP (browser), NOWEB (Baileys), GOWS (whatsmeow). Fonte: https://waha.devlike.pro/docs/how-to/engines/.
- **Core vs Plus**: a separação acabou. O post da comunidade e a página do Plus dizem que o Plus foi incorporado ao Core a partir da 2026.6.1 e que "we made WAHA free"; os tiers Core/Plus/PRO viraram um tier "Community" de **US$ 5/mês simbólico** de apoio (https://waha.devlike.pro/docs/how-to/waha-plus/ e https://waha.devlike.pro/blog/waha-community). O preço antigo do Plus (~US$ 19/mês) aparece em páginas de terceiros; estado atual da página de preços própria: **não verificado** (retornou conteúdo mínimo).
- Documentação de anti-bloqueio é a melhor do mercado: ordem seen -> typing -> aguardar aleatório -> parar typing -> enviar, e avisos de erro **475 (capping de novos contatos)** e **463 (reachout timelock)** com instrução "não reinicie nem re-pareie" (https://waha.devlike.pro/docs/overview/how-to-avoid-blocking/).
- Saúde: alta cadência (43/74/63 commits em jul/ago/out), mas **GOWS tem issues abertas relevantes**: #2138 passkey (132 comentários, aberta), #1992 erro 463 em contatos frios sem tctoken/cstoken (aberta desde 2026-03-31), #2227 passkey aceito mas sessão continua `PASSKEY_REQUIRED`, #2317 `FAILED` sem motivo, #2365 QR com timeout/EOF (2026-11-19). #1456 "webhooks stop sending until session reconnect" (2025-10-06, fechada). Fonte: https://github.com/devlikeapro/waha/issues
- Segurança: issue #1069 (2025-06-19, fechada 2025-06-25) alegava "backdoor" do WAHA após o servidor enviar scam; o próprio texto é uma acusação sem prova no que li (o título menciona bug bounty de 2 mil USDT). Trate como **anedota/alegação não confirmada**; o mantenedor recomenda `WHATSAPP_API_KEY` forte (https://github.com/devlikeapro/waha/issues/1069).

### 3.3 wuzapi, go-whatsapp-web-multidevice, WPPConnect Server, CodeChat
- **wuzapi** (MIT, whatsmeow): multi-usuário/multi-device, webhooks com assinatura HMAC `x-hmac-signature` SHA-256 (https://github.com/asternic/wuzapi). Boa base para gateway multi-tenant em Go.
- **go-whatsapp-web-multidevice** (MIT, 5.082 estrelas, 28 issues abertas): README cita webhooks, MCP, multi-device (https://github.com/aldinokemal/go-whatsapp-web-multidevice). Detalhe de multi-sessão: não verificado.
- **WPPConnect Server**: README recomenda fixar `WPP_SERVER_TAG` e usa `WEBHOOK_ALLOWED_URLS`, `x-secret-key` (https://github.com/wppconnect-team/wppconnect-server). Browser-based.
- **CodeChat**: Baileys, release mais recente v1.3.7 (2026-05-15). É a origem da Evolution API (README da Evolution: "began as ... based on CodeChat"). Manutenção baixa.

## 4. Saúde de manutenção e incidentes (2025-2026)

### 4.1 Baileys
- Releases: `v7.0.0-rc11` 2026-05-13, rc12 2026-05-20, rc13 2026-05-21, `rc14` 2026-07-29; `6.7.24` (legacy) 2026-07-29. Sem 7.0.0 estável.
- Commits por mês (GitHub API): jun 2, jul 6, ago 1, set 0, out 1, nov 2 (até 24/11). Contribuidores: adiwajshing 1.166 (autor original, saiu), purpshell 317 (mantenedor atual), jlucaso1 58.
- README: o mantenedor vende horas de consultoria/ patrocínio ("business to enterprise-level support from Rajeh") e avisa que não endossa uso comercial (https://github.com/WhiskeySockets/Baileys README). Sinal de bus factor ~1.
- **Incidente aberto em nov/2026**: #2858 "Stream Errored (ack) every 50 min: `<status>` stanza is never acked" (2026-10-14, aberta); PRs #2866 (18/10), #2883 (05/11) e #2918 (18/11) "ack status stanzas" abertos e sem merge em 2026-11-24 (>40 dias). A Evolution consertou por patch próprio. Também abertas: #2908 (socket abre mas nunca recebe mensagens), #2913 (CONNECTING eterno), #2917, #2930 (view-once). https://github.com/WhiskeySockets/Baileys/issues
- Passkey ("Continue on WhatsApp Web"): #2672 aberta 2026-06-30 (93 comentários, ainda aberta); PR #2689 "shortcake passkey companion-linking" mergeado em 2026-08-20 (~7 semanas após o problema). O usuário `webschnecke` relatou em 2026-11-06 um pareamento bem-sucedido usando o fluxo e exigindo um "signer" de passkey (anedota).
- 463 (reachout timelock): #2441 (investigação do mantenedor, aberta desde 2026-03-25) conclui que a ausência de `tctoken`/`cstoken` faz clientes não oficiais "contribuírem sem querer" para o limite de contato com desconhecidos; PRs de tctoken #2257 (2026-01-17) e #2339 (2026-04-24). Em 2026-08 ainda há reports na rc14.
- 405: #1913 (2025-10-13 a 15/10); #2370 "Connection Failure 405" (2026-02-24, ainda aberta); #2731 (2026-07-28, resolvida em 1 dia).
- #1769 "Bad Mac / failed to decrypt / No session" aberta desde 2025-09-12 (45 comentários).
- Breaking: v7 é breaking (LID, ESM); migração em https://whiskey.so/migrate-latest. Tipos: TypeScript nativo, qualidade boa em geral, mas WAProto incompleto (#2915 `pollCreationMessageV6` ausente, 2026-11-18).

### 4.2 whatsmeow
- Commits: jul 19, ago 23, out 30. Release tags: o projeto usa pseudo-versão Go; sem releases GitHub (não verificado se há tags).
- Tempo de correção: 405 client outdated em #941/#1031 fechados no mesmo dia; #984 "new WhatsApp version" 3 dias (2025-11-03 a 11-06); **passkey #1184 aberto 2026-06-30 e fechado 2026-07-01**, #1188 PairPhone passkey 1 dia; mas #1233 (agosto) e #1360 (2026-11-21, pair-success de contas Business `smba` com novo bloco `<encryption-metadata>`) ainda aberta. #1074 (463) levou ~5 meses; #1197 levou 4 meses.
- Mantenedor: tulir (1.279 commits, projeto pessoal; Matrix), bus factor 1 com histórico longo. Licença MPL-2.0 (copyleft por arquivo, compatível com uso como biblioteca num binário separado; alterações nos arquivos MPL devem ser publicadas). https://github.com/tulir/whatsmeow
- Tipos: Go; em TypeScript você consome só pelo REST/gRPC do gateway.

### 4.3 Demais
- whatsapp-web.js: v1.34.8 2026-11-12 depois de 1.34.7 em 2026-04-24 (6 meses). Mudou de dono para a org `wwebjs`. README admite: "not guaranteed you will not be blocked ... WhatsApp does not allow bots or unofficial clients".
- venom: sem release desde 2024-11 (v5.3.0). Descartar.
- open-wa: ativo, mas licença Hippocratic + `licenseKey`: evitar por restrição de licença e custo.
- WPPConnect: ativo (renovate/dependabot dominam contagem de commits).

## 5. Licença e aspectos legais

- **Licenças**: Baileys MIT; whatsmeow MPL-2.0; wuzapi e gowa MIT; WAHA Apache-2.0; WPPConnect LGPL-3.0; Evolution API/Go Apache-2.0 + condições (aviso de uso e preservação de logo; Go ainda exige licença ativa); open-wa Hippocratic + chave. URLs na seção 1.
- **Termos do WhatsApp (consumidor)**: proíbem usar ou ajudar outros a usar o serviço para "bulk messaging, auto-messaging, auto-dialing", "uso não pessoal" salvo autorização, e "reverse engineer, alter, modify ... or extract code"; permitem suspender/desabilitar contas por violação (https://www.whatsapp.com/legal/terms-of-service). Ou seja, o uso não oficial de qualquer biblioteca viola os Termos por definição.
- **Business Messaging Policy** (atualizada em 2026-09-23): a política cobre a plataforma oficial; a lista de vedações inclui "Medical and healthcare products". Se serviços de saúde ou consultas se enquadram nisso: **não verificado**; vale consulta jurídica antes de escalar o canal oficial (https://www.whatsapp.com/legal/business-policy).
- **Termos para IA na API oficial**: reportagem indica que os Business Solution Terms (out/2025) proíbem provedores de IA de uso geral a partir de 2026-01-15, e que o CADE suspendeu a regra no Brasil (medida cautelar de 2026-01-12, recurso negado em 2026-03-04); a Meta diz que visa assistentes gerais e não automação de atendimento de empresas. Estado em 24/11/2026: **não verificado**. Fontes: https://techcrunch.com/2026/01/13/brazil-orders-meta-to-suspend-policy-banning-third-party-ai-chatbots-from-whatsapp , https://www.gov.br/cade/en/matters/news/cade-upholds-interim-measure-against-whatsapp , https://www.whatsapp.com/legal/business-solution-terms (conteúdo da página não carregou na minha leitura).
- **Ações judiciais/notificações da Meta contra autores de bibliotecas ou provedores**: **não encontrei nenhuma** (busca ampla em 2026-11-24, sem resultado). Ausência de evidência não é evidência de ausência; **não verificado** de forma conclusiva. Todos os projetos trazem disclaimers de "no affiliation".
- Risco jurídico do seu lado: você aceita que o cliente use algo que viola os Termos do WhatsApp; por isso o aviso de risco assinado é a mitigação correta. Adicione cláusula de indenização/limitação, e LGPD (dados de saúde são sensíveis) sobre o armazenamento de credenciais e mensagens.

## 6. Risco de banimento: o que é documentado vs anedota

### 6.1 Documentado (fonte primária ou comportamento observável no código)
1. **Tela "Your account may be at risk / unauthorized tools"**: texto reproduzido em whatsmeow #810 (2025-05-09), reportado por um integrador com clientes que "apenas respondem mensagens" e não fazem bulk (https://github.com/tulir/whatsmeow/issues/810). É relato de usuário com captura de tela, não comunicado da Meta.
2. **Reachout Timelock (erro 463)** e **capping de novos contatos (erro 475)**: descritos pelo mantenedor do Baileys com base em engenharia reversa do cliente web (`NackCallerReachoutTimelocked: 463`, query Mex `ReachoutTimelockJobQuery`) em https://github.com/WhiskeySockets/Baileys/issues/2441 e na documentação do WAHA (https://waha.devlike.pro/docs/overview/how-to-avoid-blocking/). É a evidência mais forte: o limite é por contatos novos/desconhecidos, e `tctoken` ausente agrava.
3. **Perfil de uso importa**: o WAHA afirma que ser marcado como spam 5-10 vezes leva a banimento e recomenda: resposta apenas a quem escreveu, delays aleatórios, foto de perfil, enviar "seen", ≤4 mensagens/hora por contato que respondeu (https://waha.devlike.pro/docs/overview/how-to-avoid-blocking/). É guideline de fornecedor, não regra da Meta.
4. Registro de mensagem a número inexistente: relato de restrição após enviar a número não registrado (Baileys #2441, comentário de 2026-08-08, anedota). Mitigação razoável: checar `onWhatsApp` antes, mas Evolution #2228 alerta que checar muitos números em massa também eleva risco.

### 6.2 Anedota
- Baileys #1869 "High number of bans" (2025-10-05, fechada 2025-12-24): usuário reporta 5 bots banidos na mesma semana, 2 deles com >3 anos de uso; teste de n=1 com bot só em chats privados vs só em grupos (bot privado durou 1 mês, banido ao entrar em 3 grupos). Pergunta recorrente "alguém foi banido só lendo?" sem resposta. https://github.com/WhiskeySockets/Baileys/issues/1869
- Comentário atribuindo detecção a fingerprint TLS (JA3) e user-agent: opinião, sem prova.
- Reports de que 463 aumenta frequência de desconexão (#2441 de 2026-08-12) e que `NotificationUserReachoutTimelockUpdate` é seguido de logout 401 (2026-08-04): observações isoladas.
- Blogs de fornecedores (pipes.bot, whasp.ai) afirmam diferenças de risco; são marketing de produtos concorrentes. Não usei como evidência.

### 6.3 Fatores de risco (consenso, nível de evidência)
| Fator | Evidência |
|---|---|
| Contato frio / muitos números novos | Forte (463/475 acima) |
| Mensagens idênticas, links marcados como spam, volume 24/7 | Guideline do WAHA (fornecedor) |
| Número novo | Plausível; evidência primária **não verificada** |
| IP de datacenter | **não verificado**; só anedota |
| Proxy residencial/móvel usado por provedores hospedados | **não verificado** (nenhuma página de provedor que li documenta) |
| Diferença de ban entre bibliotecas | **Sem evidência**. Mesma tela de aviso apareceu em whatsmeow e Baileys (#810 diz "also reported with Baileys") |
| Conta WhatsApp Business app vs pessoal | **não verificado** |
| Recuperação/apelo | Não vi documentação oficial para contas banidas por uso de cliente não oficial; o fluxo é o formulário de revisão do app. **Não verificado.** 463 "se levanta sozinho" segundo o WAHA |

### 6.4 Leitura para o seu perfil
Reply-only + lembretes para quem já é paciente (contato conhecido, o paciente escreveu antes) está no perfil de menor risco descrito acima, mas **não é risco zero**: o aviso "may be at risk" já apareceu para clientes que só respondiam (#810). Lembretes/confirmações **iniciados por você** para pacientes que não escreveram nas últimas 24 h são o ponto de maior risco (contato iniciado pelo bot). Na conexão não oficial, limite esses a pacientes com conversa recente e a poucos por hora.

## 7. Segurança

- **Cadeia de suprimentos**: o pacote npm `lotusbail` (fork trojanizado do Baileys; >56 mil downloads) roubava tokens, chaves de sessão, mensagens e contatos, e adicionava o dispositivo do atacante via código de pareamento hardcoded, mantendo acesso mesmo após remover o pacote (relatado por Koi Security em dez/2025). Fontes: https://www.theregister.com/2025/12/22/whatsapp_npm_package_message_steal/ , https://thehackernews.com/2025/12/fake-whatsapp-api-package-on-npm-steals.html , https://koi.ai/blog/npm-package-with-56k-downloads-malware-stealing-whatsapp-messages (a página retornou conteúdo genérico na minha leitura; usei os resumos das outras duas). Há uma floresta de forks/nomes parecidos (`itsliaaa/baileys`, `Yudzxml/Baileys`, `vreden/baileys` e outros com poucas estrelas, e pacotes npm `baileys`, `baileys-pro`, `baileys-x`, etc.). Regra: instalar só `@whiskeysockets/baileys` (ou `baileys`, que aponta o mesmo `latest` hoje, mas confirme o dono), com lockfile e `npm ci --ignore-scripts` (patch-package é exceção controlada).
- **O que as credenciais permitem**: o estado de auth (identity keys, signal sessions, `creds.json`/store) equivale a ser um dispositivo vinculado: ler e enviar mensagens em nome da conta, baixar mídia, e é suficiente para clonar a sessão. Não revoga ao trocar senha; só desvincular o dispositivo no celular (ou logout) revoga (https://www.theregister.com/2025/12/22/whatsapp_npm_package_message_steal/ para o caso do dispositivo atacante).
- **Criptografia em repouso** (recomendação minha): cifrar credenciais e chaves com envelope encryption (chave por tenant derivada de KMS/Vault; em self-host, `age`/libsodium com chave mestre fora do banco), colunas dedicadas e RLS por tenant no Postgres; backups cifrados; nunca logar `creds`; rotação ao desvincular; tabela de auditoria de acessos.
- Gateway sem porta pública, só na rede interna, com HMAC nos webhooks (wuzapi já tem `x-hmac-signature`), API key forte (WAHA) e `WEBHOOK_ALLOWED_URLS` (WPPConnect Server).

## 8. Encaixe no monolito TypeScript

| Opção | Prós | Contras |
|---|---|---|
| Baileys embutido como lib no monolito | Menos hops | Crash/memory leak ou event loop bloqueado (#2520) derruba a API Fastify inteira; deploys do monolito desconectam sessões; sem isolamento de segredo |
| **Gateway dedicado (processo/container) com REST + webhooks** | Isolamento de falhas, deploy independente, pinagem de versão, lease de sessão, rate limit centralizado | Mais uma peça; webhooks precisam ser confiáveis |
| Gateway terceiro (WAHA/wuzapi/Evolution) | Pronto, QR/pareamento, REST | Dependência do projeto e de seu ritmo; superfície de ataque |

Recomendação: **gateway dedicado**, com contrato interno estável (`ChannelAdapter` com `sendText`, `sendVoice`, `setTyping`, `markRead`, eventos normalizados) e um gateway por motor, de modo que trocar Baileys <-> whatsmeow seja troca de implementação.
- **Webhook confiável**: WAHA já teve "webhooks stop sending until session reconnect" (#1456); portanto não confie em entrega única. Faça: gateway grava o evento em outbox no Postgres e só depois chama o monolito; monolito responde 2xx após enfileirar no pg-boss (idempotência por `message_id`); retries com backoff e DLQ; reconciliação periódica por polling de "últimas mensagens"; HMAC na assinatura.
- **Observabilidade**: métricas por sessão (estado, último evento recebido, idade da última mensagem, taxa de 463/475/401/405/440, tempo de reconexão), alerta de "socket aberto sem tráfego" (cobre #2908 e o bug do status ack), tracing com `tenant_id` e `session_id`, logs sem PII (dados de saúde).

## 9. Custos: 100 / 1.000 / 3.000 números

### 9.1 Auto-hospedado (estimativas; a hipótese de RAM precisa ser medida)
Premissas **minhas, não verificadas**: Go/whatsmeow 15-30 MB por sessão; Baileys 50-80 MB; 30% de folga; Postgres separado. Preço de servidor no Brasil: **não verificado** (não consultei tabelas de provedores).

| Escala | whatsmeow (Go) RAM total | Baileys RAM total | Observação |
|---|---|---|---|
| 100 | 2-4 GB | 5-8 GB | 1 VM pequena + Postgres compartilhado |
| 1.000 | 20-40 GB | 50-80 GB | 1-2 nós (Go) ou 2-3 nós (Baileys), 2 réplicas de standby sem sessões |
| 3.000 | 60-120 GB | 150-240 GB | 3-5 nós (Go) ou 4-8 nós (Baileys), sharding por `tenant_id` |

Considere também: Postgres com estado de criptografia por sessão (chaves Signal crescem com contatos), IOPS de escrita de chaves, backup cifrado.

### 9.2 Hospedado (preço de tabela, sem imposto, mensal)
| Provedor | 100 | 1.000 | 3.000 | Base |
|---|---|---|---|---|
| Z-API Partner R$ 89,99/canal (10+) | R$ 8.999 | R$ 89.990 | R$ 269.970 (extrapolado; a tabela do site vai até 2.000) | https://www.z-api.io/ |
| W-API PRO R$ 29,90/instância | R$ 2.990 | R$ 29.900 | R$ 89.700 (sem desconto de volume; pacotes por volume existem, preço não verificado) | https://w-api.app/ |
| Mega API R$ 69,90-99,90/instância | R$ 6.990-9.990 | R$ 69.900-99.900 | R$ 209.700-299.700 | https://mega-api.app.br/ |
| Whapi plano BR R$ 49/canal | R$ 4.900 | R$ 49.000 | R$ 147.000 | https://whapi.cloud/pt/price |
| Maytapi US$ 24/número | US$ 2.400 | US$ 24.000 | US$ 72.000 | https://maytapi.com/pricing |
| Green API (Business US$ 12?) | não verificado | não verificado | não verificado | plano exato por instância não confirmado |

Todos são caros frente ao preço-alvo de um profissional solo (se o produto cobra algo na faixa de R$ 100-300/mês, 10-30% da receita iria só para o provedor). SLA declarado só pela Z-API (99,9%, mesma página). Biblioteca por baixo, local dos dados e termos de uso dos provedores brasileiros: **não verificado** (código e infraestrutura fechados; não encontrei declaração pública).

### 9.3 Cloud API oficial (para comparação)
- Desde 2026-10-01 a Meta voltou a cobrar mensagens de serviço: **1.000 mensagens de serviço entregues por número/mês gratuitas**, cobrança a partir da 1.001ª; mensagens de utilidade/autenticação (lembretes e confirmações fora da janela de 24 h) são pagas por mensagem entregue, com faixas de volume. Fonte: https://developers.facebook.com/docs/whatsapp/pricing/ . O perfil de 150-1.200 conversas/mês cabe, em tese, no nível gratuito de serviço; o custo real fica nos templates de utilidade. **Tarifa em BRL: não verificado** (as tabelas são CSV/PDF atrás de links de CDN que não consegui resolver).
- **Coexistência**: número em uso simultâneo no app WhatsApp Business e na Cloud API; mensagens enviadas pelo app continuam gratuitas e chegam ao webhook `smb_message_echoes`; histórico de 180 dias via webhooks `history`; contatos via `smb_app_state_sync`; throughput fixo de 20 mps; exige app Business 2.24.17+ e ser Solution Partner ou Tech Provider via Embedded Signup (https://developers.facebook.com/docs/whatsapp/embedded-signup/custom-flows/onboarding-business-app-users/). Isso cobre exatamente "detectar mensagens do dono vindas do celular" sem ban. Disponibilidade para o Brasil por tipo de conta: **não verificado**.

## 10. Ranking para este caso (conexão não oficial opt-in)

1. **WAHA com engine GOWS (whatsmeow)** como gateway: Apache-2.0, gratuito, Postgres/S3, API de typing/seen/presence, documentação de anti-bloqueio com 463/475, cadência alta de commits. Ressalvas: issues abertas de GOWS (passkey #2138/#2227, 463 #1992, QR/EOF #2365, `FAILED` sem motivo #2317), 495 issues abertas, glue em Node (você continua com um Node a mais). Bom para o piloto.
2. **whatsmeow em gateway próprio fino em Go** (ou wuzapi MIT como base): melhor saúde de protocolo, menor RAM provável, controle total de lease/reconexão/outbox. Custo: você mantém o gateway e depende de um mantenedor único (tulir), embora com histórico longo. É o destino em 1.000+.
3. **Baileys pinado em gateway dedicado**: só se precisar de algo que o whatsmeow não entrega. Mitigação: fixar `7.0.0-rc14` + patch do ack de status (mesmo que a Evolution aplica sobre rc.9), testes de contrato, plano de saída.

Fora do top 3: Evolution API v2 (Baileys por baixo, release irregular, obrigações de aviso de uso; ver 3.1), Evolution Go (licença com heartbeat), browser-libs (custo por sessão), venom (abandonado), open-wa (licença), provedores hospedados (custo de 10-100x o auto-hospedado).

## 11. Veredito

| | Piloto agora (poucas dezenas de números) | 1.000+ números |
|---|---|---|
| Baileys como lib embutida | **Não** | **Não** |
| Baileys em gateway dedicado | Aceitável só como plano B, pinado e com patch | Não recomendado (upstream quase parado) |
| Gateway pronto (WAHA GOWS / wuzapi) | **Sim**, recomendado | Possível como base, mas planeje gateway próprio |
| whatsmeow gateway próprio | Opcional | **Sim** |
| Provedor hospedado (Z-API, W-API etc.) | Só se o prazo for crítico e o preço aceitável (3,5 mil a 10 mil por 100 números/mês) | Não (custo e dependência) |
| Cloud API oficial + Coexistência | Padrão | Padrão; a não oficial vira exceção opt-in |

Ressalva de honestidade: o ranking whatsmeow > Baileys vem de cadência de commits e tempo de correção observados nos repositórios, não de taxa de ban nem de benchmark de RAM, que não existem publicamente.

## 12. Salvaguardas operacionais recomendadas

**Envio**
- Só responder a quem escreveu nas últimas 24 h; lembretes proativos só para pacientes com conversa anterior, no máximo N/hora por número (comece em 10) e janelas diurnas.
- Pacing: `seen` -> `typing` por tempo proporcional ao texto (1-5 s com jitter) -> enviar. Atraso aleatório entre mensagens do mesmo número (30-60 s para envios iniciados por você, conforme WAHA). Nunca enviar ao mesmo contato mais de ~4 mensagens/hora.
- Variar o texto dos lembretes (IA já ajuda); evitar links encurtados/desconhecidos; não verificar listas de números em lote (`onWhatsApp`).
- Ignorar grupos, status e newsletters no adapter.

**Sessão**
- Lease único por sessão no Postgres; um processo por sessão.
- Reconexão com backoff exponencial + jitter, teto de tentativas por hora. Códigos: 401 -> não reconectar, pedir re-pareamento; 405 -> atualizar versão do cliente, não ficar em loop; 440 -> parar (outro dono). Loop de reconexão agressivo foi apontado como causa comum de desconexão virar ban (comentário em #2707, anedota).
- Em 463/475: **não reiniciar, não re-parear**; pausar envios para contatos novos e esperar (orientação do WAHA).
- Alertar o profissional se o celular ficar offline ~14 dias (re-link iminente).

**Monitoramento**
- Alertas: sessão `open` sem evento há X min; taxa de erro 463/475; mensagens `ERROR`/1 tick por >N min; picos de reconexão; atraso de webhook; fila pg-boss.
- Canary: um número interno de teste por motor, enviando e recebendo a cada 5 min, para detectar quebra de protocolo antes dos clientes.
- Kill switch por tenant e global; fallback automático para a conexão oficial quando disponível.

**Política de versão**
- Fixar versões exatas (lockfile + imagem Docker por digest); sem `latest`. Atualizar só após o canary passar em staging com 2-3 números reais.
- Acompanhar os repositórios (releases + issues) e alertar em quebras (palavras: "client outdated", "405", "passkey", "463").
- Para Baileys: manter patch local versionado (patch-package) e abrir PR upstream; ter motor alternativo testado atrás do adapter.
- Ensaiar: troca de motor em um tenant piloto a cada trimestre.

## 13. Perguntas em aberto

1. Tarifas BRL da Cloud API para utilidade/autenticação e faixas de volume (CSV da Meta não resolvido).
2. A Cloud API em modo Coexistência está disponível para qualquer profissional solo no Brasil e quais exigências de verificação de negócio se aplicam?
3. A restrição "Medical and healthcare products" da Business Messaging Policy atinge agendamento de consultas por profissional de saúde? E a cláusula de provedores de IA nos Business Solution Terms continua suspensa no Brasil em 24/11/2026?
4. Fluxo e taxa de sucesso de apelo para número banido por cliente não oficial.
5. Efeito real de WhatsApp Business app vs conta pessoal na taxa de ban nas conexões QR.
6. Diferenças de ban entre whatsmeow e Baileys com o mesmo comportamento (precisa de experimento próprio).
7. RAM/CPU por sessão e sessões por servidor para Baileys, whatsmeow, WAHA GOWS e wuzapi em carga idle e com picos (testes de carga próprios).
8. Confiabilidade de `fromMe` echoes e histórico em 2026 em cada motor.
9. Tratamento de LID/PN em Baileys rc14 e whatsmeow (mapeamento persistente, merge de contatos).
10. Preço/termos da licença do Evolution Go e do open-wa.
11. Biblioteca subjacente, localização dos dados, proxies e termos dos provedores (Z-API, W-API, UAZAPI, Mega API, APIBrasil, Ultramsg, 2Chat, Green API, Whapi, Maytapi, Wassenger).
12. Data e condições da transferência de `EvolutionAPI` para `evolution-foundation`.
13. Preço de servidores dedicados/VM no Brasil para o dimensionamento da seção 9.1.
14. Existência de ações da Meta contra autores/provedores (busca não achou, mas não é conclusiva).
15. Limite oficial de dispositivos vinculados e comportamento de logout por inatividade para companions QR fora da coexistência.
16. Estabilidade do fix de passkey no Baileys (#2689) para contas Business e o impacto do bug de `<status>` ack em produção.
