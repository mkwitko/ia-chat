# 09 — Onboarding ideal e features de alto valor

Data: 25/11/2026. Pesquisa em páginas públicas e centrais de ajuda; nenhuma conta aberta, nenhum produto testado. Toda afirmação sobre concorrente traz URL e "lido em 25/11/2026"; sem isso, está marcada "não verificado". Páginas de fornecedores são marketing: provam o que prometem, não o que entregam. Complementa `04-concorrentes-ui-free-tiers.md` e `founder/competitors.md`.

## Parte 1 — Onboarding

### O que os produtos parecidos fazem (fatos lidos)

| Padrão | Quem faz | Fonte (lido 25/11/2026) |
|---|---|---|
| **Um endereço de site basta para pré-preencher.** Zendesk pede só o site corporativo e cria agente, artigos de conhecimento, visões e um ticket de exemplo em poucos minutos; nome e tom do agente editáveis depois, sem etapa de aprovação descrita | Zendesk | https://support.zendesk.com/hc/en-us/articles/9748832324634 |
| **Conhecimento primeiro, depois teste, depois ativação.** Tidio: 1) conhecimento (URL do site, até 60 páginas) e tom, 2) Playground para testar (perguntas de teste não gastam franquia), 3) ativar em Canais, 4) avançar. Sem conhecimento não dá para testar | Tidio Lyro | https://help.tidio.com/hc/en-us/articles/15607494952604 |
| **Perguntas sem resposta viram sugestão.** Em Lyro, "Knowledge > Suggestions" lista o que o agente não soube responder | Tidio Lyro | mesma página |
| **Testar antes, com nota "bom/ruim".** Fin: aba Test com perguntas geradas, CSV ou manuais, marcadas Good/Poor; prévia sem custo; recomenda começar com público interno e depois ampliar. Exige 10 artigos públicos antes | Intercom Fin | https://www.intercom.com/help/en/articles/8286630-set-up-and-go-live-with-fin |
| **Editar em linguagem natural, testar casos difíceis, aprovar, publicar.** "Practice calls" antes de ir ao ar; o dono aprova e a mudança vai ao agente. Página não informa tempo de setup | Goodcall (voz) | https://goodcall.com |
| **Lista de checagem pré-lançamento** (tom consistente, importação de conhecimento sem falha) | Zendesk | https://support.zendesk.com/hc/en-us/articles/8357758811930 |
| **Quatro passos fixos: conectar agenda, criar tipo de evento, definir disponibilidade, pré-visualizar e compartilhar** | Calendly | https://calendly.com/learn/calendly-setup (resultado de busca; não abri a página) |
| **WhatsApp: "3 passos", mesmo número, "ainda hoje".** Conectar em poucos cliques, explicar o negócio (falado ou escrito), ligar o agente. Sem importação de dados descrita. "Sem programação, sem prompt". Pro: especialista individual | Botconversa | https://www.botconversa.com.br/ |
| **Implantação feita por eles:** diagnóstico, fluxo criado pela Cloudia, ativação, suporte. Prazo não informado na página | Cloudia | https://www.cloudia.com.br/ |
| **Migração de dados em até 3 dias úteis e treinamento remoto grátis** | Clinicorp | https://www.clinicorp.com/ |
| **Onboarding assistido como add-on pago** (conexão do número, Meta, verificação), sem montar chatbot pelo cliente; preço não informado | Wati | https://support.wati.io/en/articles/11462987 |
| **Coexistência importa contatos e até 180 dias de conversa 1:1, mas NÃO catálogo, mensagem de saudação/ausência, respostas rápidas nem etiquetas.** A API recebe eco das mensagens enviadas pelo app. Histórico não abre a janela de 24 h | Meta (documentação) | https://developers.facebook.com/documentation/business-messaging/whatsapp/embedded-signup/onboarding-business-app-users |
| Importação do histórico é opcional e deve ser decidida no onboarding: pular impede repetir sem refazer a conexão | Wati (coexistência) | https://support.wati.io/en/articles/11822421 |

Lacunas da pesquisa: Respond.io, Kommo, Blip, Zenvia, Manychat, Leadster, Cal.com e Intercom Fin sem leitura direta do fluxo de primeira execução (busca não devolveu páginas úteis): não verificado. Nenhum concorrente lido declara importar horário/serviços do Perfil da Empresa no Google: **não verificado** (busca por Cal.com, Calendly e Acuity só achou o caminho inverso, empurrar agenda para o Google: https://help.acuityscheduling.com/hc/articles/16676895486349). Mobbin não consultado, como combinado.

### Leitura para nós

1. Quem vende "pronto hoje" (Botconversa, Tidio) entrega **conhecimento a partir de algo que o dono já tem** (site, descrição falada). O dono de pequeno negócio não quer escrever; quer confirmar.
2. **Testar antes de ligar** é o padrão (Tidio, Fin, Goodcall). Nosso simulador já existe; o ganho é mostrá-lo cedo e alimentado pelos dados pré-preenchidos.
3. **A coexistência não traz saudação, ausência, respostas rápidas nem catálogo.** Logo, o pré-preenchimento do piloto não vem do app: vem de (a) 180 dias de histórico, se o dono autorizar (E-24b, com descarte de dado de saúde), e (b) do que ele digita ou cola. A mensagem de boas-vindas atual dele (nome, queixa, há quanto tempo) precisa ser **digitada/colada** por ele; sugerimos o campo "cole sua mensagem de boas-vindas atual".
4. O concorrente brasileiro que mais cobra implantação fala em "implantação difícil" nas reclamações (pesquisa 04). Nossa vantagem declarada é implantação assistida + simulador + "aprovar antes de enviar".

### Fluxo recomendado (alvo: 10 minutos, celular, uma mão)

Respeita a ordem decidida pelo dono em 25/11/2026 (WhatsApp logo após CPF/CNPJ, porque o teste de 14 dias conta daí). As mudanças são de conteúdo dos passos e de visibilidade do simulador, não de ordem.

| # | Passo | Tempo | Pré-preenche de onde | Aprovação do dono |
|---|---|---|---|---|
| 0 | Link do convite; entrar com Google (um toque) | 0:30 | Nome e e-mail do Google; nome do consultório do convite | n/a |
| 1 | **"Onde seus clientes acham você?"** Um campo: link do Google Maps, site ou @ do Instagram (opcional) + especialidade + CPF/CNPJ | 1:00 | Google Places (nome, endereço, telefone, horário, site), páginas do site que o dono colou. Instagram só por texto colado da bio (raspar rede social contraria os termos delas: não verificado, tratar como risco) | Tela única "encontramos isto, confere?" com campos editáveis |
| 2 | **Conectar WhatsApp** (coexistência) + aviso do cartão na Meta (já só avisa) | 2:30 | Número do app | Autorizar ou não importar 180 dias de histórico (pode ficar para depois da ativação) |
| 3 | **Serviços e preços** | 1:30 | Modelo da especialidade (já existe); preços achados no site; pacotes colados em texto livre viram resposta de conhecimento (como no piloto) | Lista com um toque para aceitar ou editar cada linha |
| 4 | **Horários e Google Agenda** | 1:00 | Horário do Perfil no Google ou, depois de conectar, o horário de trabalho do Google Agenda; antecedência e prazo de cancelamento com padrão conservador | Confirma a grade da semana |
| 5 | **Simulador com os dados reais** (3 perguntas sugeridas: "quanto custa?", "tem horário amanhã?", "onde fica?") | 1:30 | Tudo acima | O dono vê as respostas e marca "boa" ou "ajustar" (padrão Fin) |
| 6 | **Ativar em "aprovar antes de enviar"** + instalar o PWA e permitir notificações | 1:00 | n/a | n/a |

Total estimado 9 minutos (estimativa nossa, não medida). Medir de verdade com o piloto (RF-86).

**Antecipar o "mágico" sem mudar a ordem:** a partir do passo 1, mostrar um botão "Ver uma conversa de exemplo" com os dados achados (cartão de prévia, sem enviar nada). É o equivalente do Playground do Tidio/Fin, disponível antes do WhatsApp.

**Adiar para depois da ativação** (lista na Home, "próximos passos", uma por dia): tom de voz (padrão da especialidade, ajuste com 3 mensagens de exemplo), lembretes (padrão D-1 e H-2 já definidos), link de avaliação do Google, pacotes e perguntas frequentes (alimentados pelas dúvidas sem resposta, padrão Lyro "Suggestions"), importar histórico, convidar secretária, segundo profissional.

**Cortar do caminho:** perfil longo (descrição, redes, formas de pagamento) vira campos opcionais pré-preenchidos; nada de escolha de modelo de IA, template da Meta ou funil no onboarding.

**Persistência e retorno:** já salva por passo (E-24). Acrescentar: e-mail em 1 e 3 dias (RF-84) com link direto para o passo parado; passo do WhatsApp ganha "continuar no celular com o app Business na mão" (coexistência exige o aparelho com o app; risco para quem começa no computador). Pós-WhatsApp, lembrete por push/WhatsApp é possível.

**Feito por nós:** oferta de configuração assistida de 15 minutos no passo travado (RF-84) e, para o piloto e primeiros clientes, o operador preenche os passos 1, 3 e 4 por vídeo/áudio do dono e o dono só aprova. Concorrentes vendem isso: Cloudia e Wati (fontes acima). Nossa implantação de R$ 497 (hipótese) já cobre.

**Riscos do pré-preenchimento:** (a) Google Places: conferir termos de armazenamento e custo por consulta antes de construir (não verificado); (b) conteúdo achado na web só entra com aprovação do dono, nunca direto no assistente (regra do projeto: preço vem do cadastro); (c) dado de saúde: descartar antes de extrair (M-03, E-24b).

## Parte 2 — Features

Esforço para a nossa stack: S = até 2 dias, M = até 1 semana, L = mais de 1 semana. "Etapa" aponta onde já está em `docs/plan/TASKS.md` (estado em 25/11/2026). Classificação: **M** = essencial do mercado (table stakes), **D** = diferencial.

Evidência de mercado citada: Clinicorp lista confirmação, remarcação, reativação (faltosos, orçamento aberto), FAQ, integração Google Meu Negócio para pedir avaliação e "Alerta de Retorno" (https://www.clinicorp.com/, lido 25/11/2026). Cloudia lista lembretes, entende áudio, responde áudio com áudio (plano Pro), pesquisa NPS e funil (https://www.cloudia.com.br/, 25/11/2026). Botconversa: agente entende texto, áudio e imagem (https://www.botconversa.com.br/, 25/11/2026). Guias brasileiros de fornecedores repetem lista de espera como peça mais citada e mensagem pós-falta em até 1 hora (https://www.socialhub.pro/blog/paciente-faltou-consulta-o-que-mandar-whatsapp/, 25/11/2026; marketing, sem dados). Reduções de falta "até 40%" são alegação de fornecedor sem método: não usar como promessa (RF-71).

Ordenada por valor/esforço (maior primeiro).

| # | Feature | O que é | Por que importa | Esforço | Risco e conformidade | Tipo |
|---|---|---|---|---|---|---|
| 1 | **Painel "dinheiro recuperado"** | Resultados em R$: respostas fora do horário, agendamentos feitos pelo assistente, faltas evitadas, horários preenchidos por lista de espera; "respondemos em X s" | Prova o valor a cada abertura e justifica a mensalidade; evita cancelamento. Baseia-se nos dados que já temos (M-07) | S | Valores calculados da tabela de preços do dono; rotular como estimativa; sem promessa de ganho (RF-71) | D |
| 2 | **Relatório semanal no WhatsApp/push do dono** | Mensagem de 5 linhas com os números do #1 e 1 sugestão | Percepção de valor sem abrir painel; hábito semanal | S | Para o dono, não paciente: fora da janela precisa de template utility aprovado; sem conteúdo de paciente (RN de log) | D |
| 3 | **Entender áudio e (opcional) responder** | Transcrever áudio do paciente (E-10, já em aberto); resposta em texto; voz sintética só depois | Áudio é comum no WhatsApp BR; Cloudia e Botconversa anunciam (fontes acima) | S (entender), M (responder em voz) | Áudio pode conter saúde: transcrição só na mensagem, não no cadastro (M-03); aviso na política de privacidade; corte em 3 min já planejado | M |
| 4 | **Lembretes D-1/H-2 com confirmar/remarcar** | Já construído (E-22); falta cadastrar templates na Meta e tratar resposta "remarcar" | Principal alavanca de falta; piloto tem 1 a 2 faltas/mês: linha de base pequena, medir antes de prometer | S (falta fechar) | Template utility aprovado pela Meta; transacional (H-36) | M |
| 5 | **Perguntas sem resposta viram sugestão** | Lista "o que perguntaram e não soube"; dono aprova resposta em 1 toque e vira conhecimento | Padrão Lyro (https://help.tidio.com/hc/en-us/articles/15607494952604, 25/11/2026); faz o assistente melhorar sozinho; substitui onboarding longo | S | Já existe `registrar_duvida_sem_resposta` filtrada por juízo de saúde (M-03): reusar | D |
| 6 | **Lista de espera automática** | Cancelou, avisa o primeiro da fila, quem aceitar ocupa o horário | Dinheiro direto; peça mais citada nos guias (acima). Etapa M-09 | M | Opt-in e opt-out (M-01); sem disparo em massa; mensagem a partir de lista é ativa: janela de 24 h ou template | D (para solo) |
| 7 | **Saldo de pacotes de sessões** | Cadastra "pacote 4/10", conta sessões usadas ao marcar realizado, avisa "restam 2", sugere renovação | Piloto vende pacotes de 4 (R$ 800) e 10 (R$ 1.800); hoje só resposta de conhecimento. Concorrente: não verificado | M | Dinheiro em centavos; só registro, não cobramos (regra: nunca guardamos dinheiro de paciente); não registrar queixa | D |
| 8 | **Pós-falta e remarcação imediata** | Mensagem acolhedora em até 1 h oferecendo novos horários, respeitando regra do dono (piloto: 1ª falta remarca, 2ª perde a sessão) | Recupera horário; encaixa M-08/M-09 | S | Regra de perda da sessão é do dono; texto sem julgamento | M |
| 9 | **Reativação de quem sumiu** | Regra por dias sem retorno; dono aprova o texto uma vez (M-10) | Receita de base já conquistada; Clinicorp tem (acima) | M | Fora da janela de 24 h exige template marketing pago pela Meta; opt-in de marketing obrigatório (M-01); Meta limita volume | M |
| 10 | **Pedido de avaliação no Google pós-atendimento** | Depois de "realizado", envia link do perfil que o dono informou | Prova social e busca local; Clinicorp tem integração (acima) | S | Pedir para todos, sem filtrar quem está satisfeito (gating é proibido), sem incentivo: guias 2026 conflitam sobre detalhes; conferir política oficial do Google antes (https://www.brightlocal.com/learn/review-management/dos-and-donts/review-platform-guidelines/, 25/11/2026). Sem citar a consulta no texto (saúde) | M |
| 11 | **Sinal Pix com confirmação** | Pix com confirmação manual ou Mercado Pago; horário só confirma após pagar, libera se expirar | Maior alavanca de falta segundo a pesquisa 04; nenhum concorrente lido anuncia (04, A.6). Piloto não cobra sinal: oferecer opcional | M (manual), L (automático) | Nunca guardamos dinheiro (DepositProvider); Pix por chave do dono, confirmação manual | D |
| 12 | **Modo férias avançado** | Já existe (E-22b). Evoluir: mensagem automática de retorno com data | Percepção de cuidado | S | Nenhum | M |
| 13 | **Aniversário e datas** | Mensagem anual curta | Relacionamento barato, "percepção de mágica" | S | Marketing: opt-in; guardar data de nascimento é dado pessoal (LGPD), não de saúde; coletar só se o dono pedir | M |
| 14 | **Acompanhamento pós-visita** | Dia seguinte: "como você está?" com resposta tratada | Cuidado percebido; retorno agendado | M | **Risco alto:** resposta do paciente pode ser clínica. O assistente não orienta; resposta "dor/piora" vai direto ao profissional (urgência E-12); não gravar o conteúdo | D |
| 15 | **Pré-consulta digital** | Formulário curto pelo WhatsApp (nome, data de nascimento, como conheceu) | Economiza tempo na 1ª consulta | M | **Sem queixa, histórico ou alergia no cadastro** (decisão 25/11/2026 e M-03); só dados administrativos; queixa fica na mensagem | D (se enxuto) |
| 16 | **Roteamento multiprofissional** | Vários profissionais e locais no perfil, assistente escolhe agenda certa | Libera clínicas pequenas (plano Clínica) | L | Cada profissional com Google Agenda próprio; M-04 pendente | M (para clínica) |
| 17 | **Canal Instagram DM** | Mesmo assistente nas mensagens do Instagram | Pequenos negócios vendem pelo Instagram; BotConversa/Tidio têm canais (Tidio: https://help.tidio.com/hc/en-us/articles/15607494952604, 25/11/2026) | L | Outra API e revisão de app na Meta; fora do piloto | M |
| 18 | **Programa de indicação** | Link/código por cliente assinante, indicação de quem aceitou (M-11) | Aquisição barata sem site; piloto "pode indicar outros negócios" | S | Nenhum envio a indicado (já no plano); recompensa é decisão do dono | D |
| 19 | **Importação do histórico para sugerir FAQ e tom** | 180 dias de conversa → perguntas frequentes e tom para aprovar (E-24b) | Reduz digitação do onboarding; "mágica" imediata ao ver as próprias perguntas | M | Autorização explícita; descartar saúde antes da extração; janela e mídia: 14 dias de mídia, 24 h para iniciar sincronização (Meta, link acima) | D |
| 20 | **Previsão de falta e confirmação inteligente** | Pontuar risco (histórico, antecedência, horário) e reforçar confirmação | Aumenta preenchimento | L | Com 1 a 2 faltas por mês no piloto não há dado para modelo; **não construir agora**; usar regra simples (primeira consulta ou já faltou) | D |
| 21 | **Edição por linguagem natural** | "Mude o horário de sexta para 18h", assistente propõe, dono aprova | Padrão Goodcall (https://goodcall.com, 25/11/2026) | M | Preço e horário só por ferramenta com validação; sempre aprovação | D |
| 22 | **Atalho de abertura "responder dúvida em 3 cliques"** (resposta sugerida a partir de FAQ aprovado para o dono usar no app Business) | Para quem ainda quer responder à mão | Menos confiança necessária para começar | M | Eco de mensagens do app já existe na coexistência (Meta, link acima) | M |

### Avisos de conformidade que valem para todas

- **Política da Meta para IA:** os termos da Business API proíbem assistente de IA de uso geral (efeito em 15/01/2026); uso para atendimento ao cliente da própria empresa segue permitido segundo cobertura da imprensa e do Respond.io (https://techcrunch.com/2025/10/18/whatssapp-changes-its-terms-to-bar-general-purpose-chatbots-from-its-platform, https://respond.io/blog/whatsapp-general-purpose-chatbots-ban, lido 25/11/2026). Fontes secundárias; **ler o texto oficial dos termos**. O assistente deve continuar restrito ao negócio.
- **Mensagem ativa** (lembrete, reativação, avaliação, aniversário, relatório ao dono) fora da janela de 24 h exige template aprovado; marketing é pago e limitado. Mensagens enviadas pelo app do dono não abrem janela (Meta, link acima).
- **LGPD, dado de saúde:** nada de queixa, diagnóstico ou histórico em cadastro, resumo, relatório ou métrica. Resultados contam eventos, não conteúdo.

## Top 5 para construir a seguir

Critério: valor percebido já na primeira semana do piloto, baixo esforço, dependência mínima de terceiros, nenhum dado de saúde novo.

**1. Painel "dinheiro recuperado" e relatório semanal (#1 e #2).** Quem paga R$ por mês precisa ver, sem pedir, que o assistente trabalhou. Já temos os números do M-07; falta traduzir em reais com a tabela de preços do dono e "respondeu em X segundos fora do horário". O relatório de 5 linhas toda segunda-feira vira o hábito que sustenta a renovação e o depoimento autorizado do piloto. Esforço pequeno, risco baixo, único cuidado é rotular como estimativa. Entrega depois das etapas M-08 (realizado/faltou) para o número de faltas sair de dado real.

**2. Perguntas sem resposta viram sugestão (#5) e importação de histórico para FAQ (#19).** Corta a digitação do onboarding, o maior atrito do segmento, e deixa o assistente melhor a cada semana, que é o contrário da queixa mais comum nos concorrentes (robô errando dado da clínica, pesquisa 04). Começa por #5 (ferramenta já existe e passa pelo juízo de saúde) e deixa #19 para depois da autorização explícita e do descarte de saúde. Dá a "mágica" do primeiro dia: o dono vê as próprias perguntas viradas em respostas.

**3. Lista de espera e pós-falta (#6 e #8, etapa M-09).** Converte horário vago em receita no mesmo dia e é a peça mais repetida nos guias brasileiros. Entra em cima de M-01 (consentimento) e E-22 (lembretes), já feitos. Cuidado: aviso a quem está na lista é mensagem ativa; fora da janela exige template. O piloto tem poucas faltas, então medir em horários cancelados, não em faltas.

**4. Saldo de pacotes de sessões (#7).** O piloto já vende pacote de 4 e de 10 e hoje isso é só resposta de conhecimento. Contar sessões usadas ao marcar "realizado" e avisar "restam 2" gera renovação e dá ao dono algo que a agenda do Google não faz. Não verificamos concorrente que faça no WhatsApp (não verificado), por isso é candidato real a diferencial. Só registro, sem cobrança, para não esbarrar na regra de dinheiro de paciente.

**5. Áudio: entender e transcrever (#3), mais lembretes completos (#4).** Paciente brasileiro manda áudio; ignorar é perder o lead e é o que mais parece "robô burro". A transcrição é pequena e já está planejada (E-10). Fecha junto o cadastro de templates dos lembretes na Meta, que destrava a confirmação D-1/H-2 pela API oficial. Resposta em voz sintética fica para depois (Cloudia a oferece no plano Pro, mas não é prioridade para um quiropraxista que atende pessoas, em geral, por texto).

Fora do top 5, de propósito: previsão de falta (#20, sem dados), Instagram (#17, nova API e revisão da Meta), multiprofissional (#16, só quando o plano Clínica pedir), pré-consulta e pós-visita com queixa (#14, #15, risco de saúde: só versões administrativas).
