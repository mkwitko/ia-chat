import { NodeEnv } from '@app/core';
import type { Db } from '@app/db';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import type { EmailSender } from '../email/outbox.ts';
import { passwordResetEmail, verificationEmail } from '../email/templates.ts';
import type { ApiEnv } from '../env.ts';
import { tenantPlugin } from './organization.ts';

export const AUTH_BASE_PATH = '/api/auth';
const DATABASE_PROVIDER = 'postgresql';

export interface AuthDeps {
  env: ApiEnv;
  db: Db;
  email: EmailSender;
}

export type Auth = ReturnType<typeof createAuth>;

/** Better Auth over our Postgres. Organizations are our tenants (E-04). */
export function createAuth({ env, db, email }: AuthDeps) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    basePath: AUTH_BASE_PATH,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.WEB_ORIGIN],
    database: prismaAdapter(db.client, { provider: DATABASE_PROVIDER }),
    telemetry: { enabled: false },
    advanced: {
      database: { generateId: false },
      useSecureCookies: env.NODE_ENV === NodeEnv.production,
    },
    // ponytail: in-memory limiter is per instance; move to database storage with a second API instance.
    rateLimit: { enabled: env.NODE_ENV !== NodeEnv.test },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: ({ user, url }) => email.send(passwordResetEmail(user.email, url)),
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: ({ user, url }) => email.send(verificationEmail(user.email, url)),
    },
    socialProviders: googleProvider(env),
    plugins: [tenantPlugin({ env, email })],
  });
}

/** Google login only when credentials exist (Google Cloud project, E-00c). */
function googleProvider(env: ApiEnv) {
  const { GOOGLE_CLIENT_ID: clientId, GOOGLE_CLIENT_SECRET: clientSecret } = env;
  return clientId && clientSecret ? { google: { clientId, clientSecret } } : {};
}
