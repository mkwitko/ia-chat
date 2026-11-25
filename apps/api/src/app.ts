import { createChannelSender, type ChannelSend } from '@app/channels';
import { NodeEnv } from '@app/core';
import type { Db } from '@app/db';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerAssistantSettingsRoutes } from './assistant/settings-routes.ts';
import { createAuth, type Auth } from './auth/auth.ts';
import { registerAgendaRoutes } from './agenda/register.ts';
import { registerAuthRoutes } from './auth/routes.ts';
import { registerControlRoutes } from './conversations/control-routes.ts';
import { registerInboxRoutes } from './conversations/inbox-routes.ts';
import { registerPushRoutes } from './push/push-routes.ts';
import { registerEventsRoute } from './realtime/events-route.ts';
import { createInboxHub } from './realtime/inbox-hub.ts';
import { devEmailSender } from './email/dev-sender.ts';
import type { EmailSender } from './email/outbox.ts';
import { registerKnowledgeRoutes } from './setup/knowledge-routes.ts';
import { registerLocationRoutes } from './setup/location-routes.ts';
import { registerServiceRoutes } from './setup/services-routes.ts';
import { registerToneRoutes } from './setup/tone-routes.ts';
import { registerUsageRoutes } from './usage/usage-routes.ts';
import type { ApiEnv } from './env.ts';
import type { EnqueueInbound } from './webhooks/store.ts';
import { registerWaitlistIfConfigured } from './waitlist/waitlist-routes.ts';
import type { TurnstileVerifier } from './waitlist/turnstile.ts';
import { registerWhatsappWebhook } from './webhooks/whatsapp.ts';

declare module 'fastify' {
  interface FastifyInstance {
    auth: Auth;
    db: Db;
  }
}

export interface AppDeps {
  env: ApiEnv;
  db: Db;
  /** Defaults to printing emails in the log (development). */
  email?: EmailSender;
  /** Queues stored webhook batches for the worker; without it the webhook is off. */
  enqueueInbound?: EnqueueInbound;
  /** Sends the professional's messages. Defaults to the Cloud API (records only in dev without token). */
  send?: ChannelSend;
  /** Checks Turnstile tokens of the public waitlist form. Defaults to Cloudflare's siteverify. */
  verifyTurnstile?: TurnstileVerifier;
}

// Logs never carry message content nor auth headers (RN-38).
const REDACTED_PATHS = ['req.headers.cookie', 'req.headers.authorization'];

export function buildApp(deps: AppDeps): FastifyInstance {
  const { env, db, email, enqueueInbound, send } = deps;
  const app = Fastify({
    logger: env.NODE_ENV !== NodeEnv.test && { redact: REDACTED_PATHS },
  });
  app.decorate('db', db);
  app.decorate('auth', createAuth({ env, db, email: email ?? devEmailSender(app.log) }));
  registerAuthRoutes(app);
  registerControlRoutes(app);
  registerSettingsRoutes(app);
  registerWaitlistIfConfigured(app, deps);
  registerInboxRoutes(app, {
    send:
      send ??
      createChannelSender({
        accessToken: env.META_ACCESS_TOKEN,
        devFallback: env.NODE_ENV !== NodeEnv.production,
        log: (fields, message) => {
          app.log.info(fields, message);
        },
      }),
  });
  registerPushRoutes(app, { publicKey: env.PUSH_VAPID_PUBLIC_KEY });
  const hub = createInboxHub(env.DATABASE_URL, app.log);
  registerEventsRoute(app, hub);
  app.addHook('onClose', () => hub.close());
  const { META_APP_SECRET: appSecret, META_VERIFY_TOKEN: verifyToken } = env;
  if (appSecret && verifyToken && enqueueInbound) {
    registerWhatsappWebhook(app, { appSecret, verifyToken, enqueue: enqueueInbound });
  }
  return app;
}

/** Panel settings and agenda: each module registers its own guarded routes. */
function registerSettingsRoutes(app: FastifyInstance): void {
  registerAssistantSettingsRoutes(app);
  registerServiceRoutes(app);
  registerLocationRoutes(app);
  registerKnowledgeRoutes(app);
  registerToneRoutes(app);
  registerUsageRoutes(app);
  registerAgendaRoutes(app);
}
