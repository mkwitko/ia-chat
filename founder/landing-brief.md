# Briefing da landing page (25/11/2026)

Para o redesenho da página inicial de `apps/site`. Fonte: `marketing.md` (posicionamento), `offer.md`, `pricing.md`, `panel/results.md` (objeções simuladas), `competitors.md`. Visual: grafite + jade de `DESIGN.md` (jade só onde o assistente aparece). Textos em português do Brasil, segunda pessoa, "assistente" e não "bot".

**Linha de posicionamento:** Para o profissional de saúde e bem-estar que atende sozinho e perde paciente porque não consegue responder o WhatsApp durante o atendimento, o Consultório Aberto é a recepcionista com IA que responde e marca no seu Google Agenda, no mesmo número, começando com você aprovando cada resposta.

## Regras de prova (zero clientes)

- **Nunca:** depoimento, nota, número de clientes, "X consultórios usam", logotipos, "antes e depois", porcentagem de redução de faltas, "visto em". Nada disso existe ainda.
- **Pode mostrar (verdadeiro hoje):** a conversa de exemplo com dados fictícios e rotulada como exemplo; o fluxo de aprovação real do painel (captura com dados fictícios); as regras do produto (preço e horário só do cadastro; aprovar antes de enviar; assumir com um toque; diz a verdade se perguntado); preço aberto; teste de 14 dias; WhatsApp oficial em coexistência; quem constrói (o fundador, com nome e rosto; foto publicada em 26/11/2026); a política de privacidade e os termos.
- **Quando houver:** números do piloto e depoimento só com autorização escrita (ver `piloto.md`).

## Seções

| # | Seção | Mensagem | Objeção que responde | Prova honesta |
|---|---|---|---|---|
| 1 | **Topo** | Título: "Seu WhatsApp responde e marca na sua agenda enquanto você atende." Apoio: "No mesmo número. Nada sai sem você aprovar, até você querer." Botão: "Pedir convite". Linha abaixo: "14 dias grátis · sem taxa de implantação · sem fidelidade" | "Perco paciente porque não respondo"; "e se errar?" | Conversa de exemplo animada ao lado (paciente pergunta preço e horário, assistente responde, horário aparece no Google Agenda), com o rótulo "Serviço e preço reais do consultório piloto. Conversa ilustrativa." (serviço e preço reais do piloto por decisão do dono em 26/11/2026; paciente e mensagens fictícios) |
| 2 | **O problema** | "A mensagem chega enquanto você está com um paciente. Quando você vê, ele já marcou com outro." Três fatos do dia: mensagem às 21h, áudio perguntando preço, "tem horário amanhã?" | "Já dou conta pelo celular" | Nenhuma estatística; descrição do dia a dia, no texto do dono |
| 3 | **Como funciona (3 passos)** | 1. Conecte seu WhatsApp (mesmo número, você continua no app). 2. Mande um áudio contando serviços, preços e horários; a gente configura e você aprova. 3. O assistente responde, marca no Google Agenda e lembra o paciente | "Vou ter que trocar de número"; "não quero aprender sistema"; "implantação demora" | Capturas reais das telas de onboarding e do simulador |
| 4 | **Você no controle** | "Nos primeiros dias, cada resposta espera seu toque. Você aprova, edita ou descarta. Quando quiser, deixa automático." + "Assuma qualquer conversa com um toque." | Confiança (11 de 18 "não" no painel) | Captura do cartão de aprovação (dados fictícios) |
| 5 | **Não inventa** | "Preço, horário e endereço vêm do seu cadastro. Se não souber, chama você. Não dá orientação de saúde." | "E se inventar preço ou marcar errado?" | As regras do produto, ditas como regras; nenhuma taxa de acerto inventada |
| 6 | **O que ele faz** | Responde na hora, a qualquer hora · marca, remarca, cancela no Google Agenda · lembrete 1 dia e 2 horas antes · entende áudio · avisa você no celular quando precisa de você | "O WhatsApp Business já resolve" (mensagem automática não marca nem lembra) | Lista de recursos que existem hoje; o que é "em breve" fica fora desta seção |
| 7 | **Privacidade** | "A queixa do paciente fica só na conversa. Não entra em cadastro nem em relatório. Seus dados ficam com você." | "Meus pacientes contam coisas pessoais" | Link para a política de privacidade e o contrato de operador |
| 8 | **Preço** | Agenda R$ 297 em destaque; Essencial R$ 197 ao lado; link "ver todos os planos". Conta de exemplo: "Mês de 400 conversas: R$ 297 do plano + cerca de R$ 55 pagos direto à Meta no seu cartão (as primeiras 1.000 respostas do mês são grátis)." Selos: 14 dias grátis, sem implantação, sem fidelidade | "Quanto vou pagar no total?"; "implantação pesa" | Preço aberto (ninguém verificado no segmento combina preço aberto e configuração assistida); a conta vem de `docs/spec/07` |
| 9 | **Perguntas** | Robô ou gente? (diz que é assistente; diz a verdade se perguntado) · Preciso trocar de número? · E se eu quiser parar? (cancela e usa até o fim do mês) · Funciona com áudio? · Quem paga a Meta? · O que acontece em urgência? (orienta SAMU 192 e avisa você) | Objeções restantes do painel | Respostas que batem com os termos de uso |
| 10 | **Quem faz** | Uma frase do fundador: por que construiu e o compromisso de configurar junto. Entrada por convite: "atendemos poucos por semana para configurar com cuidado" | "E se o suporte sumir?" (queixa n.º 2 do mercado) | Nome real e contato do fundador; sem fotos de banco de imagem de "clientes" |
| 11 | **Chamada final** | "Peça um convite. A gente mostra respostas com os seus dados antes de você ligar qualquer coisa." Botão "Pedir convite" | Hesitação final | Nenhuma |

## Notas para o redesenho

- Mobile-first, 360 px: topo com título, apoio, botão e a conversa de exemplo logo abaixo, sem rolar muito.
- Jade só no assistente (bolhas e marca do assistente na conversa de exemplo); ação em tinta preta.
- "Pedir convite" porque o cadastro é por convite; não prometer cadastro imediato.
- Página de preços (`/precos`): 4 planos; Pro e Clínica com o que é "em breve" marcado; Clínica com "2 profissionais incluídos; do 3º, R$ 147/mês cada"; sem a seção de implantação.
- Revisar a página contra os termos de uso antes de publicar.
