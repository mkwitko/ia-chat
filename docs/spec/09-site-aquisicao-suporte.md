# 09 — Site, aquisição, cadastro sozinho e suporte

Objetivo: vender sem chamada de vendas e atender sem equipe grande. O profissional descobre pelo Google ou por indicação, testa pelo WhatsApp, cadastra, configura e ativa sozinho.

## O que limita a escala

Não é o site. São duas aprovações de terceiros, que precisam estar prontas antes de qualquer divulgação em volume:

| Limite | Efeito sem a aprovação |
|---|---|
| Meta, Tech Provider verificado | Só 10 clientes novos por semana. Verificado: 200 |
| Google, verificação OAuth | Tela de "app não verificado" no cadastro e teto de usuários em modo de teste |

Enquanto não saem, o site funciona com lista de espera e convites em lotes.

## Site

### Arquitetura

- Aplicação separada no monorepo: `apps/site`, em Astro, gerada como páginas estáticas e publicada no Cloudflare Pages. Motivo: o painel é uma aplicação React de página única, ruim para busca; conteúdo precisa de HTML pronto e carregamento rápido.
- Conteúdo em Markdown versionado no repositório (páginas, artigos, central de ajuda). Sem CMS no início.
- Mesma identidade do painel: tokens e tipografia do `DESIGN.md`. Direção e revisão com a skill `impeccable`.
- Domínio do site separado do painel (`app.`), para isolar cookies e sessão.

### Página inicial

| Bloco | Conteúdo |
|---|---|
| Abertura | O problema em uma frase e a ação principal: "Converse com a demonstração no WhatsApp" |
| Demonstração | Conversa real de exemplo e o botão para o número de demonstração |
| Como funciona | Três passos: conectar o WhatsApp, cadastrar serviços e horários, ativar |
| Controle | "Você responde pelo celular e o assistente se cala"; aprovar antes de enviar |
| Segurança | Não inventa preço nem horário; não dá orientação clínica; LGPD |
| Calculadora | Receita perdida por mensagens sem resposta e por faltas |
| Preços | Tabela pública, franquia, custo estimado da Meta |
| Perguntas frequentes | As dez dúvidas de compra |
| Chamada final | Teste grátis |

| ID | Requisito |
|---|---|
| RF-70 | Nenhum depoimento, número de clientes ou resultado inventado. Só entram dados reais, começando pelo piloto com autorização escrita |
| RF-71 | Nenhuma promessa de resultado clínico nem de aumento garantido de faturamento |
| RF-72 | Preço e franquia do site lidos da mesma fonte que o painel usa, para nunca divergirem |
| RF-73 | Ação principal em toda página: demonstração no WhatsApp ou teste grátis |
| RF-74 | Formulários com Turnstile; lista de espera com confirmação por e-mail |
| RF-74a | Lista de espera (S-01): `POST /api/waitlist` na API, com o site em outra origem (CORS só para `SITE_ORIGIN`). Turnstile verificado no servidor, limite de 10 envios por minuto por endereço (em memória, por processo) e e-mail guardado em minúsculas: repetir o e-mail não duplica nem reenvia a confirmação. Enquanto a demonstração (S-03) e o cadastro (S-05) não existem, a ação principal do site é a lista de espera |

### Busca (SEO)

Técnico:

- HTML estático, sitemap, `robots.txt`, URLs canônicas, títulos e descrições únicos, imagens de compartilhamento geradas por página.
- Dados estruturados: `Organization`, `SoftwareApplication` com preço, `FAQPage`, `Article`, `BreadcrumbList`.
- Metas: LCP abaixo de 2 segundos em 4G, CLS abaixo de 0,1, nota de acessibilidade 95 ou mais no Lighthouse. Medido no CI.
- `llms.txt` e respostas diretas no topo das páginas, para aparecer em assistentes de IA.
- Search Console e análise de uso desde o primeiro dia; banner de consentimento de cookies.

Conteúdo, em ordem de prioridade:

| Tipo | Exemplo | Observação |
|---|---|---|
| Página por especialidade | "Secretária virtual para psicólogos" | Uma por especialidade liberada, com as regras do conselho e exemplos reais daquela área. Não publicar especialidade sem política revisada |
| Página por problema | "Como reduzir faltas em consultas", "Agendamento pelo WhatsApp" | Intenção de compra alta |
| Ferramentas gratuitas | Calculadora de faltas, gerador de mensagem de confirmação, estimador de custo da Meta | Atraem links e cadastros |
| Comparações | "Alternativa a [concorrente]" | Só com fatos verificados e data; sem depreciar |
| Guias | "WhatsApp Business API para consultórios: quanto custa", "LGPD no atendimento por WhatsApp" | Autoridade; revisados quando a Meta mudar preço |
| Modelos | Mensagens de lembrete, política de cancelamento | Úteis mesmo para quem não compra |

Não fazer: páginas por cidade geradas em massa nem texto genérico produzido por IA em volume. O Google trata como conteúdo de baixa qualidade e derruba o domínio inteiro. Cada página precisa de informação própria.

## Cadastro e ativação sem ajuda

Fluxo, com o progresso salvo a cada passo:

1. Conta: e-mail ou Google, nome, especialidade.
2. Serviços, valores e horários. Modelos prontos por especialidade.
3. Endereço e instruções de chegada.
4. Tom de voz: colar mensagens ou responder a quatro perguntas.
5. **Simulador:** conversa com o assistente já configurado. Até aqui não precisa de WhatsApp nem de cartão.
6. Conectar WhatsApp (Embedded Signup, coexistência) e forma de pagamento na Meta.
7. Conectar Google Calendar (opcional no Essencial).
8. Mensagem de teste e ativação em "aprovar antes de enviar".

| ID | Requisito |
|---|---|
| RF-80 | Teste grátis de 14 dias, sem cartão. O custo de IA de um teste é da ordem de poucos reais; a franquia gratuita da Meta cobre as mensagens |
| RF-81 | Limites contra abuso no teste: Turnstile, verificação de e-mail, um teste por CPF ou CNPJ e por número, teto de conversas |
| RF-82 | O valor aparece antes do passo difícil: o simulador vem antes de conectar o WhatsApp |
| RF-83 | Cada passo tem ajuda no próprio lugar (texto curto e vídeo de até 60 segundos) e botão "preciso de ajuda" |
| RF-84 | Passo abandonado gera lembrete por e-mail em 1 dia e em 3 dias, e oferta de configuração assistida em 15 minutos |
| RF-85 | Erros da Meta e do Google traduzidos para linguagem comum, com o que fazer |
| RF-86 | Funil medido passo a passo; meta inicial: metade dos que chegam ao simulador ativam |
| RF-87 | Assinatura, troca de plano, notas e cancelamento feitos pelo próprio cliente. Cancelar leva o mesmo número de toques que assinar |
| RF-88 | Ao fim do teste sem assinatura: assistente passa a "desligado", dados preservados por 30 dias |

## Central de ajuda

- Dentro do site, em Markdown, com busca. Pública, o que também traz tráfego.
- Organização por tarefa: começar, WhatsApp, agenda, pagamentos, assistente, conta e cobrança, privacidade.
- Cada artigo responde a uma pergunta, com passos e capturas de tela.
- A mesma base alimenta o assistente de suporte.
- Páginas legais: termos de uso, privacidade, contrato de operador, lista de suboperadores, política de cookies.
- Página de status pública com histórico de incidentes.

## Suporte

| Camada | Como | Cobre |
|---|---|---|
| 1. Ajuda no lugar | Textos e vídeos em cada tela | Dúvida de uso |
| 2. Assistente de suporte | Nosso próprio produto, num número de WhatsApp nosso, com a central de ajuda como base | Perguntas repetidas, 24 horas |
| 3. Pessoa | Transferência do assistente para nós, pelo mesmo inbox | O que o assistente não resolve |
| 4. Configuração assistida | Chamada de 15 minutos, agendada pelo próprio assistente | Quem travou no onboarding |

| ID | Requisito |
|---|---|
| RF-90 | Atender o suporte com o próprio produto. É vitrine e teste diário |
| RF-91 | Do painel, o cliente abre o suporte com contexto: conta, plano, estado das integrações, último erro |
| RF-92 | Alertas que evitam chamado: canal desconectado, Google expirado, pagamento da Meta ausente, franquia a 80% |
| RF-93 | Toda dúvida resolvida por pessoa vira artigo ou correção de produto na mesma semana |
| RF-94 | Prazo de primeira resposta humana por plano, publicado na página de preços |
| RF-95 | Acesso do suporte à conta do cliente segue RN-35: motivo, tempo limitado, auditoria |

## Aquisição além da busca

| Canal | Como |
|---|---|
| Indicação | Mês grátis para quem indica e para quem entra; link próprio no painel |
| "Atendido por" | Assinatura opcional e discreta no perfil do WhatsApp Business do cliente, com desconto para quem mantém |
| Demonstração | Número público de consultório fictício; QR code em material e eventos |
| Conteúdo curto | Vídeos de conversas reais anonimizadas e de configuração em minutos |
| Parcerias | Cursos e associações de cada especialidade; contadores de profissionais de saúde |
| Agências | Revenda com marca própria (fase 5) |
| Anúncio com clique para o WhatsApp | Cai direto na demonstração; a janela gratuita da Meta reduz o custo da conversa |

## E-mail

Transacional por um provedor de envio (Resend ou equivalente): verificação, lembretes de onboarding, avisos de franquia e cobrança, resumo semanal. Nunca conteúdo de conversa de paciente por e-mail.

## Medição

Indicadores do funil: visitas, conversas com a demonstração, cadastros, chegada ao simulador, ativação, conversão do teste em assinatura, cancelamento por mês, custo de aquisição por canal, chamados por cliente ativo.
