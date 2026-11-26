# Arquitetura de informação do painel (shape, 26/11/2026)

Brief curto, escrito antes de construir, a partir do retorno do dono: "está bem confuso as páginas, está difícil de fazer a configuração e encontrar as coisas"; "temos que permitir um usuário EXTREMAMENTE LEIGO conseguir configurar e usar tranquilamente".

## Quem chega e o que precisa

- **Profissional de saúde, nada técnico** (pense num quiroprata de 60 anos), no celular entre um paciente e outro. Nunca usou um sistema assim. Precisa: ver quem precisa dele, responder, ver a agenda; de vez em quando, mudar um preço ou um horário.
- **Sucesso:** acha qualquer ajuste em dois toques e cada tela tem um próximo passo óbvio.

## Regras de estrutura (valem para todo ajuste)

1. **Página de ajuste é um resumo, não um formulário.** Uma linha por assunto, com o valor atual em palavras ("Ter a Qui, 7h–20h") e a situação ("Feito" / "Falta configurar" / "Opcional"). A primeira linha que falta configurar leva o único botão cheio da página.
2. **Tocar abre um editor só daquele assunto:** uma coluna (até 560 px), 2 a 4 campos essenciais, o resto em "Mais opções", um "Salvar" e um "Voltar". Salvou, volta ao resumo.
3. **Uma coisa mora num lugar só** (Google Agenda, horários, WhatsApp).
4. **Palavras do dia a dia.** Nada de "franquia", "excedente", "template", "coexistência".

## Árvore dos ajustes (grupo "Configurações" da lateral; "Mais" no celular)

```
Meu consultório        /mais/consultorio
  Nome e apresentação  /negocio        nome, o que faz · Mais opções: telefone, site, rede, link de avaliação, boas-vindas
  Serviços e preços    /servicos       serviços (nome, duração, valor) · pacotes
  Horários             /horarios       dias e horas · folgas e férias · Mais opções: hora do resumo da agenda
  Endereço             /endereco       endereços (o primeiro é o principal)
  Quem atende          /quem-atende    profissionais
  Pagamento e desmarcação /pagamentos  formas de pagamento, prazo · Mais opções: regra em palavras, mensagem depois de falta
  Google Agenda        /google-agenda  conectar, escolher a agenda (opcional)
  WhatsApp             /whatsapp       conectar · Mais opções: QR code · importação do histórico
Assistente             /mais/assistente   como responde, o que sabe, mensagens automáticas, testar
Equipe                 /mais/equipe       quem acessa o painel (só o dono vê)
Conta                  /mais/conta        plano e uso, assinatura, avisos e aparência
Ajuda                  /mais/ajuda
```

Endereços antigos redirecionam, mantendo a consulta: `/agenda/disponibilidade` → Horários, `/mais/perfil` → Meu consultório, `/mais/servicos` → Serviços e preços, `/mais/conexoes` → WhatsApp.

## Configuração inicial (`/configuracao`)

Assistente de verdade: uma pergunta por tela, barra "Passo 2 de 6" no topo, sem lista de passos ao lado, botões grandes, "Pular por agora" onde o passo é opcional, e uma tela final "Pronto" com o próximo passo (abrir as conversas). O primeiro passo do servidor ("onde seus clientes acham você") vira telas curtas: sua área, CPF ou CNPJ, onde acham você (opcional).

## Telas do dia a dia

Início, Conversas, Agenda e Clientes ficam como estão na navegação. Ajustes de texto, estados (carregando, vazio, erro) e alvos de toque seguem a crítica registrada no PR.

## Hipóteses (sem resposta do dono; conservadoras)

- Editor é uma rota própria, não uma folha por cima: o botão Voltar do celular funciona e o link pode ser enviado.
- "Indique e ganhe" ainda não existe no produto; a linha entra em Conta quando existir.
