# Contrato de Tratamento de Dados Pessoais (Controlador e Operador)

**Versão 1.0 — vigente a partir de 25/11/2026**

## 1. Partes

1.1. **Controlador:** o Cliente identificado no cadastro do Consultório Aberto ("Cliente").

1.2. **Operador:** Mauricio de Oliveira Kwitko, CNPJ 40.585.767/0001-44, Rua Castro Alves, 1015, Independência, Porto Alegre (RS), CEP 90430-131 ("Operador"). Encarregado: Mauricio de Oliveira Kwitko, mauriciokwt@gmail.com.

1.3. Este contrato faz parte dos [Termos de Uso](termos-de-uso.md) e prevalece sobre eles no que trata de dados pessoais dos pacientes.

## 2. Definições

2.1. Os termos "dado pessoal", "dado pessoal sensível", "tratamento", "controlador", "operador", "titular", "encarregado", "incidente" e "transferência internacional" têm o sentido da Lei 13.709/2018 (LGPD) e das resoluções da ANPD.

2.2. **Paciente** é a pessoa que conversa com o Cliente pelo WhatsApp, seja paciente, cliente ou interessado.

2.3. **Suboperador** é quem trata dados pessoais por conta do Operador para prestar o serviço.

## 3. Objeto, finalidade e duração

3.1. O Operador trata dados pessoais dos pacientes **em nome do Cliente e só para prestar o serviço** descrito nos Termos: receber e responder mensagens pelo WhatsApp, transcrever áudios, agendar, remarcar, cancelar, confirmar e lembrar atendimentos, cobrar sinal por Pix quando o Cliente usar, e mostrar tudo isso no painel.

3.2. O tratamento dura enquanto durar o contrato e o prazo de eliminação da cláusula 12.

## 4. Dados e titulares

| Categoria | Dados |
| --- | --- |
| Identificação e contato | Nome, telefone do WhatsApp, identificador do contato no WhatsApp |
| Conversa | Texto das mensagens, áudios e sua transcrição, imagens e documentos enviados |
| Agenda | Serviço, data e hora, situação do agendamento, confirmações |
| Pagamento de sinal | Valor, situação e identificador da cobrança (o pagamento é feito na conta do Cliente) |
| Consentimento | Opt-in e opt-out, com data, origem e texto exibido |
| Administrativos | Origem do contato, etapa do atendimento, anotações administrativas |
| **Dado sensível (saúde)** | A queixa que o paciente relata (o que incomoda e há quanto tempo) e qualquer informação de saúde enviada espontaneamente |

4.1. **Regra para dado de saúde.** A informação de saúde fica **só no texto da mensagem**. O Operador não a extrai para cadastro, campos, resumos de longo prazo ou relatórios. Textos gerados pela IA para guardar (por exemplo, dúvida sem resposta ou resumo) só são gravados depois de uma verificação automática indicar que não contêm dado de saúde; se a verificação falhar, nada é gravado. Imagens e documentos não são enviados a modelo de IA.

4.2. O serviço não é prontuário e não deve ser usado como registro clínico.

## 5. Instruções do Cliente

5.1. O Operador trata os dados **só conforme as instruções documentadas do Cliente**. São instruções: estes Termos e este contrato, as configurações feitas pelo Cliente no painel (serviços, horários, autonomia, identidade do assistente, retenção, integrações) e pedidos escritos ao suporte.

5.2. Se o Operador entender que uma instrução viola a LGPD, avisa o Cliente e pode deixar de cumpri-la até esclarecimento.

5.3. O Operador **não usa os dados dos pacientes para finalidade própria**, não os vende e não os usa nem permite que suboperadores os usem para **treinar modelos de IA**.

5.4. O Operador pode gerar estatísticas agregadas e anônimas, sem conteúdo de mensagem e sem identificar Cliente ou paciente, para operar e melhorar o serviço.

## 6. Obrigações do Cliente (controlador)

6.1. Definir a base legal do tratamento, inclusive para o dado de saúde (LGPD, art. 11), e informar os pacientes, usando o [modelo de aviso](aviso-privacidade-paciente.md) ou texto equivalente, incluindo o uso de assistente automatizado, a possibilidade de a queixa ser perguntada, a transferência internacional e a palavra de saída.

6.2. Responder aos pedidos dos titulares, com o apoio do Operador.

6.3. Cumprir as normas do seu conselho profissional e responder pelo conteúdo que cadastra.

6.4. Comunicar à ANPD e aos titulares os incidentes que exijam comunicação (art. 48).

6.5. Não pedir ao paciente, nem cadastrar, dados além do necessário.

## 7. Suboperadores

7.1. O Cliente autoriza o Operador a usar os suboperadores da [lista pública](suboperadores.md).

7.2. O Operador exige de cada suboperador obrigações de proteção de dados equivalentes às deste contrato, incluindo não treinar modelos com os dados.

7.3. **Mudança na lista.** O Operador avisa o Cliente com pelo menos 30 dias de antecedência sobre inclusão ou troca de suboperador, pelo painel ou por e-mail, e atualiza a lista. O Cliente pode se opor por motivo razoável de proteção de dados; se não houver solução, pode cancelar sem multa, com devolução proporcional do período pago e não usado.

7.4. Em emergência (por exemplo, queda de um provedor de IA), o Operador pode trocar de provedor antes do prazo, avisando o Cliente logo depois.

7.5. A Meta (WhatsApp), o Google e o Mercado Pago são contratados diretamente pelo Cliente, nas contas dele. Por isso não constam como suboperadores na lista pública.

7.6. O Operador responde perante o Cliente pelos atos dos suboperadores que contratar, nos limites da lei.

## 8. Transferência internacional

8.1. Os modelos de inteligência artificial e alguns suboperadores processam dados fora do Brasil, conforme a lista de suboperadores. O texto das conversas, inclusive a queixa, é enviado aos modelos de IA para gerar as respostas.

8.2. Para essas transferências, o Operador adota as **cláusulas-padrão contratuais da ANPD** (LGPD, art. 33, II, "b"; Resolução CD/ANPD 19/2024, Anexo II) com cada suboperador no exterior, ou outro mecanismo válido do art. 33.

8.3. O Operador minimiza o que envia: nome e telefone são mascarados nos registros técnicos de IA (Langfuse), e imagens e documentos não vão aos modelos.

8.4. O Cliente reconhece a transferência e a informa aos pacientes no aviso de privacidade.

## 9. Medidas de segurança

9.1. O Operador mantém, no mínimo, as medidas abaixo (LGPD, art. 46). Elas podem ser trocadas por medidas equivalentes ou melhores.

| Tema | Medida |
| --- | --- |
| Isolamento entre clientes | Cada registro tem identificador do cliente; o banco aplica segurança por linha (RLS) em toda tabela de negócio, com teste automatizado de isolamento |
| Localização do banco | Banco de dados em servidor no Brasil |
| Criptografia | Conexões cifradas em trânsito; tokens de Meta, Google e Asaas e sessões da conexão por QR code cifrados em repouso, com chave fora do banco. |
| Mídia | Arquivos guardados em caminho separado por cliente, acessíveis só por link assinado de curta duração |
| Backups | Backup diário e contínuo, com recuperação em ponto no tempo; teste de restauração a cada trimestre |
| Registros técnicos | Logs e relatórios de erro **sem conteúdo de mensagem**, com telefone e e-mail removidos; traços de IA com nome e telefone mascarados |
| Acesso do painel | Cookie de sessão seguro, bloqueio após tentativas, papéis (dono, profissional, recepcionista) com permissões diferentes; segundo fator de autenticação conforme o plano |
| Acesso do Operador | Acesso da equipe a dados de um cliente só com motivo registrado, por prazo de até 24 horas, com registro de auditoria visível ao Cliente |
| Integrações | Assinatura de webhooks verificada, limite de taxa e tratamento idempotente |
| Segredos | Fora do repositório de código e fora dos logs |
| Ambiente de teste | Nunca usa dados reais de pacientes |
| Envio de mensagens | Trava que impede o assistente de responder quando o profissional assumiu a conversa; opt-out aplicado antes de qualquer envio ativo |

9.2. O Operador **não declara certificações** (como ISO 27001 ou SOC 2) que não possui.

9.3. Pessoas do Operador com acesso a dados ficam sob dever de confidencialidade.

## 10. Incidentes de segurança

10.1. O Operador comunica ao Cliente qualquer incidente que afete dados dos pacientes dele **em até 24 horas** depois de tomar conhecimento, mesmo com informação incompleta.

10.2. A comunicação informa, na medida do possível: o que aconteceu, quando, dados e titulares afetados, medidas tomadas e recomendadas, e um contato.

10.3. O Operador ajuda o Cliente a cumprir o prazo de comunicação à ANPD e aos titulares (art. 48; Resolução CD/ANPD 15/2024) e guarda registro do incidente.

## 11. Direitos dos titulares e auditoria

11.1. O painel permite ao Cliente **exportar** os dados de um contato e **eliminar** um contato (apaga mensagens, mídia e cadastro; ficam registros financeiros e de auditoria sem conteúdo de conversa). Pedido que não puder ser atendido pelo painel é atendido pelo suporte em até 5 dias úteis.

11.2. Pedido de titular que chegar ao Operador é repassado ao Cliente, sem resposta de mérito do Operador.

11.3. O Operador fornece ao Cliente, mediante pedido, as informações necessárias para demonstrar o cumprimento deste contrato, incluindo relatório de impacto quando exigido (art. 38).

11.4. **Auditoria.** O Cliente pode auditar o cumprimento deste contrato uma vez por ano, ou após incidente, com aviso de 30 dias, por meio de questionário, documentos ou auditor independente sob confidencialidade, sem acesso a dados de outros clientes. Os custos ficam com o Cliente, salvo se a auditoria encontrar descumprimento relevante.

## 12. Retenção, devolução e eliminação

12.1. **Durante o contrato:** o texto das mensagens fica guardado enquanto a conversa estiver ativa e por até 90 dias após a última mensagem; depois o texto é apagado e ficam só metadados (autor, tipo, horário, situação). Mídia fica até 90 dias. O Cliente pode pedir a exclusão imediata de um contato.

12.2. **No fim do contrato:** o Cliente tem **30 dias** para exportar os dados pelo painel. Depois disso o Operador elimina os dados dos pacientes do banco e do armazenamento. Cópias em backup são eliminadas no ciclo normal dos backups, em até 35 dias, e não são usadas nesse período, salvo para recuperação de desastre.

12.3. O Operador pode manter, só pelo prazo legal, dados que a lei obrigue a guardar, sem conteúdo de conversa.

12.4. A pedido, o Operador confirma por escrito a eliminação.

## 13. Responsabilidade

13.1. Cada parte responde pelos danos que causar por descumprir a LGPD ou este contrato. O Operador responde solidariamente quando descumprir a lei ou as instruções lícitas do Cliente (LGPD, art. 42, §1º, I).

13.2. A limitação de responsabilidade dos Termos de Uso se aplica a este contrato no que a lei permitir.

## 14. Disposições finais

14.1. Este contrato segue a lei brasileira e o foro dos Termos de Uso.

14.2. Mudança na LGPD ou em resolução da ANPD que exija ajuste neste contrato será incorporada com aviso ao Cliente.
