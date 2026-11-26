# 01 — Produto e planos

## Visão

Recepção digital por WhatsApp para profissionais de saúde autônomos no Brasil. Atende o paciente na hora, responde dúvidas administrativas, agenda, lembra e cobra. Cada profissional é uma configuração; não existe código por cliente.

## Usuários

| Persona | O que precisa |
|---|---|
| Profissional (dono da conta) | Não perder paciente por demora, não gastar tempo com perguntas repetidas, assumir a conversa quando quiser |
| Paciente | Resposta rápida, horário, preço, endereço, sem instalar nada |
| Recepcionista (plano Clínica) | Inbox compartilhado, transferência entre profissionais |
| Operador da plataforma (nós) | Onboarding, suporte, custos por cliente, qualidade |

## Limites do produto

- **Identidade, escolhida por cliente** (decisão do dono em 24/11/2026, `tenants.identity_mode`):
  - `assistant` (padrão): apresenta-se como assistente virtual do profissional na primeira mensagem de cada conversa nova.
  - `clinic`: fala como a recepção do consultório ("aqui é do consultório"), no tom do profissional, sem anunciar que é IA.
  - `professional`: fala em nome do profissional, em primeira pessoa, sem se apresentar como assistente. O dono escolheu oferecer este modo ciente dos riscos: o paciente pode contar sintoma ou urgência achando que o profissional leu; a transparência exigida pela LGPD e pelo Código de Defesa do Consumidor pesa contra enganar o paciente (não verificado com advogado); e a descoberta prejudica a reputação do profissional.
  - Em todos os modos: perguntado diretamente se é robô, assistente ou o próprio profissional, diz a verdade; urgência e transferência avisam o profissional de verdade (a notificação real entra na E-16 e é bloqueio antes de qualquer paciente real; até lá, nenhuma mensagem promete esse aviso); nunca diz que leu, avaliou ou vai tratar algo de saúde.
- O assistente trata só de assuntos administrativos. Não diagnostica, não avalia sintoma, não orienta tratamento. Pode perguntar a queixa (o que incomoda e há quanto tempo), para o profissional chegar preparado (decisão do dono, 25/11/2026).
- Preço, horário, agendamento e pagamento vêm de dados estruturados. O modelo não é fonte desses dados.
- Urgência ou sofrimento intenso: o assistente orienta procurar atendimento de emergência (SAMU 192) e notifica o profissional.

## Requisitos funcionais do MVP (cliente piloto)

| ID | Requisito |
|---|---|
| RF-01 | Responder a primeira mensagem do paciente em até 30 segundos, a qualquer hora |
| RF-02 | Informar serviços e valores cadastrados, quando a política da especialidade permitir |
| RF-03 | Mostrar horários livres conforme regras de disponibilidade e agenda |
| RF-04 | Agendar, remarcar e cancelar, com confirmação explícita do paciente antes de gravar |
| RF-05 | Enviar endereço e instruções de chegada cadastradas (texto livre do profissional, ex.: campainha ao lado do portão grande) |
| RF-06 | Pausar quando o profissional responde pelo celular ou clica em "assumir"; retomar só por ação explícita ou expiração configurada |
| RF-07 | Transferir para o profissional quando não souber responder, quando o paciente pedir ou em caso de urgência |
| RF-08 | Transcrever áudios do paciente e responder em texto |
| RF-09 | Enviar confirmação do agendamento e lembrete antes da consulta |
| RF-10 | Painel web: inbox, agenda, configurações, uso do mês |
| RF-11 | Onboarding guiado: conectar WhatsApp, conectar Google, cadastrar serviços, horários, endereço e tom de voz |
| RF-12 | Registrar custo de IA e mensagens por cliente e por conversa |
| RF-13 | Nível de autonomia por cliente: **automático** (o assistente responde), **aprovar antes de enviar** (o assistente redige, o profissional aprova, edita ou descarta com um toque; sem aprovação em tempo configurável, nada é enviado e o profissional é lembrado) e **desligado** (sem IA: só inbox, mensagem fixa de ausência, confirmações e lembretes). Cliente novo começa em "aprovar antes de enviar" |
| RF-14 | Modo férias: o profissional informa o período; o assistente avisa os pacientes e só oferece horários depois dele |
| RF-15 | Agenda do dia seguinte enviada ao profissional toda noite, em horário configurável, pelo WhatsApp ou por notificação do painel |
| RF-16 | Onboarding pelo histórico (opcional, primeiro a cortar se o prazo apertar): com autorização do profissional, sugerir perguntas frequentes e tom de voz a partir das conversas sincronizadas. Mensagens com informação de saúde são descartadas antes da extração; nada entra na base sem aprovação dele |

Não existe um segundo produto "sem IA" com menu de opções. O nível "desligado" reaproveita as partes determinísticas que já existem e serve a quem quer só lembretes, a quem está inadimplente ou acima do teto, e como contingência se os provedores de IA caírem.

Fora do MVP: Pix, follow-up, reativação, pedido de avaliação, CRM, resposta em áudio, vários profissionais, documentos, telefonia.

## Planos

A estrutura proposta no master prompt faz sentido com três ajustes:

1. **Lembrete e confirmação ficam no plano Agenda**, mas lista de espera vai para o Pro. Lista de espera exige mensagem ativa fora da janela e lógica de oferta, e pouco profissional solo usa no começo.
2. **Agente supervisor e inteligência operacional não são itens de venda.** O cliente compra "relatório de qualidade" e "recomendações". Por dentro são tarefas em lote.
3. **Voz, documentos e telefonia são módulos adicionais**, porque o custo varia por uso e nem todo cliente quer.

| Plano | Inclui | Franquia mensal |
|---|---|---|
| Essencial | Atendimento, serviços e preços, endereço, tom de voz, base de conhecimento curta, inbox, transferência para humano, áudio do paciente, relatório básico | 300 conversas |
| Agenda | Essencial + Google Calendar, agendar, remarcar, cancelar, confirmação, lembrete, regras de horário, sinal por Pix com chave manual (confirmação pelo profissional) e leitura do comprovante de Pix | 500 conversas |
| Pro | Agenda + sinal Pix com confirmação automática (Mercado Pago, depois), leitura de documento ou carteirinha, resumo de pedido médico ou exame (desligado até o dono ligar), follow-up, recuperação de interessados, reativação, pedido de avaliação, lista de espera, CRM administrativo, relatório de qualidade | 1.000 conversas |
| Clínica | Pro + vários profissionais e agendas, equipe e permissões, salas e equipamentos, relatórios por profissional | 1.000 conversas com 2 profissionais; cada profissional a mais soma 250 conversas |

"Conversa" para franquia: sequência de mensagens com o mesmo paciente sem intervalo maior que 24 horas.

### Módulos adicionais

| Módulo | Cobrança | Motivo |
|---|---|---|
| Resposta em áudio (voz padrão) | Pacote de minutos | Custo por minuto de fala |
| Documentos (base de conhecimento grande, PDFs) | Valor fixo por faixa de páginas | Custo de indexação e de contexto maior |
| Mensagens ativas (reativação, campanhas) | Repasse do custo Meta, pago pelo cliente direto à Meta | Marketing custa R$ 0,32 por mensagem |
| Profissional adicional | R$ 147 por mês, +250 conversas de franquia (`EXTRA_PROFESSIONAL` em `plans.ts`) | Só no plano Clínica, a partir do 3º profissional; os demais planos têm 1 profissional e sem adicional (decisão de 25/11/2026, `founder/pricing.md`) |
| Telefonia | Não ofertado | Incompatível com coexistência; exige segundo número |
| Voz clonada do próprio profissional | Valor fixo + pacote de minutos (Fase 5) | Exige termo de consentimento; ver [06](06-seguranca-e-lgpd.md) |

### Recursos (liga e desliga)

Decisão do dono, 26/11/2026 (H-51). Cada recurso que o dono pode ligar ou desligar tem uma chave e o plano mais baixo que o inclui; os planos acima também o incluem. O catálogo fica em `packages/core/src/features.ts` e é a única fonte para API, painel e worker.

| Chave | Recurso | Plano |
|---|---|---|
| `audio_transcription` | Entender áudios do cliente (RF-08) | Essencial |
| `pix_deposit` | Sinal por Pix com chave manual ([05](05-agenda-e-pagamentos.md)) | Agenda |
| `ocr_pix_receipt` | Ler comprovante de Pix e sugerir a confirmação do sinal | Agenda |
| `ocr_id_card` | Ler documento ou carteirinha e sugerir nome, CPF e nascimento | Pro |
| `ocr_medical_request` | Resumo factual de pedido médico ou exame, só para o profissional ([06](06-seguranca-e-lgpd.md)); nasce desligado | Pro |

- Planos decididos pelo dono em 26/11/2026: o sinal manual e a leitura do comprovante entram no Agenda (à venda), porque andam juntos e o fluxo manual não nos custa nada; o Pro ganha a leitura de documento ou carteirinha, o resumo de exame e a confirmação automática do sinal (Mercado Pago, depois). Preços sem mudança.
- Dentro do plano, o recurso nasce ligado (menos o resumo de exame, dado de saúde, que nasce desligado); o dono desliga em Conta > Recursos. Fora do plano, nunca liga, e a tela mostra em que plano ele está, sem propaganda.
- Onde o recurso roda (ferramenta do agente, job do worker), o código confere `featureEnabled` antes. Rebaixar o plano desliga na hora, mesmo com escolha salva.
- Guardado em `feature_settings` (uma linha por escolha do dono, com RLS); sem linha vale o padrão do plano.

### Controle de custo imprevisível

- **Franquia por conversa, não por mensagem ou token.** É a unidade que o profissional entende.
- **Ao atingir 80% da franquia:** aviso no painel e por WhatsApp ao profissional.
- **Ao atingir 100%:** o atendimento continua. O excedente é cobrado por conversa na fatura seguinte, com teto configurável pelo cliente. Atingido o teto, o assistente passa a só avisar o paciente de que o profissional responderá em breve e notifica o profissional. Nunca deixa o paciente sem resposta. Franquias, excedente e mensalidades ficam em `packages/core/src/plans.ts` (fonte única); o teto e os avisos seguem a hipótese H-17.
- **Teto técnico por conversa:** máximo de 30 turnos do assistente e de custo de IA por conversa (valor em [04](04-agentes-e-ia.md)). Passou do teto, transfere para humano.
- **Custo da Meta:** cada cliente paga a Meta diretamente, com cartão próprio. O onboarding mostra a estimativa mensal conforme o volume informado.

### Preços

À venda agora só Essencial e Agenda; Pro e Clínica aparecem em /precos com preço e "em breve", sem assinatura, até as funções existirem (decisão de 25/11/2026, condição do conselho em `founder/board.md`). Não há taxa de implantação: a configuração assistida vem incluída em todo plano.

O master prompt pede preço fundamentado, não inventado. A proposta com margens está em [07-custos.md](07-custos.md). Os valores são hipótese até a validação com 5 a 10 profissionais.

## Expansão por especialidade

Cada especialidade tem um registro de política (`specialty_policy`) com:

- se pode informar preço proativamente, só quando perguntado, ou nunca;
- termos proibidos (ex.: promessa de resultado, "cura");
- texto de identificação do assistente;
- conduta em urgência;
- vocabulário (consulta, sessão, atendimento, avaliação).

Situação conhecida na pesquisa: CFM permite informar valor de consulta; CFN veda; COFFITO restringe; CFO e CFP não verificados. Quiropraxia não é profissão regulamentada em lei federal. Antes de abrir cada especialidade nova, revisar a norma do conselho e preencher a política.
