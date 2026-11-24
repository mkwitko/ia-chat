import { parseCloudWebhook, verifySignature, type InboundBatch } from '@app/channels';
import type { FastifyInstance } from 'fastify';
import { HttpStatus } from '../http.ts';
import { storeBatch, StoreOutcome, type EnqueueInbound } from './store.ts';

export const WHATSAPP_WEBHOOK_PATH = '/webhooks/whatsapp';
const SIGNATURE_HEADER = 'x-hub-signature-256';
const SUBSCRIBE = 'subscribe';
const JSON_TYPE = 'application/json';
const LOG_BAD_SIGNATURE = 'whatsapp webhook with invalid signature';
const LOG_UNREADABLE = 'whatsapp webhook body could not be read';
const LOG_UNKNOWN = 'whatsapp webhook for an account with no channel';

interface VerifyQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

export interface WhatsappWebhookDeps {
  appSecret: string;
  verifyToken: string;
  enqueue: EnqueueInbound;
}

/** Cloud API webhook (spec 03, "Entrada de webhook"): RF-20 and RF-21. No AI in the request. */
export function registerWhatsappWebhook(app: FastifyInstance, deps: WhatsappWebhookDeps): void {
  void app.register((scope, _options, done) => {
    // Raw bytes: the signature covers the body exactly as Meta sent it.
    scope.addContentTypeParser(JSON_TYPE, { parseAs: 'buffer' }, (_request, body, parsed) => {
      parsed(null, body);
    });
    scope.get<{ Querystring: VerifyQuery }>(WHATSAPP_WEBHOOK_PATH, async (request, reply) => {
      const query = request.query;
      if (query['hub.mode'] !== SUBSCRIBE || query['hub.verify_token'] !== deps.verifyToken) {
        return reply.code(HttpStatus.forbidden).send();
      }
      return reply.code(HttpStatus.ok).send(query['hub.challenge'] ?? '');
    });
    scope.post(WHATSAPP_WEBHOOK_PATH, async (request, reply) => {
      const body = request.body as Buffer;
      if (
        !verifySignature(
          body,
          request.headers[SIGNATURE_HEADER] as string | undefined,
          deps.appSecret,
        )
      ) {
        request.log.warn(LOG_BAD_SIGNATURE);
        return reply.code(HttpStatus.unauthorized).send();
      }
      const batches = readBatches(body, request.log);
      for (const batch of batches) {
        const outcome = await storeBatch(app.db, batch, deps.enqueue);
        if (outcome === StoreOutcome.unknownAccount)
          request.log.warn({ accountId: batch.accountId }, LOG_UNKNOWN);
      }
      return reply.code(HttpStatus.ok).send();
    });
    done();
  });
}

// A signed body we cannot read is acknowledged and logged: Meta would retry it for 7 days.
function readBatches(body: Buffer, log: FastifyInstance['log']): InboundBatch[] {
  try {
    return parseCloudWebhook(body);
  } catch (error) {
    log.error({ err: error }, LOG_UNREADABLE);
    return [];
  }
}
