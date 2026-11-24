import { NodeEnv } from '@app/core';
import type { Db } from '@app/db';
import Fastify, { type FastifyInstance } from 'fastify';
import { createAuth, type Auth } from './auth/auth.ts';
import { registerAuthRoutes } from './auth/routes.ts';
import { devEmailSender } from './email/dev-sender.ts';
import type { EmailSender } from './email/outbox.ts';
import type { ApiEnv } from './env.ts';

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
}

// Logs never carry message content nor auth headers (RN-38).
const REDACTED_PATHS = ['req.headers.cookie', 'req.headers.authorization'];

export function buildApp({ env, db, email }: AppDeps): FastifyInstance {
  const app = Fastify({
    logger: env.NODE_ENV !== NodeEnv.test && { redact: REDACTED_PATHS },
  });
  app.decorate('db', db);
  app.decorate('auth', createAuth({ env, db, email: email ?? devEmailSender(app.log) }));
  registerAuthRoutes(app);
  return app;
}
