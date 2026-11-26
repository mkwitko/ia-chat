import type { AiGateway } from '@app/ai';
import { createChannelSender, type ChannelSend } from '@app/channels';
import { NodeEnv, channelTokenReader, whatsappSignupConfig, type BillingProvider } from '@app/core';
import type { Db } from '@app/db';
import type { Alert } from '@app/observability';
import Fastify, { type FastifyInstance } from 'fastify';
import { registerAssistantSettingsRoutes } from './assistant/settings-routes.ts';
import { createAuth, type Auth } from './auth/auth.ts';
import { registerAgendaRoutes } from './agenda/register.ts';
import { registerAuthRoutes } from './auth/routes.ts';
import { registerCalendarRoutes } from './calendar/routes.ts';
import { setupCalendar } from './calendar/setup.ts';
import type { HealthDeps } from './health/health-routes.ts';
import { fastifyObservability, setupObservability } from './observability.ts';
import { registerControlRoutes } from './conversations/control-routes.ts';
import { registerInboxRoutes } from './conversations/inbox-routes.ts';
import { registerCustomerRoutes } from './customers/customers-routes.ts';
import { registerHomeRoutes } from './home/home-routes.ts';
import { registerResultsRoutes } from './results/results-routes.ts';
import { registerOperatorRoutes } from './operator/operator-routes.ts';
import { registerPushRoutes } from './push/push-routes.ts';
import { registerEventsRoute } from './realtime/events-route.ts';
import { createInboxHub } from './realtime/inbox-hub.ts';
import { devEmailSender } from './email/dev-sender.ts';
import type { EmailSender } from './email/outbox.ts';
import { registerInviteRoutes } from './invites/invite-routes.ts';
import { registerOnboardingRoutes } from './onboarding/onboarding-routes.ts';
import { registerTrialRoutes } from './trial/trial-routes.ts';
import { registerKnowledgeRoutes } from './setup/knowledge-routes.ts';
import { registerLocationRoutes } from './setup/location-routes.ts';
import { registerPlacesRoutes } from './setup/places-routes.ts';
import { registerProfessionalRoutes } from './setup/professionals-routes.ts';
import { registerProfileRoutes } from './setup/profile-routes.ts';
import { registerServiceRoutes } from './setup/services-routes.ts';
import { registerSimulatorRoutes } from './simulator/simulator-routes.ts';
import { registerToneRoutes } from './setup/tone-routes.ts';
import { registerBillingRoutes } from './billing/billing-routes.ts';
import { registerBillingWebhook } from './billing/webhook.ts';
import { registerUsageRoutes } from './usage/usage-routes.ts';
import type { ApiEnv } from './env.ts';
import type { EnqueueInbound } from './webhooks/store.ts';
import { registerWaitlistIfConfigured } from './waitlist/waitlist-routes.ts';
import type { TurnstileVerifier } from './waitlist/turnstile.ts';
import { registerWhatsappWebhook } from './webhooks/whatsapp.ts';
import { registerWhatsappSignupRoutes } from './whatsapp/routes.ts';

declare module 'fastify' {
  interface FastifyInstance {
    auth: Auth;
    db: Db;
    /** Logs, sends to Sentry and records a problem for the operator panel. */
    alert: Alert;
  }
}

export interface AppDeps extends HealthDeps {
  env: ApiEnv;
  db: Db;
  /** Defaults to printing emails in the log (development). */
  email?: EmailSender;
  /** Queues stored webhook batches for the worker; without it the webhook is off. */
  enqueueInbound?: EnqueueInbound;
  /** Sends the professional's messages. Defaults to the Cloud API (records only in dev without token). */
  send?: ChannelSend;
  /** Model access of the simulator (spec 10); without it the simulator answers 503. */
  simulatorGateway?: AiGateway;
  /** Checks Turnstile tokens of the public waitlist form. Defaults to Cloudflare's siteverify. */
  verifyTurnstile?: TurnstileVerifier;
  /** Asaas (E-25); without it billing is off and the routes answer 503. */
  billing?: BillingProvider;
  /** Test seam; defaults to log + Sentry + ops_events. */
  alert?: Alert;
  /** Test seam: the `fetch` used for Google (OAuth and Calendar). */
  calendarFetch?: typeof fetch;
  /** Test seam: the `fetch` used for the Graph API in Embedded Signup (E-24). */
  metaFetch?: typeof fetch;
}

export function buildApp(deps: AppDeps): FastifyInstance {
  const { env, db, email, enqueueInbound, send } = deps;
  const app = Fastify(fastifyObservability(env));
  app.decorate('db', db);
  setupObservability(app, deps);
  setupCalendar(app, deps);
  app.decorate('operatorEmails', env.OPERATOR_EMAILS);
  app.decorate('auth', createAuth({ env, db, email: email ?? devEmailSender(app.log) }));
  registerAuthRoutes(app);
  registerInviteRoutes(app, env);
  registerOperatorRoutes(app);
  registerControlRoutes(app);
  registerSimulatorRoutes(app, { gateway: deps.simulatorGateway });
  registerSettingsRoutes(app);
  registerWaitlistIfConfigured(app, deps);
  registerInboxRoutes(app, {
    send:
      send ??
      createChannelSender({
        accessToken: env.META_ACCESS_TOKEN,
        readChannelToken: channelTokenReader(env.META_TOKEN_KEY),
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
  registerBillingWebhook(app, env.ASAAS_WEBHOOK_TOKEN);
  registerBillingRoutes(app, deps.billing);
  registerWhatsappSignupRoutes(app, { config: whatsappSignupConfig(env), fetch: deps.metaFetch });
  return app;
}

/** Panel settings and agenda: each module registers its own guarded routes. */
function registerSettingsRoutes(app: FastifyInstance): void {
  registerAssistantSettingsRoutes(app);
  registerServiceRoutes(app);
  registerLocationRoutes(app);
  registerPlacesRoutes(app);
  registerProfessionalRoutes(app);
  registerProfileRoutes(app);
  registerKnowledgeRoutes(app);
  registerOnboardingRoutes(app);
  registerTrialRoutes(app);
  registerToneRoutes(app);
  registerUsageRoutes(app);
  registerAgendaRoutes(app);
  registerCustomerRoutes(app);
  registerHomeRoutes(app);
  registerResultsRoutes(app);
  registerCalendarRoutes(app);
}
