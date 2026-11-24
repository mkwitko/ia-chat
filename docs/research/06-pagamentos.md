# 06 - Pagamentos: provedor para (A) cobrar assinantes e (B) sinal Pix do paciente

Data da pesquisa: 2026-11-24. Regra: só páginas oficiais de preço e documentação oficial de API. O que não deu para confirmar em fonte oficial está marcado **não verificado**. Reclame Aqui e fóruns não foram consultados (fora da regra), então toda reputação/saldo bloqueado/suporte fica **não verificado**. Preços de vitrine mudam e várias páginas mostram condição promocional; confirmar por contrato antes de decidir.

## 0. Resumo executivo

- **A (cobrar nossos assinantes): Asaas.** Único que fecha tudo em um lugar: assinatura por API, Pix Automático, cartão recorrente, boleto, NFS-e nativa (R$ 0,49/nota), sandbox, webhooks com fila. Pix a R$ 1,99 é o mais caro entre os candidatos, mas em R$ 297 isso é 0,67%. Runner-up: **AbacatePay** (Pix R$ 0,80, trial grátis, troca de plano e `record-usage` para overage nativos, HMAC nos webhooks), com a ressalva de ser jovem, sem NFS-e e sem boleto em assinatura.
- **B (sinal Pix paciente -> profissional): Mercado Pago via OAuth** (cobrança criada com o token do próprio profissional, dinheiro cai na conta MP dele), com **B-zero (chave Pix estática + "recebido")** como fallback/MVP. Runner-up: **PagBank Connect** (mesmo modelo OAuth). Stripe fica fora no Pix: MCC 8099 (serviços médicos) é **proibido** para Pix. Asaas subcontas exigem CNPJ-pai, período de avaliação e homologação, e Woovi/AbacatePay subcontas guardam saldo dentro da NOSSA conta (violaria "nunca seguramos fundos").
- Os dois problemas são separados: A pode ser um PSP "de comerciante" comum; B precisa de modelo "conta do profissional".

## 1. Tabela de taxas (A: nossas cobranças como comerciante)

| Provedor | Pix | Cartão crédito à vista | Boleto | Liquidação | Fonte |
|---|---|---|---|---|---|
| Asaas | R$ 1,99 por cobrança (R$ 0,99 aparece ao lado, aparentemente promocional; **não verificado** o prazo) | R$ 0,49 + 2,99% (R$ 0,49 + 1,99% condição "válida por 3 meses"); assinaturas: mesma taxa por cobrança recebida | R$ 1,99 (R$ 0,99 promo) | Cartão: simulador mostra "receber em 1 dia" (**não verificado** o prazo padrão); antecipação cartão 1,25% a.m. | https://www.asaas.com/precos-e-taxas |
| Mercado Pago (Checkout) | 0,99% | 4,98% na hora, 4,49% em 14 dias, 3,98% em 30 dias | R$ 3,49 (até 3 dias) | Pix na hora | https://www.mercadopago.com.br/ajuda/33399 (taxa da API Pix/assinaturas: **não verificado**) |
| Stripe Brasil | 1,19% | 3,99% + R$ 0,39 (cartão nacional) | R$ 3,45 | Pix T+2 (doc) | https://stripe.com/br/pricing , https://stripe.com/br/pricing/local-payment-methods , https://docs.stripe.com/payments/pix . Billing: +0,7% do volume (https://stripe.com/br/billing/pricing) |
| Pagar.me (Stone) | 0,99% | 4,19% | **não verificado** | "dia seguinte*" | https://www.pagar.me/ (campanha Black Friday; preço padrão **não verificado**) |
| Efí | 1,19% (Pix API/QR dinâmico); Pix Automático R$ 3,50 por Pix liquidado | 3,49% (recebe em até 31 dias) | R$ 3,45 (compensa em 1 dia útil) | ver coluna anterior | https://sejaefi.com.br/tarifas |
| AbacatePay | R$ 0,80 fixo | 3,5% + R$ 0,60 em D+30; 5,42% + R$ 0,60 em D+1 (prazo escolhido no dashboard) | R$ 2,50 (D+3 úteis) | Pix na hora | https://www.abacatepay.com/pricing |
| Woovi | R$ 0,85 (plano fixo) ou 0,80% (mín. R$ 0,50, máx. R$ 5,00); recorrente R$ 0,85 ou 0,80% por parcela | **não verificado** (não listado) | R$ 2,99 | Pix na hora; saque grátis a partir de R$ 500, R$ 1,00 abaixo | https://woovi.com/pricing/ |
| PagBank | 0% nos primeiros 30 dias (depois **não verificado**) | 4,99% na hora / 3,99% em 14 d / 3,19% em 30 d (simulador; aba maquininha x internet **não verificado**) | **não verificado** | na hora/14/30 d | https://pagbank.com.br/taxas |
| InfinitePay | "Pix taxa 0%" (checkout) | a partir de 2,69% | **não verificado** | **não verificado** | https://www.infinitepay.io/taxas ; **API pública para terceiros não encontrada: não verificado** |
| Iugu | **não verificado** (sem preço público) | **não verificado** | **não verificado** | **não verificado** | https://www.iugu.com/api (site lista Pix, assinaturas, Split, Contas e Subcontas) |
| Cora | **não verificado** (sem tarifa na doc) | n/a | API de boleto v2 e QR Pix v2 existem | n/a | https://developers.cora.com.br/llms.txt (conta só CNPJ) |

## 2. Recursos para A (assinaturas)

| Provedor | Assinatura via API | Pix recorrente | Trial / troca plano / overage | Dunning | NFS-e | Sandbox / SDK |
|---|---|---|---|---|---|---|
| Asaas | Sim (https://docs.asaas.com/docs/assinaturas) | Pix Automático via API "Jornada 3", modo `MANUAL` ou `SUBSCRIPTION`; assinatura com `billingType=PIX` NÃO é Pix Automático (https://docs.asaas.com/docs/pix-automatico , https://docs.asaas.com/docs/diferença-entre-pix-automático-e-assinaturas-1.md) | Trial: usar data da 1a cobrança (nextDueDate). Overage na próxima fatura e upgrade/downgrade sem proração nativa: **não verificado** | Notificações por e-mail/SMS R$ 0,99, WhatsApp R$ 0,55, carta R$ 2,91, voz R$ 0,55, Serasa R$ 9,90 (página de preços); retentativas do Pix Automático documentadas | Nativa: R$ 0,49/nota; depende da lista da prefeitura (https://docs.asaas.com/docs/notas-fiscais.md); emissão automática para assinaturas documentada | Sandbox sim (https://docs.asaas.com/docs/sandbox.md); SDK oficial Node **não verificado** |
| Mercado Pago | Sim, preapproval com ou sem plano; `free_trial` no plano; periodicidade semanal/mensal/anual; retentativas automáticas (https://www.mercadopago.com.br/developers/pt/docs/subscriptions/overview) | A página lista Pix/boleto como meios, mas Pix Automático real: **não verificado** | Trial em dias: **não verificado** (exemplo da doc usa meses) | Retentativas automáticas (doc) | **não verificado** | SDK Node listado na página de SDKs (pacote exato a confirmar); sandbox/contas de teste sim |
| Stripe | Billing sim; Pix Automático suportado, com aviso de pré-débito (3 dias) e confirmação até 7 dias (https://docs.stripe.com/payments/pix) | Sim (Pix Automático) | Trial/avaliação, Smart Retries e uso medido na página de Billing (https://stripe.com/br/billing/pricing) | Smart Retries | **não verificado** | SDK/sandbox: **não verificado** nesta rodada |
| Pagar.me | Planos e assinaturas v5 (https://docs.pagar.me/reference/planos-1.md) | **não verificado** | **não verificado** | **não verificado** | **não verificado** | Simulador de Pix, SDKs v5 listados |
| Efí | Assinaturas: boleto e cartão (https://dev.efipay.com.br/docs/api-cobrancas/assinaturas-recorrencia); Pix Automático em endpoints próprios (https://dev.efipay.com.br/docs/api-pix/pix-automatico) | Sim | **não verificado** | **não verificado** | **não verificado** | Certificado .p12 por conta e mTLS (ver §4) |
| AbacatePay | Sim; ciclos semanal a anual (https://docs.abacatepay.com/pages/cobrar/assinaturas) | Pix Automático (precisa ser liberado na conta) (https://docs.abacatepay.com/pages/cobrar/pix-automatico) | Teste grátis, `change-plan` (vale na próxima cobrança), `record-usage` soma uso à próxima parcela (https://docs.abacatepay.com/pages/subscriptions/record-usage). Assinatura é `CARD` ou `PIX`; boleto só avulso | `maxRetry` e `retryEvery` configuráveis; cancela ao esgotar | **não verificado** | Modo Teste; SDKs Node e Ruby (https://docs.abacatepay.com/pages/sdks/sdks) |
| Woovi | Cobrança recorrente (mensal/semanal/quinzenal) e Pix Automático (jornadas 1-3), assinatura com boleto (https://developers.woovi.com/llms.txt) | Sim | **não verificado** | **não verificado** | Add-on R$ 0,99/nota (https://woovi.com/pricing/) | Sandbox e SDK Node oficiais |
| PagBank | Pagamentos recorrentes com planos, assinaturas e retentativas (https://developer.pagbank.com.br/docs/assinaturas.md); boleto sem retentativa | **não verificado** | **não verificado** | Retentativas (doc) | **não verificado** | Sandbox Connect existe |
| Iugu | Assinaturas com gestão de inadimplência (https://www.iugu.com/api) | **não verificado** | **não verificado** | Sim (vitrine) | **não verificado** | **não verificado** |

NFS-e fora do PSP (nós emitimos para o assinante, exige CNPJ e emissão municipal/nacional): Focus NFe Solo R$ 94,90/mês com 100 documentos e R$ 0,11 por adicional (https://focusnfe.com.br/precos/); NFE.io Base R$ 190/mês até 250 notas + R$ 299 de adesão (https://nfe.io/precos/); eNotas: preço **não verificado** (página sem valores). Cora tem API de NFS-e beta, mas exige conta Cora e certificado A1 (https://developers.cora.com.br/reference/upload-certificado-a1-e-credenciais-nfse.md). Como Asaas faz por R$ 0,49 e é nativo, o PSP vence frente a integrador separado enquanto o volume for baixo.

## 3. Modelo para B: dinheiro na conta do profissional

| Provedor | Como funciona | Fica com a gente? | Onboarding do profissional | Taxa Pix | Veredito B |
|---|---|---|---|---|---|
| **Mercado Pago** | OAuth authorization code: o vendedor autoriza nosso app e criamos cobranças com o access token dele. code vale 10 min, access token 180 dias, refresh 6 meses (https://www.mercadopago.com.br/developers/pt/docs/security/oauth/introduction). Pix dinâmico com `expiration_time` ISO 8601 (https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix). Webhook com `x-signature` HMAC e segredo (https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks) | Não: cobrança é da conta dele, cai no MP dele | Self-service: clica em "Conectar" e loga na conta MP (cria se não tiver). KYC é do MP | 0,99% (Checkout). R$ 0,50 num sinal de R$ 50 | **Escolhido** |
| PagBank Connect | OAuth (Connect Authorization ou via SMS), vendedor autoriza; `code` vale 10 min (https://developer.pagbank.com.br/docs/connect.md , https://developer.pagbank.com.br/docs/connect-authorization.md). QR Pix por pedido; webhook com verificação SHA256 | Não | Similar ao MP | 0% nos primeiros 30 dias, depois **não verificado** | Runner-up |
| Asaas subcontas | `POST /v3/accounts`; conta-pai tem que ser **CNPJ** (CPF proibido, Res. Conjuntas 16/17). Não-BaaS: titular recebe e-mail, define senha e envia documentos no Asaas. Período de avaliação: até 10 subcontas, R$ 2.000 por subconta, 60 dias; depois só com homologação; `apiKey` da subconta só durante avaliação, depois exige BaaS ou filial com mesmo prefixo de CNPJ (https://docs.asaas.com/docs/criacao-de-subcontas.md , https://docs.asaas.com/docs/faq-periodo-de-avaliacao.md , https://docs.asaas.com/docs/detalhamento-do-fluxo-de-aprovação-de-subcontas.md , https://docs.asaas.com/docs/gerenciamento-de-chaves-de-api-de-subcontas.md). BaaS exige exposição da marca Asaas e alinhamento com gerente | Fundo fica na subconta Asaas (do profissional), não em nossa conta | Titular completa KYC; prazo de aprovação da subconta: **não verificado** | R$ 1,99 (R$ 50 = 4%) | Pesado para o porte |
| Woovi subconta | Subconta = nome + chave Pix; split credita saldo e o profissional "saca"; criação só por API e exige o recurso Subconta (https://developers.woovi.com/docs/subaccount/how-to-create-a-subbaccount.md , https://developers.woovi.com/docs/subaccount/split-sub-account-usecases.md) | Indica saldo virtual dentro da conta-mãe (inferência) | Conta PJ da plataforma | R$ 0,85 ou 0,80% | Descartado (seguraríamos fundos) |
| AbacatePay subconta | Subconta guarda saldo dentro da NOSSA conta, saque só para o CPF/CNPJ do titular (https://docs.abacatepay.com/pages/dinheiro/subcontas-e-split) | Sim | Plataforma precisa de CNPJ verificado (até 3 dias úteis) | R$ 0,80 | Descartado |
| Pagar.me recebedores | `recipient` com saldo no ambiente Pagar.me, KYC com link de prova de vida, regras regulatórias de marketplace desde fev/2024 (https://docs.pagar.me/docs/recebedores-2.md , https://docs.pagar.me/page/adequação-de-marketplace-para-mudanças-regulatórias.md) | Não (saldo é do recebedor no Pagar.me) | Prova de vida, dados mínimos | 0,99% (promo) | Possível, contrato de marketplace; **não verificado** prazo/self-service |
| Efí | Split Pix só entre contas Efí, até 20 contas; mTLS e certificado por conta (https://dev.efipay.com.br/docs/api-pix/split-de-pagamento-pix) | Não | Cada profissional abriria conta Efí e gerenciaria certificado: inviável para não técnico | 1,19% | Descartado |
| Stripe Connect | Express disponível para plataforma no Brasil e Pix em Connect com direct charges (https://docs.stripe.com/connect/express-accounts , https://docs.stripe.com/payments/payment-methods/payment-method-connect-support). Connect: R$ 6 por conta ativa/mês + 0,25% + R$ 0,67 por repasse (https://stripe.com/br/connect/pricing) | Não | Hospedado pela Stripe | 1,19% | **Bloqueado**: Pix proíbe MCC 8099 (serviços médicos), 8071 e 8062; telemedicina também (https://docs.stripe.com/payments/pix) |
| InfinitePay, Iugu, Cora | Sem OAuth/connect verificável em doc oficial pública | - | - | - | **não verificado** |

Reembolso: com MP/PagBank o profissional pode devolver pelo próprio app do provedor; nós também podemos acionar a API com o token dele (endpoint exato de MP/PagBank: **não verificado**). No Pix de Stripe a janela é 90 dias (doc oficial), como referência de prática.

## 4. Webhooks, API, regulatório

| Provedor | Assinatura / autenticação | Retry | Instituição / enquadramento |
|---|---|---|---|
| Asaas | Token estático definido por nós no header `asaas-access-token` (não é HMAC) (https://docs.asaas.com/docs/sobre-os-webhooks.md) | Novas tentativas; 15 falhas seguidas podem pausar a fila; eventos retidos 14 dias; penalização progressiva de intervalo (https://docs.asaas.com/docs/penalização-de-filas.md). Tem idempotência documentada e logs de webhook | BaaS/subcontas sob Res. Conjuntas 16/17: Asaas é a instituição, a marca Asaas precisa aparecer ao usuário final. Nome jurídico: **não verificado** |
| Mercado Pago | `x-signature` HMAC com segredo (QR Code é exceção) | **não verificado** | Mercado Pago Instituição de Pagamento Ltda. (rodapé oficial). Split 1:1 é descrito como serviço de PSP a vendedores de marketplace |
| Stripe | **não verificado** nesta rodada | **não verificado** | **não verificado** |
| Pagar.me | **não verificado** (objeto de webhook traz `attempts`/`last_attempt`) | **não verificado** | Site hoje se apresenta como "Pagar.me agora é Stone" |
| Efí | mTLS exigido no nosso servidor (chave pública Efí) por norma do BC (https://dev.efipay.com.br/docs/api-pix/webhooks) | **não verificado** | **não verificado**. API Pix exige certificado por conta (https://dev.efipay.com.br/docs/api-pix/credenciais) |
| AbacatePay | `X-Webhook-Secret` e `X-Webhook-Signature` HMAC-SHA256 (https://docs.abacatepay.com/pages/notificacoes/seguranca) | 2xx em 30 s; mesmo `id` nas retentativas; intervalos 5 min, 30 min, 2 h... (tabela completa **não verificado**) (https://docs.abacatepay.com/pages/notificacoes/webhooks) | Instituição parceira **não verificado**. Atende só PJ (MEI e ME aceitos), análise até 3 dias úteis (https://docs.abacatepay.com/pages/comecar/conta-e-verificacao) |
| Woovi | Header `X-OpenPix-Signature` (https://developers.woovi.com/llms.txt) | **não verificado** | "Payment Institution regulada pelo BC e participante direto do Pix" (mesma fonte). Sandbox e SDK Node oficiais, MCP oficial |
| PagBank | Verificação SHA256 da notificação | **não verificado** | **não verificado** |

## 5. Exemplos de custo efetivo

### A: assinatura de R$ 297 (taxa por cobrança, sem NFS-e)

| Provedor | Pix | Cartão (à vista) | Boleto |
|---|---|---|---|
| Asaas | R$ 1,99 (0,67%) | R$ 9,37 (8,88 + 0,49) = 3,15%; na promo de 3 meses R$ 6,40 | R$ 1,99 |
| Mercado Pago | R$ 2,94 | R$ 14,79 (na hora), R$ 13,34 (14 d), R$ 11,82 (30 d) | R$ 3,49 |
| Stripe (sem Billing) | R$ 3,53 | R$ 12,24 | R$ 3,45 |
| Stripe + Billing 0,7% | R$ 5,61 | R$ 14,32 | R$ 5,53 |
| Pagar.me (promo) | R$ 2,94 | R$ 12,44 | não verificado |
| Efí | R$ 3,53 (QR); Pix Automático R$ 3,50 | R$ 10,37 | R$ 3,45 |
| AbacatePay | R$ 0,80 | R$ 11,00 (D+30), R$ 16,70 (D+1) | R$ 2,50 |
| Woovi | R$ 0,85 (plano fixo) | não verificado | R$ 2,99 |
| PagBank | 0% por 30 dias, depois não verificado | R$ 14,82 (na hora), R$ 9,47 (30 d) | não verificado |

Observação: NFS-e Asaas +R$ 0,49 por nota; a diferença entre o mais barato e o mais caro no Pix é menos de R$ 3 por assinante/mês (<1%). No cartão, a diferença entre Asaas (R$ 9,37) e MP imediato (R$ 14,79) é de R$ 5,42/mês. Cartão deve ser o método incentivado para MRR e Pix Automático para baixar custo e inadimplência.

### B: sinal Pix de R$ 50

| Provedor | Taxa | % do sinal |
|---|---|---|
| Mercado Pago | R$ 0,50 (0,99%, taxa Checkout; API não verificada) | 1,0% |
| Woovi (plano %) | R$ 0,50 (0,80% = R$ 0,40, sobe ao mínimo de R$ 0,50) | 1,0% |
| Pagar.me (promo) | R$ 0,50 | 1,0% |
| Efí | R$ 0,60 | 1,2% |
| AbacatePay | R$ 0,80 | 1,6% |
| Woovi (plano fixo) | R$ 0,85 | 1,7% |
| Asaas | R$ 1,99 (R$ 0,99 se promo) | 4,0% |
| Stripe | R$ 0,60, mas Pix proibido para MCC 8099 | n/a |
| PagBank | R$ 0,00 por 30 dias, depois não verificado | - |
| B-zero | R$ 0 (taxa do banco do profissional: **não verificado**) | 0% |

Quem paga a taxa de B é o profissional (cobrança dele), então não cabe margem nossa nesse fluxo.

## 6. B-zero: chave Pix estática com valor, sem PSP

Fatos do Manual de Padrões para Iniciação do Pix (https://www.bcb.gov.br/content/estabilidadefinanceira/pix/Regulamento_Pix/II_ManualdePadroesparaIniciacaodoPix.pdf):
- QR estático exige chave válida no DICT; campos opcionais: txid (até 25 caracteres), texto livre e valor. Nada de vencimento/expiração: expiração só existe no QR dinâmico.
- O txid do estático chega ao PSP do recebedor via pacs.008 e serve para conciliar. O webhook padrão da API Pix informa apenas Pix associados a txid, e só existe quando o PSP do recebedor oferece API Pix. Bancos pessoais e de varejo normalmente não expõem isso a terceiros: **não verificado**.

Viabilidade: gerar o BR Code (EMV + CRC16) é trivial para nós, custo zero, sem regulação (não tocamos dinheiro). Limites:
- Sem expiração nem "pago" automático. Confirmação por toque "recebido" do profissional: risco de comprovante falso, esquecimento e a IA não fecha o ciclo sozinha. Mitigação: txid = id do agendamento, e valor exato por consulta.
- Confirmação via Open Finance/webhook bancário: exigiria cada profissional consentir leitura de extrato por instituição autorizada. Viabilidade para solo não técnico: **não verificado**; trate como não disponível no MVP.
- Reembolso: o profissional devolve no app do banco dele (zero integração).
Recomendação: oferecer como modo "manual" padrão no dia 1 e como saída para quem não quer conta MP.

## 7. Recomendação

**A: Asaas.** Razões: cobertura completa em um fornecedor (assinatura, Pix Automático, cartão, boleto, NFS-e a R$ 0,49, notificações de cobrança, sandbox); preço de tabela público; subconta não é necessária para A (somos o comerciante), então o gargalo de CNPJ/homologação de subcontas não nos atinge. Precisamos de conta Asaas PJ para emitir NFS-e de qualquer forma.
- **Runner-up: AbacatePay.** Mudar se (i) Pix Automático e assinaturas forem liberados na nossa conta, (ii) resolvermos NFS-e por Focus NFe (R$ 94,90/mês), (iii) a diligência de estabilidade/suporte vier boa, ou (iv) o volume de Pix fizer a diferença de R$ 1,19 por cobrança pesar. `record-usage` resolve o overage com menos código.
- Mudar do Asaas se: Pix Automático falhar em escala, houver pausa recorrente de fila de webhook, retenção de saldo, ou tarifa de renovação for reajustada.

**B: Mercado Pago OAuth, com B-zero como fallback.** Razões: modelo é exatamente "cobrança na conta do profissional", sem subconta, sem CNPJ-pai nem homologação de marketplace, onboarding é um clique de consentimento, taxa Pix 0,99%, Pix "na hora", webhook assinado, expiração de QR por API. A plataforma não vira facilitadora: não recebe nem repassa os valores.
- **Runner-up: PagBank Connect** (mesma arquitetura; Pix 0% por 30 dias, depois a confirmar). Mudar para ele (ou usar ambos) se o profissional já tem PagBank/PagSeguro ou se MP bloquear categoria de saúde.
- Mudar do MP se: taxa de Pix pela API for maior que a de vitrine, bloqueio de saldo de contas de profissionais de saúde, ou exigir homologação/aprovação de marketplace (Split 1:1) para apenas conectar contas.

## 8. Riscos

1. MP: taxa de Checkout pode não ser a da API; categoria "serviços de saúde" pode ter restrição em termos (**não verificado**); token expira em 180 dias, então precisamos de job de refresh e de reconexão assistida.
2. Dinheiro fica na carteira MP do profissional e saque para banco pode ter prazo/tarifa: **não verificado**.
3. Asaas: subconta/BaaS pode virar obrigatório se algum dia centralizarmos recebimentos; o período de avaliação trava criação de subcontas (10, R$ 2.000, 60 dias).
4. Asaas: webhook com token estático, sem HMAC; fila pausa após 15 falhas; precisamos de endpoint idempotente, resposta rápida e reconciliação por polling.
5. Pix Automático depende do banco do pagador; fallback para cartão e Pix avulso com lembrete.
6. NFS-e: exigências variam por município (Asaas e Cora avisam); cobrir MEI/PF que não precisa exigir nota.
7. Promoções (Asaas 3 meses, Pagar.me Black Friday, PagBank 30 dias) distorcem comparação: usar preço padrão.
8. LGPD/dado de saúde: sinal revela consulta; evitar enviar descrição clínica ao PSP.
9. Reputação e suporte de todos: **não verificado**; risco real em contas novas de profissional (bloqueios/KYC).

## 9. O que verificar por contato com o provedor

Asaas: preço padrão de Pix após promoção; tarifa do Pix Automático; prazo de liquidação do cartão; overage na próxima fatura e proração em upgrade/downgrade; limites/aprovação para conta PJ nova; tempo de aprovação de subconta e se BaaS é obrigatório; SDK Node oficial.
Mercado Pago: taxa Pix pela API e assinatura; se OAuth para marketplace sem comissão exige enrolar no Split 1:1; categoria saúde permitida; Pix Automático e trial em dias em preapproval; retry de webhook; tarifa e prazo de saque; endpoint de reembolso com token do vendedor; pacote Node oficial.
PagBank: taxa Pix depois de 30 dias; Pix QR com expiração e reembolso via Connect; retry/assinatura do webhook.
AbacatePay: liberação de assinaturas/Pix Automático; NFS-e; instituição parceira; histórico de estabilidade.
Pagar.me/Stripe/Efí/Woovi/Iugu/InfinitePay/Cora: preços padrão, webhook (assinatura e retry), instituição, KYC de sub-merchants, prazos de aprovação, complaints.
Para B-zero: se algum banco grande expõe webhook/Open Finance a terceiros para PF/MEI.

## 10. Itens "não verificado" (consolidado)

Reclame Aqui/fóruns de todos; tempo de aprovação de subconta Asaas; tarifa Pix Automático (Asaas, Stripe, MP); overage e proração no Asaas; SDK Node oficial do Asaas, Stripe e Efí; taxa MP Pix via API e assinaturas; Pix Automático no MP; trial em dias no MP; retry de webhook (MP, Woovi, PagBank, Pagar.me, Efí, Stripe); assinatura de webhook Stripe/Pagar.me; preços padrão de Pagar.me, Iugu, Cora, PagBank (Pix pós-30 dias); preço eNotas; boleto Pagar.me/PagBank/Woovi cartão; API pública InfinitePay; instituição jurídica de Asaas, Stripe, Efí, AbacatePay, PagBank; reembolso por API para MP/PagBank; Open Finance e webhook bancário para B-zero; prazo/tarifa de saque MP.
