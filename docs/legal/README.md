# Documentos legais

Versão 1.0, vigente a partir de 25/11/2026. Aprovada pelo dono em 25/11/2026 sem revisão de advogado (decisão registrada em `docs/spec/README.md`). Estes arquivos são a **fonte única**: o site (`apps/site`) os lê daqui e publica `/termos`, `/privacidade`, `/contrato-de-operador`, `/suboperadores`, `/aviso-ao-paciente` e `/termo-conexao-qr`. Para mudar um texto, edite o arquivo aqui e suba a versão no topo dele.

Dados da empresa: Mauricio de Oliveira Kwitko, CNPJ 40.585.767/0001-44, também encarregado (DPO).

## Documentos

| Arquivo | Para quê | Quem aceita ou assina | Onde aparece |
| --- | --- | --- | --- |
| [termos-de-uso.md](termos-de-uso.md) | Contrato de uso do serviço (B2B): planos, cobrança, teste, cancelamento, uso aceitável, limites da IA, responsabilidade, foro | Cliente (dono da conta), no cadastro por convite | Site e painel |
| [politica-de-privacidade.md](politica-de-privacidade.md) | Como tratamos os dados dos nossos clientes (profissionais, equipe) e dos visitantes do site, como **controladores** | Informativo | Site e painel |
| [aviso-privacidade-paciente.md](aviso-privacidade-paciente.md) | Modelo de aviso que o **cliente** mostra ao paciente: versão curta para o WhatsApp e versão completa para link | O cliente adapta e publica; é dele (controlador) | Primeira mensagem (M-01) e link no perfil |
| [contrato-de-operador.md](contrato-de-operador.md) | Acordo de tratamento de dados (LGPD, controlador e operador) sobre os dados dos pacientes | Cliente, junto com os Termos | Anexo dos Termos |
| [suboperadores.md](suboperadores.md) | Lista pública e versionada de suboperadores, com finalidade, dados e local | Informativo | Site |
| [termo-conexao-qr.md](termo-conexao-qr.md) | Termo de ciência do risco da conexão não oficial por QR code (RF-27) | Cliente, no painel, antes de conectar | Onboarding |
| [termo-piloto.md](termo-piloto.md) | Consentimento do cliente piloto para depoimento e uso das métricas do piloto | Cliente piloto, por escrito | Fora do produto |

## Pendências operacionais

Marcadores ainda abertos nos textos (preencher e remover daqui):

- `Rua Castro Alves, 1015, Independência, Porto Alegre (RS), CEP 90430-131`, `mauriciokwt@gmail.com`, `mauriciokwt@gmail.com`: Termos, Política, Contrato de Operador e termo do piloto.
- `Florianópolis (SC)`: Termos de Uso, cláusula 18.2.
- `[PROVEDOR DE HOSPEDAGEM]` e `[PROVEDOR DE E-MAIL]` (e `[LOCAL DO PROVEDOR]`): `suboperadores.md`, quando os contratos forem fechados.
- Valor do profissional adicional do plano Clínica: Termos, cláusula 5.1 (hoje remete à página de preços).
- Valores adotados por padrão, sem fonte na especificação, para ajustar se o dono quiser: reajuste anual pelo IPCA (7.3), multa de 2% e juros de 1% ao mês (8.5), suporte em dias úteis das 9h às 18h (13.4), backups eliminados em até 35 dias (contrato de operador 12.2), registros de auditoria por 12 meses (Política).
- Cláusulas-padrão da ANPD com cada suboperador fora do Brasil (nota abaixo) e conferência da região de cada conta (Cloudflare, Sentry, Axiom): E-00e.
- Ao mudar o texto de um documento publicado, subir a versão no topo e avisar os clientes conforme o Contrato de Operador, cláusula 7.

## Nota: cláusulas-padrão contratuais da ANPD (transferência internacional)

- A LGPD (art. 33) só permite transferir dados pessoais para fora do Brasil com um mecanismo válido. Para nós, os candidatos são: cláusulas-padrão contratuais (art. 33, II, "b"), consentimento específico e destacado (art. 33, VIII, impraticável como base única) ou provedor que processe no Brasil.
- A **Resolução CD/ANPD 19/2024** (23/08/2024) aprovou o Regulamento de Transferência Internacional e, no Anexo II, as **cláusulas-padrão contratuais**. Elas devem ser incorporadas **sem alteração** ao contrato entre exportador e importador. O prazo para adequar contratos anteriores foi de 12 meses (até 23/08/2025, já vencido).
- Pela resolução, cabe ao **controlador** (o cliente) verificar se há transferência internacional e se existe mecanismo válido; o operador (nós) auxilia. Na prática, quem contrata os provedores somos nós, então as cláusulas precisam estar no nosso contrato com cada suboperador fora do Brasil (Vercel, provedores de modelo, TypeSafe, Langfuse, Sentry, Axiom e Cloudflare, conforme o local confirmado em [suboperadores.md](suboperadores.md)).
- Provedores estrangeiros raramente assinam o texto da ANPD sem negociação. Se algum recusar, as saídas são: trocar de provedor, processar no Brasil, ou minimizar o dado antes do envio (já mascaramos nome e telefone nos traços do Langfuse, mas o texto da conversa vai ao modelo).
- Até a data da pesquisa 01 não havia decisão de adequação de país nem cláusulas equivalentes aprovadas pela ANPD (não verificado atualmente).
- **Pendência operacional:** conferir a versão vigente da resolução e do Anexo II ao incorporar as cláusulas aos contratos.
