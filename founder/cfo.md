# CFO (25/11/2026)

Valores em R$ (a ferramenta imprime "$"). "Cliente-mês pagante a day" = clientes pagantes no mês (dias por mês = 1). Fontes de cada número em `cfo-sources.md`. Projeção, não resultado. Não é aconselhamento financeiro, fiscal ou jurídico: um contador deve checar regime tributário, pró-labore e impostos antes de qualquer dinheiro mudar de mão.

## Nota do CFO

- **Margem:** cada cliente deixa R$ 227,70 (81%) depois dos custos dele. Com 30 clientes, a margem depois de tudo é 68%.
- **Equilíbrio:** 6 clientes pagantes. Com o ritmo previsto (convite, 1 cliente no mês 1, 30 no mês 12), o mês 5 é o primeiro positivo e o gasto inicial volta no mês 9.
- **Caixa necessário:** R$ 5.863 até se pagar (R$ 3.540 iniciais + prejuízo dos meses 1 a 4).
- **A linha a vigiar: o ritmo de entrada.** Volume -20% tira R$ 6.285 do ano 1 (R$ 17.623 → R$ 11.338); preço -10% tira R$ 3.864; custo +15% tira R$ 1.083. O painel simulado não comprou nada (0 de 18), então o ritmo é a premissa mais fraca; ela só se confirma com pagantes reais.
- **Fora da conta:** salário do fundador (zero), aquisição paga (zero até validar), horas da configuração assistida (tempo, não dinheiro). Sem implantação, a receita única de R$ 497 por cliente some; isso tira até R$ 14.900 do ano 1 se os 30 clientes pagassem, troca aceita por menos atrito.
- **Três jeitos de melhorar a margem (rodados na ferramenta):**
  1. Ticket médio R$ 280 → R$ 297 (mais clientes no Agenda): margem 68% → 69%.
  2. Contador e servidor mais baratos (fixo R$ 1.150 → R$ 850): equilíbrio continua 6, ano 1 + R$ 3.600.
  3. Pagamento anual (a testar): reduz a taxa de cobrança de 12 boletos para 1 e antecipa caixa.
- **Condições do conselho:** ver `board.md`.

# Unit economics: Consultório Aberto (assinatura mensal por cliente)

Every number below comes from the input file. Nothing is looked up or guessed.

## One cliente-mês pagante

| line | per cliente-mês pagante |
| --- | ---: |
| Price | $280.00 |
| IA + transcrição + mensagens utility, perfil médio 400 conversas (spec 07) | -$33.51 |
| Taxa de cobrança Asaas por boleto/Pix (spec 07, não verificada) | -$1.99 |
| Imposto sobre receita, Simples Nacional ~6% (estimativa, confirmar com contador) | -$16.80 |
| **Contribution** (what each cliente-mês pagante leaves to pay the fixed costs) | **$227.70** (81%) |

## The margin that matters

Fixed costs: $1,150 a month (Outros custos fixos: domínio, e-mail, monitoramento (spec 07, US$ 100 a R$ 5,50) $550, Servidor Postgres próprio + backup R2 (estimativa, sem cotação) $300, Contador (estimativa, sem cotação) $300).

- **Break-even: 6 cliente-mês pagantes a day.** Below that you lose money every month.
- **Profit margin at your plan** (30 a day): **68%** of every sale, after every cost.
- Capacity: 60 a day.

## Year 1, month by month

| month | cliente-mês pagantes a day | revenue | profit | cumulative (after $3,540 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 1 | $280 | -$922 | -$4,462 |
| 2 | 2 | $560 | -$695 | -$5,157 |
| 3 | 3 | $840 | -$467 | -$5,624 |
| 4 | 4 | $1,120 | -$239 | -$5,863 |
| 5 | 6 | $1,680 | $216 | -$5,647 |
| 6 | 8 | $2,240 | $672 | -$4,975 |
| 7 | 10 | $2,800 | $1,127 | -$3,848 |
| 8 | 13 | $3,640 | $1,810 | -$2,038 |
| 9 | 16 | $4,480 | $2,493 | $455 |
| 10 | 20 | $5,600 | $3,404 | $3,859 |
| 11 | 25 | $7,000 | $4,542 | $8,402 |
| 12 | 30 | $8,400 | $5,681 | $14,083 |

- **Year 1 operating profit: $17,623** on $38,640 of revenue.
- After the $3,540 startup spend: $14,083.
- Startup money earned back: month 9.
- Cash you need before it pays for itself: **$5,863**.

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 68% | 6 | $17,623 |
| Price -10% | 64% | 6 | $13,759 |
| Volume -20% | 64% | 6 | $11,338 |
| Unit costs +15% | 65% | 6 | $16,540 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.
