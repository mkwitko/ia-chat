import type { FastifyInstance } from 'fastify';
import * as z from 'zod';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';

export const PUSH_CONFIG_PATH = '/api/push/config';
export const PUSH_SUBSCRIPTIONS_PATH = '/api/push/subscriptions';

const subscribeSchema = z.object({
  endpoint: z.url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});
const unsubscribeSchema = z.object({ endpoint: z.url() });

/** Web Push of the panel (spec 10, "Notificações"): the browser registers here, any member. */
export function registerPushRoutes(
  app: FastifyInstance,
  { publicKey }: { publicKey: string | undefined },
): void {
  // null: this server has no VAPID keys, so the panel hides the "turn on notifications" action.
  app.get(PUSH_CONFIG_PATH, { preHandler: requireTenant() }, () => ({
    publicKey: publicKey ?? null,
  }));

  app.put(PUSH_SUBSCRIPTIONS_PATH, { preHandler: requireTenant() }, async (request, reply) => {
    const body = subscribeSchema.safeParse(request.body);
    const tenant = request.tenant;
    if (!body.success || !tenant)
      return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
    const { endpoint, keys } = body.data;
    const data = { userId: tenant.userId, p256dh: keys.p256dh, auth: keys.auth };
    await tenant.withTenant((tx) =>
      tx.pushSubscription.upsert({
        where: { tenantId_endpoint: { tenantId: tenant.tenantId, endpoint } },
        create: { tenantId: tenant.tenantId, endpoint, ...data },
        update: data,
      }),
    );
    return reply.code(HttpStatus.ok).send({ subscribed: true });
  });

  app.delete(PUSH_SUBSCRIPTIONS_PATH, { preHandler: requireTenant() }, async (request, reply) => {
    const body = unsubscribeSchema.safeParse(request.body);
    const tenant = request.tenant;
    if (!body.success || !tenant)
      return reply.code(HttpStatus.badRequest).send({ error: ErrorCode.invalidRequest });
    await tenant.withTenant((tx) =>
      tx.pushSubscription.deleteMany({
        where: { endpoint: body.data.endpoint, userId: tenant.userId },
      }),
    );
    return reply.code(HttpStatus.ok).send({ subscribed: false });
  });
}
