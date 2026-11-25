# 10 — Painel e interface

Define o que cada tela contém e como se comporta. Não define aparência: cor, tipografia, espaçamento e tom visual saem da etapa E-08 e ficam em `DESIGN.md`, na raiz do projeto.

## Princípios

| ID | Regra |
|---|---|
| RN-50 | Celular primeiro. Toda tela é desenhada para 360 px de largura e depois ampliada. O profissional usa entre um paciente e outro, com uma mão |
| RN-51 | Instalável (PWA), com notificação push. No iOS, o push exige o app instalado na tela inicial: o onboarding orienta |
| RN-52 | Tudo o que o profissional precisa no dia cabe em três telas: conversas, agenda, hoje. Configuração fica fora do caminho |
| RN-53 | Toda tela tem os quatro estados desenhados: carregando, vazio, erro e com dados. O estado vazio explica o que fazer |
| RN-54 | Nenhuma ação destrutiva sem confirmação; toda ação tem retorno visível em até 100 ms |
| RN-55 | Acessibilidade: contraste AA, alvos de toque de 44 px, navegação por teclado, leitor de tela, respeito a "reduzir movimento" |
| RN-56 | Textos em português do Brasil, na segunda pessoa, sem termo de software. "Assistente", nunca "bot", "agente" ou "IA" sozinha |
| RN-57 | Nada de enfeite sem função: sem gradiente decorativo, sem cartões idênticos com ícone, sem emoji como ícone, sem números de vaidade |
| RN-58 | Fuso do tenant em toda data e hora exibida |

## Navegação

Barra inferior no celular, lateral no computador:

1. **Conversas** (com contador de pendências)
2. **Agenda**
3. **Hoje**
4. **Mais**: assistente, serviços, conexões, plano e uso, equipe, ajuda

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
- Implementação (E-23): lista feita à mão, sem Schedule-X (sem dependência nova): dia no celular e semana como sete seções de dia, a partir do dia escolhido (`/agenda?dia=AAAA-MM-DD&visao=semana`). Em vez de tocar num horário livre da grade, o botão "Novo agendamento" abre o formulário com os horários livres do dia (mesmo `availableSlots` do assistente) e o toque no atendimento abre remarcar e cancelar. Horários do Google como ocupado entram com a E-21. A tela "Disponibilidade, bloqueios e férias" (`/agenda/disponibilidade`) edita os horários da semana, os bloqueios, as férias e o horário do resumo noturno.

### Hoje

- Próximos atendimentos do dia.
- O que precisa de atenção: conversas aguardando, rascunhos para aprovar, perguntas que o assistente não soube.
- Três números da semana, todos vindos do banco: conversas atendidas, agendamentos feitos pelo assistente, horas estimadas poupadas.

### Assistente

- Nível de autonomia: automático, aprovar antes de enviar, desligado. A descrição de cada nível diz o que acontece na prática.
- Tom de voz: mensagens de exemplo e as quatro perguntas.
- Base de conhecimento: perguntas e respostas.
- **Perguntas que o assistente não soube**: lista com um toque para escrever a resposta e incluí-la na base.
- **Simulador**: conversa de teste que não envia nada ao WhatsApp, com a indicação de qual informação o assistente usou.
  - Roda o mesmo caminho do turno real (pré-filtros, prompt, validação da saída; código em `packages/agent`), sem conversa, contato nem mensagem gravados: a conversa de teste vive só na tela. O que sai de cada resposta ("O que o assistente usou") vem das chamadas de ferramenta e da comparação da resposta com os dados cadastrados (serviço e preço, endereço, como chegar, base de conhecimento), nunca do que o modelo diz ter usado.
  - Ferramentas: consulta de horários roda de verdade, mas sem registrar ofertas; agendar, remarcar e cancelar não existem no simulador (a tela avisa); transferir e registrar dúvida só marcam o que aconteceria. A checagem de urgência por Jev (julgamento extra antes do modelo) não roda aqui; a lista de palavras sim.
  - Custo: usa o gateway de IA como a produção (em desenvolvimento, Groq grátis). O uso entra em `ai_usage` com `task` iniciada por `simulator:` e sem `turn_id`/`conversation_id`. Limite de 30 mensagens por hora por consultório (resposta 429); o limite fica em memória do processo da API (hipótese: uma instância).

### Serviços e local

- Serviços com duração e valor; aviso quando a especialidade restringe divulgar preço.
- Endereço e instruções de chegada, com pré-visualização de como o paciente recebe.

### Conexões

- WhatsApp: tipo de conexão, estado, número, e a ação para reconectar. Na conexão por QR code, o aviso de risco fica sempre visível e há a oferta de migrar para a oficial.
- Google Calendar: estado, calendário escolhido, última sincronização.
- Recebimento de sinal (módulo Pro): Mercado Pago ou chave Pix.

### Plano e uso

- Plano atual, conversas usadas na franquia, previsão para o mês e estimativa de gasto na Meta.
- Teto de excedente, troca de plano, faturas, cancelamento.

### Onboarding

Os oito passos de [09](09-site-aquisicao-suporte.md), um por tela, com barra de progresso, possibilidade de voltar e de continuar depois. O simulador vem antes de conectar o WhatsApp.

### Operador (interno)

Fora da navegação do cliente, em endereço e autenticação próprios: clientes, custos, falhas, acesso assistido com motivo e prazo.

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

## Processo de design

1. E-08 define a direção com a skill `impeccable` e grava `DESIGN.md`, com referências reais por tela anexadas (fontes em [../plan/IMPLEMENTACAO.md](../plan/IMPLEMENTACAO.md)).
2. Cada etapa de tela (E-16, E-17, E-23, E-24, S-01) começa lendo `DESIGN.md` e este arquivo, e termina com uma revisão pela `impeccable` e verificação em 360 px e em 1280 px.
3. Componentes de base acessíveis e sem estilo pronto; tokens próprios. Biblioteca de seções prontas não entra no painel.
4. A primeira versão de cada tela é mostrada ao dono do produto antes de seguir para a próxima.
