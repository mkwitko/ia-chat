import { randomInt, randomUUID } from 'node:crypto';
import type { FastifyInstance, LightMyRequestResponse } from 'fastify';
import type { AiGateway } from '@app/ai';
import type { ChannelSend } from '@app/channels';
import type { BillingProvider } from '@app/core';
import { createDb, type Db } from '@app/db';
import { buildApp } from './app.ts';
import { AUTH_BASE_PATH } from './auth/auth.ts';
import { parseApiEnv } from './env.ts';
import { createInvite } from './invites/invite-store.ts';
import { INVITE_COOKIE } from './invites/signup-gate.ts';
import { MemoryOutbox } from './email/outbox.ts';
import type { EnqueueInbound } from './webhooks/store.ts';

// Test-only helpers: a real app on the dev database, with a fake mailbox.

const TEST_ENV = {
  ...process.env,
  NODE_ENV: 'test',
  BETTER_AUTH_SECRET: 'test-secret-that-is-at-least-32-characters-long',
  BETTER_AUTH_URL: 'http://localhost:3000',
  WEB_ORIGIN: 'http://localhost:5173',
  // Integrations stay off unless a test turns one on: a developer's .env must not change results.
  GOOGLE_CLIENT_ID: undefined,
  GOOGLE_CLIENT_SECRET: undefined,
  GOOGLE_TOKEN_KEY: undefined,
  SENTRY_DSN: undefined,
  AXIOM_TOKEN: undefined,
  ASAAS_API_KEY: undefined,
  ASAAS_WEBHOOK_TOKEN: undefined,
  META_APP_ID: undefined,
  META_ES_CONFIG_ID: undefined,
  META_TOKEN_KEY: undefined,
};
const PASSWORD = 'senha-de-teste-123';
const TEST_NAME = 'Pessoa Teste';
const TEST_PRACTICE = 'Consultório Teste';
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
  metaFetch?: typeof fetch;
  billing?: BillingProvider;
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
    ...(options.billing ? { billing: options.billing } : {}),
    ...(options.metaFetch ? { metaFetch: options.metaFetch } : {}),
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

/** A fresh onboarding invite (H-37) and the cookie the invite page would have set. */
export async function inviteCookie(ctx: TestContext, practiceName = TEST_PRACTICE): Promise<string> {
  const { token } = await createInvite(ctx.db, {
    practiceName,
    email: null,
    operatorId: randomUUID(),
    now: new Date(),
  });
  return `${INVITE_COOKIE}=${token}`;
}

export function signUp(ctx: TestContext, { email, cookie = '' }: { email: string; cookie?: string }) {
  return authPost(ctx, {
    path: '/sign-up/email',
    body: { email, password: PASSWORD, name: TEST_NAME },
    cookie,
  });
}

/** Follows the last verification link emailed to this address; returns the session cookie. */
export async function verify(ctx: TestContext, email: string): Promise<string> {
  const link = new URL(lastLinkTo(ctx.outbox, email));
  const verified = await ctx.app.inject({ method: 'GET', url: link.pathname + link.search });
  return cookieOf(verified);
}

/**
 * Signs up through an onboarding invite (the only way in, H-37), follows the verification link and
 * returns the session cookie. The invite opens the user's consultório, already active.
 */
export async function signUpVerified(ctx: TestContext, email = uniqueEmail()): Promise<string> {
  await signUp(ctx, { email, cookie: await inviteCookie(ctx) });
  return verify(ctx, email);
}

export function signIn(ctx: TestContext, email: string) {
  return authPost(ctx, { path: '/sign-in/email', body: { email, password: PASSWORD } });
}

/** The consultório the invite opened for this session's user (active since sign-up). */
export async function createTenant(ctx: TestContext, cookie: string): Promise<string> {
  const response = await ctx.app.inject({
    method: 'GET',
    url: `${AUTH_BASE_PATH}/get-session`,
    headers: { cookie },
  });
  const tenantId = response.json<{ session: { activeOrganizationId: string | null } }>().session
    .activeOrganizationId;
  if (!tenantId) throw new Error('no consultório for this session');
  return tenantId;
}

/** Signs up a new user and joins them to the tenant with the given role. Returns their cookie. */
export async function joinAs(
  ctx: TestContext,
  { ownerCookie, tenantId, role }: { ownerCookie: string; tenantId: string; role: string },
): Promise<string> {
  const email = uniqueEmail();
  // Team invitation first: it is what lets someone without an onboarding invite sign up.
  await authPost(ctx, {
    path: '/organization/invite-member',
    body: { email, role, organizationId: tenantId },
    cookie: ownerCookie,
  });
  const invitationId = lastLinkTo(ctx.outbox, email).split('/').pop();
  await signUp(ctx, { email });
  const cookie = await verify(ctx, email);
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

const CPF_BASE_LENGTH = 9;
const CPF_MOD = 11;

/** A valid CPF no other test has used (the document is unique, and the dev database is shared). */
export function freshCpf(): string {
  const digits = Array.from({ length: CPF_BASE_LENGTH }, () => randomInt(10));
  const check = (list: number[]) => {
    const sum = list.reduce((acc, d, i) => acc + d * (list.length + 1 - i), 0);
    const rest = (sum * 10) % CPF_MOD;
    return rest === 10 ? 0 : rest;
  };
  const first = check(digits);
  return [...digits, first, check([...digits, first])].join('');
}
