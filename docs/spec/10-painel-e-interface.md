# 10 — Painel e interface

Define o que cada tela contém e como se comporta. Não define aparência: cor, tipografia, espaçamento e tom visual saem da etapa E-08 e ficam em `DESIGN.md`, na raiz do projeto.

## Princípios

| ID | Regra |
|---|---|
| RN-50 | Celular primeiro. Toda tela é desenhada para 360 px de largura e depois ampliada. O profissional usa entre um paciente e outro, com uma mão |
| RN-51 | Instalável (PWA), com notificação push. No iOS, o push exige o app instalado na tela inicial: o onboarding orienta |
| RN-52 | Tudo o que o profissional precisa no dia cabe em quatro telas: início, conversas, agenda, clientes. Configuração fica fora do caminho |
| RN-53 | Toda tela tem os quatro estados desenhados: carregando, vazio, erro e com dados. O estado vazio explica o que fazer |
| RN-54 | Nenhuma ação destrutiva sem confirmação; toda ação tem retorno visível em até 100 ms. A confirmação é a janela do painel (nunca a do navegador). O que dá para desfazer (cancelar atendimento, tirar da lista de espera, remover folga, descartar pergunta) sai da tela na hora com "Desfazer" por 6 s, e só então vai ao servidor; o que não dá (desconectar, remover da equipe, registrar pedido para parar) pede confirmação. Todo erro diz o que houve, o que fazer e, quando uma alteração falhou, traz "Tentar de novo" |
| RN-55 | Acessibilidade: contraste AA, alvos de toque de 44 px, navegação por teclado, leitor de tela, respeito a "reduzir movimento" |
| RN-56 | Textos em português do Brasil, na segunda pessoa, sem termo de software. "Assistente", nunca "bot", "agente" ou "IA" sozinha |
| RN-57 | Nada de enfeite sem função: sem gradiente decorativo, sem cartões idênticos com ícone, sem emoji como ícone, sem números de vaidade |
| RN-58 | Fuso do tenant em toda data e hora exibida |

## Navegação

Barra inferior no celular, lateral no computador. Cinco itens (a versão enxuta do MVP; cabe em 360 px com `grid-cols-5`):

1. **Início** (o que precisa de você, o mês em quatro números, atalho para os resultados)
2. **Conversas** (com contador de pendências)
3. **Agenda**
4. **Clientes**
5. **Mais**: Meu consultório, Assistente, Equipe, Conta e Ajuda (até cinco entradas; árvore em `docs/design/ia.md`)

Decisão (25/11/2026): não há aba "Resultados". Os números do piloto ficam numa seção "Resultados do mês" (`/resultados`), aberta pelo botão "Ver resultados" no Início, para não passar de cinco itens e não virar painel de métricas. "Mais" continua com o nome e os itens de configuração que já tinha.

Volta à configuração (decisão do dono, 25/11/2026): enquanto a configuração guiada tiver passo pendente, "Primeiros passos · X de N" com barra de progresso fica no topo da lateral (computador), como primeira linha de Mais (a faixa fina do celular saiu na rodada 3, 26/11/2026: lotava a primeira tela de toda página); o Início mostra "Próximo passo" com o passo atual e um botão. Tudo some quando a configuração termina. O cartão e a faixa saem de Meu consultório, que mostra a sua própria contagem ("Faltam N itens"), para não haver dois números diferentes na mesma tela. `/configuracao` não é aba: o item ativo é Mais.

Lateral no computador (decisão do dono, 26/11/2026): nome do consultório, o cartão de configuração (quando pendente), Início, Conversas, Agenda, Clientes e o grupo recolhível **Configurações** no lugar de Mais. O grupo abre sozinho quando uma página de ajuste está ativa. No rodapé, a situação do atendimento em palavras, "Aparência" e Sair. No celular, Mais abre a mesma lista.

Ajustes para quem nunca usou um sistema assim (decisão do dono, 26/11/2026, depois de "está difícil de fazer a configuração e encontrar as coisas"): o grupo tem no máximo cinco entradas, **Meu consultório**, **Assistente**, **Equipe** (só o dono), **Conta** e **Ajuda** (e Operador para quem é operador). Cada página de ajuste é um **resumo**: uma linha por assunto, com o valor atual em palavras ("Ter a Qui, 7h–20h") e a situação ("Feito", "Falta configurar" ou "Opcional"); a primeira linha que falta configurar leva o único botão cheio da tela. Tocar numa linha abre um **editor só daquele assunto**, numa rota própria: uma coluna de até 560 px, os 2 a 4 campos essenciais, o resto em "Mais opções", um "Salvar" e um "Voltar"; salvou, volta ao resumo. Listas (serviços, endereços, quem atende) salvam item a item, sem "Salvar" da página. Cada coisa mora num lugar só: o Google Agenda saiu da Disponibilidade e das Conexões e virou uma linha de Meu consultório; a Disponibilidade saiu da Agenda e virou Meu consultório › Horários. Os endereços antigos redirecionam mantendo a consulta (`/agenda/disponibilidade` → `/mais/consultorio/horarios`, `/mais/perfil` → `/mais/consultorio`, `/mais/servicos` → `/mais/consultorio/servicos`, `/mais/conexoes` → `/mais/consultorio/whatsapp`, `/mais/plano-e-uso` e `/mais/assinatura` → `/mais/conta/...`, `/mais/retorno` → `/mais/assistente/retorno`).

Atalhos de teclado (computador, 26/11/2026): "/" procura um cliente, "n" abre um novo agendamento, "j" e "k" passam de conversa, "a" assume a conversa aberta, "?" mostra a lista (também em "Atalhos do teclado", no rodapé da lateral). Uma tecla, sem modificador, e nunca enquanto se escreve ou com uma janela aberta.

Textos e idioma (decisão do dono, 26/11/2026): todo texto do painel mora em recursos por idioma (`defineMessages` em `apps/web/src/i18n`), com pt-BR como padrão e en-US como esqueleto que cai no pt-BR chave a chave. Dicionário tipado próprio, sem biblioteca: as mensagens já eram objetos e funções (plurais, valores), o compilador confere cada chave, e nenhuma dependência resolve isso em menos linhas. Datas, números e dinheiro sempre por `Intl` com o idioma ativo. A escolha do idioma (`ca-locale` no navegador) é lida ao abrir; ainda não há seletor na tela (só pt-BR é produto).

Ajuda na tela (26/11/2026): cada tela do dia a dia tem um "?" ao lado do título que abre o artigo da Central de ajuda sobre ela, e uma dica curta na primeira visita, que some com "Entendi" (guardada no navegador). Rodada 3: a dica só aparece depois que a configuração termina; antes, a primeira tela já tem o próximo passo.

Faixa de alerta no topo, acima de tudo, quando algo impede o atendimento (no máximo uma faixa por vez): WhatsApp desconectado, Google expirado, pagamento da Meta ausente, assinatura vencida, franquia estourada. Cada alerta tem um botão que leva à correção.

## Telas

### Conversas (inbox)

- Lista: nome ou telefone, trecho da última mensagem, hora, e um indicador de quem está com a conversa (assistente, você, aguardando sua aprovação, aguardando você).
- Filtros: todas, precisam de você, com o assistente.
- Ordem: primeiro as que precisam do profissional.
- Vazio: "Nenhuma conversa ainda" com o link para testar no simulador.

- Redesenho de 26/11/2026: filtros em pílulas com a contagem ("Precisam de você (2)") que quebram linha em vez de rolar de lado; "?" de ajuda e dica de primeira visita.

### Conversa

- Mensagens com autoria distinguível sem depender só de cor: paciente, assistente, profissional, sistema.
- Áudio com a transcrição logo abaixo. Imagem e documento abrem em tela cheia.
- Barra de controle fixa: "Assumir" quando está com o assistente; "Devolver ao assistente" quando está com o profissional.
- **Rascunho para aprovação** (nível "aprovar antes de enviar"): a resposta sugerida aparece acima do campo de texto com três ações de um toque: enviar, editar, descartar.
- Campo de texto para responder pelo painel. Enviar por aqui também assume a conversa.
- Linha do tempo mostra eventos: assumiu, devolveu, agendou, cancelou, transferiu.
- Atalho para o contato: agendamentos futuros e passados, opt-out, exportar e eliminar dados.

- Assumir e Devolver mostram um aviso do que mudou com "Desfazer" (volta como estava). "Assumir" é botão secundário: o principal da tela é o da resposta para aprovar. Descartar a resposta do assistente pede confirmação na janela do painel; enviar e descartar confirmam com aviso.

### Agenda

- Dia por padrão no celular; semana no computador.
- Agendamento mostra paciente, serviço e estado (confirmado, aguardando sinal, não sincronizado com o Google).
- Toque num horário livre cria agendamento manual; toque num agendamento permite remarcar ou cancelar.
- Compromissos vindos do Google aparecem como ocupado, sem detalhes.
- Acesso a disponibilidade, bloqueios e modo férias.
- Implementação (E-23): lista feita à mão, sem Schedule-X (sem dependência nova): dia no celular e semana como sete seções de dia, a partir do dia escolhido (`/agenda?dia=AAAA-MM-DD&visao=semana`). Em vez de tocar num horário livre da grade, o botão "Novo agendamento" abre o formulário com os horários livres do dia (mesmo `availableSlots` do assistente) e o toque no atendimento abre remarcar e cancelar. Com o Google Agenda conectado (E-21) os horários ocupados lá saem da lista de livres; a seção "Google Agenda" da tela Disponibilidade conecta, escolhe a agenda, mostra o estado e desconecta, e uma faixa de alerta pede para reconectar quando o token cai. A tela "Disponibilidade, bloqueios e férias" (hoje Meu consultório › Horários, `/mais/consultorio/horarios`; o Google Agenda ficou na própria linha de Meu consultório) edita os horários da semana, os bloqueios, as férias e o horário do resumo noturno. Rodada 3 (26/11/2026, uma tarefa por editor): Horários tem só a semana e um "Salvar" ("Mesmo horário em vários dias" vale na hora, sem botão de aplicar, e a frase "Depois de salvar" mostra o resultado); "Folgas e férias" (`/mais/consultorio/horarios/folgas`) e, na Clínica, "Quem faz cada serviço" (`/mais/consultorio/horarios/servicos`) abrem em páginas próprias; o horário do resumo noturno foi para Conta › Avisos e tema.
- Agenda por profissional (H-45): com mais de um profissional, a Agenda ganha o filtro "Todos / cada profissional" (`?profissional=`); em "Todos" cada atendimento mostra as iniciais e "com {nome}". Profissionais se distinguem por iniciais e nome, não por cor. No novo agendamento, os horários livres trazem as iniciais de quem atende; com o filtro num profissional, só os dele; remarcar fica com o mesmo profissional. Em Disponibilidade, a troca de profissional no topo leva aos horários, aos "Serviços que atende" (todos, ou os marcados) e aos bloqueios e férias de cada um; para quem não é o primeiro, a seção do Google Agenda vira uma frase dizendo que o Google vale para o primeiro. Em Perfil > Quem atende, cada profissional tem o link "Horários e serviços"; adicionar além do plano mostra o aviso do plano Clínica.
- Lista de espera (M-09): cada dia mostra, abaixo dos atendimentos, quem pediu para ser avisado se abrir um horário (nome, serviço, até quando), com "Tirar da lista". Na semana a explicação some e ficam só os nomes. Entradas vêm só do assistente.

- Redesenho de 26/11/2026: "Novo agendamento" é o único botão principal, ao lado do título; a barra tem só anterior / dia por extenso / próximo e "Hoje" (Dia/Semana só no computador); o link para horários e folgas desceu para baixo da lista; cada atendimento mostra a seta que indica que abre; o filtro de profissionais quebra linha. Cancelar sai na hora com "Desfazer" por 6 s. Rodada 3 (26/11/2026): no celular, uma faixa com os sete dias a partir do dia escolhido (dia da semana, data e quantos atendimentos) fica sobre a lista de um dia; tocar num dia mostra a lista dele, e as setas andam uma semana.

### Início

Substitui o antigo "Hoje" (`/inicio`; `/hoje` redireciona). Redesenho de 26/11/2026 (dono: "uma tarefa por tela", usuário extremamente leigo): uma área de situação, depois uma lista do que fazer.

Rodada 3 (26/11/2026, celular cheio demais): o quadro só fica no topo quando algo não pode esperar (problema, configuração pendente, fim do teste); "Tudo funcionando" e a sugestão descem para o fim (no computador, a coluna da direita, sob Hoje). Saíram os atalhos e o "Este mês": o Início termina com um link só, "Ver como foi o mês" (Resultados). "Pacotes no fim" virou uma linha de Precisa de você ("N clientes com o pacote no fim", abre o cliente ou a lista).

- **Quadro de situação** (um só): mostra a coisa mais importante agora, com um botão. Ordem: o que impede o atendimento (teste terminado, WhatsApp desconectado, Google expirado, notificações desligadas) em vermelho; senão o próximo passo da configuração com a barra; senão o fim do teste nos últimos 3 dias; senão uma sugestão de melhoria (uma por vez, no lugar da antiga lista "Para deixar o assistente ainda melhor"); senão "Tudo funcionando". Embaixo, sempre, a situação em palavras: assistente, WhatsApp e dias de teste. No Início a faixa de alerta do topo não aparece, porque o quadro já mostra o mesmo alerta; a faixa de teste ativo saiu de todas as telas (a contagem mora no quadro e no rodapé da lateral).
- **Precisa de você**: conversas aguardando, respostas para aprovar (sem repetir as que já aparecem como conversa), atendimentos das próximas 48 h sem confirmação, perguntas que o assistente não soube e quem conversou e não agendou e pode ser retomado (link para Clientes; nenhuma mensagem sai sozinha daqui). e os clientes com o pacote no fim (H-43). Depois, "Veio ou faltou?" (atendimentos que já passaram, com os dois botões ali mesmo). Item vazio some; sem nada, "Nada esperando por você agora".
- **Hoje**: os atendimentos do dia.
- **Primeiro atendimento do assistente**: na primeira vez que alguém marcado pelo assistente comparece, um cartão jade com o visto que entra uma vez ("O assistente marcou um atendimento sozinho, e a pessoa veio.") e "Que bom!"; aparece uma vez por conta (rodada 3: `tenants.first_booking_seen_at`, gravado por `POST /api/home/first-booking-seen`; antes era por navegador).
- **Ver como foi o mês**: o único link para os números (Resultados). Novo agendamento fica na Agenda e na tecla "n"; testar o assistente, em Mais › Assistente.

### Clientes

Lista (`/clientes`) e ficha (`/clientes/:id`) de quem já falou com o consultório. Poucos campos, quase tudo automático.

- Lista: nome ou telefone, origem (só quando não é "WhatsApp direto", o caso comum; rodada 3, 26/11/2026), status, último contato, próximo atendimento, "pediu para parar" e quantos atendimentos teve (recorrência é contagem, não etapa). Busca por nome ou telefone e filtro por status.
- **Status** (no máximo quatro, derivados de fatos; ver H-31): **Novo contato**, **Agendado** (tem atendimento marcado), **Cliente** (compareceu ao menos uma vez), **Não agendou** (sem mensagem e sem agendamento há mais de 3 dias, ou só teve agendamentos cancelados ou faltas: é a lista de recuperação). Manual, auditado: **Perdido**, com um motivo de lista fixa (preço, distância, escolheu outro profissional, não precisa mais, número errado, outro); vale até chegar mensagem ou agendamento novo, ou até "voltar ao status automático".
- **Origem**: WhatsApp direto, indicação (com código), site, anúncio, importado, cadastro manual. Só a evidência define sozinha: mensagem que chega é "WhatsApp direto" e cadastro pelo painel é "manual". Indicação, site e anúncio o profissional escolhe na ficha (anúncio automático só quando a Meta mandar o dado de origem, o que ainda não lemos). Nunca se deduz campanha sem prova.
- Ficha: conversa (link), atendimentos com "compareceu/faltou", pacotes ("Pacote 4 sessões: 2 de 4 usadas", data, pago, histórico, ajuste de uma sessão com motivo de lista fixa e "Registrar pacote" a partir dos pacotes do perfil com sessões; H-43), histórico de consentimento (aceitou/pediu para parar, categoria, origem, data, quem), histórico do status, origem e perdido.
- **Saúde fora daqui**: não existe campo de queixa nem de anotação em contato, nota ou status; o texto das mensagens não aparece na lista nem na ficha. Se um dia houver campo de observação, terá aviso visível e ficará fora do contexto do assistente.

- Redesenho de 26/11/2026: busca com "/" no computador; etapas em pílulas que quebram linha (mesmo componente de Conversas e Resultados). Ficha: telefone e etapa, "Abrir a conversa no WhatsApp" como botão principal, Atendimentos e Pacotes; origem, pedido para parar, histórico e "Perdeu este cliente?" ficam dobrados em "Origem, pedido para parar e situação".

### Presença

No atendimento que já começou, o profissional marca "Compareceu" ou "Faltou" (na ficha do cliente e no Início); dá para corrigir. Alimenta o status "Cliente" e a taxa de faltas. Atendimento futuro ou cancelado não pode ser marcado.

### Resultados do mês

`/resultados`, filtro de período (este mês, mês passado, últimos 90 dias). Só dados reais; abaixo de 5 casos aparece "Ainda poucos dados" com as contagens, nunca um percentual. Rodada 3 (26/11/2026): sob cada número, uma frase simples com a contagem ("Ninguém faltou nos 6 atendimentos marcados.", "Falta marcar se 4 pessoas vieram."), sem jargão ("mediana", "dividido por"); as fórmulas e o aviso de linha de base ficam juntos em "Como calculamos", dobrado no fim da página.

| Número | Fórmula |
|---|---|
| Conversas | conversas com ao menos uma mensagem do paciente no período |
| Contatos novos e por origem | contatos criados no período |
| Primeira resposta (mediana) | das conversas abertas no período (primeira mensagem do paciente dentro dele) que foram respondidas, o tempo até a primeira resposta do assistente ou do profissional |
| Passaram para você (taxa de transferência) | conversas do período em que o controle foi para o profissional ÷ conversas do período |
| Agendamentos feitos / remarcações / cancelamentos | atendimentos novos criados / criados no lugar de um cancelado (M-09) / cancelados e não remarcados, no período |
| Taxa de faltas | faltou ÷ (compareceu + faltou), só atendimentos com presença marcada; a tela diz quantos ficaram sem marca |
| Recuperados | contatos que estavam em "Não agendou" e agendaram no período |
| Retornos | atendimentos criados no período para quem já tinha comparecido antes |
| Indicações | contatos criados no período com origem indicação |
| Dinheiro recuperado (H-41) | atendimentos agendados pelo assistente, marcados "Compareceu" e com início no período, somados pelo preço do serviço; quantos foram agendados com o consultório fechado; detalhe por semana (segunda a domingo, hora local). Estimativa pela tabela de preços, não valor recebido |

Aviso fixo de linha de base: os números começam na data do primeiro registro; para comparar com antes do assistente, o profissional anota hoje o que tem. Pedidos de agendamento ainda não são medidos (nada os registra).

- Redesenho de 26/11/2026: o dinheiro recuperado e "O principal" (conversas, agendamentos, faltas, tempo de resposta, conversas que passaram para você) ficam à vista; o resto (por semana, contatos novos, remarcações, cancelamentos, retomados, de quem já era cliente, origem) fica em "Ver todos os números".

### Assistente

`/mais/assistente`, resumo no padrão de ajustes (decisão do dono, 26/11/2026), uma linha por assunto, cada uma com o seu editor:

- **Quanto ele faz sozinho** (`/autonomia`): automático, aprovar antes de enviar, desligado. A descrição de cada nível diz o que acontece na prática. "Desligado" aparece como "Falta configurar".
- **Como ele se apresenta** (`/apresentacao`): como assistente virtual (com o nome), como a recepção ou como você, com a prévia da primeira mensagem.
- **Jeito de escrever** (`/tom`, era "Tom de voz"): mensagens de exemplo e as quatro perguntas. "Opcional" até ser preenchido.
- **O que ele sabe responder** (`/base`, era "Base de conhecimento"): perguntas e respostas; "Falta configurar" enquanto houver pergunta esperando você.
- **Mensagens automáticas** (`/retorno`, era "Retorno e avaliações"): retorno a quem sumiu e pedido de avaliação.
- **Testar o assistente** (`/simulador`, era "Simulador").
- **Perguntas que o assistente não soube**: o assistente registra a pergunta (`registrar_duvida_sem_resposta`) como item inativo, sem resposta, de origem `unanswered`. A tela agrupa as parecidas (normalização de caixa, acento, pontuação e palavras de ligação; iguais ou com metade das palavras em comum) e mostra "Perguntada N vezes", as mais repetidas primeiro. O dono escreve ou edita a resposta e aprova: vira um item ativo da base, que o assistente passa a usar, e as cópias do grupo somem. "Descartar" remove o grupo. O botão "IA sugere resposta" (só ao clicar; usa o perfil do negócio, sem preços nem dados de paciente) devolve um rascunho para editar; se o rascunho trouxer valor ou horário, é trocado por um aviso para usar o perfil e a agenda. Só o dono aprova, descarta e pede sugestão. O número de grupos pendentes aparece na lista de Início ("Responder N perguntas") e como contador na linha Assistente de Mais.
- **Simulador**: conversa de teste que não envia nada ao WhatsApp, com a indicação de qual informação o assistente usou.
  - Roda o mesmo caminho do turno real (pré-filtros, prompt, validação da saída; código em `packages/agent`), sem conversa, contato nem mensagem gravados: a conversa de teste vive só na tela. O que sai de cada resposta ("O que o assistente usou") vem das chamadas de ferramenta e da comparação da resposta com os dados cadastrados (serviço e preço, endereço, como chegar, base de conhecimento), nunca do que o modelo diz ter usado.
  - Ferramentas: consulta de horários roda de verdade, mas sem registrar ofertas; agendar, remarcar e cancelar não existem no simulador (a tela avisa); transferir e registrar dúvida só marcam o que aconteceria. A checagem de urgência por Jev (julgamento extra antes do modelo) não roda aqui; a lista de palavras sim.
  - Custo: usa o gateway de IA como a produção (em desenvolvimento, Groq grátis). O uso entra em `ai_usage` com `task` iniciada por `simulator:` e sem `turn_id`/`conversation_id`. Limite de 30 mensagens por hora por consultório (resposta 429); o limite fica em memória do processo da API (hipótese: uma instância).

### Meu consultório

`/mais/consultorio`, resumo com oito linhas, cada uma com o seu editor (M-04, H-38; texto com "cliente" e "negócio"):

- **Nome e apresentação** (`/negocio`): nome e o que faz; em "Mais opções", telefone, rede social, site, link de avaliação do Google e a mensagem de boas-vindas colada. "Feito" quando há nome e apresentação.
- **Serviços e preços** (`/servicos`): serviços com duração e valor (aviso quando a especialidade restringe divulgar preço) e uma linha "Pacotes" que abre a página dos pacotes (`/mais/consultorio/servicos/pacotes`: nome, sessões e valor exato; o formulário só abre em "Adicionar pacote"). Campos sem exemplo dentro (rodada 3: "4 sessões" e "800" pareciam valores já preenchidos). Resumo: "2 serviços, 1 pacote".
- **Horários** (`/horarios`): a semana, folgas e férias, e em "Mais opções" a hora do resumo da agenda de amanhã; com mais de um profissional, a troca de profissional no topo e "Serviços que atende". Resumo: "Ter a Qui, 7h–20h" (dias seguidos viram intervalo; da primeira hora à última).
- **Endereço** (`/endereco`): endereços, o primeiro é o principal, com nome e como chegar.
- **Quem atende** (`/quem-atende`): profissionais; cada um com o link "Horários e serviços".
- **Pagamento e desmarcação** (`/pagamentos`): formas de pagamento em pílulas e prazo para desmarcar; em "Mais opções", a regra em palavras e a mensagem depois de uma falta. Recebimento de sinal (módulo Pro, ainda por construir): Mercado Pago ou chave Pix, aqui.
- **WhatsApp** (`/whatsapp`): estado, número e a ação para conectar ou trocar o número; a importação do histórico; em "Mais opções", a conexão por QR code (com o aviso de risco sempre visível).
- **Google Agenda** (`/google-agenda`, opcional): conectar, escolher a agenda, desconectar. Some quando a conexão não está disponível na conta.

- Redesenho de 26/11/2026: "Remover" saiu da lista (ficava ao lado de "Editar") e mora dentro do editor de cada item (serviço, endereço, profissional, pergunta), com confirmação. Horários: "Mesmo horário em vários dias" (marque os dias, das/às, "Usar este horário nos N dias marcados"), a frase "Como está agora" e a lista dia a dia dobrada em "Ajustar dia a dia". Resumos de Meu consultório, Assistente e Conta com "?" de ajuda.

### Conta

`/mais/conta`, resumo com Plano e uso, Assinatura e Avisos e aparência (resumo da semana e tema).

### Plano e uso

- Plano atual, conversas usadas na franquia, previsão para o mês e o bloco "WhatsApp (Meta)": respostas grátis da Meta usadas no mês (ex.: "640 de 1.000"), mensagens com custo por categoria e custo estimado, `GET /api/usage/meta`. Texto: "Estimativa da Meta no seu cartão: R$ X". A Meta cobra no cartão do cliente; não entra na nossa fatura.
- Teto de excedente, troca de plano, faturas, cancelamento.

### Equipe

- Só o dono vê a linha e a tela (Mais > Equipe). A recepção e o profissional não veem.
- **Convidar**: e-mail e função (Recepção ou Profissional). É o convite de organização do Better Auth (`invite-member`), com as permissões de `apps/api/src/auth/access.ts`: só o dono convida, cancela convite, muda função e remove. O e-mail sai pelo remetente de e-mail do sistema (Resend em produção; em desenvolvimento vai para o log, sem o conteúdo).
- **Lista**: convites pendentes (aguardando resposta ou vencido) com "Reenviar" (mesmo convite, novo e-mail) e "Cancelar convite"; quem já está na equipe, com a função (troca entre Recepção e Profissional) e "Remover". O dono não se remove nem muda a própria função.
- **Aceitar** (`/convite-equipe/:id`, o link do e-mail): a página lê o convite (`GET /api/team-invites/:id`: consultório, e-mail, função, estado) e, sem sessão, oferece criar a conta com o e-mail convidado (Google ou e-mail e senha; o convite pendente libera o cadastro, H-37) ou entrar (`/entrar?next=`). Com sessão, "Aceitar convite" entra na equipe e abre o Início. Se a conta logada tem outro e-mail, a página avisa e oferece trocar de conta. Convite aceito, cancelado, recusado ou vencido mostra o motivo.
- A lista de Início mostra "Convidar a secretária" até haver mais alguém na equipe ou um convite pendente.

### Onboarding

O convite (`/convite/:token`) confere o link (página amigável se inválido, vencido, usado ou cancelado) e leva à criação da conta (Google ou e-mail); `/criar-conta` sem convite explica que o acesso é por convite e aponta para a lista de espera. Depois, os seis passos de [09](09-site-aquisicao-suporte.md) como um **assistente de configuração de verdade** (decisão do dono, 26/11/2026): uma pergunta por tela, "Passo X de N" com barra no topo, sem a lista de passos ao lado, botões grandes, "Voltar" e, onde dá para deixar para depois, "Pular por agora" (onde seus clientes acham você, WhatsApp, teste). O primeiro passo do servidor vira três telas: "Qual é a sua área?", "Onde seus pacientes acham você?" (pré-preenchimento com revisão; salvar a revisão já avança) e "Qual é o seu CPF ou CNPJ?". Depois: WhatsApp, serviços e pacotes, horários (o próprio botão confirma e avança; o Google Agenda ficou em Meu consultório), teste com seus dados e ativação (com instalar e notificações; no iPhone, os três toques de "Adicionar à Tela de Início" desenhados; nos outros aparelhos, dobrados em "Usa iPhone? Veja como"). No topo de cada tela, "Sair e continuar depois" (volta ao Início) e o "?" de ajuda; no celular, a barra de baixo some durante a configuração. "Continuar" nunca fica cinza: tocado antes da hora, diz o que falta ("Escolha a sua área acima para continuar."). Rodada 3 (dono, 26/11/2026: "bem orientado, passo a passo"): cada tela traz a pergunta, o que fazer e, à parte, "Por que perguntamos isso:" numa linha; os valores sugeridos já vêm preenchidos (exemplos de serviços da área, segunda a sexta das 9h às 18h, aprovar antes de enviar). Depois de ligar o assistente, o último passo, "Teste agora: mande um alô", mostra o número e espera: quando uma mensagem chega (eventos do painel, e uma consulta a cada 4 s como reserva) aparece "Chegou!" com quem mandou, o texto e o que o assistente fez, e "Abrir a conversa". Não salva nada e não tem "Voltar". No fim, "Pronto! Veja como ficou": o resumo de cada resposta (área, WhatsApp, serviços, horários, quanto o assistente faz sozinho), cada linha abrindo a página que muda, e o único botão "Ver as conversas". Um passo "Recursos" (ligar ou desligar funções) entra quando a API de recursos (`/api/features`) chegar. A mensagem de boas-vindas colada saiu do passo do WhatsApp e mora em Meu consultório › Nome e apresentação › Mais opções. Depois da ativação, a lista "Para deixar o assistente ainda melhor" fica no Início até ser cumprida. Enquanto a configuração está aberta, o cartão e a faixa "Primeiros passos · X de N" somem, para não haver duas contagens. O botão de ativar fica desligado até o WhatsApp conectar.

### Operador (interno)

Fora da navegação do cliente, em endereço e autenticação próprios: convites (H-37: "Novo convite" com nome do consultório e e-mail opcional, o link aparece uma vez para copiar e, com e-mail, vai também por e-mail ao criar e ao gerar novo link; lista com estado aguardando, usado, vencido ou cancelado; gerar novo link, que invalida o anterior, e cancelar), clientes, custos, falhas, acesso assistido com motivo e prazo, e o painel "Gasto dos clientes na Meta no mês" (apoio; não é custo nosso): totais de todos os clientes (respostas, mensagens com custo, custo estimado) e os cinco clientes de maior custo, `GET /api/operator/meta-usage`. Só contagens e nomes de clientes, sem conteúdo nem dados de paciente.

## Tempo real

- Inbox e conversa atualizam por SSE, sem recarregar.
- Reconexão automática com aviso discreto de "reconectando".
- Rascunho digitado não se perde ao chegar mensagem nova.
- Ação feita offline é recusada com mensagem clara, nunca enfileirada em silêncio: uma resposta atrasada a paciente é pior que uma não enviada.

## Notificações

| Evento | Push | No painel |
|---|---|---|
| Paciente pede humano ou caso de urgência | Sim, imediato | Sim |
| Rascunho aguardando aprovação | Sim, agrupado | Sim |
| Conexão caiu ou integração expirou | Sim | Faixa de alerta |
| Agendamento novo, remarcado ou cancelado | Configurável | Sim |
| Franquia a 80% e a 100% | Sim | Faixa de alerta |
| Agenda de amanhã | Sim, no horário configurado | Não |
| Resumo da semana (H-41) | Sim, segunda às 8h, e e-mail ao dono; desliga em Conta › Avisos e aparência | Não |

## Processo de design

1. E-08 define a direção com a skill `impeccable` e grava `DESIGN.md`, com referências reais por tela anexadas (fontes em [../plan/IMPLEMENTACAO.md](../plan/IMPLEMENTACAO.md)).
2. Cada etapa de tela (E-16, E-17, E-23, E-24, S-01) começa lendo `DESIGN.md` e este arquivo, e termina com uma revisão pela `impeccable` e verificação em 360 px e em 1280 px.
3. Componentes de base acessíveis e sem estilo pronto; tokens próprios. Biblioteca de seções prontas não entra no painel.
4. A primeira versão de cada tela é mostrada ao dono do produto antes de seguir para a próxima.
