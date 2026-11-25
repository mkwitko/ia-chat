import { timingSafeEqual } from 'node:crypto';
import { webhookEventSchema } from '@app/core';
import { handleBillingEvent } from '@app/db';
import { AlertEvent } from '@app/observability';
import type { FastifyInstance } from 'fastify';
import { HttpStatus } from '../http.ts';

export const ASAAS_WEBHOOK_PATH = '/webhooks/asaas';
const TOKEN_HEADER = 'asaas-access-token';
const CODE_UNREADABLE = 'unreadable_billing_event';
const CODE_APPLY_FAILED = 'billing_event_failed';

function tokenMatches(sent: unknown, expected: string): boolean {
  // eslint-disable-next-line no-restricted-syntax -- headers are string | string[] | undefined
  if (typeof sent !== 'string') return false;
  const a = Buffer.from(sent);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Asaas webhook (spec 05, E-25). The `asaas-access-token` header is the secret we set on the
 * webhook. Idempotent by event id. Off without ASAAS_WEBHOOK_TOKEN.
 */
export function registerBillingWebhook(app: FastifyInstance, token: string | undefined): void {
  if (!token) return;
  app.post(ASAAS_WEBHOOK_PATH, async (request, reply) => {
    if (!tokenMatches(request.headers[TOKEN_HEADER], token))
      return reply.code(HttpStatus.unauthorized).send();
    const event = webhookEventSchema.safeParse(request.body);
    if (!event.success) {
      // Acknowledged: Asaas would retry an unreadable body until it pauses the whole queue.
      app.alert(AlertEvent.webhookError, { requestId: request.id, code: CODE_UNREADABLE });
      return reply.code(HttpStatus.ok).send();
    }
    try {
      await handleBillingEvent(app.db, event.data);
    } catch (error) {
      app.alert(AlertEvent.webhookError, { requestId: request.id, code: CODE_APPLY_FAILED }, error);
      // Not acknowledged: Asaas retries, and the stored event is applied again.
      return reply.code(HttpStatus.internalError).send();
    }
    return reply.code(HttpStatus.ok).send();
  });
}
