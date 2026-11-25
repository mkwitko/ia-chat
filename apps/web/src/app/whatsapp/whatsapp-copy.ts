// Panel copy in pt-BR for "Conectar WhatsApp" (E-24): second person, no jargon.

export const WhatsappCopy = {
  heading: 'WhatsApp',
  intro:
    'Conecte o número do consultório. Leva uns 5 minutos numa janela da Meta. Você continua usando o app WhatsApp Business no celular, no mesmo número.',
  payment:
    'A Meta cobra direto de você, no cartão que você cadastra lá durante ou depois da conexão, os lembretes e confirmações enviados fora da janela de 24 horas. Responder a quem escreveu primeiro não tem custo.',
  off: 'A conexão com o WhatsApp ainda não está disponível nesta conta. Você pode seguir sem ela.',
  ownerOnly: 'Só o dono da conta pode conectar o número.',
  loadFailed: 'Não conseguimos ver o estado do WhatsApp. Tente de novo.',
  connect: 'Conectar WhatsApp',
  reconnect: 'Conectar outro número',
  opening: 'Abrindo a janela da Meta…',
  finishing: 'Configurando seu número na Meta…',
  cancelled: 'A conexão não foi concluída. Quando quiser, é só tentar de novo.',
  sdkFailed:
    'Não conseguimos abrir a janela da Meta. Confira se o navegador bloqueou a janela e tente de novo.',
  failed: 'A Meta recusou a conexão. Tente de novo e aceite todas as permissões pedidas.',
  taken:
    'Esse número já está conectado a outra conta. Fale com a gente pelo botão "preciso de ajuda".',
  connected: (phone: string) => `Conectado: ${phone}`,
  connectedNoPhone: 'WhatsApp conectado.',
  coexistence: 'O app WhatsApp Business continua funcionando no seu celular.',
  pending: 'A conexão começou, mas falta concluir a configuração na Meta.',
  retry: 'Tentar concluir',
  retrying: 'Tentando…',
  paymentMissing:
    'Falta cadastrar um cartão na sua conta do WhatsApp na Meta. Sem ele, o assistente não é ativado.',
  paymentLink: 'Cadastrar cartão na Meta',
  paymentDone: 'Já cadastrei, verificar de novo',
} as const;
