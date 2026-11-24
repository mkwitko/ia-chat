# Plano de implementação

Data: 24/11/2026. Lê-se junto com a especificação em [../spec/](../spec/README.md). Este plano diz a ordem e o que conta como pronto; o comportamento esperado está na especificação.

## Como usar este plano

- Uma sessão de trabalho executa uma etapa (E-xx) por vez, na ordem. Cada etapa cabe em um pull request. As tarefas de cada etapa do MVP estão em [TASKS.md](TASKS.md).
- Antes de codar uma etapa: ler os arquivos da especificação citados nela.
- Lógica com regra (agenda, trava de envio, validação de saída, RLS, custo) começa pelo teste.
- Uma etapa só termina com o "Pronto quando" verificado por comando executado, não por leitura do código.
- Dúvida de requisito: registrar como hipótese no [README da especificação](../spec/README.md) e seguir com o padrão mais conservador.

## Decisões fechadas nesta rodada

### Linguagem: TypeScript em Node

Go ou Rust não trariam ganho perceptível aqui.

- **A carga é de espera, não de CPU.** Cada turno passa segundos aguardando o LLM e milissegundos no nosso código. Com 3.000 clientes no perfil médio, são cerca de 17 milhões de mensagens por mês, perto de 7 por segundo em média e algumas dezenas no pico. Um processo Node atende milhares de requisições por segundo desse tipo.
- **O gargalo real é Postgres e provedores externos.** Trocar a linguagem não mexe nisso.
- **O que se perderia:** Vercel AI SDK, Better Auth (só existe em TypeScript), Drizzle, pg-boss, schemas Zod compartilhados entre API, ferramentas do agente e painel.
- **Segurança:** Node também é seguro quanto a memória. Os riscos deste produto são isolamento entre clientes, autorização, segredos e cadeia de dependências, e nenhum deles muda com Rust. A cadeia de dependências do npm é o ponto fraco real; a mitigação está em E-01.
- **Quando reavaliar:** se surgir um serviço de mídia ou voz em tempo real com muito processamento. Nesse caso, isola-se só esse serviço em Go, sem reescrever o resto.

Node na versão LTS atual, pnpm, TypeScript estrito.

### Autenticação: Better Auth

Confirmado. Roda no nosso Postgres, sem custo por usuário. Organizações do Better Auth representam o tenant; papéis: dono, profissional, recepcionista.

### Voz clonada do próprio profissional

Entra no roadmap como módulo pago (Fase 5), sem depender de parecer jurídico. O profissional clonar a própria voz resolve o direito sobre a voz. Sobram duas condições de produto, porque quem ouve é o paciente:

1. Termo de consentimento aceito no painel, com gravação de amostra feita pelo próprio profissional logado.
2. O paciente continua sabendo que fala com um assistente virtual: a identificação na primeira mensagem vale também para áudio.

### Banco em servidor próprio

Postgres administrado por nós, em servidor no Brasil, com WAL arquivado continuamente no R2. Requisitos RN-10 a RN-16 em [02](../spec/02-arquitetura.md). A escolha do servidor e da ferramenta de backup sai da pesquisa em [../research/05-github-pecas-reaproveitaveis.md](../research/05-github-pecas-reaproveitaveis.md).

### Níveis de autonomia, não dois produtos

Não vale construir um modo "sem IA" com menu de opções: é o que os concorrentes de R$ 189 já vendem, e a IA custa só R$ 0,08 por conversa. Vale um seletor com três níveis sobre o mesmo sistema (RF-13): automático, aprovar antes de enviar, desligado. Cliente novo começa em "aprovar antes de enviar".

### Free tiers

Regra: free tier serve para desenvolvimento e para serviço que não recebe conteúdo de paciente. Nunca para conteúdo de paciente quando o provedor treina com os dados ou não assina contrato de tratamento.

| Serviço | Uso | Observação |
|---|---|---|
| Cloudflare Pages, DNS, WAF, Turnstile | Produção | Não recebem conteúdo de paciente |
| Cloudflare R2 (franquia gratuita) | Produção | Mídia cifrada em trânsito, acesso por URL assinada |
| Sentry, Axiom (planos gratuitos) | Produção no início | Logs sem conteúdo de mensagem (RN-38) |
| GitHub Actions | CI | Sem dados reais |
| Supabase e Neon gratuitos | Só desenvolvimento | Sem backup adequado; projeto pausa |
| Gemini gratuito | Proibido com dados reais | A pesquisa indica que treina com os dados |
| Cloudflare Workers AI (10 mil neurons por dia) | Desenvolvimento e testes de integração | Decidido; ver abaixo |

**Workers AI gratuito é o provedor padrão em desenvolvimento e não entra no atendimento.** A franquia é da conta inteira (300 a 900 turnos por dia somando tudo) e falha de vez ao estourar. Cuidado: o modelo de desenvolvimento não é o de produção, então a bateria de avaliação (E-07) roda sempre nos modelos candidatos de produção. A versão paga é barata e não retém dados; pode virar modelo de reserva se passar na avaliação em português.

## Painel e identidade visual

Sim, há interface: inbox, agenda, configurações, onboarding, uso e fatura. O profissional solo usa no celular, então o painel é **mobile-first e instalável (PWA)**, com notificação push.

Para não sair com cara de interface gerada por IA:

1. **Direção antes de tela.** A etapa E-08 usa a skill `impeccable` para definir a direção visual e gravar `DESIGN.md` (tipografia, cor, espaçamento, densidade, tom dos textos) antes de qualquer componente.
2. **Referências reais por tela**, anexadas ao `DESIGN.md`. Fontes conferidas em 24/11/2026:
   - Mobbin (mobbin.com): telas e fluxos reais de aplicativos. É a principal para o painel: inbox, agenda, onboarding e configurações no celular. O MCP exige o plano Pro (R$ 50 por mês no plano anual; há plano trimestral). Assinar durante E-08 e as etapas de tela.
   - Refero Styles (styles.refero.design): estilos de sites reais com `DESIGN.md` legível por agente. Serve de modelo de estrutura para o nosso `DESIGN.md` e de ponto de partida para cor e tipografia. Não copiar a identidade de uma marca.
   - Supahero (supahero.io): galeria gratuita de aberturas de página, para S-01.
   - Design Spells (designspells.com): microinterações, para o acabamento do inbox (aprovar, enviar, assumir). Site não conferido: recusou o acesso automático.
   - Jiro (jiro.build): seções React e Tailwind prontas via MCP. Fica fora do painel, porque componente pronto de biblioteca é o que deixa tudo com a mesma cara. Uso admitido só como referência de estrutura de seção no site, refeita com os nossos tokens.
3. **Base de componentes acessíveis sem estilo pronto** (Radix ou equivalente), com tokens próprios. Sem tema padrão de biblioteca.
4. **Lista do que evitar** (gradiente roxo, cartões idênticos com ícone, emoji como ícone, textos genéricos), também da pesquisa 04, revisada a cada tela com `impeccable`.
5. **Textos em português escritos para o profissional**, sem jargão de software.

## Fases

MVP = Fases 1 a 3. Fase 0 corre em paralelo desde já.

### Fase 0 — Desbloqueios externos (não é código)

| Etapa | O quê | Pronto quando |
|---|---|---|
| E-00a | Entrevista com o piloto: 10 perguntas de [08](../spec/08-roadmap-e-aceite.md) | Hipóteses H-01 a H-08 respondidas no README da especificação |
| E-00b | Meta: verificação do negócio, app, permissões, número de teste | Mensagem de teste enviada e recebida por webhook |
| E-00c | Google Cloud: projeto, tela de consentimento, pedido de verificação | Pedido enviado; OAuth funcionando em modo de teste |
| E-00d | Asaas: conta com CNPJ e ambiente de testes. Mercado Pago: aplicativo para OAuth | Cobrança de teste paga no sandbox do Asaas; OAuth de teste concluído no Mercado Pago |
| E-00e | Contrato de operador, termos, aviso de privacidade, termo de ciência da conexão por QR code | Minutas revisadas |
| E-00f | Nome do produto, domínio e contas (GitHub, Cloudflare, e-mail) | Domínio registrado |
| E-00g | Chaves de API e acessos para desenvolver (provedores de IA, Cloudflare, Langfuse, Sentry, Mobbin) | `.env` local preenchido; necessário a partir de E-06 |

### Fase 1 — Fundação

| Etapa | O quê | Pronto quando |
|---|---|---|
| E-01 | Monorepo pnpm (`apps/api`, `apps/worker`, `apps/web`, `packages/core`, `channels`, `ai`, `db`), TypeScript estrito, lint, testes, CI. Dependências: lockfile obrigatório, idade mínima de publicação, scripts de instalação bloqueados, auditoria no CI | CI verde em um PR vazio |
| E-02 | Postgres local em Docker, Drizzle, migrations SQL, papéis de banco separados, `withTenant` | Teste de integração prova que `SET` vaza entre transações no pooler e `set_config(..., true)` não |
| E-03 | Schema do núcleo ([02](../spec/02-arquitetura.md)) com RLS em todas as tabelas | Teste gerado por tabela: tenant A não lê nem altera tenant B (A-18) |
| E-04 | Better Auth com organizações, papéis e sessão; cadastro de tenant | Login, criação de tenant e convite funcionando por teste de API |
| E-05 | pg-boss no worker: job com atraso, chave única, nova tentativa, `tenant_id` no payload | Job agendado executa uma vez sob dois workers concorrentes |
| E-06 | AI Gateway: interface, roteamento por tarefa, reserva, tetos, `ai_usage`, tabela de preços versionada; `judge` com Jev e falha segura | Chamada real registra tokens e custo; modelo principal forçado a falhar cai na reserva; `judge` com provedor fora do ar devolve nulo sem lançar erro |
| E-07 | Bateria de avaliação: tenant fictício, simulador de paciente, 80 casos, relatório por modelo; casos rotulados em português para cada pergunta de juízo | Bateria roda por comando e compara os modelos candidatos; modelo escolhido e limiares de juízo registrados na especificação. Se o Jev não passar em português, `judge` usa um LLM econômico com saída estruturada |
| E-08 | Direção visual com `impeccable`: `DESIGN.md`, tokens, estrutura do painel, PWA | `DESIGN.md` aprovado por você; página de login e casca do painel seguindo os tokens |

### Fase 2 — Conversa (plano Essencial)

| Etapa | O quê | Pronto quando |
|---|---|---|
| E-09 | Adaptador Cloud API: assinatura, normalização, `inbound_events`, idempotência, status | Payloads reais gravados passam nos testes de contrato; A-01 |
| E-09b | Adaptador por QR code falando HTTP com o gateway WAHA (motor GOWS) em contêiner na rede privada, imagem fixada por digest: eco do dono, identidade do contato, limites de envio, termo de ciência, alerta de queda (RF-27 a RF-29d). Primeiro dia: provar que o eco do dono e o identificador do contato chegam | Os mesmos testes de turno e de controle humano passam nos dois adaptadores; mensagem ativa em massa é recusada pelo sistema nesta conexão |
| E-10 | Mídia: download imediato, R2, transcrição de áudio | Áudio de teste vira texto na conversa; falha de download tratada |
| E-11 | Agrupamento de mensagens e turnos com `turn_version` | A-02 e A-03 |
| E-12 | Controle humano: eco do dono, botão no painel, transferência, trava de envio | A-04, A-05, A-06 |
| E-13 | Agente de conversa: contexto em blocos com cache, ferramentas do Essencial, pré-filtros | Bateria: casos de preço, endereço, dúvida sem resposta e fora de escopo passam |
| E-14 | Validação de saída e política por especialidade | A-07, A-08, A-09; casos de segurança em 100% |
| E-15 | Entrega natural: leitura, digitação, atraso calculado, uma mensagem por turno | Teste com relógio falso cobre atraso, reenvio do indicador e aborto aos 45 s |
| E-16 | Painel: inbox em tempo real (SSE), conversa, assumir e devolver | Conversa de ponta a ponta pelo número de teste aparece no inbox |
| E-17 | Painel: serviços, preços, endereço, base de conhecimento, tom de voz, simulador | Profissional configura tudo e testa no simulador sem ajuda |
| E-18 | Uso e limites: contadores, franquia, avisos de 80% e 100%, modo restrito | Teste simula estouro e verifica aviso e resposta fixa |
| E-18b | Níveis de autonomia (RF-13): rascunho para aprovação no inbox com aprovar, editar e descartar; nível desligado | Em "aprovar", nenhuma mensagem sai sem toque do profissional; em "desligado", nenhuma chamada de LLM ocorre |

### Fase 3 — Agenda e piloto (plano Agenda)

| Etapa | O quê | Pronto quando |
|---|---|---|
| E-19 | `availableSlots` como função pura | Testes cobrem fuso, virada de dia, bloqueio, serviço maior que a janela |
| E-20 | Agendamentos com exclusion constraint; ferramentas agendar, remarcar, cancelar com confirmação | A-10, A-11, A-14 |
| E-21 | Google Calendar: OAuth, escrita, leitura por notificação e sincronização incremental, renovação de canais | A-12, A-13 |
| E-22 | Templates, confirmação e lembrete em dois tempos (RF-47); opt-out | A-15 |
| E-22b | Modo férias (RF-14) e agenda do dia seguinte para o profissional (RF-15) | Em férias, nenhum horário do período é oferecido; o resumo chega no horário configurado |
| E-23 | Painel: agenda, disponibilidade, bloqueios, agendamento manual | Agendamento manual respeita as mesmas regras |
| E-24 | Onboarding nas duas conexões: Embedded Signup em coexistência ou QR code com termo de ciência; Google, checagem de pagamento na Meta, mensagem de teste | Conta nova chega a "assistente ativo" sem intervenção nossa |
| E-24b | Onboarding pelo histórico (RF-16). Opcional: primeiro a cortar | Sugestões aparecem para aprovação; caso de teste com informação de saúde é descartado |
| E-25 | Assinatura no Asaas, inadimplência, modo restrito | Ciclo completo no sandbox |
| E-26 | Produção: servidor, Postgres com WAL no R2 (RN-10 a RN-16), segredos, Sentry, Axiom, Langfuse, alertas, procedimento de incidente | Restauração em ponto no tempo executada por script num servidor descartável; alerta de WAL atrasado e de canal desconectado disparam |
| E-27 | Painel do operador: clientes, custo real por cliente, conversas com falha | Custo por conversa comparado à planilha |
| E-28 | Piloto em produção por 30 dias, revisão semanal | A-16, A-19; indicadores do piloto coletados |
| E-28b | Aprovação seletiva: limiares de confiança calibrados com as conversas do piloto | Limiar escolhido com taxa de erro medida e registrada na especificação |

### Fase 4 — Pro

| Etapa | O quê |
|---|---|
| E-29 | Sinal Pix: interface `DepositProvider`, estado `held`, primeiro com chave Pix do profissional e confirmação manual, depois Mercado Pago por OAuth com webhook (A-17) |
| E-30 | Follow-up e recuperação de interessados dentro da janela |
| E-31 | Pedido de avaliação e reativação com opt-in e custo exibido |
| E-32 | Lista de espera |
| E-33 | CRM administrativo: etiquetas, histórico, origem |
| E-34 | `quality_review` em lote e relatório de qualidade |
| E-35 | `insights`: resumo mensal com números vindos de SQL |
| E-36 | Exportação e eliminação de contato (A-20), retenção configurável |

### Fase 5 — Clínica e módulos

| Etapa | O quê |
|---|---|
| E-37 | Vários profissionais, agendas, recursos compartilhados, transferência de conversa |
| E-38 | Documentos com pgvector |
| E-39 | Resposta em áudio com voz padrão |
| E-40 | Voz clonada do profissional, com termo de consentimento |
| E-41 | Segunda especialidade, com política revisada no conselho |

## Peças reaproveitáveis

Da pesquisa em [../research/05-github-pecas-reaproveitaveis.md](../research/05-github-pecas-reaproveitaveis.md). "Estudar" significa ler e adaptar o padrão; "usar" significa dependência. Conferir a licença no repositório antes de copiar código.

| Peça | Licença | Uso | Etapa |
|---|---|---|---|
| `whatsapp-api-js` | MIT | Usar ou estudar: tipos de webhook e verificação de assinatura | E-09 |
| `fbsamples/whatsapp-business-jaspers-market` | Apache-2.0 | Estudar: exemplo oficial da Meta | E-09, E-24 |
| Chatwoot | MIT, exceto `enterprise/` | Estudar: tratamento de `smb_message_echoes`, Embedded Signup e transferência do bot para humano | E-09, E-12, E-24 |
| `open-bsp-api` | Unlicense | Estudar: schema multi-tenant com coexistência | E-03, E-09 |
| `Hiberius/whatsapp-receptionist` | MIT | Estudar: transferência e proteções. O próprio autor admite que o RLS dele não roda em execução; é o erro que E-03 testa | E-12, E-14 |
| `cellajs/cella` | MIT | Estudar: `set_config` local por transação para RLS com Drizzle | E-02 |
| pg-boss (`singletonKey`, políticas de fila) e `@pg-boss/dashboard` | MIT | Usar | E-05, E-11, E-27 |
| `promptfoo` | MIT | Usar: avaliação e testes de ataque em CI | E-07 |
| `getsentry/vitest-evals` | Apache-2.0 | Usar: avaliações dentro do Vitest | E-07 |
| `cal.diy` (`slots.ts`) | MIT | Estudar: cálculo de horários | E-19 |
| MCP de documentação do Better Auth | Oficial | Ferramenta de desenvolvimento | E-04 |

Ajustes que a pesquisa trouxe:

- **Identidade do contato.** O Chatwoot duplicou contatos por causa do nono dígito e do BSUID. Regra em [03](../spec/03-whatsapp-e-conversa.md), teste em E-09.
- **Fixar a versão do Drizzle** (a 1.0 ainda era candidata a lançamento).
- **Sem SDK oficial do Asaas para Node:** cliente próprio, fino, com tipos Zod (E-25).
- **Áudio:** chamar o `ffmpeg` direto; `fluent-ffmpeg` está arquivado.
- **Evitar:** Evalite (descontinuado), `date-holidays` (dados com licença de compartilhamento obrigatório), Typebot (licença FSL).
- **Não achados:** simulador de paciente em TypeScript e conjunto de dados de atendimento em português. Os dois são construídos em E-07.

## Trilha paralela — Site, aquisição e suporte

Especificação em [09](../spec/09-site-aquisicao-suporte.md). Corre ao lado das fases do produto. S-01 pode ir ao ar ainda na Fase 1, para juntar interessados e testar preço antes de o produto existir.

| Etapa | O quê | Quando | Pronto quando |
|---|---|---|---|
| S-01 | `apps/site` em Astro no Cloudflare Pages; página inicial com lista de espera; medição e consentimento | Fase 1, depois de E-08 | No ar; LCP abaixo de 2 s; Lighthouse de acessibilidade 95 ou mais; cadastro na lista confirmado por e-mail |
| S-02 | Páginas legais: termos, privacidade, contrato de operador, suboperadores, cookies | Fase 1 | Publicadas a partir das minutas de E-00e |
| S-03 | Número de demonstração com consultório fictício | Fase 2, depois de E-15 | Qualquer pessoa conversa e chega a um agendamento fictício |
| S-04 | Página de preços lendo a mesma fonte do painel; calculadora de receita perdida | Fase 3 | Mudar um preço na fonte muda site e painel |
| S-05 | Cadastro sozinho com teste de 14 dias, limites contra abuso, lembretes de abandono (amplia E-24) | Fase 3 | Pessoa de fora da equipe ativa a conta sem falar conosco |
| S-06 | Central de ajuda com busca; página de status | Fase 3 | Artigos para todos os passos do onboarding e todos os alertas |
| S-07 | Suporte atendido pelo próprio produto, com contexto da conta e transferência para nós | Fase 3, depois do piloto | Dúvida respondida pelo assistente com base na central de ajuda |
| S-08 | Dados estruturados, sitemap, imagens de compartilhamento, `llms.txt`; páginas da primeira especialidade e de três problemas | Fase 3 | Validador de dados estruturados sem erro; páginas indexadas |
| S-09 | Ferramentas gratuitas, guias, comparações com fatos verificados | Fase 4 em diante, contínuo | Uma publicação por semana |
| S-10 | Programa de indicação com link próprio | Fase 4 | Mês grátis aplicado aos dois lados automaticamente |

Regra: divulgação em volume só depois de a Meta e o Google aprovarem as verificações da Fase 0. Antes disso, convites em lotes pela lista de espera.

## Diferenciais

Lista inicial, a rever com a pesquisa de concorrentes em [../research/04-concorrentes-ui-free-tiers.md](../research/04-concorrentes-ui-free-tiers.md).

| Diferencial | Fase | Por que importa |
|---|---|---|
| O profissional responde pelo celular e o assistente se cala sozinho | 2 | Nenhuma mudança de hábito; depende da coexistência |
| Nunca inventa preço nem horário (validação determinística) | 2 | Principal medo de quem contrata |
| Simulador antes de ativar | 2 | Confiança no onboarding |
| "Perguntas que o assistente não soube": vira resposta cadastrada com um toque | 2 | O assistente melhora sem suporte nosso |
| Onboarding sozinho, em minutos | 3 | Concorrentes tendem a exigir chamada de vendas |
| Custo previsível: franquia por conversa e estimativa da Meta mostrada antes | 3 | Sem surpresa na fatura |
| Resumo semanal no WhatsApp do profissional: agendamentos, faltas evitadas, horas poupadas | 4 | Mostra o valor toda semana e reduz cancelamento |
| Sinal Pix que confirma sozinho e libera o horário se não pagar | 4 | Reduz falta, que é dinheiro direto |
| Comandos do profissional por mensagem ("bloqueia amanhã à tarde") | 4 ou 5 | Gestão sem abrir painel; exige número de serviço nosso |
| Regras do conselho já embutidas por especialidade | 5 | Segurança para o profissional |

### Acrescentados após a pesquisa de concorrentes

Preços do mercado: quem vende só o robô cobra de R$ 147 a R$ 600; os especializados em saúde escondem o preço e vendem por chamada. Detalhes na pesquisa 04.

| Diferencial | Fase | Por que importa |
|---|---|---|
| Aprovar antes de enviar (RF-13) | 2 | Resolve o medo de o robô falar bobagem; segundo em valor por esforço na pesquisa |
| Aprovação seletiva: envia sozinho quando a confiança é alta, pede aprovação quando é baixa (juízos tipados, [04](../spec/04-agentes-e-ia.md)) | 3, depois de calibrar no piloto | Meio-termo que nenhum concorrente pesquisado oferece |
| Nota de qualidade em 100% das conversas | 4 | O juízo tipado custa centésimos de centavo |
| Preço público e cadastro sem chamada de vendas | 3 | Os concorrentes de saúde escondem o preço |
| Sem créditos: franquia por conversa com teto | 3 | Concorrentes cobram por créditos, o que confunde |
| Número de demonstração: o interessado conversa com um consultório fictício no WhatsApp | 3 | Melhor peça de venda para esse público |
| Onboarding pelo histórico: com autorização, sugerir perguntas frequentes e tom de voz a partir das conversas sincronizadas | 3 | Configuração em minutos. Sugestões passam por aprovação; informação de saúde é descartada na extração |
| Agenda de amanhã enviada ao profissional toda noite | 3 | Barato e lembrado todo dia |
| Modo férias: avisa o período e agenda para depois | 3 | Uso real de quem trabalha sozinho |
| Lembrete em dois tempos, com botão de confirmar | 3 | Reduz falta |
| Horário cancelado oferecido à lista de espera | 4 | Recupera receita perdida |
| Pacote de sessões e retorno recorrente, com saldo | 4 | Quiropraxia, fisioterapia e psicologia vivem de retorno |
| Lembrete de retorno ("faz 30 dias da última sessão") | 4 | Reativação com contexto, não campanha genérica |
| Origem do paciente (Instagram, Google, indicação, anúncio) | 4 | Mostra qual canal traz paciente |
| Página pública de agendamento com os mesmos horários | 4 | Link para o Instagram |
| Programa de indicação com mês grátis | 4 | Profissional de saúde indica colega |
| Recibo em PDF para reembolso | 5 | Pedido frequente de pacientes de psicologia e fisioterapia |
| Instagram Direct como segundo canal | 5 | Mesma plataforma da Meta; o adaptador de canal já prevê |
| Revenda para agências (marca própria) | 5 | Canal de distribuição |

## Passagem para a sessão de implementação

O arquivo `CLAUDE.md` na raiz do projeto orienta a sessão nova: o que ler, as convenções e por onde começar (E-01).
