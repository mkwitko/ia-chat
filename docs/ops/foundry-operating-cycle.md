# SaaS Foundry — primeiro ciclo operacional
Data da revisão: 27/11/2026
Projeto: Consultório Aberto
Repositório: https://github.com/mkwitko/ia-chat

## Decisão executiva

O gargalo principal não é falta de funcionalidades. O repositório já contém um produto substancial: API Fastify, worker, painel React/Vite, site Astro, Postgres/Prisma, gateway de IA, onboarding, adaptadores de WhatsApp, agenda, convites, trial, métricas operacionais e módulos de indicação/follow-up.

O gargalo é provar, com o piloto real, que o produto entrega valor sem perder o controle e transformar essa prova em uma sequência repetível de demonstração, ativação e pagamento. O manifesto do projeto define esse problema; o conselho fundador condiciona expansão e prova social ao resultado medido do piloto.

## Evidência e limites

- **Observado no repositório (E3):** existem rotas e telas para convites, onboarding, trial, referral, lead follow-up, agenda, uso e visão operacional.
- **Relatado pelo piloto (E2, n=1):** cerca de cinco pessoas novas e cinquenta mensagens por dia; 1–2 faltas por mês. Mensagens não são pessoas nem leads. Esses números ainda não são telemetria independente.
- **Simulado (E6, n=18):** o painel de compradores simulados registrou 0 compras e confiança como principal objeção. Isso gera uma hipótese de confiança; não prova falta de demanda.
- **Estimativa interna (E5):** R$ 52,30 de custo variável por cliente-mês, R$ 1.150 de fixo mensal e equilíbrio estimado em seis pagantes. Precisa ser reconciliado com custos reais.
- **Não estabelecido:** taxa de conversão real, tempo até primeiro valor, primeiro agendamento criado pelo assistente, custo real por cliente, retenção, canal de aquisição vencedor e disposição real a pagar.

Não usar o painel sintético como validação. Não transformar a contagem de mensagens em leads. Não publicar métricas ou depoimentos sem consentimento escrito.

## O que já existe e deve ser reutilizado

| Área | Evidência no código/documentação | Implicação |
|---|---|---|
| Convites | apps/api/src/invites/invite-routes.ts | Medir convite criado/aceito sem exportar e-mail ou token |
| Onboarding | apps/api/src/onboarding/onboarding-routes.ts | Reutilizar o progresso já persistido |
| Ativação | onboarding mantém o modo aprovar-antes-de-enviar | Preservar o controle do profissional no piloto |
| Trial | apps/api/src/trial/trial-routes.ts | Acompanhar início e fim do trial por agregado |
| Indicação | apps/api/src/growth/referral-routes.ts | O produto já conta inscrições por código; não envia mensagens |
| Follow-up | apps/api/src/growth/lead-follow-up-routes.ts | Texto é salvo com aprovação do dono; não presumir que a função gera aquisição |
| Funil | apps/api/src/operator/funnel.ts | O funil atual lê progresso de onboarding; não atribui canal nem prova agendamento |
| Economia | apps/api/src/operator/overview.ts | Já calcula receita, custo de IA, margem, falhas, descartes e handoffs por tenant |

Não instalar CRM, analytics ou automação externa antes de verificar se esses dados existentes cobrem a decisão.

## Sequência de capacidades Foundry

1. **shared-knowledge-contracts + cross-skill-orchestration:** mapear fontes canônicas e mostrar dependências; sem duplicar PRODUCT.md, DESIGN.md ou o plano de negócio.
2. **business-validation:** concluir a entrevista de piloto e confirmar condições de uso, objeções reais e o resultado que ele considera valioso.
3. **analytics-instrumentation:** auditar a cobertura atual e definir os eventos ausentes. Não contar evento proposto como instrumentado.
4. **activation-and-onboarding:** reduzir o tempo entre convite, conexão do WhatsApp, configuração aprovada e primeira interação útil.
5. **sales-pipeline + revenue-acquisition-engine:** registrar apenas organizações, fit, evidência de dor, papel comprador, permissão e estágio; manter leads vazio até haver pesquisa real.
6. **launch-and-distribution:** priorizar dois canais documentados: indicação com permissão e demonstração ao vivo com dados fictícios. Instagram fica como canal secundário.
7. **customer-research-loop + continuous-improvement-engine:** revisar semanalmente resultados, dúvidas e bloqueios usando agregados sanitizados.
8. **legal-and-compliance-review:** continua specialist_required; nenhum fluxo de dados sensíveis ou alegação de saúde deve ser tratado como aprovado por este ciclo.

## Primeiro experimento

**ID:** pilot-first-value-baseline  
**Estado:** proposto; não iniciado.

- Hipótese: o profissional consegue configurar e aprovar a recepção, e o assistente completa uma interação útil; o sinal mais forte é o primeiro agendamento criado pelo assistente sem o dono digitar.
- Unidade: um consultório piloto. Usar contagens absolutas, não taxas.
- Métrica primária: primeiro agendamento criado pelo assistente e concluído.
- Métrica secundária: tempo entre conexão do WhatsApp e primeira interação útil aprovada.
- Guardrails: manter aprovação antes do envio; não armazenar mensagens, nomes, telefones, queixas ou dados clínicos no Foundry; não publicar resultado sem permissão escrita.
- Revisão sugerida: 04/12/2026, ou quando o período acordado com o piloto terminar.

## Instrumentação: lacunas a confirmar

O painel de operador já expõe funil de onboarding, conversas, custo, margem, falhas e handoffs. Antes de criar eventos, verificar se os timestamps e estados já existem nas tabelas. Se faltarem, propor instrumentação mínima para:

- convite criado e aceito;
- WhatsApp conectado;
- configuração concluída;
- primeira resposta do assistente aprovada;
- primeiro agendamento criado pelo assistente;
- início e conversão do trial;
- origem de aquisição em nível de canal, sem dados pessoais.

Para cada métrica, definir evento/fonte, numerador, denominador, janela, fuso, segmento, exclusões e responsável. Não calcular conversões com histórico parcial.

## Aquisição e vendas

- **Indicação:** pedir ao piloto uma introdução, não o contato de terceiros. Só contatar após permissão explícita do interessado.
- **Demonstração:** usar número de teste e dados fictícios; mostrar aprovação, transferência para humano, preço/horário vindo do cadastro e agendamento.
- **Instagram:** conteúdo educativo com dados fictícios; sem depoimentos, números, logotipos ou alegações ainda não autorizadas.
- **Pago:** manter gasto em zero até dez clientes pagantes e economia unitária reconciliada.
- **Preço:** não alterar com base no painel sintético. O teste R$ 247 vs R$ 297 continua hipótese; usar compradores reais e registrar denominador e compromisso observado.

## Rotina semanal

A partir de um checkout local dos dois repositórios:

~~~bash
foundry artifacts validate .
foundry artifacts status .
foundry artifacts plan . --changed positioning-and-offer
foundry improve report .
foundry revenue report .
foundry sequence . --module revenue-acquisition-engine
foundry verify . --module business-validation,analytics-instrumentation,sales-pipeline
~~~

O plano de impacto e os relatórios são somente leitura. A atualização de decisões, contato com prospects, publicação, gasto, migração ou alteração de produção requer aprovação explícita.

## Critérios de saída do primeiro ciclo

- [ ] Entrevista do piloto concluída e hipóteses H-01 a H-08 atualizadas.
- [ ] Estado real do WhatsApp e Google Agenda confirmado para o piloto.
- [ ] Baseline agregado do piloto registrado com janela e fonte.
- [ ] Primeiro valor definido e medido; primeiro agendamento assistido registrado quando ocorrer.
- [ ] Eventos existentes auditados antes de adicionar novos.
- [ ] Pipeline de receita preenchido apenas com organizações pesquisadas e evidência real; sem contatos pessoais.
- [ ] Nenhum contato externo sem permissão explícita.
- [ ] Uma revisão semanal conclui, altera ou interrompe o experimento com base em evidência.
