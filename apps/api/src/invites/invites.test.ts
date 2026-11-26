import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  lastLinkTo,
  authPost,
  signUp,
  signUpVerified,
  startTestApp,
  uniqueEmail,
  type TestContext,
} from '../test-support.ts';
import { INVITE_COOKIE, INVITE_REQUIRED } from './signup-gate.ts';

// H-37 (owner decision, 25/11/2026): an account is created only through an onboarding invite.

const operatorEmail = uniqueEmail();
const PRACTICE = 'Clínica Coluna Fictícia';
const BASE = '/api/operator/invites';
const DAY_MS = 86_400_000;
const TRIAL_DAYS = 14;
const RACERS = 5;
const OK = 200;

interface InviteBody {
  invite: { id: string; state: string; practiceName: string; tenantId: string | null };
  link: string | null;
  emailed: boolean;
}

let ctx: TestContext;
let operator: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { env: { OPERATOR_EMAILS: operatorEmail } });
  operator = await signUpVerified(ctx, operatorEmail);
});
afterAll(() => ctx.app.close());

const post = (url: string, payload: object = {}, cookie = operator) =>
  ctx.app.inject({ method: 'POST', url, headers: { cookie }, payload });
const newInvite = async (practiceName = PRACTICE) =>
  (await post(BASE, { practiceName })).json<InviteBody>();
const tokenOf = (link: string | null) => link?.split('/').pop() ?? '';
const readInvite = (token: string) =>
  ctx.app.inject({ method: 'GET', url: `/api/invites/${token}` });
const cookieFor = (token: string) => `${INVITE_COOKIE}=${token}`;

describe('operator invites', () => {
  it('only the operator creates and lists them', async () => {
    const owner = await signUpVerified(ctx);
    expect((await post(BASE, { practiceName: PRACTICE }, owner)).statusCode).toBe(403);
    expect((await ctx.app.inject({ method: 'GET', url: BASE })).statusCode).toBe(401);
  });

  it('creates a pending invite with a one-time link and lists it without the token', async () => {
    const { invite, link } = await newInvite();
    expect(invite).toMatchObject({ state: 'pending', practiceName: PRACTICE });
    expect(link).toMatch(/\/convite\/[\w-]{43}$/);
    const list = await ctx.app.inject({ method: 'GET', url: BASE, headers: { cookie: operator } });
    expect(list.json<{ id: string }[]>().map((i) => i.id)).toContain(invite.id);
    expect(list.body).not.toContain(tokenOf(link));
  });

  it('resend issues a new link and the old one stops working', async () => {
    const { invite, link } = await newInvite();
    const resent = (await post(`${BASE}/${invite.id}/resend`)).json<InviteBody>();
    expect(tokenOf(resent.link)).not.toBe(tokenOf(link));
    expect((await readInvite(tokenOf(link))).statusCode).toBe(404);
    expect((await readInvite(tokenOf(resent.link))).json()).toMatchObject({ state: 'pending' });
  });

  it('emails the link to the invite address on create and on resend', async () => {
    const to = uniqueEmail();
    const created = (await post(BASE, { practiceName: PRACTICE, email: to })).json<InviteBody>();
    expect(created.emailed).toBe(true);
    expect(lastLinkTo(ctx.outbox, to)).toBe(created.link);
    const message = ctx.outbox.sent.findLast((m) => m.to === to);
    expect(message?.text).toContain(PRACTICE);
    expect(message?.text).toContain('7 dias');
    const resent = (await post(`${BASE}/${created.invite.id}/resend`)).json<InviteBody>();
    expect(resent.emailed).toBe(true);
    expect(lastLinkTo(ctx.outbox, to)).toBe(resent.link);
  });

  it('without an address nothing is emailed', async () => {
    const before = ctx.outbox.sent.length;
    expect((await newInvite()).emailed).toBe(false);
    expect(ctx.outbox.sent).toHaveLength(before);
  });

  it('cancel closes the invite; a cancelled invite cannot be resent', async () => {
    const { invite, link } = await newInvite();
    expect((await post(`${BASE}/${invite.id}/cancel`)).json<InviteBody>().invite.state).toBe(
      'cancelled',
    );
    expect((await post(`${BASE}/${invite.id}/resend`)).statusCode).toBe(409);
    const refused = await signUp(ctx, { email: uniqueEmail(), cookie: cookieFor(tokenOf(link)) });
    expect(refused.json()).toMatchObject({ code: INVITE_REQUIRED });
  });
});

describe('invite-only sign-up', () => {
  it('refuses a sign-up without an invite, pointing to the waitlist', async () => {
    const response = await signUp(ctx, { email: uniqueEmail() });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: INVITE_REQUIRED });
    expect(response.json<{ message: string }>().message).toContain('lista de espera');
  });

  it('nobody creates a consultório by hand', async () => {
    const cookie = await signUpVerified(ctx);
    const response = await authPost(ctx, {
      path: '/organization/create',
      body: { name: 'Outro', slug: `outro-${String(Date.now())}` },
      cookie,
    });
    expect(response.statusCode).toBe(403);
  });

  it('the invite page arms the cookie only for a pending link', async () => {
    const { link } = await newInvite();
    const page = await readInvite(tokenOf(link));
    expect(page.json()).toMatchObject({ state: 'pending', practiceName: PRACTICE });
    expect(page.headers['set-cookie']).toContain('HttpOnly');
    expect((await readInvite('nao-existe')).statusCode).toBe(404);
  });

  it('opens the consultório with the invite name, in setup, and uses the invite once', async () => {
    const { invite, link } = await newInvite();
    const email = uniqueEmail();
    expect((await signUp(ctx, { email, cookie: cookieFor(tokenOf(link)) })).statusCode).toBe(OK);
    const membership = await ctx.db.client.membership.findFirstOrThrow({
      where: { user: { email } },
      include: { tenant: true },
    });
    expect(membership.role).toBe('owner');
    expect(membership.tenant).toMatchObject({ name: PRACTICE, status: 'setup', trialEndsAt: null });
    expect((await readInvite(tokenOf(link))).json()).toMatchObject({ state: 'used' });
    const again = await signUp(ctx, { email: uniqueEmail(), cookie: cookieFor(tokenOf(link)) });
    expect(again.json()).toMatchObject({ code: INVITE_REQUIRED });
    const row = await ctx.db.client.onboardingInvite.findUniqueOrThrow({
      where: { id: invite.id },
    });
    expect(row.tenantId).toBe(membership.tenantId);
  });

  it('two sign-ups racing on the same link: exactly one account', async () => {
    const { link } = await newInvite();
    const cookie = cookieFor(tokenOf(link));
    const results = await Promise.all(
      Array.from({ length: RACERS }, () => signUp(ctx, { email: uniqueEmail(), cookie })),
    );
    expect(results.filter((r) => r.statusCode === OK)).toHaveLength(1);
  });

  it('refuses an expired link', async () => {
    const { invite, link } = await newInvite();
    await ctx.db.client.onboardingInvite.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    expect((await readInvite(tokenOf(link))).json()).toMatchObject({ state: 'expired' });
    const refused = await signUp(ctx, { email: uniqueEmail(), cookie: cookieFor(tokenOf(link)) });
    expect(refused.json()).toMatchObject({ code: INVITE_REQUIRED });
  });
});

describe('trial starts with the WhatsApp (H-24)', () => {
  it('a setup consultório gets 14 days when its channel connects, not before', async () => {
    const { link } = await newInvite();
    const email = uniqueEmail();
    await signUp(ctx, { email, cookie: cookieFor(tokenOf(link)) });
    const { tenantId } = await ctx.db.client.membership.findFirstOrThrow({
      where: { user: { email } },
    });
    const tenant = () => ctx.db.client.tenant.findUniqueOrThrow({ where: { id: tenantId } });
    const channel = await ctx.db.withTenant(tenantId, (tx) =>
      tx.channel.create({ data: { tenantId, kind: 'cloud_api' } }),
    );
    expect(await tenant()).toMatchObject({ status: 'setup', trialEndsAt: null });
    await ctx.db.withTenant(tenantId, (tx) =>
      tx.channel.update({ where: { id: channel.id }, data: { status: 'connected' } }),
    );
    const { status, trialEndsAt } = await tenant();
    expect(status).toBe('trial');
    const days = ((trialEndsAt?.getTime() ?? 0) - Date.now()) / DAY_MS;
    expect(days).toBeGreaterThan(TRIAL_DAYS - 1);
    expect(days).toBeLessThanOrEqual(TRIAL_DAYS);
  });
});
