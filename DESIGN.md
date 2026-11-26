# DESIGN.md — Consultório Aberto, painel

Status: em vigor desde 25/11/2026, decisão do dono depois da crítica que deu 21/40 ao painel anterior ("kit de componentes padrão"). Substitui a direção de 24/11 ("o padrão da categoria, feito com capricho", azul-petróleo), que fica aposentada.

Direção: **grafite monocromático com uma cor de assinatura**, no registro de Linear, Cal.com e Vercel. Uma ferramenta de trabalho: o cinza recua, o conteúdo e os estados aparecem, e a única cor da casa tem um significado só: **o assistente está aqui**.

Cena de uso: consultório de dia, luz forte, celular numa mão entre um paciente e outro; à tarde, a secretária no computador. Por isso o painel tem claro e escuro, segue o sistema por padrão e deixa escolher em "Aparência".

## Cor

Estratégia: neutros grafite, ação em tinta (preto no claro, quase branco no escuro), **jade só onde o assistente está**, e cores de estado só quando carregam significado.

| Token           | Claro     | Escuro    | Uso                                                            |
| --------------- | --------- | --------- | -------------------------------------------------------------- |
| `--bg`          | `#FAFAFA` | `#09090B` | Fundo do app                                                   |
| `--surface`     | `#FFFFFF` | `#141417` | Listas, cartões, barra lateral, folhas                         |
| `--surface-2`   | `#F1F1F2` | `#1C1C20` | Campo, linha selecionada, item ativo, trilho                   |
| `--line`        | `#E4E4E7` | `#27272A` | Bordas e divisórias                                            |
| `--line-strong` | `#D4D4D8` | `#3F3F46` | Borda de campo, borda no foco do mouse, ponto inativo          |
| `--ink`         | `#111214` | `#F2F2F3` | Texto principal                                                |
| `--ink-2`       | `#63636B` | `#A1A1AA` | Texto secundário, hora, trecho de mensagem                     |
| `--action`      | `#111214` | `#F2F2F3` | Botão principal, filtro escolhido (texto `--action-ink`)       |
| `--action-ink`  | `#FFFFFF` | `#111214` | Texto sobre `--action`                                         |
| `--jade`        | `#00A389` | `#2BC9A8` | Marca do assistente: traço da navegação, progresso             |
| `--jade-ink`    | `#007A66` | `#2BC9A8` | Texto em jade (rótulo "Assistente", selo)                      |
| `--jade-soft`   | `#DDF5EF` | `#0E2E28` | Bolha do assistente, selo "Com o assistente", seleção de texto |
| `--attention`   | `#B54708` | `#F5A05A` | Precisa de você, contador de pendências                        |
| `--approval`    | `#6941C6` | `#B69CF7` | Rascunho aguardando aprovação                                  |
| `--ok`          | `#067647` | `#4ED08A` | Confirmado, conectado                                          |
| `--danger`      | `#C0251B` | `#FF8A80` | Urgência, erro, desconectado, Sair, ação destrutiva            |

Cada cor de estado tem o seu fundo `-soft` (`#FEF0E1` / `#2E1E10`, `#F1ECFC` / `#231C38`, `#FDECEA` / `#3A1715`).

- **Jade só onde o assistente está:** bolha do assistente, selo "Com o assistente", traço do item ativo da navegação, barra de progresso da configuração, ponto "assistente respondendo". Em nenhum outro lugar. Não é o verde do WhatsApp (`#25D366`): é mais azulado, mais escuro e nunca aparece como fundo grande.
- **Ação em tinta:** o botão principal é preto no claro e quase branco no escuro. Um por tela.
- **Separação real:** superfície sobre fundo sempre com borda `--line`, e no claro uma elevação leve (`--elevation`: 1–2 px de sombra com deslocamento). No escuro a borda faz o trabalho; a sombra só reforça.
- Estado nunca depende só de cor (RN-55): todo selo tem texto e ícone de forma própria; o ponto da barra lateral vem com a frase ao lado.
- Contraste conferido (WCAG 2.x): tinta 18,7:1 no claro e 17,8:1 no escuro; `--ink-2` 5,7:1 sobre o fundo claro e 7,2:1 sobre a superfície escura; `--jade-ink` 5,3:1 sobre branco; jade escuro 9,5:1 sobre o fundo; `--jade` claro 3,2:1 sobre branco (só em traço e barra, não em texto); atenção 4,9:1 sobre o próprio fundo; contador branco sobre atenção 5,4:1.

## Tipografia

**Geist** (variável, auto-hospedada por `@fontsource-variable/geist`, licença SIL OFL), com algarismos tabulares ligados no corpo inteiro (`font-feature-settings: 'tnum'`): horários, valores e contadores sempre alinham.

| Token        | Tamanho / linha       | Uso                                                  |
| ------------ | --------------------- | ---------------------------------------------------- |
| `--text-xs`  | 13 / 18               | Hora, selo, rótulo pequeno, status da barra lateral  |
| `--text-sm`  | 15 / 22               | Trecho de mensagem, texto secundário, filtros        |
| `--text-md`  | 16 / 24               | Corpo, mensagens, campos (16 evita o zoom do iPhone) |
| `--text-lg`  | 20 / 28, 600          | Título de seção, nome do passo                       |
| `--text-xl`  | 28 / 34, 600, −0,02em | Título de tela, números de Resultados                |
| `--text-2xl` | 40 / 44, 600, −0,03em | Números do mês no Início                             |

- Pesos: 400 no corpo, 500 em rótulos e itens, 600 em títulos e números. Sem 800/900.
- Hora no formato brasileiro: 15:00, ter., 05/01. Valor: R$ 180,00.

## Layout

- **Listas e telas de trabalho em largura total.** Margem lateral de 16 px no celular, 32 px a partir de `md`, 48 px a partir de `xl`. Conversas, Agenda, Clientes e Início usam a largura toda.
- **Ajustes em uma coluna** (decisão do dono, 26/11/2026, que substitui as colunas lado a lado da mesma data): página de ajuste é um resumo em `max-w-2xl`; editor é uma coluna de até 560 px (`max-w-[35rem]`), alinhada à esquerda da área de trabalho. Nunca dois formulários lado a lado. A ficha do cliente continua em `max-w-3xl`.
- **Celular (360–390 px) primeiro:** barra inferior com cinco itens, listas de ponta a ponta, uma coluna.
- **Computador (`md`+):** barra lateral de 256 px: nome do consultório, cartão "Primeiros passos · X de N" enquanto houver passo pendente, navegação (Início, Conversas, Agenda, Clientes e o grupo recolhível "Configurações" com as páginas de ajuste), e no rodapé a situação do atendimento (assistente e WhatsApp, em palavras), "Aparência" e "Sair". A lateral rola sozinha se a tela for baixa.
- **Usar a largura (`lg`+):** Conversas em lista + conversa lado a lado (como o WhatsApp Web); Agenda abre na semana, com os dias em colunas (2 em `md`, 3 em `xl`, 4 em `2xl`); Início com os quatro números numa faixa e duas colunas a partir de `xl` (o que precisa de você e hoje / quem não agendou e resultados); Resultados em grade de números. Não há segunda coluna de menu: a lista de ajustes mora na lateral.
- Grade de 4 px. Espaçamentos: 4, 8, 12, 16, 20, 24, 32, 48.
- Raio: 10 px em campos e botões, 14 px em cartões e listas, 18 px nas bolhas, círculo em avatares e selos.

## Componentes

- **Navegação:** no celular, Início, Conversas, Agenda, Clientes, Mais (spec 10); no computador, Mais dá lugar ao grupo "Configurações" (ícone de engrenagem, seta que gira), recolhível, aberto sozinho quando uma página de ajuste está ativa; os itens do grupo vêm recuados, só com o nome, e o contador do Assistente em `--attention-soft`. Item ativo em tinta, fundo `--surface-2` na lateral, e o **traço jade**: 2 px na borda de cima no celular, na borda esquerda na lateral (também nos itens do grupo). Conversas leva o contador de pendências em `--attention`. "Configuração" não tem aba: no celular pertence a Mais, que fica ativo em `/configuracao`; no computador o cartão do topo é a volta.
- **Volta à configuração:** enquanto houver passo pendente, "Primeiros passos · X de N" com barra jade no topo da lateral (computador), numa faixa fina sob os alertas (celular) e como primeira linha de Mais, todos levando a `/configuracao`; no Início, o próximo passo aparece dentro do quadro de situação. Tudo some quando a configuração termina.
- **Faixa de alerta:** no topo, acima de tudo, em `--danger-soft`, com uma frase e o botão que leva à correção. Uma faixa por vez; no Início ela não aparece (o quadro de situação mostra o mesmo alerta).
- **Quadro de situação** (Início, `StatusCard`): cartão único no topo com a coisa mais importante (ícone de traço + título em 20 px + um botão; cheio só para problema e configuração), e embaixo, separadas por uma linha, as três frases da situação (assistente, WhatsApp, teste) com o ponto de cor ao lado. Problema: fundo `--danger-soft`, borda `--danger` a 40%.
- **Confirmação** (`confirmAction`/`confirmThen`/`confirmRemove`, Radix AlertDialog): no celular, folha que sobe da base (`sheet-in`, 260 ms, ease-out exponencial; o único movimento autoral do painel); no computador, janela de 448 px no centro. Título curto em pergunta, uma frase de consequência, o verbo no botão ("Remover", "Desconectar"; vermelho quando não dá para desfazer) e "Voltar" fantasma. Esc e o fundo fecham.
- **Momento do primeiro atendimento** (`FirstBookingMoment`): cartão `--jade-soft` com o visto em jade que entra com um leve salto (`moment-in`, 420 ms), uma vez na vida do consultório. Única celebração do painel.
- **Remover:** nunca ao lado de "Editar" numa lista; fica no fim do editor do item (`FormActions onRemove`), fantasma em `--danger`, com confirmação.
- **Desfazer** (`runWithUndo`, `useLeaving`): para o que dá para voltar atrás, a linha some na hora e um aviso "Atendimento cancelado." com o botão "Desfazer" fica 6 s; a alteração só vai ao servidor quando o aviso fecha (ou a página fecha). Se falhar, a linha volta e o erro aparece.
- **Avisos (toasts):** embaixo, acima da barra do celular (não cobrem título nem botão principal); texto de 16 px, botão de ação com 44 px numa linha própria; "Desfazer" fica 6 s; erro com "Tentar de novo" fica até ser usado ou fechado. Erro sempre com o que houve, o que fazer (descrição) e "Tentar de novo" quando uma alteração falhou (`notifyError`).
- **Erro de carregamento** (`LoadError`): cartão `--danger-soft` com o que houve, o que fazer e "Tentar de novo" com ícone.
- **Atalhos do teclado:** lista em janela (`ShortcutsSheet`), teclas em `kbd` com borda `--line-strong`; entrada no rodapé da lateral.
- **Ajuda na tela:** "?" (círculo, 44 px de alvo) ao lado do título abre o artigo da tela; dica da primeira visita numa linha discreta em `--ink-2` com lâmpada e "Entendi".
- **Linha de conversa:** 72 px, avatar com iniciais (círculo com borda), nome, trecho, hora e selo de quem está com a conversa; a aberta fica em `--surface-2`.
- **Bolhas:** paciente à esquerda em `--surface` com borda; assistente à direita em `--jade-soft` com rótulo "Assistente" em `--jade-ink`; você à direita em `--action` com texto `--action-ink` e rótulo "Você"; sistema no centro em pílula. Autoria por rótulo e posição, não só por cor. Largura máxima de 85% (36rem no computador).
- **Rascunho para aprovação:** cartão em `--approval-soft` acima do campo, com Enviar, Editar, Descartar.
- **Ação principal no título** (`Screen action`): ao lado do título no computador; no celular, botão de largura total logo abaixo do título.
- **Botões:** principal em `--action`; secundário com contorno; fantasma para Voltar e Pular; destrutivo em `--danger` com confirmação (RN-54). Um principal por tela. 44 px de altura, texto de 16 px.
- **Filtros e escolhas:** pílulas (`ChoicePills`, o mesmo componente em Conversas, Clientes e Resultados) que quebram linha, nunca rolagem lateral; a escolhida em `--action`; quando ajuda, com a contagem ("Precisam de você (2)"). Escolha grande (especialidade) em fichas de 48 px, a escolhida com borda e anel em tinta.
- **Aparência:** "Sistema / Claro / Escuro", controle segmentado em Mais e no rodapé da lateral. Padrão: sistema. A escolha fica no `localStorage` (`ca-theme`) e é aplicada em `<html data-theme>` antes da pintura, por um script em `index.html`, sem piscar.
- **Mais (celular):** todas as linhas terminam igual: seta, ícone de link externo ou "Em breve". Sair é a última linha, em `--danger`. No computador, `/mais` é "Notificações e aparência" (último item do grupo) e Sair fica no rodapé da lateral, discreto até o hover, quando ganha `--danger`.
- **Números:** Início em faixa única dividida por linhas finas (40 px); Resultados em grade de linhas finas (28 px). Valor que ainda não tem amostra aparece em texto normal ("Dados insuficientes"), nunca no estilo de número grande.
- **Estados de tela (RN-53):** carregando com esqueleto no formato do conteúdo; erro com o que houve e o que fazer; vazio com título, uma frase, a próxima ação e um desenho apagado do que vai aparecer ali, no formato de cada tela (linhas de conversa, horas do dia, linhas de cliente). Sem o molde "ícone num quadrado" repetido.
- **Base:** shadcn/ui sobre Radix, com o código em `apps/web/src/components/ui` e as variáveis do shadcn apontando para estes tokens em `apps/web/src/index.css`.
- **Ícones:** lucide-react, traço 1,75 na navegação, 24 px na barra inferior e 18 px na lateral. Sempre com rótulo; ícone sozinho só com `aria-label`.
- **Superfícies do navegador:** seleção de texto em `--jade-soft`, cursor de texto em jade, barra de rolagem fina em `--line-strong`, foco com contorno em tinta.
- **Símbolo provisório:** porta entreaberta em `apps/web/src/app/brand-mark.tsx`, em tinta, até o logo ser desenhado (`docs/brand.md`).

- **Resumo de ajustes** (`SummaryScreen` + `SummaryList`): título, uma linha de para que serve, "Faltam N itens" ou "Tudo pronto por aqui.", e a lista. Cada linha (80 px de alvo) tem ícone de traço, o assunto em 16 px/500, o valor atual em palavras em `--ink-2` (até duas linhas) e a situação com ícone e texto: "Feito" (visto, `--ok`), "Falta configurar" (alerta, `--attention`) ou "Opcional" (`--ink-2`). À direita, "Editar ›"; a primeira linha que falta configurar leva o botão cheio "Configurar", o único da tela. A linha inteira é o link.
- **Editor** (`EditorScreen`): "‹ {resumo}" no topo, título, uma linha de explicação, os campos essenciais, "Mais opções" (um `<details>` em cartão, fechado) com o resto, e embaixo "Salvar" (cheio, largura total no celular) e "Voltar" (fantasma). Salvou: aviso "Alterações salvas." e volta ao resumo.
- **Configuração inicial** (`/configuracao`): uma pergunta por tela na mesma coluna de 560 px. No topo, "Passo X de 8" e a barra jade; depois a pergunta em 28 px, uma linha de por quê, o trabalho do passo, e embaixo, separado por uma linha, "Continuar" (cheio, largura total no celular), "Pular por agora" e "Voltar" (fantasmas). Sem lista de passos ao lado. Fim: círculo jade-claro com visto, "Pronto!", uma frase e "Ver as conversas".

## Movimento

- 150 a 300 ms, saída suave. Só para dar retorno: troca de tema, barra de progresso avançando, nova mensagem, folha abrindo.
- Retorno visível em até 100 ms a cada toque (RN-54).
- Com "reduzir movimento" ligado, as transições viram troca direta.

## Texto

Direto, segunda pessoa, frases curtas, sem jargão de software (RN-56). Mensagem de indisponível diz por quê e o que fazer.

## Pendências

- Nenhuma de cor. O site público (`apps/site`) migrou para este mundo em 25/11/2026, no modo de venda: mesmos tokens claro e escuro (segue o sistema, sem seletor), Geist auto-hospedada, títulos grandes (até 76 px, −0,035em), uma faixa grafite invertida ("Não inventa") e o jade só nas bolhas e no horário marcado pelo assistente. Favicon e imagem de compartilhamento com o símbolo provisório.
