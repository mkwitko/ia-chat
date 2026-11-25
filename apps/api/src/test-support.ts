import { randomUUID } from 'node:crypto';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import type { AiGateway } from '@app/ai';
import type { ChannelSend } from '@app/channels';
import { createDb, type Db } from '@app/db';
import { buildApp } from './app.ts';
import { AUTH_BASE_PATH } from './auth/auth.ts';
import { parseApiEnv } from './env.ts';
import { MemoryOutbox } from './email/outbox.ts';
import type { EnqueueInbound } from './webhooks/store.ts';

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

export interface TestAppOptions {
  env?: Record<string, string>;
  enqueueInbound?: EnqueueInbound;
  send?: ChannelSend;
  simulatorGateway?: AiGateway;
  checkQueue?: () => Promise<unknown>;
  calendarFetch?: typeof fetch;
}

export async function startTestApp(
  register: (app: FastifyInstance) => void = () => undefined,
  options: TestAppOptions = {},
): Promise<TestContext> {
  const env = parseApiEnv({ ...TEST_ENV, ...options.env });
  const db = createDb(env.DATABASE_URL);
  const outbox = new MemoryOutbox();
  const app = buildApp({
    env,
    db,
    email: outbox,
    ...(options.enqueueInbound ? { enqueueInbound: options.enqueueInbound } : {}),
    ...(options.send ? { send: options.send } : {}),
    ...(options.simulatorGateway ? { simulatorGateway: options.simulatorGateway } : {}),
    ...(options.checkQueue ? { checkQueue: options.checkQueue } : {}),
    ...(options.calendarFetch ? { calendarFetch: options.calendarFetch } : {}),
  });
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

/** Signs up a new user and joins them to the tenant with the given role. Returns their cookie. */
export async function joinAs(
  ctx: TestContext,
  { ownerCookie, tenantId, role }: { ownerCookie: string; tenantId: string; role: string },
): Promise<string> {
  const email = uniqueEmail();
  const cookie = await signUpVerified(ctx, email);
  await authPost(ctx, {
    path: '/organization/invite-member',
    body: { email, role, organizationId: tenantId },
    cookie: ownerCookie,
  });
  const invitationId = lastLinkTo(ctx.outbox, email).split('/').pop();
  await authPost(ctx, { path: '/organization/accept-invitation', body: { invitationId }, cookie });
  return cookie;
}

/** A fictitious conversation (own channel and contact) in the tenant. */
export async function newConversation(ctx: TestContext, tenantId: string): Promise<string> {
  return ctx.db.withTenant(tenantId, async (tx) => {
    const channel = await tx.channel.create({ data: { tenantId, kind: 'cloud_api' } });
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}`, name: 'Paciente Fictício' },
    });
    const conversation = await tx.conversation.create({
      data: { tenantId, channelId: channel.id, contactId: contact.id },
    });
    return conversation.id;
  });
}
