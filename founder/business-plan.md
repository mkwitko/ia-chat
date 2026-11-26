# Consultório Aberto · Business plan

**Verdict: Not yet**

- ✓ Each cliente-mês pagante earns $227.70 before fixed costs (81% contribution).
- ✓ Year 1 operating profit: $17,623.
- ✓ Break-even is 6 cliente-mês pagantes a day against a capacity of 60.
- ✗ 0 of 18 simulated buyers buy (0%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $280.00 a cliente-mês pagante |
| Profit margin at plan | 68% per cliente-mês pagante |
| Break-even | 6 cliente-mês pagantes a day |
| Year 1 operating profit | $17,623 |
| Startup spend | $3,540 |
| Cash needed before it pays for itself | $5,863 |
| Startup money earned back | month 9 |
| Buyer panel | 0 buy · 18 pass |

## The idea

Ideia revista em 25/11/2026. Gerado a partir de `PRODUCT.md`, `docs/spec/01`, `07`, `11`, `docs/brand.md` e das decisões do dono em 25/11/2026. Não altera código nem renomeia nada.

### O negócio

Recepcionista virtual com IA que transforma conversas no WhatsApp em horários marcados e ajuda a recuperar interessados que sumiram. Atende pelo WhatsApp oficial (Coexistência: o dono continua usando o app no celular), agenda no Google Agenda, mantém uma lista simples de clientes e mostra resultados.

### Para quem

Pequenos negócios e profissionais autônomos de serviço com hora marcada no Brasil. Piloto: um quiropraxista. Em seguida, negócios locais que ele indica: salões, estúdios, terapeutas, personal trainers e similares.

### O problema (nas palavras do dono do negócio)

"Eu atendo e não consigo responder. Quando vejo, o cliente já foi para outro." Mensagem sem resposta, retorno esquecido, agenda desorganizada.

### O que está decidido

- Mercado: pequenos negócios de serviço com hora marcada (dono, 25/11/2026).
- MVP: recepcionista com IA + Google Agenda + WhatsApp oficial (Coexistência) + lista simples de clientes + resultados.
- Nome: **Consultório Aberto**, mantido pelo dono em 25/11/2026 (substitui a busca por um nome mais amplo). Primeiro público: saúde e bem-estar que atende sozinho.
- Não é CRM corporativo nem "sistema operacional de IA" (`docs/spec/11`).

### O que NÃO está provado

Nenhum cliente pagante, depoimento ou métrica real ainda. Preços são hipótese (`docs/spec/07`). Todo número neste pacote vem do repositório (com fonte) ou está marcado como hipótese.

### Linha de posicionamento (recomendada)

Para o dono de um pequeno negócio com hora marcada, que perde clientes porque não consegue responder o WhatsApp enquanto atende, o Consultório Aberto é a recepcionista virtual com IA que transforma conversas em horários marcados e ajuda a recuperar quem sumiu, sem trocar o seu número e com você no controle.

### Atualização da suíte (25/11/2026)

Preços: Essencial R$ 197, Agenda R$ 297, Pro R$ 497, Clínica R$ 697 (2 profissionais; do 3º, R$ 147/mês cada). Implantação: removida (configuração assistida incluída). Teste: 14 dias da conexão do WhatsApp, até 100 conversas. Entrada por convite com onboarding guiado de cerca de 9 minutos. Cada cliente paga a Meta no próprio cartão (1.000 respostas/mês grátis por número). Detalhes em `pricing.md`; linha de posicionamento final em `marketing.md`.

## Summary

**Veredito: Not yet (ainda não).** O que precisa mudar: **prova de confiança.** 0 de 18 compradores simulados compraram (a barra é 25%), e 11 deles passaram por não confiar numa IA falando com paciente. A resposta não é baixar preço: é o piloto medido, um depoimento autorizado e a oferta v2 testada com 10 convidados reais (`/founder-offer` refeito com dados reais e `/founder-launch`).

O Consultório Aberto é uma recepcionista com IA no WhatsApp que responde, marca no Google Agenda e lembra pacientes, no mesmo número, com o dono aprovando cada resposta no começo. É para profissionais de saúde e bem-estar que atendem sozinhos; piloto com um quiropraxista em Florianópolis.

Os números (projeção, valores em R$): cada cliente deixa R$ 227,70 por mês (81%); equilíbrio com 6 clientes; ano 1 com lucro operacional de R$ 17.623 se o ritmo de 1 a 30 clientes se confirmar, sem salário do fundador.

**Onde concordaram:** painel e conselho (3 FUND IF, média 5) apontam o mesmo bloqueio, confiança sem prova. Ambos pedem ver funcionando com os próprios dados e um colega que use. **Onde discordaram:** o conselho de Ofertas quer garantia de resultado; a decisão foi teste de 14 dias sem garantia extra até o piloto medir algo garantível. O de Produto quer um plano só; ficou em dois à venda (Essencial e Agenda).

**Maior risco:** ninguém pagar depois do teste. Plano: só abrir convites com o piloto medido; linha de sucesso escrita (6 de 10 conectam, 3 pagam); se ficar abaixo, mudar oferta ou nicho antes de gastar.

**Para começar:** caixa de R$ 5.863 até se pagar (CFO). Primeiro teste: 10 convites de fundador com metade a R$ 247 e metade a R$ 297 no Agenda (`launch.md`).

**Esta semana:** fechar com o piloto as pendências (perguntas 10 e 12, intervalos da agenda) e os templates de lembrete na Meta, para ligar o piloto em "aprovar antes de enviar" até 08/12.

O painel é de compradores simulados e os números são projeções; clientes e cotações reais confirmam. Não é aconselhamento financeiro, jurídico ou fiscal.

## What the board said

Memos em `board/offers.md`, `board/monopoly.md`, `board/product.md`; brief em `board/brief.md`. As lentes resumem frameworks publicados; os membros não falam por seus autores.

### Voto

**3 FUND IF, 0 PASS.** Notas: Ofertas 5, Monopólio 4, Produto 6. Média **5,0**.

### Riscos que mais de um membro levantou (primeiro)

1. **Confiança sem prova** (os três): zero pagantes, zero depoimentos, painel simulado com 0 de 18 e confiança como motivo de 11. Sem o piloto medido, não há o que mostrar.
2. **Vender o que não existe** (Ofertas, Produto): Pro (recuperação, lista de espera) e Clínica (multiprofissional) ainda não construídos.
3. **Fundador como gargalo e canal** (Monopólio, Produto): só convite, 3 configurações por semana, sem canal repetível.
4. **Diferencial copiável** (Monopólio, Ofertas): aprovar antes, preço aberto e configuração assistida são operação, não barreira.

### Condições (checklist para o resto do pacote)

- [ ] Piloto medido antes de abrir convites: tempo até a primeira resposta aprovada, primeiro agendamento sem o dono digitar, tempo de resposta (launch.md, semanas até 16/01).
- [ ] Ao menos 1 depoimento ou caso numérico do piloto, com autorização escrita, antes dos convites a colegas.
- [x] Conta mensal com a Meta somada na página de preços e na demonstração (pricing.md, landing-brief.md seção 8).
- [x] Sem taxa de implantação; testar sem pagar antes (pricing.md).
- [x] **Só vender o que está construído:** à venda agora apenas Essencial e Agenda; Pro e Clínica aparecem em /precos com preço e "em breve", sem assinatura até as funções existirem (pricing.md, decisão de linha).
- [ ] Nicho estreito primeiro: saúde e bem-estar solo, começando por quiropraxia e acupuntura via indicação do piloto, até 10 pagantes antes de abrir salões e estúdios (marketing.md).
- [ ] Definir o momento de valor dentro do teste (primeiro paciente agendado sem o dono digitar) e medir quantos testes chegam nele.
- [ ] Nomear o ativo que cresce com o uso (candidato: perguntas sem resposta viram base aprovada por especialidade, pesquisa 09 #5) e construí-lo depois do piloto.
- [ ] Um canal além do fundador (associação de quiropraxia/acupuntura ou indicação com incentivo) com custo por cliente estimado, antes de passar de 10 clientes.
- [ ] Refazer o painel simulado com o pitch v2 só como checagem; a decisão vem dos 10 convites reais (launch.md).
- [ ] Primeiros 6 pagantes (equilíbrio do CFO) antes de investir em novo nicho.

### Onde discordaram

- Ofertas quer **garantia de resultado** ("se não marcar X, não paga"); a decisão de preço preferiu o teste de 14 dias sem garantia extra, por custo e dúvida jurídica. Fica em aberto até o piloto medir um resultado que se possa garantir.
- Monopólio duvida da **durabilidade** mesmo com execução boa; Produto acha que a experiência bem feita no primeiro uso basta para o começo. Os dois concordam que o piloto decide.
- Produto pede **um plano e uma promessa**; a decisão manteve quatro planos no código e dois à venda, como meio-termo sem migração de banco.

### A versão mais forte que o conselho enxerga

Não é "recepcionista de IA para pequenos negócios". É: **a recepção de WhatsApp para quiropraxistas, acupunturistas e terapeutas que atendem sozinhos, configurada por quem entende a rotina deles, que marca no Google Agenda sem o dono digitar e prova isso no primeiro dia do teste.** Um nicho, um plano principal (Agenda), uma promessa medida no piloto e contada por um colega. Ampliar para salões e clínicas só depois de 10 pagantes no nicho. É mais estreita que a proposta original, de propósito.

## The competition

Pesquisa refeita em 25/11/2026 em páginas públicas, sem cadastro. Cada fato abaixo foi "lido em 25/11/2026" na página linkada; "não verificado" = página bloqueada, sem preço ou só fonte secundária. Tabela completa em `competitors.csv`. Base anterior: `docs/research/04-concorrentes-ui-free-tiers.md` (24/11/2026).

### Mapa (ordenado por proximidade)

| Concorrente | Tipo | Preço do item comparável (1 profissional, WhatsApp + IA) | Frase de posicionamento |
|---|---|---|---|
| [JaAtende](https://www.asaas.com/c/xa5apw80kv4zeih4) | direto | R$ 397/mês (1 profissional); R$ 497 (2). Só página de cobrança Asaas, secundário | n/d |
| [Cloudia](https://www.cloudia.com.br/) | direto | mascarado ("--"); "a partir de R$ 500" só em reclamação (pesquisa 04) | "Sua clínica pode estar perdendo pacientes sem perceber" |
| [Botconversa](https://www.botconversa.com.br/) | direto (genérico) | R$ 189 Starter; R$ 199 Pro + API Oficial (anual) | "Seu WhatsApp atendendo, qualificando e vendendo 24 horas por dia" |
| [GPT Maker](https://gptmaker.ai/) | direto (genérico) | R$ 147 / R$ 497 / R$ 997 | texto da página corrompido: não verificado |
| [Zaia](https://zaia.app/) | direto (genérico) | R$ 250 por slot (R$ 125 no anual) | "Infraestrutura para rodar um negócio de Agentes de IA" |
| [Clinicorp](https://www.clinicorp.com/) | indireto | R$ 149,90 / R$ 369,90 (sistema); IA sob consulta | "O melhor software odontológico com IA para clínicas e consultórios" |
| [Simples Dental](https://www.simplesdental.com/planos-e-precos) | indireto | R$ 149,90 / 249,90 / 349,90 (de-preço); secretária IA à parte, sem preço | n/d |
| [iClinic](https://iclinic.com.br/precos/) | indireto | R$ 99 a R$ 299 por profissional; IA "inclusa", sem secretária no WhatsApp descrita | "Um plano para cada momento da sua clínica" |
| [Kommo](https://www.kommo.com/br/preco/) | indireto | US$ 20 / 30 / 45 por usuário; agente IA do Avançado em diante | n/d |
| [Tidio](https://www.tidio.com/pricing/) | indireto | US$ 33 / a partir de US$ 63 | n/d |
| [Trinks](https://www.trinks.com/) | indireto | preço não exibido | "Encontre e agende serviços de beleza e bem-estar." |
| Substitutos | | secretária, WhatsApp Business, agenda manual | n/d |

Não verificados nesta rodada: Feegow, Zenvia, Blip, Agendor, Secretaria.io (só Hotmart, sem preço na busca), Dr. IAgenda (página bloqueada). Dealism citado em busca a R$ 39/mês (secundário, não aberto).

### Faixa de preço do item comparável (plano de entrada, 1 profissional, WhatsApp + IA, mensal)

Itens: GPT Maker R$ 147, Botconversa R$ 199, Zaia R$ 250, JaAtende R$ 397 (secundário).
- Baixo: R$ 147. Mediana: cerca de R$ 225. Alto: R$ 397 (R$ 497 a R$ 800 em IA de clínica: Cloudia/Cliniq, secundário, pesquisa 04).
- Nossos R$ 197/297/497/697: o plano de entrada fica na mediana, os demais acima do mercado verificado. Sistemas de gestão (iClinic R$ 99 a R$ 169) não são comparáveis: sem secretária IA no WhatsApp.

### Taxa de implantação, teste e profissional adicional no mercado

| Concorrente | Implantação | Teste | Profissional/usuário adicional |
|---|---|---|---|
| Cloudia | não encontrado; implantação feita por eles (pesquisa 04) | não encontrado | Pro inclui 5 atendentes; extra não informado |
| Botconversa | "Sem taxa de adesão e sem fidelidade" | sem teste; reembolso 7 dias (mensal) ou 30 (anual) | Starter até 5; Pro ilimitados; sem preço |
| GPT Maker | não encontrado | 7 dias grátis | agentes e operadores fixos por plano; sem preço de extra |
| Zaia | não encontrado | 7 dias sem cartão | slot extra pelo mesmo preço por slot |
| Clinicorp | não encontrado; migração em 3 dias úteis (pesquisa 04) | só "demonstração gratuita" | usuários "ilimitados"; sem preço |
| Simples Dental | não encontrado | 7 dias sem cartão | não encontrado |
| iClinic | nenhuma ("livre de taxas de entrada"); migração grátis | 5 dias sem cartão | preço é por profissional; acima de 5, orçamento |
| JaAtende | "Setup grátis na promoção" (implica taxa fora dela) | não encontrado | 2º profissional no plano Clínica; do 3º, sob proposta |
| Kommo | não encontrado | 14 dias sem cartão | por usuário, US$ 20 a 45 |
| Tidio | não encontrado | 7 dias | até 10 assentos; sem preço de extra |
| Trinks | não encontrado | 5 dias | não encontrado |

Leitura para o preço: ninguém verificado cobra implantação aberta; o padrão é "sem taxa" e teste de 5 a 14 dias (nosso teste de 14 dias fica no topo). Profissional adicional é cobrado por profissional nos sistemas de gestão (R$ 99 a R$ 299) e vira "sob proposta" nas ofertas de IA; preço aberto por profissional extra seria diferencial.

### Mapa de posicionamento (texto)

Eixo 1: especialista em saúde (esquerda) a genérico (direita). Eixo 2: preço aberto e autoatendimento (baixo) a cotação comercial (alto).

- Cloudia: saúde, cotação, implantação feita por eles (alto, esquerda).
- Clinicorp, Simples Dental: saúde odonto, IA como módulo à parte (alto/médio, esquerda).
- iClinic, Trinks: gestão, sem IA de conversa (médio, esquerda).
- Botconversa, GPT Maker, Zaia, Kommo, Tidio: genéricos, preço aberto, cliente monta o fluxo (baixo, direita).
- JaAtende: saúde, preço aberto, mas só link de cobrança e sem site localizado (baixo/médio, esquerda).
- Espaço vazio: negócio pequeno de hora marcada, preço aberto, implantação assistida, IA pronta para agendar.

### Queixas públicas (1 a 3 estrelas / reclamações)

Limite: o Reclame Aqui bloqueou a leitura direta (HTTP 403). Contagens abaixo vêm dos títulos de reclamações achados em busca em 25/11/2026 (amostra, não o total). Nenhuma página da Capterra ou do Google Play foi localizada para estas empresas. Citações literais = títulos das reclamações.

**Cloudia** (sem nota; 13 reclamações jan-jun/2026, resposta média 4 dias; [lista](https://www.reclameaqui.com.br/empresa/cloudia/lista-reclamacoes/))
1. Implantação lenta ou não entregue: 4. "Serviço de Secretária por IA não entregue após um mês e suporte demorado no WhatsApp" ([link](https://www.reclameaqui.com.br/cloudia/servico-de-secretaria-por-ia-nao-entregue-apos-um-mes-e-suporte-demorado-no-whatsapp_st_d2mZjR_3GbO1H/)); "Cloudia: Falta de Retorno e Múltiplos Erros na Implementação" ([link](https://www.reclameaqui.com.br/cloudia/cloudia-falta-de-retorno-e-multiplos-erros-na-implementacao_dw1wSJKJjEha1cH7/)).
2. Suporte demorado: 3. "Cloudia com erros no fluxo e informações incorretas, suporte demorado e cliente insatisfeito" ([link](https://www.reclameaqui.com.br/cloudia/cloudia-com-erros-no-fluxo-e-informacoes-incorretas-suporte-demorado-e-cliente-insatisfeito_pxkcw1IdoDBKprsi/)).
3. Robô errando informação: 2 (fino). "Problemas recorrentes no funcionamento do robô da Cloudia" ([link](https://www.reclameaqui.com.br/cloudia/problemas-recorrentes-no-funcionamento-do-robo-da-cloudia_g6-H9TlpQxSmSKF0/)).
4. Reembolso recusado: 1 (fino). "...não entrega o serviço, não dá suporte e se recusa a devolver o dinheiro" ([link](https://www.reclameaqui.com.br/cloudia/empresa-de-ia-para-consultorios-nao-entrega-o-servico-nao-da-suporte-e-se-recusa-a-devolver-o-dinheiro_u2gZwd5NzZL_0x-C/)).

**Clinicorp** (nota 8,3 de 10, resposta média 9 dias; [lista](https://www.reclameaqui.com.br/empresa/clinicorp/lista-reclamacoes/))
1. Suporte ruim ou lento: 4. "Indignação com Suporte Precário e Módulo de Negativação Ineficiente - Clinicorp" ([link](https://www.reclameaqui.com.br/clinicorp/indignacao-com-suporte-precario-e-modulo-de-negativacao-ineficiente-clinicorp_WlzRqE6qLL7D4pN1/)).
2. Falha de sistema/atualização: 1 (fino). "Atualização repentina interrompeu o acesso ao sistema em computadores mais antigos" ([link](https://www.reclameaqui.com.br/clinicorp/atualizacao-repentina-interrompeu-o-acesso-ao-sistema-em-computadores-mais-antigos_aMj9oeZK3zjECMrJ/)).

**Botconversa** (sem nota localizada)
1. Instabilidade e bot que falha: 3. "Problemas constantes com o bot de conversa" ([link](https://www.reclameaqui.com.br/botconversa/problemas-constantes-com-o-bot-de-conversa_VnN6ed5Me9-rIsEg/)); "Decepção Após Atualização do Sistema" ([link](https://www.reclameaqui.com.br/botconversa/decepcao-apos-atualizacao-do-sistema_7Sh50ff-m8lmJk61/)).
2. Arrependimento de compra: 1 (fino). "se fosse hoje eu nao compraria o bot conversa" ([link](https://www.reclameaqui.com.br/botconversa/se-fosse-hoje-eu-nao-compraria-o-bot-conversa_Wp7JcqT0DCft6nUT/)).
3. Propaganda enganosa: 1 (fino) ([link](https://www.reclameaqui.com.br/botconversa/propaganda-enganosa_HnzALqU48td68wfP/)).

iClinic: nota 6,4 e 79 reclamações (pesquisa 04, 24/11/2026; não reaberto). GPT Maker, Zaia, JaAtende, Kommo, Tidio, Trinks: não verificado.

Temas, em ordem: (1) implantação lenta ou não entregue, (2) suporte demorado, (3) robô errando ou instável.

### A lacuna

Há lacuna, e é a mesma da rodada anterior, agora com preços relidos: quem atende sozinho num negócio de hora marcada encontra IA de clínica por cotação com implantação reclamada (Cloudia), chatbot genérico para montar sozinho (Botconversa, GPT Maker, Zaia) ou gestão sem secretária IA (iClinic). JaAtende é o mais próximo (preço aberto, 1 profissional), mas sem site localizado. Ninguém verificado combina preço aberto, implantação assistida e IA já pronta para agendar. Continua hipótese a validar com clientes fora da saúde.

### A ameaça

Cloudia, Botconversa e Clinicorp podem lançar um plano "solo" barato; Botconversa já tem R$ 199 com API oficial. Defesa: implantação assistida (maior queixa do mercado), "aprovar antes de enviar", preço fechado com profissional extra aberto e foco em negócio pequeno.

## The buyer panel

**0 buy · 18 pass** (0% buy) out of 18 simulated buyers. Seed 594702, so the same cards can be dealt again.

2 of 20 buyers have no valid answer and are left out: P019 (missing), P020 (missing).

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Clínica ou espaço com 2 a 4 profissionais e secretária (faturamento mensal em R$) | 5 | 0%  (thin) |
| Autônomo de saúde e bem-estar que atende sozinho (faturamento mensal em R$) | 8 | 0% |
| Dono de salão, estúdio ou estética pequeno (faturamento mensal em R$) | 5 | 0%  (thin) |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Responde tudo pelo celular | 5 | 0%  (thin) |
| Compra por indicação | 3 | 0%  (thin) |
| Ama ferramenta nova | 2 | 0%  (thin) |
| Desconfiado de robô | 3 | 0%  (thin) |
| Caçador de preço | 2 | 0%  (thin) |
| Tem secretária ou ajudante | 3 | 0%  (thin) |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $40,000 and up | 6 | 0%  (thin) |
| under $18,000 | 6 | 0%  (thin) |
| $18,000 to $40,000 | 6 | 0%  (thin) |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 11 | "A ideia de uma recepcionista de IA no meu WhatsApp, o mesmo número onde eu falo com paciente, me deixa com o pé atrás. Não sei o total que vou pagar no fim do mês com a Meta somada ao plano, e não fecho nada assim." (P001) · "Eu já respondo o WhatsApp no celular entre um atendimento e outro e dou conta. Não confio que uma IA fale com meus pacientes sem eu ver o que ela escreveu, e já pago um sistema de agenda, então não sei o que isso acrescenta." (P002) |
| habit | 4 | "Eu atendo sozinha e já dou conta do WhatsApp entre um atendimento e outro, mesmo que seja corrido. Não quero mexer na forma como eu trabalho agora nem aprender mais um sistema, e uma recepcionista de IA no meu número parece coisa que eu ia ter que ficar vigiando." (P006) · "Eu compro por indicação. Ninguém da minha área recomendou isso, então não tenho por que trocar a rotina. Minha primeira reação é que não quero aprender mais um sistema." (P014) |
| price | 3 | "Com 2 a 4 profissionais e a secretária, o plano Agenda mais a implantação já pesam demais para mim. Além disso, não confio em recepcionista de robô falando com meus pacientes; quem marca e responde quero que seja gente." (P010) · "Eu sei que perdi cliente por responder no dia seguinte, mas R$ 497 de implantação mais R$ 197 por mês pesa muito pra quem fatura pouco. E meus clientes preferem falar com gente, não com um robô no WhatsApp." (P012) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |

### What would flip a no

- Um exemplo real de conta mensal com o plano Agenda, a Meta e as conversas a mais já somados, e um teste em que eu possa ver a IA respondendo antes de pagar a implantação.
- Ver outro autônomo de saúde, da minha área, usando por dois meses e dizendo que perdeu menos pacientes e que não precisou ajustar nada depois.
- Uma colega de profissão que já usa me contar que funciona na prática e que ela não perdeu nenhum paciente com a IA respondendo.
- Ver funcionando com o meu número e a minha agenda, com clientes reais aceitando bem o atendimento e sem eu precisar revisar cada resposta.
- Ver uma clínica parecida usando por uns meses, com resultado comprovado (menos faltas ou mais horários preenchidos), e poder testar sem pagar a implantação.
- Se eu visse que a agenda dela me tira de verdade horas de WhatsApp por semana, com o meu número, sem eu precisar mexer em nada e com um período de teste sem risco.
- Ver dez ou quinze conversas reais de outro profissional da minha área, com agenda marcada certinha, antes de pagar.
- Ver outro salão ou estúdio parecido com o meu usando e com as clientes elogiando, sem reclamação, e poder cancelar sem multa logo no começo.
- Testar de graça e ver na prática que ela só responde com o preço e o horário que eu cadastrei e que nada sai sem eu aprovar.
- Ver funcionando de verdade por um mês, com preço menor ou sem a taxa de implantação, e poder assumir a conversa sempre que quiser sem perder nada.
- Ver a IA atendendo de verdade no meu número, com a minha agenda e os meus preços, e eu aprovando cada resposta por um tempo sem nenhum erro.
- Testar com meus próprios clientes por uns dias, sem pagar a implantação antes, e ver que os pacientes não percebem que é robô.

18 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

Base: painel SIMULADO de 20 compradores (18 respostas válidas, `panel/results.md`), curva de preço (`pricing-curve.md`), concorrentes relidos em 25/11/2026 (`competitors.md`) e CFO (`cfo.md`). Preço de comprador simulado escolhe o que testar; não prova nada. Valores em R$ (as ferramentas imprimem "$").

### 1. O que os compradores simulados disseram

- **0 compram, 18 passam.** Motivos: confiança 11, hábito 4, preço 3. O bloqueio principal é confiança ("não confio que uma IA fale com meus pacientes sem eu ver"), não preço.
- Van Westendorp (simulado): faixa aceitável **R$ 89,60 a R$ 249,91**; menor resistência R$ 97,65; indiferença R$ 150,17. Medianas: barato R$ 127, começa a ficar caro R$ 220, caro demais R$ 297.
- Leitura honesta: o Agenda (R$ 297) fica acima da faixa simulada; o Essencial (R$ 197) fica dentro.

### 2. O que o mercado cobra (lido em 25/11/2026)

Plano de entrada com WhatsApp e IA, 1 profissional: GPT Maker R$ 147, Botconversa R$ 199, Zaia R$ 250, JaAtende R$ 397 (secundário). Mediana ~R$ 225. **Ninguém verificado cobra implantação** (Botconversa: "sem taxa de adesão"; iClinic: "livre de taxas de entrada"). Teste de 5 a 14 dias. Profissional extra: R$ 99 a R$ 299 por profissional nos sistemas de gestão; "sob proposta" nas ofertas de IA.

### 3. O que o negócio precisa (CFO)

Custo variável por cliente-mês (perfil médio): R$ 52,30 (IA R$ 33,51 + cobrança R$ 1,99 + imposto estimado R$ 16,80). Fixo R$ 1.150/mês. Equilíbrio: 6 clientes pagantes.

| ticket médio | margem no plano (30 clientes) |
|---|---:|
| R$ 280 (base) | 68% |
| R$ 250 | 64% |
| R$ 247 | 63% |

Qualquer preço da faixa testada paga a operação: o que decide a viabilidade é a confiança, não o preço.

### 4. Decisões

| Item | Decisão | Por quê |
|---|---|---|
| **Mensalidades** | **Mantidas:** Essencial R$ 197, Agenda R$ 297, Pro R$ 497, Clínica R$ 697; excedente R$ 0,40 / R$ 0,35 | Preço explica 3 de 18 "não"; confiança explica 11. Cortar sem dado real tira receita e não resolve o motivo principal. Testar R$ 247 no Agenda com compradores reais (item 6) antes de mexer nas mensalidades |
| **Implantação** | **Sai.** R$ 0; a configuração assistida (o operador preenche serviços, horários e base a partir de áudio ou vídeo do dono, que só aprova) vem incluída em todo plano | Nenhum concorrente verificado cobra; metade das frases de "o que me faria mudar" pede testar sem pagar implantação; a maior queixa do mercado é implantação (Cloudia). Custo real: horas do fundador, limitadas pelo convite |
| **Teste** | **Mantido:** 14 dias a partir da conexão do WhatsApp, até 100 conversas, um por CPF/CNPJ | Já está no topo do mercado (5 a 14 dias) e responde a "quero ver funcionando antes de pagar" |
| **Linha de planos** | **4 planos no código e em /precos (sem migração do enum `Plan`), mas só 2 à venda agora: Essencial e Agenda.** Pro e Clínica aparecem com preço e "em breve", sem assinatura, até as funções existirem (condição do conselho, `board.md`). Agenda é o destaque | Vender recurso não construído quebra a confiança, que é o bloqueio principal. Simplificar o código exigiria migração de banco e de termos. Rever com 10 pagantes: se ninguém escolher Essencial, fundir Essencial e Agenda |
| **Profissional adicional** | **Clínica inclui 2 profissionais; do 3º em diante, R$ 147/mês por profissional, com +250 conversas de franquia cada.** Essencial, Agenda e Pro: 1 profissional, sem adicional; para o 2º, sobe para Clínica | Mercado: R$ 99 a R$ 299 por profissional em gestão; JaAtende cobra R$ 100 a mais pelo 2º. R$ 147 fica no meio e cobre o custo (250 conversas ≈ R$ 21 de IA, spec 07). Preço aberto vira diferencial. Só se vende quando o multiprofissional existir |
| **Garantia** | Sem garantia de devolução além da lei; cancelamento vale até o fim do período pago | O teste de 14 dias já cobre o risco; evita custo e dúvida jurídica |

### 5. Escada

Essencial R$ 197 (só responde; para quem não usa Google Agenda) → **Agenda R$ 297 (marca e lembra; o plano principal)** → Pro R$ 497 (recuperação de interessados, lista de espera, sinal Pix: "em breve") → Clínica R$ 697 (2 profissionais e equipe, "em breve"; R$ 147 por profissional a partir do 3º).

### 6. Oferta de abertura e teste com compradores reais

- **Abertura (convite):** condição de fundador para os 10 primeiros pagantes: mensalidade travada por 12 meses, em troca de feedback e de autorização por escrito para usar números reais. Sem "de R$ X por R$ Y".
- **Teste de preço:** nas 10 primeiras conversas de venda, oferecer o Agenda a R$ 297 para metade e R$ 247 para a outra metade. Medir quem conecta o WhatsApp no teste e quem paga no dia 15. Se R$ 247 converter pelo menos o dobro, mudar `plans.ts`.

### 7. Objeções de preço do painel (simuladas, para o marketing responder)

1. "Não sei o total que vou pagar no fim do mês com a Meta somada ao plano, e não fecho nada assim." (P001)
2. "R$ 497 de implantação mais R$ 197 por mês pesa muito pra quem fatura pouco." (P012)
3. "O plano Agenda mais a implantação já pesam demais para mim." (P010)

Resposta: a implantação saiu, e a página de preços mostra uma conta mensal de exemplo com a Meta somada.

### Onde a decisão entra

`packages/core/src/plans.ts` (profissional adicional), `apps/site` (implantação removida), `docs/spec/01` e `07`. As edições necessárias em `docs/legal` (fora deste PR) estão listadas no PR.

## The offer

Base: painel SIMULADO (`panel/results.md`, 0 de 18 compram; confiança 11, hábito 4, preço 3), queixas do mercado (`competitors.md`), números do CFO (`cfo.md`) e decisões de preço (`pricing.md`). Método: a lente de Ofertas em `founder-board/lenses.md` (resumo de um framework publicado, não palavras do autor).

### Lista de problemas do comprador (palavras do painel e do mercado)

Antes de comprar:
1. "Não confio que uma IA fale com meus pacientes sem eu ver o que ela escreveu."
2. "E se ela inventar preço ou marcar errado?"
3. "Não sei o total do mês com a Meta somada ao plano."
4. "R$ 497 de implantação mais a mensalidade pesa."
5. "Ninguém da minha área recomendou."
6. "Já uso WhatsApp Business e dou conta."
7. "Meus clientes preferem falar com gente."
8. "Vou ter que trocar de número?"
9. "Meus pacientes contam coisas pessoais; é seguro?"
Durante a implantação:
10. "Não quero aprender mais um sistema."
11. "Implantação demora e não entregam" (queixa n.º 1 da Cloudia).
12. "Vou ter que digitar tudo."
13. "E se o suporte sumir?" (queixa n.º 2 do mercado)
Depois:
14. "Vou ter que vigiar o robô o tempo todo."
15. "Como sei que valeu a pena?"
16. "E se eu quiser parar?"
17. "E se o paciente perceber que é robô e não gostar?"

### Soluções, pontuadas

| # | Solução | Valor (1-5) | Custo (1-5) | Fica? |
|---|---|---:|---:|---|
| 1, 2, 14 | Começa em "aprovar antes de enviar"; preço e horário só do cadastro; passa a automático quando o dono quiser | 5 | 1 | sim, núcleo |
| 1, 2 | Simulador com os dados do dono antes de ligar, com 3 perguntas sugeridas ("quanto custa?", "tem horário amanhã?", "onde fica?") | 5 | 1 | sim, bônus |
| 3 | Conta mensal de exemplo com a Meta somada, na página de preços e no onboarding | 4 | 1 | sim |
| 4, 10, 11, 12 | Configuração feita com você por áudio, sem taxa; pronto em um dia útil depois do áudio (meta a medir no piloto) | 5 | 3 (horas do fundador) | sim, bônus |
| 5 | Piloto real documentado (só com autorização escrita) | 4 | 2 | depois do piloto |
| 6 | Mesmo número (coexistência); o dono continua no app | 5 | 1 | sim, núcleo |
| 7, 17 | Assumir com um toque; identidade configurável; diz a verdade se perguntado | 3 | 1 | sim |
| 9 | Queixa fica só na mensagem; nada de saúde em cadastro ou relatório; LGPD por escrito | 4 | 1 | sim |
| 13 | Suporte pelo WhatsApp com o fundador nos primeiros 30 dias | 4 | 3 | sim, bônus, limitado pelo convite |
| 15 | Tela Resultados: respostas fora do horário, agendamentos feitos, tempo de resposta (sem promessa de ganho) | 4 | 2 | sim |
| 16 | Sem fidelidade; usa até o fim do mês pago | 4 | 1 | sim |
| — | Garantia de devolução de 30 dias | 3 | 2 | **não**: o teste de 14 dias cobre o mesmo medo sem custo e sem dúvida jurídica |

### A oferta: "Recepção no seu WhatsApp, configurada com você"

- **Núcleo:** recepcionista com IA no seu número de WhatsApp que responde na hora, marca no Google Agenda e lembra o paciente. Começa com você aprovando cada resposta. Plano Agenda, R$ 297/mês.
- **Bônus 1, configuração feita com você:** você manda um áudio; nós preenchemos serviços, preços, horários e perguntas frequentes; você só aprova. Sem taxa (antes era R$ 497, que nunca foi cobrado: não usar como âncora).
- **Bônus 2, veja antes de ligar:** respostas de exemplo com os seus dados no simulador, antes de qualquer paciente falar com o assistente.
- **Bônus 3, 30 dias de suporte direto** com quem construiu o produto, pelo WhatsApp.
- **Risco:** teste grátis de 14 dias a partir da conexão (até 100 conversas). Sem fidelidade.
- **Urgência verdadeira:** entrada só por convite; vagas limitadas a quantas configurações assistidas o fundador consegue fazer por semana (número a fixar pelo dono; suposição: 3 por semana). Sem contador falso.

Custo dos bônus: horas do fundador (estimativa: 1 a 2 h por cliente na configuração e 1 h/mês de suporte no primeiro mês). Não entra como custo em dinheiro no CFO; é o que limita o ritmo de entrada (`ops.md`).

### Equação de valor (1 a 10, estimativa minha)

| Elemento | Antes (pitch v1) | Depois | O que move |
|---|---:|---:|---|
| Resultado desejado | 6 | 6 | igual |
| Probabilidade percebida | 3 | 6 | aprovar antes, simulador com os dados do dono, teste sem pagar nada |
| Tempo até o resultado | 4 | 6 | configuração por áudio, pronto em um dia útil (meta) |
| Esforço e sacrifício | 4 | 7 | sem implantação paga, sem digitar, mesmo número |

### Re-teste

**Não rodei o painel de novo** com `pitch.md` v2 (o v1 está em `pitch-v1.md`). Motivo: o painel v1 mostrou que o bloqueio é confiança, e confiança não se resolve com texto de oferta para compradores simulados (que tendem a concordar). O re-teste certo é com donos reais: apresentar a oferta v2 nas 10 conversas de campo (`launch.md`) e anotar o que travou. Suposição registrada.

### Conformidade

Sem promessa de mais clientes, faturamento ou resultado clínico. Sem depoimento, número ou logotipo de cliente que não exista. Não é parecer jurídico.

## The numbers

Valores em R$ (a ferramenta imprime "$"). "Cliente-mês pagante a day" = clientes pagantes no mês (dias por mês = 1). Fontes de cada número em `cfo-sources.md`. Projeção, não resultado. Não é aconselhamento financeiro, fiscal ou jurídico: um contador deve checar regime tributário, pró-labore e impostos antes de qualquer dinheiro mudar de mão.

### Nota do CFO

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

## Unit economics: Consultório Aberto (assinatura mensal por cliente)

Every number below comes from the input file. Nothing is looked up or guessed.

### One cliente-mês pagante

| line | per cliente-mês pagante |
| --- | ---: |
| Price | $280.00 |
| IA + transcrição + mensagens utility, perfil médio 400 conversas (spec 07) | -$33.51 |
| Taxa de cobrança Asaas por boleto/Pix (spec 07, não verificada) | -$1.99 |
| Imposto sobre receita, Simples Nacional ~6% (estimativa, confirmar com contador) | -$16.80 |
| **Contribution** (what each cliente-mês pagante leaves to pay the fixed costs) | **$227.70** (81%) |

### The margin that matters

Fixed costs: $1,150 a month (Outros custos fixos: domínio, e-mail, monitoramento (spec 07, US$ 100 a R$ 5,50) $550, Servidor Postgres próprio + backup R2 (estimativa, sem cotação) $300, Contador (estimativa, sem cotação) $300).

- **Break-even: 6 cliente-mês pagantes a day.** Below that you lose money every month.
- **Profit margin at your plan** (30 a day): **68%** of every sale, after every cost.
- Capacity: 60 a day.

### Year 1, month by month

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

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 68% | 6 | $17,623 |
| Price -10% | 64% | 6 | $13,759 |
| Volume -20% | 64% | 6 | $11,338 |
| Unit costs +15% | 65% | 6 | $16,540 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.

## Marketing

Base: `panel/results.md` (simulado: 0 de 18 compram; confiança 11, hábito 4, preço 3), `competitors.md` (relido em 25/11/2026), `offer.md`, `pricing.md`, `cfo.md`. Nenhum dado real de compra. Nome decidido pelo dono: **Consultório Aberto**. Briefing da landing page em `landing-brief.md`.

### Posicionamento

Modelo: Para <segmento>, que <problema>, <negócio> é a <categoria> que <lacuna>, ao contrário de <alternativa>.

1. Para o profissional de saúde e bem-estar que atende sozinho e perde paciente porque não consegue responder o WhatsApp durante o atendimento, o Consultório Aberto é a recepcionista com IA que responde e marca no seu Google Agenda, no mesmo número, começando com você aprovando cada resposta, ao contrário dos chatbots que você precisa montar sozinho e vigiar.
2. Para quem já responde tudo pelo celular, o Consultório Aberto é a recepção que marca no seu Google Agenda enquanto você atende, configurada com você em um áudio, ao contrário das IAs de clínica vendidas por cotação e com implantação demorada.
3. Para o dono de negócio de hora marcada, o Consultório Aberto transforma conversa em horário marcado sem trocar seu número, ao contrário de sistemas de gestão com IA vendida à parte.

**Recomendada: a 1.** Ataca o motivo n.º 1 dos "não" do painel (confiança: 11 de 18), diz o resultado em palavras do comprador e casa com o nome (consultório). O segmento-alvo inicial é saúde e bem-estar solo (quiropraxia, acupuntura, fisioterapia, psicologia, nutrição), porque o piloto e as indicações vêm dali; salão e estética ficam para depois do piloto. O painel não mostrou segmento que compra mais (todos 0%), então a escolha é pelo canal de indicação, não por dado de compra. Suposição registrada.

**Frase curta (título):** "Seu WhatsApp responde e marca na sua agenda enquanto você atende."
**Linha de apoio:** "No mesmo número. Nada sai sem você aprovar, até você querer."

### Canais (começar com 2)

| Canal | Por que serve | Custo | Como saber que funcionou |
|---|---|---|---|
| Indicação do piloto e de colegas de profissão | O painel repetiu "só compro se um colega usar" (P003, P014); confiança é o bloqueio | Tempo | Demonstrações marcadas por indicação |
| Conversa de demonstração ao vivo (o profissional manda mensagem para um número de teste com dados fictícios) | Mostra o produto respondendo; responde a "quero ver antes" | Tempo; número de teste | Quem pede o convite depois da demonstração |
| Instagram do fundador (bastidores e conversas de exemplo com dados fictícios) | Profissionais autônomos estão lá | Tempo | Mensagens diretas pedindo demonstração |

Fora por enquanto: anúncio pago (sem verba e sem prova), Google Ads, TikTok, compra de listas. Reavaliar com 10 pagantes.

### Calendário (dia 0 = abertura do convite após o piloto; datas relativas)

| Dia | Canal | Ação e mensagem |
|---|---|---|
| -14 | Campo | 5 conversas com profissionais indicados pelo piloto: "o que acontece com a mensagem que chega enquanto você atende?" |
| -12 | Campo | Mais 5 conversas; anotar objeções literais |
| -10 | Instagram | Post: o problema ("mensagem sem resposta às 21h") |
| -7 | Site | Landing nova no ar (briefing em `landing-brief.md`) com "Pedir convite" |
| -5 | Instagram | Vídeo: conversa de exemplo com dados fictícios, aprovação com um toque |
| -3 | Campo | Demonstração ao vivo para 3 interessados |
| 0 | Todos | Abertura dos convites (até 3 configurações por semana) |
| +1 a +7 | Instagram | Bastidores: como é a configuração por áudio |
| +3 | Campo | Pedir ao piloto 2 indicações |
| +7 | Instagram | Primeira semana do piloto, só com número real e autorização escrita |
| +10 | Campo | Demonstração para os indicados |
| +14 | Instagram | Perguntas que os profissionais fizeram |
| +16 | Campo | Revisar objeções e o teste de preço R$ 247 x R$ 297 |

Sem novidade: bastidores, pergunta da semana, uma regra do produto explicada ("preço vem do seu cadastro").

### Dez ganchos (cada um responde a uma objeção; só o que o produto faz)

1. "Você atende. Quem responde o WhatsApp?" (perder paciente)
2. "Nada sai sem você aprovar. Até você querer." (confiança)
3. "Preço e horário vêm do seu cadastro, não da cabeça da IA." (erro)
4. "Seu número continua o mesmo." (trocar número)
5. "Veja ela respondendo com os seus dados antes de ligar." (quero ver antes)
6. "Você manda um áudio. A gente configura. Você aprova." (aprender sistema)
7. "Sem taxa de implantação. 14 dias grátis." (preço)
8. "A conta do mês, com a Meta, antes de você assinar." (custo total)
9. "Você assume a conversa com um toque." (pacientes preferem gente)
10. "A queixa do paciente fica só na conversa." (privacidade)

### Orçamento e teto de custo por cliente

Verba paga: **zero** até 10 pagantes (suposição conservadora; o dono não definiu verba). Teto calculado, não meta: contribuição de R$ 227,70 por cliente-mês (CFO) × 3 meses = **R$ 683** por cliente conquistado, enquanto não houver taxa de cancelamento medida.

### Três números por semana

1. Demonstrações feitas. 2. Testes com WhatsApp conectado. 3. Testes que viram pagantes no dia 15. Gatilho: duas semanas sem demonstração, ou 5 testes seguidos sem pagante, mudar a oferta ou o segmento.

### Regras

Sem depoimento, número, logotipo ou "antes e depois" que não exista. Frases do painel são pesquisa simulada, nunca citação de cliente. Sem prometer mais pacientes ou faturamento. Sem alegar ser pessoa. Saúde: sem promessa de resultado clínico. Parceria paga: avisar. Não é parecer jurídico.

## Brand

Substitui a análise de nome de `docs/brand.md` (que escolheu "Consultório Aberto"). Nada foi renomeado no código ou nos documentos existentes. A decisão é do dono.

### Critérios

Fácil de falar ao telefone e de digitar; funciona para saúde e para outros negócios de hora marcada; não parece nome de concorrente (Cloudia, Clinicorp, Clinia, Simples Dental, Botconversa); não se passa por pessoa (por isso, sem nome próprio tipo "Lia" ou "Clara"); evitar "Zap" e "WhatsApp" no nome (marcas de terceiros).

### Dez candidatos

| # | Nome | Estilo | O que diz / som / risco | Sinal de domínio (24-25/11/2026) |
|---|---|---|---|---|
| 1 | **Recepviva** | inventado (recepção + viva) | recepção que está sempre viva. Fala-se "re-cep-VI-va", fácil de ouvir. Risco: parecido com Vivo (telecom) em classes 9/38; "Recep" fica estranho para alguns | .com.br e .com sem registro no RDAP |
| 2 | **Boa Vez** | evocativo | "sua vez", a vez de ser atendido. Soa simpático; ambíguo ("boa vez"?) | .com.br e .com sem registro |
| 3 | **Agenda Vai** | descritivo-curto | a agenda anda sozinha. Claro; parece frase | .com.br e .com sem registro |
| 4 | Combinado | evocativo | "combinado!" fecha o horário; ótimo de falar. Termo comum: registro difícil e domínio já ocupado | ocupado |
| 5 | Marcaí | evocativo | "marca aí"; domínio .com.br ocupado | ocupado |
| 6 | Sua Hora | evocativo | ótimo, mas ocupado | ocupado |
| 7 | Vezzap | invenção | livre, mas contém "Zap" (risco de marca alheia) | livre, descartado por "Zap" |
| 8 | Porta Aberta | evocativo | continuidade de "Consultório Aberto"; ocupado | ocupado |
| 9 | Hora Viva | evocativo | .com.br ocupado | .com.br ocupado |
| 10 | Prima (Agenda Prima) | evocativo | "prima" sugere confiança familiar; fraco para negócio | .com.br e .com sem registro (nome fraco) |

### Lista curta (3)

#### 1. Recepviva (recomendado)

- Significado: a recepção que não fecha, em uma palavra; conecta com o posicionamento "recepcionista virtual". Funciona para salão, clínica, estúdio.
- Risco: a semelhança com "Vivo" (telecom, muito conhecida) pode gerar oposição em classes 9, 38 ou 42; o advogado deve avaliar. "Viva" pode soar como "pessoa" para alguém, mas não alega ser humano.
- Domínio: `recepviva.com.br` e `recepviva.com` sem registro no RDAP/DNS em 25/11/2026. É apenas um sinal.

#### 2. Boa Vez

- Significado: "é a sua vez", atendido sem fila. Amistoso e amplo.
- Risco: nome comum em português, pouco distintivo; pode existir marca igual em outra classe.
- Domínio: `boavez.com.br` e `boavez.com` sem registro no RDAP/DNS. Apenas um sinal.

#### 3. Agenda Vai

- Significado: a agenda se mexe sozinha. Direto.
- Risco: descritivo ("agenda"), registro mais fraco; soa como frase, e o ".com.br" é longo.
- Domínio: `agendavai.com.br` e `agendavai.com` sem registro no RDAP/DNS. Apenas um sinal.

**Por que Recepviva:** é o único dos três que fala "recepção", a promessa do produto, e é inventado, o que ajuda na distintividade da marca. O risco maior (Vivo) precisa de parecer do advogado antes de gastar com logo. Se o advogado desaconselhar, o plano B é Boa Vez.

### Checagens que o dono precisa concluir

Nada abaixo foi confirmado por advogado e nada está registrado até o dono registrar. Isto não é parecer jurídico.

| Item | Como | Link |
|---|---|---|
| Marca no INPI | Busca por marca (pesquisa de anterioridade) pelo nome e variações fonéticas. Classes de Nice a verificar: 9 (software), 35 (secretariado, serviços de agendamento comercial), 38 (telecomunicações e mensagens), 42 (software como serviço). Confirmar as classes com o advogado | https://busca.inpi.gov.br |
| Domínio .com.br | Consulta no Registro.br | https://registro.br/tecnologia/ferramentas/whois/?search=recepviva.com.br |
| Domínio .com | Consulta de registro | https://lookup.icann.org/en/lookup?name=recepviva.com |
| Instagram | **Não consigo verificar usuário de rede social de forma confiável** (bloqueiam consulta automática). Abrir e ver se existe | https://www.instagram.com/recepviva/ |
| TikTok, YouTube, X | Idem | https://www.tiktok.com/@recepviva, https://www.youtube.com/@recepviva, https://x.com/recepviva |

Repetir os links trocando `recepviva` por `boavez` e `agendavai` para os outros dois. Sinal de domínio: consultei o RDAP do Registro.br e da Verisign e o DNS; "sem registro" não garante disponibilidade (pode estar em reserva, em liberação ou ser registrado no intervalo).

Confusão com concorrente: nenhum nome da lista curta é parecido com Cloudia, Clinicorp, Clinia, Simples Dental ou Botconversa.

### Promessa, slogans e voz

- **Promessa:** Cliente respondido na hora, horário marcado e você no controle.
- **Slogans (3):** 1. "A recepção que não deixa cliente sem resposta." 2. "Conversa no WhatsApp vira horário marcado." 3. "Você atende, a recepção responde."
- **Voz:** direta, acolhedora e segura (como em `docs/brand.md`). Não diz que é pessoa; apresenta-se como assistente virtual, no modo `assistant`.
  - Antes: "Assistente de IA no WhatsApp para profissionais de saúde autônomos."
  - Depois: "Cliente respondido no WhatsApp e horário marcado, mesmo enquanto você atende."

### Visual

Continuar com o `DESIGN.md` e a paleta de `docs/brand.md` (azul-petróleo `#0B6E7A`, laranja-atenção `#B8480F`, tinta `#13191C`; contrastes AA já medidos lá) para não refazer o painel. Tipografia: Figtree (OFL). Logo: brief novo em torno de "balão de conversa que vira horário/relógio"; evitar cruz, robô, faísca de IA, verde do WhatsApp, e qualquer semelhança com o logo da Vivo (roxo, "V" e "o"). Conceitos de IA são conceitos; o logo final passa por designer.

Cinco pontos de contato: página inicial, onboarding, confirmação ao dono, primeiro post, resposta à primeira reclamação; mesmo roteiro de `docs/brand.md`, trocando "paciente" por "cliente" e "consultório" por "negócio".

### Segunda rodada (25/11/2026)

A primeira lista não convenceu. Critério novo: soar como algo que o brasileiro já fala ao marcar horário, ser fácil de soletrar ao telefone, sem "IA", "bot" ou "zap".

Consultei o RDAP de uns 80 nomes. Quase toda palavra comum já tem dono: marquei, encaixe, vaguinha, marca aí, atendi, tá marcado (.com.br), pode deixar, até lá, agendinha, combinado. Sobraram, com .com.br e .com sem registro:

| Nome | O que diz | Ao telefone | Risco |
| --- | --- | --- | --- |
| **Marcadinha** | "tá marcadinha", carinho e certeza. Uma palavra, escreve como fala | "marcadinha, tudo junto" | Diminutivo pode soar pouco sério para clínica; INPI: palavra comum, registro fraco sem logo |
| **Ficou Marcado** | É a frase que o assistente diz ao fechar. A promessa no nome | "ficou marcado, tudo junto" | Longo (13 letras) para ícone; descritivo, marca mais fraca |
| **Já Tem Vaga** | A pergunta que o paciente faz e o produto responde | "já tem vaga" | Fala do paciente, não do dono; frase, não nome |
| **Oi Vaga** | Curto, cumprimento de WhatsApp | "oi vaga" | **Oi** é marca de telecom (Oi S.A.), classe 38. Evitar sem parecer |
| **Recepviva** | Da primeira rodada, continua livre | "recepviva" | Parecido com Vivo |

**Recomendação: Marcadinha.** É a única que é uma palavra só, fala a linguagem do cliente final do pequeno negócio e cabe num ícone ("M"). Plano B: Ficou Marcado, como slogan ou nome.

Checar antes de decidir: INPI (https://busca.inpi.gov.br/pePI/) nas classes 9, 35, 38 e 42; Registro.br; Instagram e TikTok com o nome. Busca pública não é parecer; quem confirma é advogado de marcas, e nada está reservado até o registro.

#### Tá Marcado: descartado

`tamarcado.com.br` é de outra empresa desde 2020 e mostra no ar a "TáMarcado!", uma plataforma de agendamento online, que é o nosso segmento. `tamarcado.com` está à venda na Afternic. O risco de colisão é alto.

### Terceira rodada (25/11/2026)

Consultei mais 80 nomes. Com .com.br e .com sem registro, e sem produto de mesmo nome na busca web:

| Nome | Promessa | Observação |
| --- | --- | --- |
| **Agenda Cheinha** | o resultado que o dono quer | fala de ganho, não de ferramenta |
| **Confirmadinho** | o horário confirmado, sem falta | combina com o lembrete |
| **Marcadinha** | "tá marcadinha" | uma palavra |
| **Ninguém Falta** | ataca a falta | frase longa |
| **Atentinha** | a recepcionista atenta | persona |
| **Cliente Chega** | o cliente aparece | descritivo |
| **Marcadeira** | quem marca por você | soa a profissão |
| **Quem Marca** | "quem marca é ela" | ambíguo sozinho |
| **Recepçãozinha / Balcãozinho** | a recepção pequena | o "ç" e o "ã" atrapalham no domínio |

Livres apenas no .com.br: Prontinha, Recepcionando.

### Decisão (25/11/2026)

O dono manteve **Consultório Aberto**: as rodadas acima soaram leves demais. `consultorioaberto.com.br` e `.com` estavam sem registro nesta data, e a busca web não achou produto com esse nome (o mais próximo é Consultorio.me). Limite conhecido: o nome fala de saúde. Se o produto for para salão ou barbearia, revisitar o nome ou criar uma linha com outro nome.

#### Família "Sempre Aberto" (25/11/2026)

- **Sempre Aberto**: `sempreaberto.com.br` foi registrado em 30/08/2026 por pessoa física, com DNS na AWS e site fora do ar; pode ser projeto em andamento. Livres: `sempreaberto.com`, `.app.br`, `.ia.br`, `.net.br`, `sempreabertoapp.com.br`. A busca web não achou produto com esse nome; o mais próximo é o Atendente24h.
- Com .com.br e .com livres: Agenda Sempre Aberta, Consultório Sempre Aberto, Recepção Sempre Aberta, Porta Sempre Aberta, Aberto o Dia Todo (`abertotododia`), Aberto 24h (`abertoate24h`), Sempre Atendendo, Não Fecha Nunca.
- **Tamo Aberto**: descartado. `tamoaberto.com.br` está no ar desde 10/2026 como "Tamo Aberto: sua loja de delivery sem comissão", um SaaS para pequeno negócio vendido pelo WhatsApp e por link. É público vizinho e o nome é igual. Variações livres (.com.br e .com): Tamos Aberto, Estamos Abertos.
- **Marca AI / Marca Aí**: descartado. Já existem dois produtos com esse nome: "MarcaAí — Agende sua quadra" (`usemarcaai.com`, agendamento de quadras esportivas) e "Marca Aí — desafios e check-ins" (`marcaaiapp.com`). `marcaai.com.br` (desde 2013), `.com`, `.ia.br` e `.app.br` têm dono, e `marca.ai` está à venda na Spaceship. "Marca" também quer dizer brand, o que confunde a busca.

### Nota (25/11/2026): direção visual mudou

O dono manteve o nome **Consultório Aberto**. A direção visual do painel mudou para **grafite monocromático com jade** como única cor de assinatura (jade = "o assistente está aqui"), substituindo o azul-petróleo de 24/11. Fonte de verdade: `DESIGN.md`. Cores, tipografia e primeiras telas descritas acima neste arquivo que conflitem com `DESIGN.md` ficam valendo só como histórico; a landing nova segue `DESIGN.md` e `landing-brief.md`.

## Operations

Base: `offer.md`, `numbers.json`, `docs/spec/07`, `docs/research/09`, `piloto.md`. Um fundador sozinho opera tudo no começo. Regras e preços de fornecedores mudam: confirmar cada um antes de contratar. Não é parecer jurídico nem contábil.

### 1. O ciclo de cada dia (marcado com * o que o cliente vê)

1. Manhã: painel do operador: erros da noite, conversas que passaram para humano, custo de IA do dia contra a planilha (alerta se desvio > 30%, spec 07).
2. * Convites do dia: enviar link, acompanhar quem parou no onboarding (e-mail em 1 e 3 dias, RF-84).
3. * Configuração assistida: ouvir o áudio do novo cliente, preencher serviços, preços, horários e perguntas; mandar para aprovação (meta: 1 dia útil).
4. * Suporte pelo WhatsApp do fundador (clientes nos primeiros 30 dias primeiro).
5. Revisão de qualidade: amostra de conversas com nota ruim no juiz; ajustar base do cliente com aprovação dele.
6. * Cobrança: faturas vencidas (escada de aviso em 0, 3 e 7 dias, spec 05).
7. Fim do dia: backups verificados (alerta automático), filas do pg-boss vazias.

### 2. Fornecedores (custo por uso ou fixo)

| Insumo | Fornecedor | Preço | Onde confirmar |
|---|---|---|---|
| Modelos de IA | Vercel AI Gateway (uma chave) | por uso; estimado em `docs/spec/07` | página de preços da Vercel |
| Juiz de saúde e urgência | TypeSafe (Jev), chave própria | por uso; não cotado | documentação TypeSafe |
| WhatsApp | Meta Cloud API (coexistência); cliente paga no próprio cartão | 1.000 respostas de atendimento/mês grátis por número; utility ~R$ 0,035 (pesquisa 01) | developers.facebook.com, tabela de preços por país |
| QR code (alternativa) | WAHA (motor GOWS) em contêiner próprio | licença Plus não cotada | waha.devlike.pro |
| Banco | Postgres em servidor próprio + backup contínuo no R2 | servidor sem cotação (R$ 300 estimado); R2 por GB | provedor escolhido; cloudflare.com/r2 |
| Cobrança da assinatura | Asaas | R$ 1,99 por cobrança (spec 07, não verificado) | asaas.com/precos |
| Agenda | Google Calendar API | sem custo no volume previsto (não verificado) | console do Google Cloud |

Nenhum preço real diferente de `numbers.json` foi encontrado nesta rodada; o CFO não precisa ser refeito. Cotações pendentes: servidor, contador, advogado, licença WAHA.

### 3. Pessoas

| Fase | Quem | Horas por semana | Custo |
|---|---|---|---|
| Piloto e meses 1-3 (até ~5 clientes) | Fundador: produto, configuração, suporte, vendas | tudo | sem salário (fora do CFO) |
| Meses 4-12 (até 30 clientes) | Fundador + suporte 20 h/semana quando passar de 20 clientes | +20 h | não orçado; com 20 clientes a contribuição é ~R$ 4.550/mês, o que pagaria meio período (encargos variam: contador) |

Capacidade de entrada: até **3 configurações assistidas por semana** (suposição: 1 a 2 h cada mais acompanhamento). Esse é o limite real de crescimento no ano 1.

### 4. Rotinas

**A. Configuração assistida (por cliente)**
1. Cliente conecta o WhatsApp no onboarding (o teste começa a contar).
2. Pedir um áudio de até 5 minutos: serviços, duração, preços, pacotes, horários, endereço, como quer ser apresentado.
3. Preencher passos 3 e 4 do onboarding; pacotes viram resposta de conhecimento.
4. Rodar o simulador com as 3 perguntas padrão e mandar o resultado ao cliente.
5. Cliente aprova; ativar em "aprovar antes de enviar"; instalar o PWA e as notificações junto com ele.
6. Marcar retorno em 3 e 7 dias.

**B. Reclamação de paciente ou erro do assistente**
1. Assumir a conversa (o assistente pausa).
2. Avisar o cliente pelo WhatsApp em até 1 hora útil.
3. Achar a causa: dado do cadastro, base ou modelo. Corrigir com aprovação do cliente.
4. Registrar no histórico de incidentes, sem conteúdo de mensagem.

**C. Cancelamento**
1. Confirmar o cancelamento sem tentar reter com desconto.
2. Acesso segue até o fim do período pago.
3. Perguntar o motivo em uma linha; registrar.
4. Exportação e exclusão conforme a política de privacidade.

**D. Revisão semanal (segunda-feira)**
1. Custo real x planilha. 2. Testes ativos e dia de vencimento. 3. Objeções da semana. 4. Três números do marketing.

### 5. Ferramentas

Já decididas no projeto: Asaas (assinatura), Google Agenda, painel próprio (PWA), pg-boss, Sentry/PostHog se configurados. Contabilidade: contador com emissão de nota de serviço; escolher na contratação.

### 6. Licenças, registros e seguros (confirmar cada um)

- CNPJ e enquadramento (Simples Nacional, CNAE de software/SaaS): gov.br/empresas-e-negocios; contador.
- Emissão de nota fiscal de serviço (NFS-e) no município da sede: prefeitura.
- Marca "Consultório Aberto" no INPI: busca de anterioridade antes de investir em marca (gov.br/inpi).
- LGPD: encarregado nomeado, política de privacidade e contrato de operador (rascunhos em `docs/legal`, revisão de advogado pendente).
- Meta: verificação da empresa, aceitação da política comercial do WhatsApp (uso restrito ao atendimento do próprio negócio do cliente).
- Seguro de responsabilidade civil profissional/cyber: avaliar com corretor; não obrigatório (não verificado).

### 7. Riscos

| Risco | Chance | Impacto | Plano |
|---|---|---|---|
| Assistente informa algo errado a paciente | média | alto | aprovar antes de enviar no início; preço e horário só por ferramenta; rotina B |
| Meta bloqueia ou muda regra para IA no WhatsApp | baixa | alto | uso restrito ao atendimento; adaptador QR como contingência; nível "desligado" |
| Fundador doente ou indisponível | média | alto | nível "desligado" mantém lembretes; mensagem de ausência; documentar rotinas |
| Ninguém paga depois do teste | média | alto | gatilho do marketing (5 testes sem pagante = mudar oferta ou segmento) |
| Provedor de IA cai | média | médio | gateway com mais de um modelo; nível "desligado" como contingência |
| Custo de IA acima da planilha | baixa | médio | alerta de 30%; teto por conversa (spec 01) |
| Vazamento de dado | baixa | alto | RLS e teste de isolamento; logs sem conteúdo; plano de incidente da LGPD |
| Backup falha | baixa | alto | teste de restauração trimestral |
| Inadimplência | média | baixo | escada 0/3/7 dias e modo restrito |
| Concorrente lança plano solo barato | média | médio | configuração assistida e "aprovar antes" como diferença; preço aberto |

## Launch plan

Base: `marketing.md`, `ops.md`, `pricing.md`, `numbers.json`, `piloto.md`. O dono não deu data de abertura; datas abaixo partem de hoje (25/11/2026) com o caminho mais curto realista. Suposição registrada: abertura dos convites em **19/01/2027**, depois de 6 semanas de piloto.

### 1. O teste antes de gastar

Negócio de assinatura: **pré-venda de fundador**. Os 10 primeiros convites, com o teste de 14 dias e a condição de fundador (mensalidade travada por 12 meses). Metade vê o Agenda a R$ 297, metade a R$ 247.

**Linha de sucesso (escrita antes):** de 10 convidados que fazem a demonstração, pelo menos 6 conectam o WhatsApp e pelo menos 3 pagam no dia 15. Painel simulado: 0 de 18 compraram com o pitch v1. Se os reais ficarem abaixo da linha, acreditar nos reais e voltar para `offer.md` ou `pricing.md`. Se passarem, o painel subestimou e a oferta v2 está validada.

Gasto grande que espera o teste: revisão jurídica (R$ 3.000) só depois de 3 pagantes ou antes do primeiro paciente real, o que vier primeiro; nenhuma verba de anúncio.

### 2. Contagem regressiva

| Semana | Tarefa | Dono | Prazo |
|---|---|---|---|
| 25/11 a 06/12 | Piloto: transcrever respostas pendentes (perguntas 10 e 12), intervalos da agenda, regra de desmarcação da manhã | fundador | 06/12 |
| 25/11 a 06/12 | **Crítico:** templates utility de lembrete aprovados na Meta; notificação real de urgência (E-16) | fundador | 06/12 |
| 07/12 a 13/12 | Piloto ligado em "aprovar antes de enviar" com o quiropraxista | fundador | 08/12 |
| 07/12 a 20/12 | Site: remover implantação de /precos e FAQ (este PR); landing nova a partir de `landing-brief.md` | fundador | 20/12 |
| 07/12 a 20/12 | **Crítico:** revisão jurídica de termos e privacidade antes de paciente real fora do piloto | advogado | 20/12 |
| 14/12 a 10/01 | 10 conversas de campo com indicados do piloto; anotar objeções | fundador | 10/01 |
| 05/01 a 16/01 | Depoimento e números do piloto por escrito (só se o piloto autorizar) | fundador + piloto | 16/01 |
| 05/01 a 16/01 | CNPJ, NFS-e e Asaas em produção | fundador + contador | 16/01 |
| 12/01 a 18/01 | Ensaio: um convite para um conhecido fazer o onboarding inteiro; medir tempo (alvo ~9 min) | fundador | 18/01 |
| 19/01 | Abertura dos convites (até 3 por semana) | fundador | 19/01 |

**Caminho crítico:** templates da Meta e notificação de urgência → piloto ligado → revisão jurídica → abertura. Se qualquer um atrasar, a abertura atrasa.

### 3. Dia da abertura (19/01/2027)

| Hora | O que |
|---|---|
| 08:00 | Painel do operador: tudo verde (banco, filas, backups, Meta) |
| 09:00 | Enviar os 3 primeiros convites (indicados do piloto) |
| 10:00 | Post no Instagram: vídeo da conversa de exemplo (dados fictícios) |
| 10:00-18:00 | Acompanhar cada onboarding ao vivo; configuração por áudio no mesmo dia |
| 18:00 | Revisar: quem conectou o WhatsApp, onde travou, tempo de onboarding |
| Se algo quebrar | Meta fora: adiar conexão e avisar; IA fora: nível "desligado"; erro de cobrança: teste continua, cobrança manual depois |

### 4. Primeiros 30 dias

Números por semana: testes com WhatsApp conectado; pagantes (equilíbrio: 6, CFO); demonstrações; custo real de IA x planilha.

| Dia | Perguntas |
|---|---|
| 7 | Quanto tempo levou o onboarding de verdade? Alguém travou no WhatsApp? Quantas respostas o dono editou? |
| 14 | Quantos testes viraram pagantes no dia 15? Qual objeção se repetiu? R$ 247 ou R$ 297 converteu melhor? |
| 30 | Ritmo está perto de 1-2 pagantes/mês (CFO, meses 1-2)? Algum incidente com paciente? Mudar oferta, preço ou segmento? |

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
