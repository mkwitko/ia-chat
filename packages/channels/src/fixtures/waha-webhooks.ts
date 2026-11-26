// WAHA webhook bodies shaped after the WAHA docs (waha.devlike.pro, "Events" and "Receive
// messages", read 26/11/2026), engine GOWS, with fictitious numbers. Replace with captured
// payloads after the first real pairing (E-09b, "primeiro dia").

/** The container on the private network (plain HTTP inside it, never public). */
// eslint-disable-next-line sonarjs/no-clear-text-protocols -- private Docker network, never public
export const WAHA_BASE_URL = 'http://waha:3000';
export const SESSION = 'qr-0193a1b2c3d4';
export const OTHER_SESSION = 'qr-0193ffffffff';
const OWNER = '554133330000@c.us';
const PATIENT = '5541999990001@c.us';
const PATIENT_LID = '123456789012345@lid';
const ENGINE = 'GOWS';
const ME = { id: OWNER, pushName: 'Consultório' };

const event = <P extends object>(name: string, payload: P, session = SESSION) => ({
  id: `evt_${name}`,
  event: name,
  session,
  engine: ENGINE,
  me: ME,
  payload,
});

/** A patient wrote: `message.any` with fromMe false. */
export const wahaText = event('message.any', {
  id: `false_${PATIENT}_3EB0TEXT1`,
  timestamp: 1798981200,
  from: PATIENT,
  fromMe: false,
  source: 'app',
  to: OWNER,
  body: 'oi, quanto custa a avaliação?',
  hasMedia: false,
  ack: 1,
  _data: { Info: { PushName: 'Joana Exemplo' } },
});

/** Hidden id (LID) instead of the phone; GOWS carries the phone in `_data.Info.SenderAlt`. */
export const wahaLidText = event('message.any', {
  id: `false_${PATIENT_LID}_3EB0LID1`,
  timestamp: 1798981210,
  from: PATIENT_LID,
  fromMe: false,
  source: 'app',
  to: OWNER,
  body: 'tem horário amanhã?',
  hasMedia: false,
  _data: { Info: { SenderAlt: '5541999990001@s.whatsapp.net' } },
});

/** Only the LID: no phone anywhere. */
export const wahaLidOnly = event('message.any', {
  id: `false_${PATIENT_LID}_3EB0LID2`,
  timestamp: 1798981220,
  from: PATIENT_LID,
  fromMe: false,
  source: 'app',
  to: OWNER,
  body: 'olá',
  hasMedia: false,
});

export const wahaAudio = event('message.any', {
  id: `false_${PATIENT}_3EB0AUDIO1`,
  timestamp: 1798981230,
  from: PATIENT,
  fromMe: false,
  source: 'app',
  to: OWNER,
  body: '',
  hasMedia: true,
  media: {
    url: `${WAHA_BASE_URL}/api/files/${SESSION}/3EB0AUDIO1.oga`,
    mimetype: 'audio/ogg; codecs=opus',
    filename: null,
    error: null,
  },
});

/** The owner answered from the phone: `message.any`, fromMe true, source app. */
export const wahaOwnerEcho = event('message.any', {
  id: `true_${PATIENT}_3EB0ECHO1`,
  timestamp: 1798981500,
  from: OWNER,
  fromMe: true,
  source: 'app',
  to: PATIENT,
  body: 'Oi Joana, aqui é o Rafael. Te ligo já.',
  hasMedia: false,
});

/** What we sent through the API comes back too (source api): already stored, ignored. */
export const wahaApiEcho = event('message.any', {
  id: `true_${PATIENT}_3EB0API1`,
  timestamp: 1798981510,
  from: OWNER,
  fromMe: true,
  source: 'api',
  to: PATIENT,
  body: 'resposta do assistente',
  hasMedia: false,
});

export const wahaGroupMessage = event('message.any', {
  id: 'false_120363000000000000@g.us_3EB0GROUP1',
  timestamp: 1798981520,
  from: '120363000000000000@g.us',
  fromMe: false,
  source: 'app',
  to: OWNER,
  participant: PATIENT,
  body: 'mensagem no grupo',
  hasMedia: false,
});

export const wahaDelivered = event('message.ack', {
  id: `true_${PATIENT}_3EB0OUT1`,
  from: PATIENT,
  participant: null,
  fromMe: true,
  ack: 2,
  ackName: 'DEVICE',
});

export const wahaAckError = event('message.ack', {
  id: `true_${PATIENT}_3EB0OUT2`,
  from: PATIENT,
  participant: null,
  fromMe: true,
  ack: -1,
  ackName: 'ERROR',
});

const status = (name: string) =>
  event('session.status', {
    status: name,
    statuses: [{ status: name, timestamp: 1798981600000 }],
  });

export const wahaWorking = status('WORKING');
export const wahaFailed = status('FAILED');
export const wahaScanQr = status('SCAN_QR_CODE');

export const wahaOtherSession = event(
  'message.any',
  { ...wahaText.payload, id: `false_${PATIENT}_3EB0OTHER1` },
  OTHER_SESSION,
);
