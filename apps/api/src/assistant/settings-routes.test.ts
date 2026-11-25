import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';

// Spec 10, "Assistente": autonomy, identity and name. Audited; receptionist only reads.

const PATH = '/api/assistant/settings';
const CHANGE = { autonomy: 'auto', identityMode: 'clinic', assistantName: 'Lia' };

let ctx: TestContext;
let owner: string;
let tenantId: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
});
afterAll(() => ctx.app.close());

const get = (cookie: string) => ctx.app.inject({ method: 'GET', url: PATH, headers: { cookie } });
const put = (cookie: string, payload: object) =>
  ctx.app.inject({ method: 'PUT', url: PATH, payload, headers: { cookie } });

describe('assistant settings', () => {
  it('starts in approve mode, as a virtual assistant', async () => {
    expect((await get(owner)).json()).toEqual({
      autonomy: 'approve',
      identityMode: 'assistant',
      assistantName: 'Assistente virtual',
      professionalName: 'Pessoa Teste',
    });
  });

  it('owner changes them and the change is audited', async () => {
    const response = await put(owner, CHANGE);
    expect(response.json()).toEqual(CHANGE);
    expect((await get(owner)).json()).toMatchObject(CHANGE);
    const audit = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { entity: 'assistant_settings' } }),
    );
    expect(audit.map((entry) => entry.after)).toEqual([CHANGE]);
  });

  it('refuses invalid values and a blank name', async () => {
    expect((await put(owner, { ...CHANGE, autonomy: 'yolo' })).statusCode).toBe(400);
    expect((await put(owner, { ...CHANGE, assistantName: '   ' })).statusCode).toBe(400);
    expect((await put(owner, { autonomy: 'off' })).statusCode).toBe(400);
  });

  it('receptionist reads but cannot change', async () => {
    const receptionist = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.receptionist,
    });
    expect((await get(receptionist)).statusCode).toBe(200);
    expect((await put(receptionist, CHANGE)).statusCode).toBe(403);
  });

  it('needs a session', async () => {
    expect((await get('')).statusCode).toBe(401);
  });
});
