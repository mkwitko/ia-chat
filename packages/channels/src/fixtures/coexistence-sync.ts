// Coexistence history and contacts sync webhooks, shaped after Meta's "Onboarding WhatsApp Business
// app users" reference (history, smb_app_state_sync; read 26/11/2026). Fictitious numbers and texts.

import { PHONE_NUMBER_ID, WABA_ID } from './cloud-webhooks.ts';

const BUSINESS_PHONE = '554133330000';
const PATIENT_PHONE = '5541999990001';
const OTHER_PHONE = '5541999990002';

const wrap = (field: string, value: object) => ({
  object: 'whatsapp_business_account',
  entry: [
    {
      id: WABA_ID,
      changes: [
        {
          field,
          value: {
            messaging_product: 'whatsapp',
            metadata: { display_phone_number: BUSINESS_PHONE, phone_number_id: PHONE_NUMBER_ID },
            ...value,
          },
        },
      ],
    },
  ],
});

/** Two threads: text, a media placeholder and a reply in the first; the owner's text in the second. */
export const historyChunk = wrap('history', {
  history: [
    {
      metadata: { phase: 0, chunk_order: 1, progress: 55 },
      threads: [
        {
          id: PATIENT_PHONE,
          messages: [
            {
              from: PATIENT_PHONE,
              id: 'wamid.HIST1',
              timestamp: '1798981100',
              type: 'text',
              text: { body: 'Oi, vocês atendem aos sábados?' },
              history_context: { status: 'read' },
            },
            {
              from: BUSINESS_PHONE,
              id: 'wamid.HIST2',
              timestamp: '1798981200',
              type: 'text',
              text: { body: 'Atendemos sim, das 8h às 12h.' },
              history_context: { status: 'read' },
            },
            {
              from: BUSINESS_PHONE,
              id: 'wamid.HIST3',
              timestamp: '1798981300',
              type: 'media_placeholder',
              history_context: { status: 'played' },
            },
          ],
        },
        {
          id: OTHER_PHONE,
          messages: [
            {
              from: BUSINESS_PHONE,
              id: 'wamid.HIST4',
              timestamp: '1798981400',
              type: 'text',
              text: { body: 'Obrigado pela confiança!' },
              history_context: { status: 'delivered' },
            },
          ],
        },
      ],
    },
  ],
});

/** A thread known only by BSUID: the patient's message carries `from_user_id`, no phone. */
export const historyBsuidThread = wrap('history', {
  history: [
    {
      metadata: { phase: 1, chunk_order: 2, progress: 100 },
      threads: [
        {
          context: { user_id: 'BR.9Z8Y7X', username: 'carlos.exemplo' },
          messages: [
            {
              from_user_id: 'BR.9Z8Y7X',
              id: 'wamid.HIST5',
              timestamp: '1798981500',
              type: 'text',
              text: { body: 'Bom dia' },
              history_context: { status: 'read' },
            },
          ],
        },
      ],
    },
  ],
});

/** The owner turned history sharing off in the Business app: error 2593109. */
export const historyDeclined = wrap('history', {
  history: [
    {
      errors: [
        {
          code: 2593109,
          title: 'History sync is turned off by the business from the WhatsApp Business App',
          message: 'History sync is turned off by the business from the WhatsApp Business App',
          error_data: { details: 'History sharing is turned off by the business' },
        },
      ],
    },
  ],
});

/** Phone book: one contact added or edited, one removed (no name on removal). */
export const contactsSync = wrap('smb_app_state_sync', {
  state_sync: [
    {
      type: 'contact',
      contact: { full_name: 'Joana Exemplo', first_name: 'Joana', phone_number: PATIENT_PHONE },
      action: 'add',
      metadata: { timestamp: '1798981000' },
    },
    {
      type: 'contact',
      contact: { phone_number: OTHER_PHONE },
      action: 'remove',
      metadata: { timestamp: '1798981010' },
    },
  ],
});
