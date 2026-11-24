# DESIGN.md — Consultório Aberto, painel

Status: proposta aprovada na prévia (E-08, 24/11/2026); login e casca do painel construídos com estes tokens em `apps/web`. Aprovado pelo dono, com as telas de login e da casca, em 24/11/2026.

Direção: **o padrão da categoria, feito com capricho** (escolha do dono). Régua: Nubank / Inter na clareza e no texto; WhatsApp Business na lista de conversas e nas bolhas. Quem usa esses apps sabe onde está tudo no primeiro segundo. Familiaridade vale mais que originalidade. O que é da casa fica nos detalhes: o estado de cada conversa legível de longe, os horários sempre alinhados e o texto em português direto.

Cena de uso: consultório de dia, luz forte, celular numa mão entre um paciente e outro. Por isso o tema claro é o padrão; o escuro segue o sistema do aparelho.

## Cor

Estratégia: neutros levemente frios, **uma cor de marca** e cores de estado que só aparecem quando carregam significado.

| Token              | Claro     | Escuro    | Uso                                                     |
| ------------------ | --------- | --------- | ------------------------------------------------------- |
| `--bg`             | `#F5F7F8` | `#0E1214` | Fundo do app                                            |
| `--surface`        | `#FFFFFF` | `#171C1F` | Listas, cartões, folhas                                 |
| `--surface-2`      | `#EEF2F4` | `#1F2629` | Campo de texto, linha selecionada                       |
| `--ink`            | `#13191C` | `#E8EDEF` | Texto principal                                         |
| `--ink-2`          | `#5A676D` | `#9AA7AD` | Texto secundário, hora, trecho de mensagem              |
| `--line`           | `#E1E7EA` | `#2A3236` | Divisórias                                              |
| `--brand`          | `#0B6E7A` | `#4FC1CC` | Ação principal, item ativo da navegação, links          |
| `--brand-ink`      | `#FFFFFF` | `#06282C` | Texto sobre a cor de marca                              |
| `--brand-soft`     | `#E1F1F3` | `#163338` | Bolha do assistente, fundo de seleção                   |
| `--attention`      | `#B8480F` | `#F29A62` | Precisa de você (conversa aguardando, pedido de humano) |
| `--attention-soft` | `#FCEBDF` | `#3A2418` | Fundo do selo e da faixa "precisa de você"              |
| `--approval`       | `#6A4BC4` | `#B29CF2` | Rascunho aguardando sua aprovação                       |
| `--approval-soft`  | `#EEE9FB` | `#2A2340` | Fundo do cartão de rascunho                             |
| `--ok`             | `#1F7A3E` | `#6BD18F` | Confirmado, conectado                                   |
| `--danger`         | `#B42318` | `#FF8A80` | Urgência, erro, desconectado, ação destrutiva           |
| `--danger-soft`    | `#FDE8E6` | `#3D1C1A` | Faixa de alerta                                         |

- O azul-petróleo é a cor de marca do Consultório Aberto (`docs/brand.md`). Fica num token só, para a troca ser uma linha.
- Verde de WhatsApp não entra: o painel não pode parecer o WhatsApp nem ser confundido com ele.
- Estado nunca depende só de cor (RN-55): todo selo tem texto ("Precisa de você", "Com o assistente", "Aguardando aprovação") e um ícone de forma diferente.
- Contraste AA conferido em todos os pares de texto acima, nos dois temas.

## Tipografia

Fonte do sistema: San Francisco no iPhone, Roboto no Android, Segoe no Windows. É a mesma que o WhatsApp e os bancos usam em cada aparelho, carrega na hora e não precisa de download.

`font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`

| Token        | Tamanho / altura de linha | Peso | Uso                                                           |
| ------------ | ------------------------- | ---- | ------------------------------------------------------------- |
| `--text-xs`  | 12 / 16                   | 500  | Hora, rótulo de selo                                          |
| `--text-sm`  | 14 / 20                   | 400  | Trecho de mensagem, texto secundário                          |
| `--text-md`  | 16 / 24                   | 400  | Corpo, mensagens, campos (16 evita o zoom do iPhone ao focar) |
| `--text-lg`  | 18 / 24                   | 600  | Nome na lista, título de seção                                |
| `--text-xl`  | 22 / 28                   | 700  | Título de tela                                                |
| `--text-2xl` | 28 / 34                   | 700  | Números do "Hoje"                                             |

- Horários, valores e contadores sempre com `font-variant-numeric: tabular-nums`.
- Hora no formato brasileiro: 15:00, ter., 05/01. Valor: R$ 180,00.

## Espaço, forma e densidade

- Grade de 4 px. Espaçamentos: 4, 8, 12, 16, 20, 24, 32, 48.
- Margem lateral de 16 px no celular; conteúdo com no máximo 720 px de largura no computador, com a navegação na lateral.
- Raio: 10 px em campos e botões, 16 px em folhas e cartões, 18 px nas bolhas, círculo nos avatares e selos.
- Sombra só em elementos que flutuam (folha inferior, menu). Listas e cartões se separam por divisória ou fundo, não por sombra.
- Alvo de toque mínimo de 44 × 44 px (RN-55). A linha da lista de conversas tem 72 px, como no WhatsApp.
- Densidade média: uma informação principal por linha, no máximo duas secundárias.

## Componentes

- **Navegação:** barra inferior no celular com Conversas, Agenda, Hoje e Mais. O item ativo fica na cor de marca e com rótulo. Conversas leva um contador de pendências na cor de atenção. No computador a navegação vai para a lateral.
- **Faixa de alerta:** no topo, acima de tudo, em `--danger-soft`, com uma frase e um botão que leva à correção ("WhatsApp desconectado. Reconectar").
- **Linha de conversa:** avatar com iniciais, nome ou telefone, trecho da última mensagem, hora e o selo de quem está com a conversa. As que precisam de você vêm primeiro, com o selo de atenção.
- **Bolhas:** paciente à esquerda, em `--surface`. Assistente à direita, em `--brand-soft`, com o rótulo "Assistente". Você à direita, em `--brand` com texto claro, com o rótulo "Você". Sistema no centro, em pílula pequena ("Você assumiu a conversa às 14:32"). A autoria aparece no rótulo e na posição, não só na cor.
- **Rascunho para aprovação:** cartão em `--approval-soft` acima do campo de texto, com o texto sugerido e três botões de um toque: Enviar, Editar, Descartar.
- **Barra de controle da conversa:** fixa, com "Assumir" quando está com o assistente e "Devolver ao assistente" quando está com você.
- **Botões:** principal cheio na cor de marca, secundário com contorno, destrutivo em `--danger` e sempre com confirmação (RN-54). Um botão principal por tela.
- **Estados de tela (RN-53):** carregando com esqueleto no formato do conteúdo; vazio com uma frase e a próxima ação; erro com o que houve e o que fazer.
- **Base:** shadcn/ui sobre Radix (decisão do dono, 24/11/2026). O código dos componentes fica no projeto (`apps/web/src/components/ui`), e as variáveis do shadcn apontam para estes tokens em `apps/web/src/index.css`. O tema padrão do shadcn não é usado: botão e campo com 44 px de altura e texto de 16 px; o shadcn vem com 32 px e 14 px.
- **Ícones:** lucide-react, traço de 2 px, 24 px na barra inferior e 20 px na lateral. Sempre com rótulo de texto ao lado; ícone sozinho só com `aria-label`.
- **Símbolo provisório:** porta entreaberta em `apps/web/src/app/brand-mark.tsx` e nos ícones do PWA, até o logo ser desenhado (`docs/brand.md`).

## Movimento

- 150 a 200 ms, saída suave. Só para dar retorno: nova mensagem entrando, folha abrindo, selo mudando de estado.
- Retorno visível em até 100 ms a cada toque (RN-54).
- Com "reduzir movimento" ligado, as transições viram troca direta.

## Texto

Tom do Nubank: direto, segunda pessoa, frases curtas, sem jargão de software (RN-56).

| Em vez de                       | Escreva                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| "Handoff realizado com sucesso" | "Você assumiu a conversa"                                              |
| "Erro 500 ao sincronizar"       | "Não conseguimos falar com o Google. Tente de novo em alguns minutos." |
| "Nenhum registro encontrado"    | "Nenhuma conversa ainda. Teste o assistente no simulador."             |
| "Bot", "IA", "agente"           | "Assistente"                                                           |
| "Deletar"                       | "Apagar", sempre com confirmação                                       |

## Evitar (RN-57)

Gradiente decorativo; cartões idênticos com ícone; emoji como ícone; números de vaidade; sombra em tudo; o mesmo raio grande em todos os blocos; verde de WhatsApp; texto centralizado em telas de trabalho.

## Referências

- Nubank e Inter: listas de transações (ritmo da linha, hora à direita), telas de confirmação, tom do texto.
- WhatsApp Business: lista de conversas, bolhas, campo de texto e anexos, rótulos de conversa.
- Mobbin não foi usado (assinatura paga); as referências vêm dos próprios apps.
- Bibliotecas animadas (Aceternity, Obsidian UI) e galerias de seção pronta (Jiro) ficam fora do painel (RN-57). Para o site (S-01), podem servir: header.design como referência de topo, Aceternity para um ou dois momentos animados, transitions.dev como referência das microinterações do inbox (aprovar, enviar, assumir), sempre com os nossos tokens e respeitando "reduzir movimento".
