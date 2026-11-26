import { randomUUID } from 'node:crypto';
import { WaitlistStatus } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// M-09: the agenda shows who waits on each day; the owner takes a client off the list.
// A move counts as a remarcação in Resultados, apart from new bookings and cancellations.

const DAY_MS = 86_400_000;
const AHEAD_DAYS = 10;

let ctx: TestContext;
let owner: string;
let viewer: string;
let tenantId: string;
let entryId: string;
const day = new Date(Date.now() + AHEAD_DAYS * DAY_MS).toISOString().slice(0, 10);

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  viewer = await joinAs(ctx, { ownerCookie: owner, tenantId, role: Role.receptionist });
  entryId = await ctx.db.withTenant(tenantId, async (tx) => {
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}`, name: 'Paciente Fictícia' },
    });
    const entry = await tx.slotWaitlistEntry.create({
      data: {
        tenantId,
        contactId: contact.id,
        serviceId: service.id,
        windowStart: new Date(`${day}T03:00:00Z`),
        windowEnd: new Date(new Date(`${day}T03:00:00Z`).getTime() + 2 * DAY_MS),
      },
    });
    return entry.id;
  });
});
afterAll(() => ctx.app.close());

const call = (method: 'GET' | 'DELETE', url: string, cookie = owner) =>
  ctx.app.inject({ method, url, headers: { cookie } });

describe('waitlist in the agenda', () => {
  it('shows the waiting client on the days of the window, not outside it', async () => {
    const inside = (await call('GET', `/api/agenda?from=${day}&days=1`)).json<{
      waitlist: { id: string; patientName: string; serviceName: string }[];
    }>();
    expect(inside.waitlist).toEqual([
      expect.objectContaining({
        id: entryId,
        patientName: 'Paciente Fictícia',
        serviceName: 'Sessão',
      }),
    ]);
    const before = new Date(Date.now() + 2 * DAY_MS).toISOString().slice(0, 10);
    const outside = (await call('GET', `/api/agenda?from=${before}&days=1`)).json<{
      waitlist: unknown[];
    }>();
    expect(outside.waitlist).toEqual([]);
  });

  it('another clinic cannot remove the entry; the owner can, with audit', async () => {
    const stranger = await signUpVerified(ctx);
    await createTenant(ctx, stranger);
    expect((await call('DELETE', `/api/agenda/waitlist/${entryId}`, stranger)).statusCode).toBe(
      404,
    );
    expect((await call('DELETE', `/api/agenda/waitlist/${entryId}`, viewer)).statusCode).toBe(200);
    expect((await call('DELETE', `/api/agenda/waitlist/${entryId}`)).statusCode).toBe(404);
    const entry = await ctx.db.withTenant(tenantId, (tx) =>
      tx.slotWaitlistEntry.findUniqueOrThrow({ where: { id: entryId } }),
    );
    expect(entry.status).toBe(WaitlistStatus.removed);
    const audits = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.count({ where: { entity: 'waitlist_entry' } }),
    );
    expect(audits).toBe(1);
  });
});
