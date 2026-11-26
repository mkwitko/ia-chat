// Panel copy in pt-BR for the QR code connection (E-09b, RF-27, RF-29). The risks repeat
// docs/legal/termo-conexao-qr.md (version 1.0) in its own words; the full text is on the site.

export const QrCopy = {
  heading: 'Conexão por QR code (alternativa)',
  intro:
    'Se a conexão oficial ainda não for possível, dá para conectar lendo um QR code, como no WhatsApp Web. Não é autorizada pela Meta e o número pode ser bloqueado.',
  start: 'Conectar por QR code',
  termsTitle: 'Antes de conectar, leia e aceite os riscos',
  risks: [
    'Esta conexão não é oferecida nem autorizada pela Meta ou pelo WhatsApp e viola os termos de uso do WhatsApp.',
    'Seu número pode ser bloqueado pelo WhatsApp, por um tempo ou para sempre, a qualquer momento e sem aviso, mesmo que você só responda a quem escreveu.',
    'Não há garantia de recuperar o número, as conversas ou os contatos se o número for bloqueado. O Consultório Aberto não responde por essa perda.',
    'A conexão pode cair quando o WhatsApp mudar. Enquanto estiver fora, o assistente para de responder e o painel avisa você.',
    'Para reduzir o risco, o assistente só responde a quem escreveu (além de confirmação e lembrete de horário), com intervalo entre mensagens e limite por minuto e por dia. Não há envio em massa.',
    'Se a perda do número for inaceitável, não use nesta conexão o número principal do consultório. Você pode trocar para a conexão oficial quando quiser, sem perder contatos, conversas ou horários.',
  ],
  readFull: 'Ler o termo completo',
  accept: 'Li e aceito os riscos',
  confirm: 'Aceitar e gerar o QR code',
  cancel: 'Agora não',
  connecting: 'Gerando o QR code…',
  scanTitle: 'Leia o QR code com o celular do consultório',
  scanSteps: 'No WhatsApp do celular: Configurações > Aparelhos conectados > Conectar um aparelho.',
  scanHint: 'O código muda sozinho a cada 20 segundos. Deixe esta tela aberta até conectar.',
  qrAlt: 'QR code para conectar o WhatsApp',
  starting: 'Preparando o QR code…',
  expired: 'O QR code expirou antes de ser lido.',
  unreachable: 'Não conseguimos falar com o serviço de conexão agora. Tente de novo em instantes.',
  newQr: 'Gerar novo QR code',
  connected: (phone: string) => `Conectado por QR code: ${phone}`,
  connectedNoPhone: 'WhatsApp conectado por QR code.',
  connectedNote:
    'O assistente só responde a quem escreveu, com limite de envio, para reduzir o risco.',
  downTitle: 'O WhatsApp por QR code desconectou',
  downBody:
    'O assistente parou de responder neste número. Gere um novo QR code e leia com o celular para voltar.',
  failed: 'Não conseguimos gerar o QR code. Tente de novo em instantes.',
  ownerOnly: 'Só o dono da conta pode conectar o número.',
} as const;
