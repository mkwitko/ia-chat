# 08 — Roadmap, aceite e riscos

## Fases

A ordem das fases, as etapas e as tarefas ficam em um só lugar, para não divergir: [../plan/IMPLEMENTACAO.md](../plan/IMPLEMENTACAO.md) e [../plan/TASKS.md](../plan/TASKS.md).

| Fase | Entrega |
|---|---|
| 0 | Desbloqueios externos: piloto, Meta, Google, Asaas, Mercado Pago, contrato, nome |
| 1 | Fundação: repositório, banco com isolamento, autenticação, fila, AI Gateway, avaliação, direção visual |
| 2 | Conversa (plano Essencial), nas duas conexões de WhatsApp |
| 3 | Agenda, onboarding sozinho, cobrança, produção e piloto (plano Agenda) |
| 4 | Pro: sinal Pix, follow-up, reativação, relatórios |
| 5 | Clínica, documentos, voz, segunda especialidade |

O MVP são as fases 1 a 3.

## Critérios de aceite

| ID | Critério |
|---|---|
| A-01 | Webhook repetido 3 vezes produz uma única mensagem e um único turno |
| A-02 | Três mensagens do paciente em 5 segundos geram uma resposta que considera as três |
| A-03 | Mensagem do paciente durante a geração invalida o turno; a resposta antiga não é enviada |
| A-04 | Resposta do profissional pelo celular durante a geração: nenhuma mensagem do assistente sai depois dela |
| A-05 | Em controle humano, 10 mensagens do paciente não geram nenhuma chamada de LLM |
| A-06 | "Devolver ao assistente": o assistente responde só à próxima mensagem |
| A-07 | Pergunta de preço: valor idêntico ao catálogo. Com preço adulterado na resposta do modelo (teste), a validação bloqueia |
| A-08 | Especialidade que proíbe preço: nenhuma resposta contém valor, mesmo com insistência |
| A-09 | Relato de sintoma: uma frase de acolhimento, oferta de agendamento ou transferência, nenhuma orientação clínica. Termo de urgência: mensagem de emergência e notificação ao profissional |
| A-10 | Dois pacientes confirmam o mesmo horário ao mesmo tempo: um agenda, o outro recebe alternativa |
| A-11 | Assistente não afirma agendamento sem sucesso da ferramenta (teste com ferramenta forçada a falhar) |
| A-12 | Evento criado no Google aparece como ocupado em até 2 minutos |
| A-13 | Token do Google revogado: assistente para de oferecer horários e o profissional é avisado |
| A-14 | Remarcação com falha no novo horário mantém o agendamento original |
| A-15 | Lembrete não é enviado a contato com opt-out nem para agendamento cancelado |
| A-16 | Primeira resposta em até 30 segundos no p95, medido em produção |
| A-17 | Pagamento só é confirmado ao paciente após webhook; imagem de comprovante não confirma |
| A-18 | Sessão do tenant A não lê nem altera dados do tenant B em nenhuma tabela |
| A-19 | Custo médio por conversa em produção dentro de 30% do previsto em [07](07-custos.md) |
| A-20 | Exportação e eliminação de um contato funcionam e ficam auditadas |

## Estratégia de testes

| Nível | Alvo |
|---|---|
| Unitário | `availableSlots`, validação de saída, cálculo de atraso, máquina de controle, cálculo de custo |
| Integração (Postgres real) | RLS, exclusion constraint, trava de envio, idempotência de webhook e de ferramentas |
| Contrato | Payloads reais gravados da Meta, Google e Asaas reproduzidos contra os adaptadores |
| Avaliação de IA | Bateria de conversas simuladas, em CI a cada mudança de prompt, ferramenta ou modelo |
| Ponta a ponta | Número de teste da Meta: conversa completa até o agendamento aparecer no Google |
| Carga | Rajada de webhooks de 100 clientes simultâneos; latência da fila |

## Indicadores do piloto

- Tempo até a primeira resposta.
- Conversas resolvidas sem humano.
- Agendamentos por conversa.
- Taxa de falta, antes e depois (pedir ao piloto o número atual).
- Perguntas que o assistente não soube responder.
- Custo real por conversa e gasto do cliente com a Meta.
- Horas do profissional economizadas, por estimativa dele.

## Riscos

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Verificações da Meta e do Google atrasam | Alta | Atrasa o piloto | Fase 0 imediata; piloto pela conexão por QR code ou pelo limite de 10 onboardings |
| Coexistência indisponível ou instável no Brasil | Média | Controle humano pelo celular não funciona | Confirmar no primeiro teste; plano B é número dedicado só para a API, com inbox no painel |
| Número de cliente bloqueado na conexão por QR code | Média | Cliente perde o número e os contatos; dano à nossa reputação | Termo de ciência, limites de envio, sem mensagens em massa, oferta de migração para a oficial |
| WhatsApp muda o protocolo e derruba a conexão por QR code de todos | Média | Parada coletiva | Versão fixada, monitor de falha em massa, página de status, oficial como padrão |
| Meta altera preço ou política de IA | Média | Margem do cliente e risco de bloqueio | Assistente restrito ao escopo do negócio; premissas isoladas na planilha; adaptador de canal substituível |
| Assistente informa preço ou horário errado | Média | Perda de confiança | Validação determinística de saída; bateria de avaliação; revisão semanal no piloto |
| Resposta do assistente depois de o humano assumir | Média | Constrangimento com paciente | Trava de envio com versão; critério A-04 |
| Incidente com dados de saúde | Baixa | Grave, legal e reputacional | RLS testado, minimização, mascaramento, contrato, plano de resposta |
| Regra de conselho violada pelo conteúdo do cliente | Média | Sanção ao profissional | Política por especialidade conservadora; responsabilidade no contrato |
| Custo de IA acima do previsto por cache expirado | Média | Margem menor | Medição semanal; TTL de cache maior; tetos por conversa |
| Dependência de um provedor de LLM | Baixa | Indisponibilidade | Reserva em outro provedor no AI Gateway |
| Cliente não cadastra pagamento na Meta | Média | Assistente para de entregar | Verificação bloqueante no onboarding; alerta de falha de entrega |
| Concorrentes com mais recursos | Alta | Pressão de preço | Foco no profissional solo e na simplicidade do onboarding |

## Perguntas ao cliente piloto

1. Usa WhatsApp Business ou WhatsApp comum? No mesmo número pessoal?
2. Que agenda usa hoje? Aceita Google Calendar?
3. Qual a formação e o registro profissional? Tem CNPJ?
4. Quais serviços, durações e valores? Há pacote de sessões?
5. Horários de atendimento, intervalos e antecedência mínima para marcar e cancelar?
6. Quantas mensagens novas recebe por dia? Quantos pacientes faltam por mês?
7. Quais as 10 perguntas mais frequentes e como responde hoje? (Pedir exemplos reais de mensagens.)
8. Em que situações quer ser chamado em vez de o assistente responder?
9. Aceita que o assistente se apresente como assistente virtual?
10. Cobra sinal hoje? Como lida com quem falta?
