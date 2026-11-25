# Piloto: respostas do quiropraxista (25/11/2026)

Dados do negócio do profissional, não de paciente. E-mail e registro técnico ficam fora do repositório.

## Atendimento hoje

- WhatsApp Business. Pensa em separar o número pessoal.
- Só ele responde.
- Cerca de 5 pessoas novas e 50 mensagens por dia.
- Faltas sem aviso: 1 ou 2 por mês. Esta é a linha de base do piloto.
- Mensagem de boas-vindas atual: pede nome, "o que está incomodando" e "há quanto tempo". O assistente pode fazer as mesmas perguntas (decisão do dono, 25/11/2026); a queixa fica só na mensagem.

## Serviços e preços

| Serviço | Duração | Preço |
|---|---|---|
| Primeira consulta (quiropraxia ou acupuntura) | 60 min | R$ 250,00 |
| Retorno (quiropraxia ou acupuntura) | 30 min | R$ 250,00 |

- 30 min é a média; pode passar um pouco, conforme o caso.
- Pacotes: 4 sessões por R$ 800,00 e 10 sessões por R$ 1.800,00.
- Quem vem do site paga R$ 790,00 pelo pacote de 4.
- Pacotes entram como resposta na base de conhecimento. Eles não são serviços agendáveis.

## Agenda

- Google Agenda.
- Atende de terça a quinta, das 7h às 20h. Intervalos ainda não informados.
- Marcar: sem regra de antecedência informada. Encaixe em cima da hora passa para ele.
- Desmarcar:
  - Consulta de manhã: até a noite do dia anterior.
  - Demais horários: mínimo de 2 horas; o ideal é 4.
- Não cobra sinal.
- Falta:
  - Na primeira, pergunta para quando o paciente quer remarcar.
  - Na segunda, o paciente perde a sessão.

## Quando chamar o profissional

- Marcação em cima da hora.
- Pedido de dia ou horário fora do atendimento normal.

## Configuração

- Lembretes: 1 dia antes e 2 horas antes, conforme sugerido.
- Tem CNPJ, mas atende como pessoa física. Quiropraxia e acupuntura não exigem registro em conselho. O registro técnico não aparece nas mensagens, por decisão dele.
- Celular Android. O PWA com notificações funciona no Chrome do Android; instalamos junto com ele.
- Topa dar depoimento e autorizar o uso dos números do piloto. Isso ainda precisa ser feito por escrito.

## Pendentes

- Perguntas 10 (perguntas frequentes) e 12 (se apresentar como assistente virtual): vieram em áudio e ainda não foram transcritas.
- Intervalos na agenda (almoço).
- Regra de desmarcação da manhã: o produto tem um único prazo (`cancel_notice_minutes`). Por ora usamos 4 horas. Antes do piloto, decidir se a regra da manhã vira código.
