# Suboperadores — Consultório Aberto

**Versão 1.0 — vigente a partir de 25/11/2026**

Lista pública e versionada. Mudanças são avisadas aos clientes conforme o [Contrato de Operador](contrato-de-operador.md), cláusula 7.


## Suboperadores que tratam dados de pacientes

| Suboperador | Finalidade | Dados | Local | Mecanismo de transferência |
| --- | --- | --- | --- | --- |
| [PROVEDOR DE HOSPEDAGEM] | Servidores da API, do processamento em segundo plano, do banco Postgres e do gateway da conexão por QR code | Todos os dados do serviço | Brasil | Não se aplica |
| Cloudflare, Inc. (R2) | Armazenamento de mídia (áudios, imagens, documentos) e backup contínuo do banco | Mídia e cópia de segurança de todos os dados | Exterior, conforme a região do bucket | Cláusulas-padrão ANPD, se fora do Brasil |
| Vercel, Inc. (AI Gateway) | Intermediário que encaminha as chamadas aos modelos de IA | Texto das conversas, transcrições, dados de agenda enviados ao modelo | Estados Unidos  | Cláusulas-padrão ANPD |
| OpenAI (via Vercel AI Gateway) | Modelos de linguagem que geram as respostas; transcrição de áudio | Texto das conversas, áudios, contexto de agenda | Estados Unidos  | Cláusulas-padrão ANPD |
| Anthropic (via Vercel AI Gateway) | Modelos de linguagem de reserva e de escalada | Texto das conversas, contexto de agenda | Estados Unidos  | Cláusulas-padrão ANPD |
| TypeSafe (modelo Jev) | Verificações automáticas: urgência, confirmação, validação da resposta, presença de dado de saúde | Trechos do texto das conversas | Estados Unidos (informado na documentação do provedor em 24/11/2026) | Cláusulas-padrão ANPD |
| Langfuse (Langfuse Cloud) | Registro técnico das chamadas de IA, para qualidade e custo | Texto das conversas com nome e telefone mascarados | União Europeia | Cláusulas-padrão ANPD |
| Functional Software, Inc. (Sentry) | Relatórios de erro | Dados técnicos, **sem conteúdo de mensagem**, com telefone e e-mail removidos | Exterior, conforme a região da conta | Cláusulas-padrão ANPD, se fora do Brasil |
| Axiom, Inc. | Registros técnicos (logs) | Identificadores e códigos técnicos, **sem conteúdo de mensagem** | Exterior, conforme a região da conta | Cláusulas-padrão ANPD, se fora do Brasil |

## Serviços contratados pelo Cliente, nas contas dele

| Serviço | Finalidade | Dados | Local |
| --- | --- | --- | --- |
| Meta Platforms (WhatsApp Business Platform, Cloud API) | Envio e recebimento das mensagens | Telefone, nome do perfil, mensagens e mídia | Exterior (provedor global) |
| Google (Google Agenda) | Espelho da agenda, quando o Cliente conecta | Eventos de agendamento (horário e serviço) | Exterior (provedor global) |
| Mercado Pago | Cobrança do sinal por Pix na conta do Cliente, quando usado | Valor e identificação da cobrança | Brasil  |

## Prestadores que tratam só dados dos nossos clientes (não de pacientes)

Nestes casos somos controladores (ver a [Política de Privacidade](politica-de-privacidade.md)).

| Prestador | Finalidade | Dados | Local |
| --- | --- | --- | --- |
| Asaas Gestão Financeira | Cobrança da assinatura e nota fiscal | Nome, CPF ou CNPJ, e-mail, faturas | Brasil |
| Google (login) | Entrar no painel com a conta Google | Nome, e-mail, identificador da conta | Exterior (provedor global) |
| Cloudflare (Turnstile) | Verificação anti-robô nos formulários do site | Dados técnicos do navegador | Exterior (provedor global) |
| Serviços de notificação do navegador (Google, Mozilla, Apple) | Entrega de notificações do painel | Endereço de inscrição; a notificação não traz conteúdo de mensagem | Exterior (provedor global) |
| [PROVEDOR DE E-MAIL] | E-mails de conta, teste e cobrança | Nome, e-mail | [LOCAL DO PROVEDOR] |

## O que não é suboperador

- **Groq** e outros modelos usados só em desenvolvimento e testes: nunca recebem dados reais (ambiente de teste não usa dados de pacientes).
- Modelos usados na bateria de avaliação recebem só conversas fictícias.
