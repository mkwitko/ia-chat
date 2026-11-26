import { Feature, PlanId } from '@app/core';
import { Plan } from '@app/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Role } from '../auth/access.ts';
import {
  createTenant,
  joinAs,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';
import { FEATURES_PATH } from './feature-routes.ts';

// Recursos (H-51): owner only, plan default, refusal outside the plan, tenant isolation.

interface View {
  plan: PlanId;
  features: { feature: Feature; plan: PlanId; included: boolean; enabled: boolean }[];
}

let ctx: TestContext;
let owner: string;
let tenantId: string;
let otherOwner: string;

beforeAll(async () => {
  ctx = await startTestApp();
  owner = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, owner);
  otherOwner = await signUpVerified(ctx);
  await createTenant(ctx, otherOwner);
});
afterAll(() => ctx.app.close());

const call = (method: 'GET' | 'PUT', payload?: object, cookie = owner) =>
  ctx.app.inject({
    method,
    url: FEATURES_PATH,
    headers: { cookie },
    ...(payload ? { payload } : {}),
  });
const view = async (cookie = owner) => (await call('GET', undefined, cookie)).json<View>();
const stateOf = (data: View, feature: Feature) =>
  data.features.find((state) => state.feature === feature);
const setPlan = (plan: Plan) =>
  ctx.db.client.tenant.update({ where: { id: tenantId }, data: { plan } });

describe('features API', () => {
  it('starts with what the plan includes, and says which plan has the rest', async () => {
    const data = await view();
    expect(data.plan).toBe(PlanId.essencial);
    expect(stateOf(data, Feature.audioTranscription)).toMatchObject({ enabled: true });
    expect(stateOf(data, Feature.pixDeposit)).toMatchObject({
      included: false,
      enabled: false,
      plan: PlanId.agenda,
    });
  });

  it('refuses to turn on a feature outside the plan and saves nothing', async () => {
    const reply = await call('PUT', { features: { [Feature.pixDeposit]: true } });
    expect(reply.statusCode).toBe(422);
    expect(reply.json<{ error: string }>().error).toBe('feature_not_in_plan');
    expect(stateOf(await view(), Feature.pixDeposit)?.enabled).toBe(false);
  });

  it('turns an included feature off and on, with audit', async () => {
    await setPlan(Plan.pro);
    const off = await call('PUT', { features: { [Feature.ocrIdCard]: false } });
    expect(off.statusCode).toBe(200);
    expect(stateOf(off.json<View>(), Feature.ocrIdCard)?.enabled).toBe(false);
    expect(stateOf(off.json<View>(), Feature.pixDeposit)?.enabled).toBe(true);
    await call('PUT', { features: { [Feature.ocrIdCard]: true } });
    expect(stateOf(await view(), Feature.ocrIdCard)?.enabled).toBe(true);
    const audits = await ctx.db.withTenant(tenantId, (tx) =>
      tx.auditLog.findMany({ where: { entity: 'features' } }),
    );
    expect(audits).toHaveLength(2);
  });

  it('a downgrade turns the feature off even with a saved "on"', async () => {
    await setPlan(Plan.essencial);
    expect(stateOf(await view(), Feature.ocrIdCard)?.enabled).toBe(false);
  });

  it('refuses unknown keys and an empty change', async () => {
    expect((await call('PUT', { features: { teleport: true } })).statusCode).toBe(400);
    expect((await call('PUT', { features: {} })).statusCode).toBe(400);
  });

  it('does not leak one tenant choices into another', async () => {
    await setPlan(Plan.pro);
    await call('PUT', { features: { [Feature.ocrMedicalRequest]: true } });
    const rows = await ctx.db.withTenant(tenantId, (tx) => tx.featureSetting.findMany());
    expect(rows.every((row) => row.tenantId === tenantId)).toBe(true);
    expect(stateOf(await view(otherOwner), Feature.audioTranscription)?.enabled).toBe(true);
    const other = await view(otherOwner);
    expect(other.plan).toBe(PlanId.essencial);
  });

  it('is the owner only', async () => {
    const receptionist = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.receptionist,
    });
    const professional = await joinAs(ctx, {
      ownerCookie: owner,
      tenantId,
      role: Role.professional,
    });
    expect((await call('GET', undefined, receptionist)).statusCode).toBe(403);
    expect((await call('GET', undefined, professional)).statusCode).toBe(403);
    const change = { features: { [Feature.audioTranscription]: false } };
    expect((await call('PUT', change, professional)).statusCode).toBe(403);
  });
});
