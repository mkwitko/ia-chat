import {
  InboundProvider,
  parseWahaWebhook,
  verifyWahaSignature,
  WAHA_HMAC_HEADER,
  type InboundBatch,
} from '@app/channels';
import { AlertEvent } from '@app/observability';
import type { FastifyInstance } from 'fastify';
import { HttpStatus } from '../http.ts';
import { storeBatch, StoreOutcome, type EnqueueInbound } from './store.ts';

export const WAHA_WEBHOOK_PATH = '/webhooks/waha';
const JSON_TYPE = 'application/json';
const LOG_BAD_SIGNATURE = 'waha webhook with invalid hmac';
const LOG_UNKNOWN = 'waha webhook for a session with no channel';
const CODE_UNREADABLE = 'unreadable_waha_body';

export interface WahaWebhookDeps {
  /** WAHA_WEBHOOK_SECRET: the HMAC key the container signs with. */
  secret: string;
  enqueue: EnqueueInbound;
}

/**
 * E-09b: events from the WAHA container (private network). Same path as the Cloud API one
 * after the signature: raw part stored per tenant, 200, worker queued (RF-21).
 */
export function registerWahaWebhook(app: FastifyInstance, deps: WahaWebhookDeps): void {
  void app.register((scope, _options, done) => {
    scope.addContentTypeParser(JSON_TYPE, { parseAs: 'buffer' }, (_request, body, parsed) => {
      parsed(null, body);
    });
    scope.post(WAHA_WEBHOOK_PATH, async (request, reply) => {
      const body = request.body as Buffer;
      const hmac = request.headers[WAHA_HMAC_HEADER];
      if (!verifyWahaSignature(body, Array.isArray(hmac) ? undefined : hmac, deps.secret)) {
        request.log.warn(LOG_BAD_SIGNATURE);
        return reply.code(HttpStatus.unauthorized).send();
      }
      for (const batch of readBatches(app, body, request.id)) {
        const outcome = await storeBatch(
          app.db,
          { ...batch, provider: InboundProvider.waha },
          deps.enqueue,
        );
        if (outcome === StoreOutcome.unknownAccount)
          request.log.warn({ accountId: batch.accountId }, LOG_UNKNOWN);
      }
      return reply.code(HttpStatus.ok).send();
    });
    done();
  });
}

// Signed but unreadable: acknowledged and alerted, or WAHA would retry it.
function readBatches(app: FastifyInstance, body: Buffer, requestId: string): InboundBatch[] {
  try {
    return parseWahaWebhook(body);
  } catch {
    app.alert(AlertEvent.webhookError, { requestId, code: CODE_UNREADABLE });
    return [];
  }
}
