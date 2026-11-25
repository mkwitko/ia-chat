# Documentos legais — minutas

> **MINUTA — revisar com advogado antes de publicar.** Nada nesta pasta foi revisado por advogado. Os textos foram escritos a partir da especificação (`docs/spec/`) e das pesquisas (`docs/research/`) em 25/11/2026. Onde falta dado da empresa há marcador entre colchetes (`[RAZÃO SOCIAL]`, `[CNPJ]`, `[ENDEREÇO]`, `[E-MAIL DO ENCARREGADO]`, `[VALOR]`). Nenhum dado de empresa foi inventado.

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

## Ordem de leitura sugerida para o advogado

1. Contrato de operador e lista de suboperadores (dado de saúde e transferência internacional são o maior risco).
2. Termos de Uso.
3. Aviso ao paciente.
4. Termo da conexão por QR code.
5. Política de privacidade e termo do piloto.

## Pendências para o advogado

1. **Papéis na LGPD.** Confirmar que o cliente é controlador e nós operador para os dados dos pacientes, e controladores para os dados de cadastro e cobrança dos clientes. Pesquisa 01 marcou como "não verificado" no guia da ANPD.
2. **Dado de saúde (art. 11).** O assistente pode perguntar a queixa (decisão do dono, 25/11/2026). Definir a base legal que o **cliente** deve indicar (art. 11, II, "f", tutela da saúde, só vale para profissional ou serviço de saúde; negócios que não são de saúde precisariam de outra base ou de não perguntar). Avaliar se o aviso curto basta ou se é preciso consentimento destacado.
3. **Transferência internacional (art. 33).** Os modelos de IA rodam fora do Brasil. Ver a nota abaixo sobre as cláusulas-padrão da ANPD.
4. **CDC.** O cliente é pequeno negócio ou profissional autônomo. Avaliar se ele pode ser tratado como consumidor (teoria finalista mitigada, vulnerabilidade) e o que isso derruba: limitação de responsabilidade, ausência de reembolso proporcional, foro, direito de arrependimento de 7 dias (art. 49) na contratação pela internet.
5. **Política da Meta para saúde.** A Business Messaging Policy restringe pedir informação de saúde quando a norma aplicável exigir sistema com requisitos reforçados (seção 3). Confirmar se pedir a queixa é compatível (H-29).
6. **Modos de identidade `clinic` e `professional`** (o assistente não se anuncia como IA). Risco de CDC (art. 6, III; art. 37, §1º), LGPD (transparência) e Resolução CFM 2.454/2026 (H-13). Decidir se o produto pode oferecer esses modos e com que aviso.
7. **Conexão por QR code.** Viola os termos do WhatsApp por definição. Avaliar nossa exposição por oferecer a opção, a validade da renúncia do cliente e a cláusula de indenização.
8. **Retenção.** Texto das mensagens por até 90 dias após a última mensagem (H-34); mídia 90 dias; dados de conta 30 dias após o fim. Confirmar os prazos e os registros que precisam ser guardados por obrigação legal (fiscal, Marco Civil art. 15 para registros de acesso de aplicação: 6 meses).
9. **Prazo de incidente.** Propusemos avisar o cliente em até 24 horas para ele cumprir os 3 dias úteis da Resolução CD/ANPD 15/2024 (prazo da resolução não conferido no DOU).
10. **Encarregado (DPO).** Indicar o nosso encarregado e verificar a dispensa para agente de pequeno porte (Resolução CD/ANPD 2/2022), que não se aplica a quem trata dado sensível em larga escala.
11. **Contratos com suboperadores.** Conferir os termos de cada provedor (não treinar com os dados, retenção, região) e se aceitam as cláusulas-padrão da ANPD.
12. **Dados da empresa.** Preencher razão social, CNPJ, endereço, e-mail do encarregado, foro e valores dos planos.

## Nota: cláusulas-padrão contratuais da ANPD (transferência internacional)

- A LGPD (art. 33) só permite transferir dados pessoais para fora do Brasil com um mecanismo válido. Para nós, os candidatos são: cláusulas-padrão contratuais (art. 33, II, "b"), consentimento específico e destacado (art. 33, VIII, impraticável como base única) ou provedor que processe no Brasil.
- A **Resolução CD/ANPD 19/2024** (23/08/2024) aprovou o Regulamento de Transferência Internacional e, no Anexo II, as **cláusulas-padrão contratuais**. Elas devem ser incorporadas **sem alteração** ao contrato entre exportador e importador. O prazo para adequar contratos anteriores foi de 12 meses (até 23/08/2025, já vencido).
- Pela resolução, cabe ao **controlador** (o cliente) verificar se há transferência internacional e se existe mecanismo válido; o operador (nós) auxilia. Na prática, quem contrata os provedores somos nós, então as cláusulas precisam estar no nosso contrato com cada suboperador fora do Brasil (Vercel, provedores de modelo, TypeSafe, Langfuse, Sentry, Axiom e Cloudflare, conforme o local confirmado em [suboperadores.md](suboperadores.md)).
- Provedores estrangeiros raramente assinam o texto da ANPD sem negociação. Se algum recusar, as saídas são: trocar de provedor, processar no Brasil, ou minimizar o dado antes do envio (já mascaramos nome e telefone nos traços do Langfuse, mas o texto da conversa vai ao modelo).
- Até a data da pesquisa 01 não havia decisão de adequação de país nem cláusulas equivalentes aprovadas pela ANPD (não verificado atualmente).
- **Pendência:** o advogado deve conferir a versão vigente da resolução e do Anexo II antes de assinar.
