import { randomUUID } from 'node:crypto';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import { createDb, type Db } from '@app/db';
import { buildApp } from './app.ts';
import { AUTH_BASE_PATH } from './auth/auth.ts';
import { parseApiEnv } from './env.ts';
import { MemoryOutbox } from './email/outbox.ts';

// Test-only helpers: a real app on the dev database, with a fake mailbox.

const TEST_ENV = {
  ...process.env,
  NODE_ENV: 'test',
  BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  BETTER_AUTH_URL: 'http://localhost:3000',
  WEB_ORIGIN: 'http://localhost:5173',
};
const PASSWORD = 'senha-de-teste-123';
const SET_COOKIE = 'set-cookie';
const LINK_PATTERN = /https?:\/\/\S+/;

export interface TestContext {
  app: FastifyInstance;
  db: Db;
  outbox: MemoryOutbox;
}

export async function startTestApp(
  register: (app: FastifyInstance) => void = () => undefined,
): Promise<TestContext> {
  const env = parseApiEnv(TEST_ENV);
  const db = createDb(env.DATABASE_URL);
  const outbox = new MemoryOutbox();
  const app = buildApp({ env, db, email: outbox });
  register(app);
  await app.ready();
  return { app, db, outbox };
}

export function uniqueEmail(): string {
  return `pessoa-${randomUUID()}@exemplo.test`;
}

export function cookieOf(response: LightMyRequestResponse): string {
  const raw = response.headers[SET_COOKIE];
  const list = Array.isArray(raw) ? raw : [raw ?? ''];
  return list.map((c) => c.split(';')[0]).join('; ');
}

export function lastLinkTo(outbox: MemoryOutbox, email: string): string {
  const message = outbox.sent.findLast((m) => m.to === email);
  const link = message?.text.match(LINK_PATTERN)?.[0];
  if (!link) throw new Error(`no link emailed to ${email}`);
  return link;
}

export interface AuthRequest {
  path: string;
  body: object;
  cookie?: string;
}

export function authPost(ctx: TestContext, { path, body, cookie = '' }: AuthRequest) {
  return ctx.app.inject({
    method: 'POST',
    url: `${AUTH_BASE_PATH}${path}`,
    payload: body,
    headers: { cookie, origin: TEST_ENV.WEB_ORIGIN },
  });
}

/** Signs up, follows the verification link and returns the session cookie. */
export async function signUpVerified(ctx: TestContext, email = uniqueEmail()): Promise<string> {
  await authPost(ctx, {
    path: '/sign-up/email',
    body: { email, password: PASSWORD, name: 'Pessoa Teste' },
  });
  const link = new URL(lastLinkTo(ctx.outbox, email));
  const verified = await ctx.app.inject({ method: 'GET', url: link.pathname + link.search });
  return cookieOf(verified);
}

export function signIn(ctx: TestContext, email: string) {
  return authPost(ctx, { path: '/sign-in/email', body: { email, password: PASSWORD } });
}

export async function createTenant(ctx: TestContext, cookie: string): Promise<string> {
  const slug = `consultorio-${randomUUID()}`;
  const response = await authPost(ctx, {
    path: '/organization/create',
    body: { name: 'Consultório Teste', slug },
    cookie: cookie,
  });
  const { id } = response.json<{ id: string }>();
  return id;
}
