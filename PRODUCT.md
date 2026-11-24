# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Profissional de saúde autônomo** (dono da conta). Piloto: um quiropraxista, à vontade com celular, WhatsApp Business e Google Agenda. Usa o painel no celular, com uma mão, entre um paciente e outro.
- **Secretária** do piloto: também responde conversas, provavelmente no computador.
- **Paciente**: nunca usa o painel; conversa só pelo WhatsApp.
- **Operador da plataforma** (nós): área interna, fora da navegação do cliente.

## Product Purpose

Recepção por WhatsApp para profissionais de saúde autônomos no Brasil. O assistente atende o paciente na hora, responde dúvidas administrativas, agenda, lembra e cobra. O painel é onde o profissional acompanha, assume conversas, aprova respostas e configura. Sucesso: nenhum paciente perdido por demora e menos tempo do profissional com perguntas repetidas.

## Positioning

O profissional mantém o controle: começa em "aprovar antes de enviar", assume qualquer conversa com um toque, e o assistente nunca inventa preço, horário nem conduta clínica, porque esses dados vêm do cadastro e das ferramentas.

## Operating Context

- Uso em pé, entre atendimentos, com pressa; precisa ver primeiro o que pede ação.
- Três telas do dia a dia: Conversas, Agenda, Hoje. Configuração fora do caminho (docs/spec/10-painel-e-interface.md).
- Notificação push para urgência, pedido de humano e rascunho aguardando aprovação.

## Capabilities and Constraints

- PWA mobile-first (360 px primeiro), React, Vite, Tailwind, componentes acessíveis sem estilo pronto e tokens próprios.
- Textos em português do Brasil, segunda pessoa, sem termo de software; "assistente", nunca "bot" ou "IA" sozinha.
- Quatro estados em toda tela: carregando, vazio, erro, com dados.
- Nome e marca: **em aberto** (nome provisório "Recepção Inteligente"); o dono vai definir.
- Planos: Essencial, Agenda, Pro e Clínica, com franquia mensal de conversas; implantação de R$ 497 (hipótese).

## Brand Commitments

- Nome, logo e cor de marca: por definir pelo dono.
- Direção visual escolhida pelo dono em 24/11/2026: **o padrão da categoria, feito com capricho**. Régua de acabamento e de jeito de app: **Nubank / Inter** (clareza, poucos elementos por tela, texto direto em português) e **WhatsApp Business** (lista de conversas e bolhas que o profissional já conhece). Familiaridade vale mais que originalidade.

## Evidence on Hand

Nenhum depoimento, cliente ou número real ainda. Não inventar.

## Product Principles

1. O que precisa do profissional aparece primeiro.
2. O profissional sempre pode assumir; nada sai sem ele saber que pode.
3. Dados de preço, horário e agenda vêm do cadastro, nunca do modelo.
4. Nenhum enfeite sem função.

## Accessibility & Inclusion

Contraste AA, alvos de toque de 44 px, teclado, leitor de tela, respeito a "reduzir movimento" (RN-55). Autoria das mensagens distinguível sem depender só de cor.
