# 08 - BSP com linha de crédito compartilhada (solução multiparceiro)

Pesquisa de 25/11/2026. Contexto: H-05 (pagamos a Meta por todos os clientes). Precisamos de um BSP (Parceiro de Soluções) que compartilhe a linha de crédito com cada WABA que onboardarmos pelo nosso Embedded Signup, sem nos obrigar a usar a API ou a caixa de entrada dele. Nada foi contatado nem contratado. Só páginas públicas, lidas em 25/11/2026 por leitura automática de páginas (resumos podem perder detalhes; confirmar com o comercial).

Legenda: V = verificado na página citada; NV = não verificado.

## O que a Meta diz (V)

- Passo 7 da solução multiparceiro: só Solution Partner compartilha a própria linha de crédito com cada cliente novo; exige a permissão `MANAGE_BILLING`. Tech Provider não tem linha de crédito. Fonte: https://developers.facebook.com/docs/whatsapp/solution-providers/multi-partner-solutions e https://developers.facebook.com/documentation/business-messaging/whatsapp/solution-providers/share-and-revoke-credit-lines/
- Quem compartilha a linha é o "Bill To Party" e responde por todo o gasto dos clientes na linha (resultado de busca citando a doc da Meta; reconfirmar na página de créditos acima).
- Mudar o cliente para outra linha pausa as mensagens até o dia 1 do mês seguinte, e a moeda da linha deve ser igual à da WABA (mesma fonte). Vale para a escolha do BSP: trocar depois custa um mês de transição por cliente. Perguntar a moeda da linha (BRL?) a cada BSP.

## Comparação

| BSP | Linha de crédito com Tech Provider | Cobrança a nós | Coexistência | Fricção / acesso à Cloud API | Contrato / mínimo |
|---|---|---|---|---|---|
| WAME (wame.api.br) | NV. A página não menciona linha de crédito nem MPS; diz que a revenda não exige virar Solution Partner, ou seja, é revenda da API própria, não MPS. Fonte: https://wame.api.br (25/11) | V: revenda R$ 28/instância/mês (20-99), R$ 24 (100-299), R$ 20 (300-799), via PIX. Meta cobra por mensagem à parte. Nota fiscal: NV (a página não cita). Markup por mensagem: NV | V: cita Coexistência da Meta na API oficial | NV se dá acesso direto à Cloud API com o nosso app | V: mínimo 20 instâncias, sem fidelidade |
| 360dialog | V (parcial): tabela do programa Tech Provider diz "Credit lines available via 360Dialog"; MPS não é possível entre a 360dialog e outro BSP (irrelevante para nós, que somos Tech Provider). Fonte: https://docs.360dialog.com/partner/get-started/tech-provider-program | V: API EUR 49/99/500 por número/mês, ou Partner Platform EUR 250/500/1.000 base + EUR 15-49 por canal; "sem markup" nas tarifas da Meta; moeda EUR/USD (BRL: NV); fatura em BRL com nota fiscal: NV (improvável). Fonte: https://360dialog.com/pricing | NV | V: o Tech Provider pode hospedar o próprio Embedded Signup e acessar as WABAs pela Meta e pela API. Se o cliente precisa usar a API 360dialog: NV (a página não diz) | V: mensal, sem fidelidade citada; mínimo de volume NV |
| Gupshup | V (parcial): "Você pode continuar acessando a linha de crédito do Solution Partner se fizer parceria com um como a Gupshup". Não usa o termo MPS. Fonte: https://partner-docs.gupshup.io/docs/what-is-sp-tp | NV (quem fatura, preço, moeda, BRL/nota) | NV | NV | NV |
| Twilio | NV. A FAQ não fala de MPS. V: "Meta não cobra ISVs diretamente"; Meta cobra a Twilio; pagamos Twilio conforme preço ou contrato; programa Tech Provider gratuito. Fonte: https://www.twilio.com/docs/whatsapp/isv/tech-provider-program/faq | V (parcial): repasse mais taxa da Twilio; valores, moeda e nota fiscal em BRL: NV | NV | NV; o modelo parece passar pela Twilio (cobrança e escalonamento) | NV |
| Infobip | V: "Clientes onboardados pelo Embedded Signup (configurado para uma solução de parceiro) compartilham a linha de crédito da Infobip"; a Infobip cobra o uso e fatura a solução para nós. Fonte: https://www.infobip.com/docs/whatsapp/tech-provider-program/setup-and-integration | V (parcial): fatura o uso a nós. Markup, mensalidade, moeda, BRL e nota: NV | NV | V: permissão de envio do app da Infobip fica "Only my partner" (a solução descrita é só com a Infobip). Se podemos enviar pela nossa própria Cloud API: NV; limite de 200 clientes por semana por solução | V: mínimo não declarado na página; contrato NV |
| Blip (Take) | NV | NV | NV | NV | NV (fonte secundária e não verificada cita planos a partir de R$ 450/mês) |
| Zenvia | NV | NV | NV | NV | NV |
| Outros BSPs brasileiros com MPS/linha de crédito anunciados | Nenhum encontrado em busca pública (25/11). NV se existe. Exotel documenta o mesmo modelo, mas é indiano: https://support.exotel.com/support/solutions/articles/3000126550-get-started-for-meta-tech-providers-with-exotel-for-whatsapp-isv- | NV | NV | NV | NV |

Pontos que nenhuma página pública resolveu para nenhum BSP: moeda da linha (BRL), nota fiscal brasileira, markup sobre a tarifa da Meta, mínimo de volume, coexistência dentro da MPS.

## Recomendação (top 2)

1. **Infobip.** Única com a mecânica verificada por escrito: linha compartilhada para clientes do nosso Embedded Signup, com a Infobip pagando a Meta e nos faturando. Risco: a configuração descrita limita o envio ao "meu parceiro" e não dá clareza sobre mantermos nossa Cloud API própria (isso precisa de resposta escrita). Provável contrato enterprise, sem preço público.
2. **360dialog.** Linha de crédito confirmada no programa Tech Provider, preço público, sem markup nas tarifas da Meta, mensal sem fidelidade, e o Tech Provider pode usar o próprio Embedded Signup e acessar as WABAs pela Meta. Risco: preço em EUR/USD, fatura provavelmente sem nota fiscal brasileira (iss e IOF/remessa a avaliar), e custo fixo por número (EUR 49-99).

Fora do top 2: WAME é revenda da API deles, sem MPS à vista (só vale se responderem que sim); Gupshup é plausível (menção a linha de crédito) mas sem detalhe. Twilio, Blip, Zenvia, desconhecidos. Se Infobip e 360dialog falharem em BRL/nota, perguntar a Blip e Zenvia (BSPs brasileiros, provável nota fiscal) antes de decidir.

## Perguntas para o comercial

Enviar a todos (adaptar ao nome):

1. Vocês são Solution Partner da Meta e oferecem Multi-Partner Solution com linha de crédito compartilhada para Tech Providers (nós, com Embedded Signup próprio)? Há documentação ou contrato-modelo?
2. Continuamos chamando a Cloud API da Meta diretamente com o token do nosso app, sem passar pela API ou pela caixa de entrada de vocês? Há alguma restrição de permissão nos ativos do cliente?
3. Quem paga a Meta e como nos cobram: markup percentual por mensagem, mensalidade por número, taxa de setup, mínimo mensal ou de números? Tabela completa para 1, 20 e 100 números.
4. A linha de crédito e a fatura são em BRL? Emitem nota fiscal brasileira (CNPJ nacional)? Prazo e forma de pagamento (PIX, boleto, cartão)? Se a linha for em USD ou EUR, como fica a conversão?
5. Qual o mínimo contratual, a duração, a fidelidade e a multa de saída? Como migrar clientes para outra linha depois (pausa de um mês) e quem arca com isso?
6. Coexistência (app WhatsApp Business e API no mesmo número) funciona nos números onboardados por essa solução? Há custo extra?
7. Limites do onboarding: clientes por semana, prazo para ativar a solução, o que pedem de nós (aprovações, conta, KYC)? Há controle de gasto por cliente ou alerta quando um cliente consome demais na nossa linha?
8. Como suspendem ou cortam um cliente que gera consumo alto ou abuso, e qual o nosso risco financeiro como Bill To Party?

Extra para WAME: vocês fazem MPS com linha de crédito ou só a API própria? Se só a própria, podemos manter nossa Cloud API?

Extra para Infobip: a permissão "Only my partner" impede nosso envio pela Cloud API? Dá para configurar de outro modo?

Extra para 360dialog: a linha de crédito está disponível a Tech Providers que não usam a API de vocês para envio? Fatura em BRL ou só EUR/USD?
