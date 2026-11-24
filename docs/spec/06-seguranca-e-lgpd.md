# 06 — Segurança, privacidade e conformidade

Fontes: [pesquisa 01](../research/01-meta-whatsapp-compliance.md). Esta seção não substitui parecer jurídico. Vários pontos da pesquisa ficaram sem verificação e estão marcados (nv).

## Papéis na LGPD

- O profissional é o **controlador** dos dados dos pacientes. Nós somos **operador** (nv quanto ao detalhamento no guia da ANPD).
- Somos controladores dos dados dos nossos clientes (cadastro, cobrança).
- Provedores de LLM, transcrição, banco e armazenamento são suboperadores. A lista é pública e versionada.

## Dados de saúde

Mensagem de paciente a profissional de saúde pode conter dado sensível mesmo quando ninguém pede. Conduta:

| ID | Regra |
|---|---|
| RN-20 | O assistente não solicita informação de saúde. Também é exigência da política da Meta |
| RN-21 | Informação de saúde que o paciente envia espontaneamente fica só no texto da mensagem. Não é extraída para campos de cadastro, CRM, resumos de longo prazo ou relatórios |
| RN-22 | Imagens e documentos não são enviados a modelo de IA |
| RN-23 | Relatórios e análises trabalham com metadados e categorias administrativas |
| RN-24 | Traços de IA têm nome e telefone mascarados |

## Transferência internacional

Nenhum provedor de LLM processa integralmente no Brasil. Por isso:

- Contrato com cada provedor com as cláusulas-padrão contratuais da ANPD (Resolução 19/2024), obrigatórias para esse tipo de envio.
- Aviso de privacidade do profissional (modelo fornecido por nós) informa o uso de assistente virtual e o processamento fora do país.
- Opção de não retenção de dados ativada nos provedores que a oferecem.
- Nunca usar tier gratuito ou modalidade em que o provedor treina com os dados.

## Transparência com o paciente

- Primeira mensagem de cada conversa nova identifica o assistente virtual. A Resolução CFM 2.454/2026 garante ao paciente o direito de saber do uso de IA; adotamos a regra para todas as especialidades.
- O perfil do WhatsApp Business ou a primeira mensagem traz link para o aviso de privacidade do profissional.
- Paciente pode pedir atendimento humano a qualquer momento.

## Voz clonada

Decisão de 24/11/2026: ofertar como módulo pago na Fase 5, restrito à voz do próprio profissional titular da conta. Isso resolve o direito sobre a voz e dispensa parecer jurídico como bloqueio. Não há lei específica e o Marco Legal da IA seguia pendente na pesquisa, então ficam duas condições de produto:

- termo de consentimento aceito no painel, com a amostra gravada pelo próprio profissional logado; nunca a voz de terceiro;
- o paciente continua informado de que fala com um assistente virtual. A identificação da primeira mensagem vale para áudio.

Antes disso, o módulo de voz usa voz padrão.

## Regras por especialidade

Ver `specialty_policies` em [01](01-produto-e-planos.md). A divulgação de preço é o ponto mais sensível: permitida pelo CFM, vedada pelo CFN, restrita pelo COFFITO, não verificada para CFO e CFP. A responsabilidade pelo cumprimento da norma do conselho é do profissional e isso consta no contrato; ainda assim, o padrão de cada especialidade nasce conservador.

## Contrato com o cliente

O contrato de operador precisa cobrir, no mínimo: objeto e finalidade do tratamento; instruções do controlador; lista de suboperadores e como é alterada; transferência internacional; medidas de segurança; prazo de comunicação de incidente (a ANPD exige comunicação em 3 dias úteis; nosso prazo ao controlador deve ser menor); atendimento a direitos dos titulares; devolução e eliminação ao término; responsabilidade do profissional pelas regras do conselho e pelo conteúdo cadastrado.

## Direitos dos titulares e retenção

| ID | Requisito |
|---|---|
| RF-60 | Exportar todos os dados de um contato em formato legível, pelo painel |
| RF-61 | Eliminar um contato: apaga mensagens, mídia e cadastro; mantém registros financeiros e de auditoria sem conteúdo de conversa |
| RF-62 | Retenção configurável de mensagens e mídia por tenant (padrão 12 meses para mensagens, 90 dias para mídia), com job de expurgo |
| RF-63 | Encerramento de conta: exportação disponível por 30 dias, depois eliminação completa |
| RF-64 | Registro de consentimento e de opt-out por contato, com data e origem |

O prazo de guarda de prontuário não se aplica aqui: o sistema não é prontuário (nv). Deixar isso explícito nos termos.

## Segurança técnica

| ID | Requisito |
|---|---|
| RN-30 | Isolamento por RLS conforme [02](02-arquitetura.md), com teste automatizado por tabela |
| RN-31 | Tokens de terceiros (Meta, Google, Asaas) cifrados em repouso com chave fora do banco; nunca em log |
| RN-32 | Webhooks: validação de assinatura, limite de taxa na borda, idempotência |
| RN-33 | Painel: sessão com cookie seguro, segundo fator opcional no início e obrigatório para o plano Clínica, bloqueio após tentativas |
| RN-34 | Papéis: dono, profissional, recepcionista. Recepcionista não vê cobrança nem altera integrações |
| RN-35 | Acesso do operador da plataforma a um tenant exige motivo, é temporário e gera auditoria visível ao cliente |
| RN-36 | Mídia no R2 em caminho por tenant, acesso só por URL assinada de curta duração |
| RN-37 | Backups diários e recuperação em ponto no tempo; teste de restauração a cada trimestre |
| RN-38 | Logs sem conteúdo de mensagem. Conteúdo fica só no banco e no traço mascarado |
| RN-39 | Segredos em cofre do provedor de execução; rotação documentada |
| RN-40 | Ambiente de teste nunca usa dados reais de pacientes |

## Resposta a incidente

Procedimento escrito antes do primeiro cliente pagante: quem decide, como isolar, como avaliar o alcance por tenant (a auditoria e o RLS permitem), modelo de comunicação ao controlador e à ANPD.
