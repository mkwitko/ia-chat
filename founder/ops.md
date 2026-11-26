# Operação (25/11/2026)

Base: `offer.md`, `numbers.json`, `docs/spec/07`, `docs/research/09`, `piloto.md`. Um fundador sozinho opera tudo no começo. Regras e preços de fornecedores mudam: confirmar cada um antes de contratar. Não é parecer jurídico nem contábil.

## 1. O ciclo de cada dia (marcado com * o que o cliente vê)

1. Manhã: painel do operador: erros da noite, conversas que passaram para humano, custo de IA do dia contra a planilha (alerta se desvio > 30%, spec 07).
2. * Convites do dia: enviar link, acompanhar quem parou no onboarding (e-mail em 1 e 3 dias, RF-84).
3. * Configuração assistida: ouvir o áudio do novo cliente, preencher serviços, preços, horários e perguntas; mandar para aprovação (meta: 1 dia útil).
4. * Suporte pelo WhatsApp do fundador (clientes nos primeiros 30 dias primeiro).
5. Revisão de qualidade: amostra de conversas com nota ruim no juiz; ajustar base do cliente com aprovação dele.
6. * Cobrança: faturas vencidas (escada de aviso em 0, 3 e 7 dias, spec 05).
7. Fim do dia: backups verificados (alerta automático), filas do pg-boss vazias.

## 2. Fornecedores (custo por uso ou fixo)

| Insumo | Fornecedor | Preço | Onde confirmar |
|---|---|---|---|
| Modelos de IA | Vercel AI Gateway (uma chave) | por uso; estimado em `docs/spec/07` | página de preços da Vercel |
| Juiz de saúde e urgência | TypeSafe (Jev), chave própria | por uso; não cotado | documentação TypeSafe |
| WhatsApp | Meta Cloud API (coexistência); cliente paga no próprio cartão | 1.000 respostas de atendimento/mês grátis por número; utility ~R$ 0,035 (pesquisa 01) | developers.facebook.com, tabela de preços por país |
| QR code (alternativa) | WAHA (motor GOWS) em contêiner próprio | licença Plus não cotada | waha.devlike.pro |
| Banco | Postgres em servidor próprio + backup contínuo no R2 | servidor sem cotação (R$ 300 estimado); R2 por GB | provedor escolhido; cloudflare.com/r2 |
| Cobrança da assinatura | Asaas | R$ 1,99 por cobrança (spec 07, não verificado) | asaas.com/precos |
| Agenda | Google Calendar API | sem custo no volume previsto (não verificado) | console do Google Cloud |

Nenhum preço real diferente de `numbers.json` foi encontrado nesta rodada; o CFO não precisa ser refeito. Cotações pendentes: servidor, contador, advogado, licença WAHA.

## 3. Pessoas

| Fase | Quem | Horas por semana | Custo |
|---|---|---|---|
| Piloto e meses 1-3 (até ~5 clientes) | Fundador: produto, configuração, suporte, vendas | tudo | sem salário (fora do CFO) |
| Meses 4-12 (até 30 clientes) | Fundador + suporte 20 h/semana quando passar de 20 clientes | +20 h | não orçado; com 20 clientes a contribuição é ~R$ 4.550/mês, o que pagaria meio período (encargos variam: contador) |

Capacidade de entrada: até **3 configurações assistidas por semana** (suposição: 1 a 2 h cada mais acompanhamento). Esse é o limite real de crescimento no ano 1.

## 4. Rotinas

**A. Configuração assistida (por cliente)**
1. Cliente conecta o WhatsApp no onboarding (o teste começa a contar).
2. Pedir um áudio de até 5 minutos: serviços, duração, preços, pacotes, horários, endereço, como quer ser apresentado.
3. Preencher passos 3 e 4 do onboarding; pacotes viram resposta de conhecimento.
4. Rodar o simulador com as 3 perguntas padrão e mandar o resultado ao cliente.
5. Cliente aprova; ativar em "aprovar antes de enviar"; instalar o PWA e as notificações junto com ele.
6. Marcar retorno em 3 e 7 dias.

**B. Reclamação de paciente ou erro do assistente**
1. Assumir a conversa (o assistente pausa).
2. Avisar o cliente pelo WhatsApp em até 1 hora útil.
3. Achar a causa: dado do cadastro, base ou modelo. Corrigir com aprovação do cliente.
4. Registrar no histórico de incidentes, sem conteúdo de mensagem.

**C. Cancelamento**
1. Confirmar o cancelamento sem tentar reter com desconto.
2. Acesso segue até o fim do período pago.
3. Perguntar o motivo em uma linha; registrar.
4. Exportação e exclusão conforme a política de privacidade.

**D. Revisão semanal (segunda-feira)**
1. Custo real x planilha. 2. Testes ativos e dia de vencimento. 3. Objeções da semana. 4. Três números do marketing.

## 5. Ferramentas

Já decididas no projeto: Asaas (assinatura), Google Agenda, painel próprio (PWA), pg-boss, Sentry/PostHog se configurados. Contabilidade: contador com emissão de nota de serviço; escolher na contratação.

## 6. Licenças, registros e seguros (confirmar cada um)

- CNPJ e enquadramento (Simples Nacional, CNAE de software/SaaS): gov.br/empresas-e-negocios; contador.
- Emissão de nota fiscal de serviço (NFS-e) no município da sede: prefeitura.
- Marca "Consultório Aberto" no INPI: busca de anterioridade antes de investir em marca (gov.br/inpi).
- LGPD: encarregado nomeado, política de privacidade e contrato de operador (rascunhos em `docs/legal`, revisão de advogado pendente).
- Meta: verificação da empresa, aceitação da política comercial do WhatsApp (uso restrito ao atendimento do próprio negócio do cliente).
- Seguro de responsabilidade civil profissional/cyber: avaliar com corretor; não obrigatório (não verificado).

## 7. Riscos

| Risco | Chance | Impacto | Plano |
|---|---|---|---|
| Assistente informa algo errado a paciente | média | alto | aprovar antes de enviar no início; preço e horário só por ferramenta; rotina B |
| Meta bloqueia ou muda regra para IA no WhatsApp | baixa | alto | uso restrito ao atendimento; adaptador QR como contingência; nível "desligado" |
| Fundador doente ou indisponível | média | alto | nível "desligado" mantém lembretes; mensagem de ausência; documentar rotinas |
| Ninguém paga depois do teste | média | alto | gatilho do marketing (5 testes sem pagante = mudar oferta ou segmento) |
| Provedor de IA cai | média | médio | gateway com mais de um modelo; nível "desligado" como contingência |
| Custo de IA acima da planilha | baixa | médio | alerta de 30%; teto por conversa (spec 01) |
| Vazamento de dado | baixa | alto | RLS e teste de isolamento; logs sem conteúdo; plano de incidente da LGPD |
| Backup falha | baixa | alto | teste de restauração trimestral |
| Inadimplência | média | baixo | escada 0/3/7 dias e modo restrito |
| Concorrente lança plano solo barato | média | médio | configuração assistida e "aprovar antes" como diferença; preço aberto |
