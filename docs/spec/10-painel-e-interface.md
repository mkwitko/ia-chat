# 10 — Painel e interface

Define o que cada tela contém e como se comporta. Não define aparência: cor, tipografia, espaçamento e tom visual saem da etapa E-08 e ficam em `DESIGN.md`, na raiz do projeto.

## Princípios

| ID | Regra |
|---|---|
| RN-50 | Celular primeiro. Toda tela é desenhada para 360 px de largura e depois ampliada. O profissional usa entre um paciente e outro, com uma mão |
| RN-51 | Instalável (PWA), com notificação push. No iOS, o push exige o app instalado na tela inicial: o onboarding orienta |
| RN-52 | Tudo o que o profissional precisa no dia cabe em quatro telas: início, conversas, agenda, clientes. Configuração fica fora do caminho |
| RN-53 | Toda tela tem os quatro estados desenhados: carregando, vazio, erro e com dados. O estado vazio explica o que fazer |
| RN-54 | Nenhuma ação destrutiva sem confirmação; toda ação tem retorno visível em até 100 ms |
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
5. **Mais**: assistente, serviços, conexões, plano e uso, equipe, ajuda

Decisão (25/11/2026): não há aba "Resultados". Os números do piloto ficam numa seção "Resultados do mês" (`/resultados`), aberta pelo botão "Ver resultados" no Início, para não passar de cinco itens e não virar painel de métricas. "Mais" continua com o nome e os itens de configuração que já tinha.

Volta à configuração (decisão do dono, 25/11/2026): enquanto a configuração guiada tiver passo pendente, "Configuração · X de N" com barra de progresso fica no topo da lateral (computador), numa faixa fina sob os alertas (celular) e como primeira linha de Mais; o Início mostra "Próximo passo" com o passo atual e um botão. Tudo some quando a configuração termina. `/configuracao` não é aba: o item ativo é Mais.

Lateral no computador: nome do consultório, o cartão de configuração (quando pendente), os cinco itens e, no rodapé, a situação do atendimento em palavras (assistente ativo ou não, WhatsApp conectado ou não) e "Aparência: Sistema / Claro / Escuro" (também em Mais). Largura total sempre; Conversas em lista e conversa lado a lado a partir de `lg`; Mais com a lista de ajustes à esquerda e a página escolhida à direita a partir de `lg` (DESIGN.md, "Layout").

Faixa de alerta no topo, acima de tudo, quando algo impede o atendimento: WhatsApp desconectado, Google expirado, pagamento da Meta ausente, assinatura vencida, franquia estourada. Cada alerta tem um botão que leva à correção.

## Telas

### Conversas (inbox)

- Lista: nome ou telefone, trecho da última mensagem, hora, e um indicador de quem está com a conversa (assistente, você, aguardando sua aprovação, aguardando você).
- Filtros: todas, precisam de você, com o assistente.
- Ordem: primeiro as que precisam do profissional.
- Vazio: "Nenhuma conversa ainda" com o link para testar no simulador.

### Conversa

- Mensagens com autoria distinguível sem depender só de cor: paciente, assistente, profissional, sistema.
- Áudio com a transcrição logo abaixo. Imagem e documento abrem em tela cheia.
- Barra de controle fixa: "Assumir" quando está com o assistente; "Devolver ao assistente" quando está com o profissional.
- **Rascunho para aprovação** (nível "aprovar antes de enviar"): a resposta sugerida aparece acima do campo de texto com três ações de um toque: enviar, editar, descartar.
- Campo de texto para responder pelo painel. Enviar por aqui também assume a conversa.
- Linha do tempo mostra eventos: assumiu, devolveu, agendou, cancelou, transferiu.
- Atalho para o contato: agendamentos futuros e passados, opt-out, exportar e eliminar dados.

### Agenda

- Dia por padrão no celular; semana no computador.
- Agendamento mostra paciente, serviço e estado (confirmado, aguardando sinal, não sincronizado com o Google).
- Toque num horário livre cria agendamento manual; toque num agendamento permite remarcar ou cancelar.
- Compromissos vindos do Google aparecem como ocupado, sem detalhes.
- Acesso a disponibilidade, bloqueios e modo férias.
- Implementação (E-23): lista feita à mão, sem Schedule-X (sem dependência nova): dia no celular e semana como sete seções de dia, a partir do dia escolhido (`/agenda?dia=AAAA-MM-DD&visao=semana`). Em vez de tocar num horário livre da grade, o botão "Novo agendamento" abre o formulário com os horários livres do dia (mesmo `availableSlots` do assistente) e o toque no atendimento abre remarcar e cancelar. Com o Google Agenda conectado (E-21) os horários ocupados lá saem da lista de livres; a seção "Google Agenda" da tela Disponibilidade conecta, escolhe a agenda, mostra o estado e desconecta, e uma faixa de alerta pede para reconectar quando o token cai. A tela "Disponibilidade, bloqueios e férias" (`/agenda/disponibilidade`) edita os horários da semana, os bloqueios, as férias e o horário do resumo noturno.

### Início

Substitui o antigo "Hoje" (`/inicio`; `/hoje` redireciona).

- **Recuperado este mês** (H-41): no topo, a soma do preço dos serviços dos atendimentos que o assistente agendou e que você marcou "Compareceu", com a contagem ao lado e "Como calculamos" num toque; abaixo de 5 atendimentos, "Ainda sem dados".
- **O mês em quatro números**, todos contados do banco e cada um um link para onde agir: contatos no mês (Clientes), agendamentos (Agenda), aguardando retorno (Conversas) e cancelamentos (Agenda). Cancelamento conta no dia em que foi feito.
- **O que precisa de você**: conversas aguardando, rascunhos para aprovar, perguntas que o assistente não soube, atendimentos que já passaram sem "compareceu/faltou" marcado (com os dois botões ali mesmo) e atendimentos das próximas 48 h ainda sem confirmação. Item vazio some; sem nada, "Tudo em dia".
- **Hoje**: os atendimentos do dia.
- **Não agendaram**: quantos contatos estão em "Não agendou" e quantos podem ser retomados (não pediram para parar e falaram com você nos últimos 30 dias). Nenhuma mensagem sai sozinha daqui: o link leva à ficha do cliente.
- **Resultados do mês**: botão "Ver resultados".

### Clientes

Lista (`/clientes`) e ficha (`/clientes/:id`) de quem já falou com o consultório. Poucos campos, quase tudo automático.

- Lista: nome ou telefone, origem, status, último contato, próximo atendimento, "pediu para parar" e quantos atendimentos teve (recorrência é contagem, não etapa). Busca por nome ou telefone e filtro por status.
- **Status** (no máximo quatro, derivados de fatos; ver H-31): **Novo contato**, **Agendado** (tem atendimento marcado), **Cliente** (compareceu ao menos uma vez), **Não agendou** (sem mensagem e sem agendamento há mais de 3 dias, ou só teve agendamentos cancelados ou faltas: é a lista de recuperação). Manual, auditado: **Perdido**, com um motivo de lista fixa (preço, distância, escolheu outro profissional, não precisa mais, número errado, outro); vale até chegar mensagem ou agendamento novo, ou até "voltar ao status automático".
- **Origem**: WhatsApp direto, indicação (com código), site, anúncio, importado, cadastro manual. Só a evidência define sozinha: mensagem que chega é "WhatsApp direto" e cadastro pelo painel é "manual". Indicação, site e anúncio o profissional escolhe na ficha (anúncio automático só quando a Meta mandar o dado de origem, o que ainda não lemos). Nunca se deduz campanha sem prova.
- Ficha: conversa (link), atendimentos com "compareceu/faltou", histórico de consentimento (aceitou/pediu para parar, categoria, origem, data, quem), histórico do status, origem e perdido.
- **Saúde fora daqui**: não existe campo de queixa nem de anotação em contato, nota ou status; o texto das mensagens não aparece na lista nem na ficha. Se um dia houver campo de observação, terá aviso visível e ficará fora do contexto do assistente.

### Presença

No atendimento que já começou, o profissional marca "Compareceu" ou "Faltou" (na ficha do cliente e no Início); dá para corrigir. Alimenta o status "Cliente" e a taxa de faltas. Atendimento futuro ou cancelado não pode ser marcado.

### Resultados do mês

`/resultados`, filtro de período (este mês, mês passado, últimos 90 dias). Só dados reais; cada número mostra a conta e a fórmula; abaixo de 5 casos aparece "sem dados suficientes" com as contagens, nunca um percentual.

| Número | Fórmula |
|---|---|
| Conversas | conversas com ao menos uma mensagem do paciente no período |
| Contatos novos e por origem | contatos criados no período |
| Primeira resposta (mediana) | das conversas abertas no período (primeira mensagem do paciente dentro dele) que foram respondidas, o tempo até a primeira resposta do assistente ou do profissional |
| Passaram para você (taxa de transferência) | conversas do período em que o controle foi para o profissional ÷ conversas do período |
| Agendamentos feitos / cancelamentos | atendimentos criados / cancelados no período |
| Taxa de faltas | faltou ÷ (compareceu + faltou), só atendimentos com presença marcada; a tela diz quantos ficaram sem marca |
| Recuperados | contatos que estavam em "Não agendou" e agendaram no período |
| Retornos | atendimentos criados no período para quem já tinha comparecido antes |
| Indicações | contatos criados no período com origem indicação |
| Dinheiro recuperado (H-41) | atendimentos agendados pelo assistente, marcados "Compareceu" e com início no período, somados pelo preço do serviço; quantos foram agendados com o consultório fechado; detalhe por semana (segunda a domingo, hora local). Estimativa pela tabela de preços, não valor recebido |

Aviso fixo de linha de base: os números começam na data do primeiro registro; para comparar com antes do assistente, o profissional anota hoje o que tem. Pedidos de agendamento ainda não são medidos (nada os registra).

### Assistente

- Nível de autonomia: automático, aprovar antes de enviar, desligado. A descrição de cada nível diz o que acontece na prática.
- Tom de voz: mensagens de exemplo e as quatro perguntas.
- Base de conhecimento: perguntas e respostas.
- **Perguntas que o assistente não soube**: lista com um toque para escrever a resposta e incluí-la na base.
- **Simulador**: conversa de teste que não envia nada ao WhatsApp, com a indicação de qual informação o assistente usou.
  - Roda o mesmo caminho do turno real (pré-filtros, prompt, validação da saída; código em `packages/agent`), sem conversa, contato nem mensagem gravados: a conversa de teste vive só na tela. O que sai de cada resposta ("O que o assistente usou") vem das chamadas de ferramenta e da comparação da resposta com os dados cadastrados (serviço e preço, endereço, como chegar, base de conhecimento), nunca do que o modelo diz ter usado.
  - Ferramentas: consulta de horários roda de verdade, mas sem registrar ofertas; agendar, remarcar e cancelar não existem no simulador (a tela avisa); transferir e registrar dúvida só marcam o que aconteceria. A checagem de urgência por Jev (julgamento extra antes do modelo) não roda aqui; a lista de palavras sim.
  - Custo: usa o gateway de IA como a produção (em desenvolvimento, Groq grátis). O uso entra em `ai_usage` com `task` iniciada por `simulator:` e sem `turn_id`/`conversation_id`. Limite de 30 mensagens por hora por consultório (resposta 429); o limite fica em memória do processo da API (hipótese: uma instância).

### Perfil do negócio

M-04 (`/mais/perfil`, H-38): nome, o que faz, telefone, site, rede social, link de avaliação do Google; formas de pagamento em pílulas; prazo para desmarcar e a regra em palavras; pacotes (nome e valor exato); endereços (o primeiro é o principal, com nome e como chegar); quem atende (o primeiro é a agenda do assistente); mensagem de boas-vindas colada. Texto com "cliente" e "negócio".

### Serviços e local

- Serviços com duração e valor; aviso quando a especialidade restringe divulgar preço.
- Endereço e instruções de chegada, com pré-visualização de como o paciente recebe.

### Conexões

- WhatsApp: tipo de conexão, estado, número, e a ação para reconectar. Na conexão por QR code, o aviso de risco fica sempre visível e há a oferta de migrar para a oficial.
- Google Calendar: estado, calendário escolhido, última sincronização.
- Recebimento de sinal (módulo Pro): Mercado Pago ou chave Pix.

### Plano e uso

- Plano atual, conversas usadas na franquia, previsão para o mês e o bloco "WhatsApp (Meta)": respostas grátis da Meta usadas no mês (ex.: "640 de 1.000"), mensagens com custo por categoria e custo estimado, `GET /api/usage/meta`. Texto: "Estimativa da Meta no seu cartão: R$ X". A Meta cobra no cartão do cliente; não entra na nossa fatura.
- Teto de excedente, troca de plano, faturas, cancelamento.

### Onboarding

O convite (`/convite/:token`) confere o link (página amigável se inválido, vencido, usado ou cancelado) e leva à criação da conta (Google ou e-mail); `/criar-conta` sem convite explica que o acesso é por convite e aponta para a lista de espera. Depois, os seis passos de [09](09-site-aquisicao-suporte.md) como um fluxo só, um passo por tela, nesta ordem: onde seus clientes acham você (pré-preenchimento com revisão, área, CPF/CNPJ), conectar WhatsApp (com a mensagem de boas-vindas), serviços e pacotes, horários (com Google Agenda), teste com seus dados, ativação (com instalar e notificações). O trabalho de cada passo é feito no próprio passo. Depois da ativação, a lista "Para deixar o assistente ainda melhor" fica no Início até ser cumprida. Barra de progresso ("Passo X de N"), botão Voltar, continuar depois. O botão de ativar fica desligado até o WhatsApp conectar.

### Operador (interno)

Fora da navegação do cliente, em endereço e autenticação próprios: convites (H-37: "Novo convite" com nome do consultório e e-mail opcional, o link aparece uma vez para copiar; lista com estado aguardando, usado, vencido ou cancelado; gerar novo link, que invalida o anterior, e cancelar), clientes, custos, falhas, acesso assistido com motivo e prazo, e o painel "Gasto dos clientes na Meta no mês" (apoio; não é custo nosso): totais de todos os clientes (respostas, mensagens com custo, custo estimado) e os cinco clientes de maior custo, `GET /api/operator/meta-usage`. Só contagens e nomes de clientes, sem conteúdo nem dados de paciente.

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
| Resumo da semana (H-41) | Sim, segunda às 8h, e e-mail ao dono; desliga em Mais > Notificações | Não |

## Processo de design

1. E-08 define a direção com a skill `impeccable` e grava `DESIGN.md`, com referências reais por tela anexadas (fontes em [../plan/IMPLEMENTACAO.md](../plan/IMPLEMENTACAO.md)).
2. Cada etapa de tela (E-16, E-17, E-23, E-24, S-01) começa lendo `DESIGN.md` e este arquivo, e termina com uma revisão pela `impeccable` e verificação em 360 px e em 1280 px.
3. Componentes de base acessíveis e sem estilo pronto; tokens próprios. Biblioteca de seções prontas não entra no painel.
4. A primeira versão de cada tela é mostrada ao dono do produto antes de seguir para a próxima.
