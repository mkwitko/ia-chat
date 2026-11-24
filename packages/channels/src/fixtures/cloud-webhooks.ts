// Cloud API webhook bodies shaped after Meta's documentation (research 01), with fictitious
// numbers and names. Replace with captured payloads once the Meta test number exists.

export const PHONE_NUMBER_ID = '106540352242922';
export const OTHER_PHONE_NUMBER_ID = '106540352242999';
export const WABA_ID = '102290129340398';

const wrap = (field: string, value: object, entryId = WABA_ID) => ({
  object: 'whatsapp_business_account',
  entry: [
    { id: entryId, changes: [{ field, value: { messaging_product: 'whatsapp', ...value } }] },
  ],
});
const metadata = (id = PHONE_NUMBER_ID) => ({
  display_phone_number: '554133330000',
  phone_number_id: id,
});

export const textMessage = wrap('messages', {
  metadata: metadata(),
  contacts: [
    { profile: { name: 'Joana Exemplo' }, wa_id: '5541999990001', user_id: 'BR.1A2B3C4D5E' },
  ],
  messages: [
    {
      from: '5541999990001',
      from_user_id: 'BR.1A2B3C4D5E',
      id: 'wamid.TEXT1',
      timestamp: '1798981200',
      type: 'text',
      text: { body: 'oi, quanto custa a avaliação?' },
    },
  ],
});

/** Patient with a username: Meta omits the phone and sends only the BSUID. */
export const bsuidOnlyMessage = wrap('messages', {
  metadata: metadata(),
  contacts: [{ profile: { name: 'Carlos' }, user_id: 'BR.9Z8Y7X' }],
  messages: [
    {
      from_user_id: 'BR.9Z8Y7X',
      id: 'wamid.BSUID1',
      timestamp: '1798981260',
      type: 'text',
      text: { body: 'tem horário amanhã?' },
    },
  ],
});

export const mediaMessages = wrap('messages', {
  metadata: metadata(),
  contacts: [
    { profile: { name: 'Joana Exemplo' }, wa_id: '5541999990001', user_id: 'BR.1A2B3C4D5E' },
  ],
  messages: [
    {
      from: '5541999990001',
      id: 'wamid.AUDIO1',
      timestamp: '1798981300',
      type: 'audio',
      audio: { id: 'media-audio-1', mime_type: 'audio/ogg; codecs=opus' },
    },
    {
      from: '5541999990001',
      id: 'wamid.IMAGE1',
      timestamp: '1798981301',
      type: 'image',
      image: { id: 'media-image-1', mime_type: 'image/jpeg', caption: 'meu exame' },
    },
    {
      from: '5541999990001',
      id: 'wamid.LOC1',
      timestamp: '1798981302',
      type: 'location',
      location: { latitude: -25.43, longitude: -49.27 },
    },
    {
      from: '5541999990001',
      id: 'wamid.BTN1',
      timestamp: '1798981303',
      type: 'interactive',
      interactive: { type: 'button_reply', button_reply: { id: 'confirmar', title: 'Confirmar' } },
    },
    {
      from: '5541999990001',
      id: 'wamid.REACT1',
      timestamp: '1798981304',
      type: 'reaction',
      reaction: { message_id: 'wamid.X', emoji: '👍' },
    },
  ],
});

export const statuses = wrap('messages', {
  metadata: metadata(),
  statuses: [
    {
      id: 'wamid.OUT1',
      status: 'delivered',
      timestamp: '1798981400',
      recipient_id: '5541999990001',
    },
    {
      id: 'wamid.OUT2',
      status: 'failed',
      timestamp: '1798981401',
      recipient_id: '5541999990001',
      errors: [{ code: 131047, title: 'Re-engagement message' }],
    },
    { id: 'wamid.OUT3', status: 'played', timestamp: '1798981402', recipient_id: '5541999990001' },
  ],
});

/** Coexistence: the owner answered from the WhatsApp Business app on the phone. */
export const ownerEcho = wrap('smb_message_echoes', {
  metadata: metadata(),
  message_echoes: [
    {
      from: '554133330000',
      to: '5541999990001',
      to_user_id: 'BR.1A2B3C4D5E',
      id: 'wamid.ECHO1',
      timestamp: '1798981500',
      type: 'text',
      text: { body: 'Oi Joana, aqui é o Rafael. Te ligo já.' },
    },
  ],
});

export const accountDisconnected = wrap('account_update', {
  phone_number: '554133330000',
  event: 'PARTNER_APP_UNINSTALLED',
  disconnection_info: { reason: 'PRIMARY_INACTIVITY' },
});

/** One delivery can carry two phone numbers of the same app. */
export const twoAccounts = {
  object: 'whatsapp_business_account',
  entry: [
    {
      id: WABA_ID,
      changes: [{ field: 'messages', value: textMessage.entry[0]?.changes[0]?.value }],
    },
    {
      id: WABA_ID,
      changes: [
        {
          field: 'messages',
          value: {
            messaging_product: 'whatsapp',
            metadata: metadata(OTHER_PHONE_NUMBER_ID),
            contacts: [{ wa_id: '5511988887777', user_id: 'BR.OTHER' }],
            messages: [
              {
                from: '5511988887777',
                from_user_id: 'BR.OTHER',
                id: 'wamid.OTHER1',
                timestamp: '1798981600',
                type: 'text',
                text: { body: 'olá' },
              },
            ],
          },
        },
      ],
    },
  ],
};

export const asBody = (payload: object) => Buffer.from(JSON.stringify(payload));
