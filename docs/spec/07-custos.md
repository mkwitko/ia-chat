# 07 — Custos e preços

Planilha com fórmulas: [custos.xlsx](custos.xlsx). Toda premissa está na aba "Premissas" e pode ser alterada; as demais abas recalculam. Fontes dos preços: [pesquisa 01](../research/01-meta-whatsapp-compliance.md), [02](../research/02-llm-voz-custos.md) e [03](../research/03-banco-infra-pagamentos.md).

Os números abaixo são estimativa. As premissas de volume e de comportamento são hipóteses até haver dados do piloto.

## Premissas

| Premissa | Valor | Origem |
|---|---|---|
| Câmbio | R$ 5,50 por dólar | Hipótese H-09 |
| LLM, modelo econômico | US$ 0,005 por conversa | Pesquisa: 0,0014 com cache e 0,0040 sem; folga para cache expirado |
| LLM, modelo escalado | US$ 0,05 por conversa | Pesquisa: 0,025 a 0,080 |
| Conversas escaladas | 15% | Hipótese; medir na avaliação |
| Fator de novas tentativas | 1,2 | Hipótese |
| Avaliação de qualidade | US$ 0,001 por conversa | Amostra de 10% em lote |
| Conversas com áudio | 20%, 1 minuto cada | Hipótese |
| Transcrição | US$ 0,00067 por minuto | Pesquisa |
| Mensagens do assistente por conversa | 6 | Hipótese |
| Meta, atendimento | R$ 0,035 por mensagem acima de 1.000 por mês | Pesquisa |
| Meta, utility | R$ 0,035 por mensagem; 2 por agendamento | Pesquisa |
| Taxa de cobrança da assinatura | R$ 1,99 | Não verificado em fonte oficial |
| Outros custos fixos | US$ 100 por mês | Hipótese |

## Custo por unidade

| Unidade | Custo nosso |
|---|---|
| Conversa | R$ 0,084 |
| Mensagem do assistente (6 por conversa) | R$ 0,014 |
| Agendamento (perfil médio, 1 a cada 5 conversas) | R$ 0,42 |

O LLM responde por mais de 90% desse valor. A transcrição é desprezível.

## Custo por perfil de consumo (por cliente, por mês)

| Perfil | Conversas | Agendamentos | Custo variável nosso | Meta, pago pelo cliente |
|---|---|---|---|---|
| Baixo | 150 | 30 | R$ 12,57 | R$ 2,10 |
| Médio | 400 | 80 | R$ 33,51 | R$ 54,60 |
| Alto | 1.200 | 200 | R$ 100,54 | R$ 231,00 |

**O maior custo variável do cliente é a Meta, não a IA.** No perfil médio a Meta custa mais que todo o nosso custo de IA. Consequências:

- uma mensagem por turno é regra de produto, não só de estilo;
- o onboarding mostra a estimativa de gasto com a Meta;
- respostas enviadas pelo profissional no celular não são cobradas, e isso não muda;
- se a Meta mudar a tabela de novo, só a aba "Premissas" precisa de ajuste.

## Cenários de escala

Mistura de perfis: 50% baixo, 35% médio, 15% alto. Ticket médio de R$ 280 (hipótese). Infraestrutura conforme a pesquisa 03, com recuperação em ponto no tempo.

| Clientes | Fixo por cliente | Custo por cliente | Custo total por mês | Receita por mês | Margem bruta |
|---|---|---|---|---|---|
| 100 | R$ 15,12 | R$ 50,21 | R$ 5.021 | R$ 28.000 | 82% |
| 300 | R$ 7,09 | R$ 42,18 | R$ 12.654 | R$ 84.000 | 85% |
| 1.000 | R$ 3,02 | R$ 38,11 | R$ 38.105 | R$ 280.000 | 86% |
| 3.000 | R$ 1,58 | R$ 36,66 | R$ 109.993 | R$ 840.000 | 87% |

A margem bruta não inclui impostos, suporte, aquisição de clientes, inadimplência nem salários. Não é lucro.

Os valores de infraestrutura acima supõem Supabase com PITR (US$ 125 por mês). Com a decisão de usar Postgres em servidor próprio, o custo fixo cai nesse valor e sobe no preço do servidor escolhido. Ajuste a coluna "Infra" da aba "Cenários" quando o servidor for contratado. O efeito na margem é pequeno fora do cenário de 100 clientes.

## Proposta de preços

O master prompt pede preço fundamentado em custo e em disposição de pagamento.

- **Custo:** o piso é baixo. O custo total de um cliente fica entre R$ 34 e R$ 93 por mês com a franquia cheia.
- **Disposição de pagamento:** a pesquisa de mercado achou ofertas de recepcionista de IA para clínicas entre R$ 157 e R$ 797 por mês, e não conseguiu verificar os preços dos concorrentes principais. A evidência é fraca.

| Plano | Preço proposto | Franquia | Excedente por conversa | Custo com franquia cheia | Margem bruta |
|---|---|---|---|---|---|
| Essencial | R$ 197 | 300 | R$ 0,40 | R$ 34,22 | 83% |
| Agenda | R$ 297 | 500 | R$ 0,40 | R$ 50,98 | 83% |
| Pro | R$ 497 | 1.000 | R$ 0,35 | R$ 92,87 | 81% |
| Clínica (base) | R$ 697 | 1.000 | R$ 0,35 | R$ 92,87 | 87% |

- Todos os preços são hipótese. Validar com 5 a 10 profissionais antes de publicar.
- O excedente cobre mais de 4 vezes o custo da conversa e fica abaixo do preço médio por conversa dentro do plano, para não punir quem cresce.
- Taxa de implantação: R$ 497, paga uma vez, pela configuração assistida (serviços, horários, base, tom de voz, conexões e teste no simulador). Hipótese do dono em 24/11/2026; rever depois de medir as horas do onboarding do piloto.
- Módulos de voz e documentos: precificar quando forem especificados, com a mesma planilha.
- Para o piloto: desconto em troca de depoimento, acesso aos números e indicações.

## Custos que a planilha ainda não cobre

- Resposta em áudio: de US$ 0,009 a US$ 0,072 por minuto de fala, conforme o provedor.
- RAG com embeddings (módulo de documentos).
- Mensagens de marketing (R$ 0,3217 cada), pagas pelo cliente.
- Crescimento de armazenamento: a pesquisa estima 432 GB em 12 meses com 3.000 clientes. A retenção configurável em [06](06-seguranca-e-lgpd.md) controla isso.
- Um preço de modelo citado na pesquisa dobra em 01/01/2027 (Gemini Flash). Os modelos candidatos principais não são afetados, mas a tabela de preços do AI Gateway precisa ser versionada por data.

## Medição em produção

`ai_usage` e `usage_counters` permitem responder, por consulta SQL: custo por mensagem, turno, conversa, agendamento, tarefa, cliente, plano e mês. O painel do operador compara o custo real com esta planilha toda semana durante o piloto. Desvio acima de 30% dispara revisão das premissas.
