# Preço (decisão, 25/11/2026)

Base: painel SIMULADO de 20 compradores (18 respostas válidas, `panel/results.md`), curva de preço (`pricing-curve.md`), concorrentes relidos em 25/11/2026 (`competitors.md`) e CFO (`cfo.md`). Preço de comprador simulado escolhe o que testar; não prova nada. Valores em R$ (as ferramentas imprimem "$").

## 1. O que os compradores simulados disseram

- **0 compram, 18 passam.** Motivos: confiança 11, hábito 4, preço 3. O bloqueio principal é confiança ("não confio que uma IA fale com meus pacientes sem eu ver"), não preço.
- Van Westendorp (simulado): faixa aceitável **R$ 89,60 a R$ 249,91**; menor resistência R$ 97,65; indiferença R$ 150,17. Medianas: barato R$ 127, começa a ficar caro R$ 220, caro demais R$ 297.
- Leitura honesta: o Agenda (R$ 297) fica acima da faixa simulada; o Essencial (R$ 197) fica dentro.

## 2. O que o mercado cobra (lido em 25/11/2026)

Plano de entrada com WhatsApp e IA, 1 profissional: GPT Maker R$ 147, Botconversa R$ 199, Zaia R$ 250, JaAtende R$ 397 (secundário). Mediana ~R$ 225. **Ninguém verificado cobra implantação** (Botconversa: "sem taxa de adesão"; iClinic: "livre de taxas de entrada"). Teste de 5 a 14 dias. Profissional extra: R$ 99 a R$ 299 por profissional nos sistemas de gestão; "sob proposta" nas ofertas de IA.

## 3. O que o negócio precisa (CFO)

Custo variável por cliente-mês (perfil médio): R$ 52,30 (IA R$ 33,51 + cobrança R$ 1,99 + imposto estimado R$ 16,80). Fixo R$ 1.150/mês. Equilíbrio: 6 clientes pagantes.

| ticket médio | margem no plano (30 clientes) |
|---|---:|
| R$ 280 (base) | 68% |
| R$ 250 | 64% |
| R$ 247 | 63% |

Qualquer preço da faixa testada paga a operação: o que decide a viabilidade é a confiança, não o preço.

## 4. Decisões

| Item | Decisão | Por quê |
|---|---|---|
| **Mensalidades** | **Mantidas:** Essencial R$ 197, Agenda R$ 297, Pro R$ 497, Clínica R$ 697; excedente R$ 0,40 / R$ 0,35 | Preço explica 3 de 18 "não"; confiança explica 11. Cortar sem dado real tira receita e não resolve o motivo principal. Testar R$ 247 no Agenda com compradores reais (item 6) antes de mexer nas mensalidades |
| **Implantação** | **Sai.** R$ 0; a configuração assistida (o operador preenche serviços, horários e base a partir de áudio ou vídeo do dono, que só aprova) vem incluída em todo plano | Nenhum concorrente verificado cobra; metade das frases de "o que me faria mudar" pede testar sem pagar implantação; a maior queixa do mercado é implantação (Cloudia). Custo real: horas do fundador, limitadas pelo convite |
| **Teste** | **Mantido:** 14 dias a partir da conexão do WhatsApp, até 100 conversas, um por CPF/CNPJ | Já está no topo do mercado (5 a 14 dias) e responde a "quero ver funcionando antes de pagar" |
| **Linha de planos** | **4 planos no código e em /precos (sem migração do enum `Plan`), mas só 2 à venda agora: Essencial e Agenda.** Pro e Clínica aparecem com preço e "em breve", sem assinatura, até as funções existirem (condição do conselho, `board.md`). Agenda é o destaque | Vender recurso não construído quebra a confiança, que é o bloqueio principal. Simplificar o código exigiria migração de banco e de termos. Rever com 10 pagantes: se ninguém escolher Essencial, fundir Essencial e Agenda |
| **Profissional adicional** | **Clínica inclui 2 profissionais; do 3º em diante, R$ 147/mês por profissional, com +250 conversas de franquia cada.** Essencial, Agenda e Pro: 1 profissional, sem adicional; para o 2º, sobe para Clínica | Mercado: R$ 99 a R$ 299 por profissional em gestão; JaAtende cobra R$ 100 a mais pelo 2º. R$ 147 fica no meio e cobre o custo (250 conversas ≈ R$ 21 de IA, spec 07). Preço aberto vira diferencial. Só se vende quando o multiprofissional existir |
| **Garantia** | Sem garantia de devolução além da lei; cancelamento vale até o fim do período pago | O teste de 14 dias já cobre o risco; evita custo e dúvida jurídica |

## 5. Escada

Essencial R$ 197 (só responde; para quem não usa Google Agenda) → **Agenda R$ 297 (marca e lembra; o plano principal)** → Pro R$ 497 (recuperação de interessados, lista de espera, sinal Pix: "em breve") → Clínica R$ 697 (2 profissionais e equipe, "em breve"; R$ 147 por profissional a partir do 3º).

## 6. Oferta de abertura e teste com compradores reais

- **Abertura (convite):** condição de fundador para os 10 primeiros pagantes: mensalidade travada por 12 meses, em troca de feedback e de autorização por escrito para usar números reais. Sem "de R$ X por R$ Y".
- **Teste de preço:** nas 10 primeiras conversas de venda, oferecer o Agenda a R$ 297 para metade e R$ 247 para a outra metade. Medir quem conecta o WhatsApp no teste e quem paga no dia 15. Se R$ 247 converter pelo menos o dobro, mudar `plans.ts`.

## 7. Objeções de preço do painel (simuladas, para o marketing responder)

1. "Não sei o total que vou pagar no fim do mês com a Meta somada ao plano, e não fecho nada assim." (P001)
2. "R$ 497 de implantação mais R$ 197 por mês pesa muito pra quem fatura pouco." (P012)
3. "O plano Agenda mais a implantação já pesam demais para mim." (P010)

Resposta: a implantação saiu, e a página de preços mostra uma conta mensal de exemplo com a Meta somada.

## Onde a decisão entra

`packages/core/src/plans.ts` (profissional adicional), `apps/site` (implantação removida), `docs/spec/01` e `07`. As edições necessárias em `docs/legal` (fora deste PR) estão listadas no PR.
