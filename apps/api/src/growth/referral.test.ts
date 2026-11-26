import { randomUUID } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { REFERRAL_CODE_PATTERN } from '@app/core';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { TurnstileVerifier } from '../waitlist/turnstile.ts';
import { createTenant, signUpVerified, startTestApp, type TestContext } from '../test-support.ts';

// M-11 (spec 11, "Modelo de indicação"): a code and a link per business; a waitlist sign-up with
// the code is attributed to it. NOTHING sends a message to a referred person: the product never
// contacts someone because a business named them. Fictitious data only.

const SITE = 'https://site.exemplo.test';
const GOOD_TOKEN = 'token-valido';
const PATH = '/api/growth/referral';

const verify: TurnstileVerifier = (token) => Promise.resolve(token === GOOD_TOKEN);
let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, {
    env: { SITE_ORIGIN: SITE, TURNSTILE_SECRET_KEY: 'segredo-de-teste' },
    verifyTurnstile: verify,
  });
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

const view = async () =>
  (await ctx.app.inject({ method: 'GET', url: PATH, headers: { cookie: owner } })).json<{
    code: string;
    link: string;
    signups: number;
  }>();
const signup = (payload: object) =>
  ctx.app.inject({
    method: 'POST',
    url: '/api/waitlist',
    payload: { token: GOOD_TOKEN, ...payload },
    headers: { origin: SITE },
  });
const address = () => `indicado-${randomUUID()}@exemplo.test`;

describe('referral code and link', () => {
  it('gives the business one stable code and a link on the site', async () => {
    const first = await view();
    expect(first.code).toMatch(REFERRAL_CODE_PATTERN);
    expect(first.link).toBe(`${SITE}/?ref=${first.code}`);
    expect(first.signups).toBe(0);
    expect((await view()).code).toBe(first.code);
  });

  it('records a waitlist sign-up with the code and counts it', async () => {
    const { code } = await view();
    const email = address();
    expect((await signup({ email, ref: code.toLowerCase() })).statusCode).toBe(201);
    const row = await ctx.db.client.waitlistEntry.findUniqueOrThrow({ where: { email } });
    expect(row.referralCode).toBe(code);
    expect((await view()).signups).toBe(1);
  });

  it('a repeated email is not counted twice', async () => {
    const { code } = await view();
    const email = address();
    await signup({ email, ref: code });
    await signup({ email, ref: code });
    expect((await view()).signups).toBe(2);
  });

  it('ignores an unknown or malformed code without failing the sign-up', async () => {
    const before = (await view()).signups;
    const unknown = address();
    const malformed = address();
    expect((await signup({ email: unknown, ref: 'ZZZZZZZZ' })).statusCode).toBe(201);
    expect((await signup({ email: malformed, ref: 'x; drop' })).statusCode).toBe(201);
    for (const email of [unknown, malformed]) {
      const row = await ctx.db.client.waitlistEntry.findUniqueOrThrow({ where: { email } });
      expect(row.referralCode).toBeNull();
    }
    expect((await view()).signups).toBe(before);
  });

  it('keeps another business out of this count', async () => {
    const otherOwner = await signUpVerified(ctx);
    await createTenant(ctx, otherOwner);
    const other = (
      await ctx.app.inject({ method: 'GET', url: PATH, headers: { cookie: otherOwner } })
    ).json<{ code: string; signups: number }>();
    expect(other.code).not.toBe((await view()).code);
    expect(other.signups).toBe(0);
    expect(tenantId).toBeTruthy();
  });
});

describe('no message to a referred person (RN: indicação sem disparo)', () => {
  it('a sign-up with a code gets only the confirmation of its own request, nothing else', async () => {
    const { code } = await view();
    const email = address();
    const before = ctx.outbox.sent.length;
    await signup({ email, ref: code });
    const sentNow = ctx.outbox.sent.slice(before);
    expect(sentNow.map((mail) => mail.to)).toEqual([email]);
    const [outbound, scheduled] = await ctx.db.withTenant(tenantId, (tx) =>
      Promise.all([tx.message.count(), tx.scheduledMessage.count()]),
    );
    expect([outbound, scheduled]).toEqual([0, 0]);
  });

  it('the referral code never reaches a sender: its modules import none', () => {
    const dir = path.resolve(import.meta.dirname, '../../../..');
    const files = [
      'apps/api/src/growth/referral-routes.ts',
      'packages/core/src/growth/referral.ts',
    ];
    const forbidden = /email|outbox|@app\/channels|notify|push|sendProactive|sendTemplate|channel/i;
    for (const file of files) {
      const imports = readFileSync(path.join(dir, file), 'utf8')
        .split('\n')
        .filter((line) => /^\s*(import|export) .* from /.test(line));
      expect(
        imports.filter((line) => forbidden.test(line)),
        file,
      ).toEqual([]);
    }
    expect(readdirSync(path.join(dir, 'apps/api/src/growth')).length).toBeGreaterThan(0);
  });
});
