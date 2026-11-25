import { randomUUID } from 'node:crypto';
import { AlertEvent } from '@app/observability';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { signUpVerified, startTestApp, uniqueEmail, type TestContext } from '../test-support.ts';

// E-26: "Erros recentes" in /operador, fed by alert(). Ids and codes only.

const operatorEmail = uniqueEmail();
const SETTLE_MS = 100;
const FORBIDDEN = 403;
const MESSAGE = 'Quero marcar uma consulta para dor nas costas';

let ctx: TestContext;
let operator: string;
let owner: string;

beforeAll(async () => {
  ctx = await startTestApp(undefined, { env: { OPERATOR_EMAILS: operatorEmail } });
  owner = await signUpVerified(ctx);
  operator = await signUpVerified(ctx, operatorEmail);
});
afterAll(() => ctx.app.close());

const problems = (cookie: string) =>
  ctx.app.inject({ method: 'GET', url: '/api/operator/problems', headers: { cookie } });

describe('operator problems', () => {
  it('lists alerts newest first with ids and codes, never content', async () => {
    const tenantId = randomUUID();
    const leaky = { tenantId, jobId: 'job-9', queue: 'inbound.process', text: MESSAGE };
    ctx.app.alert(AlertEvent.deadLetter, leaky);
    await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
    const response = await problems(operator);
    const rows = response.json<{ event: string; tenantId: string | null }[]>();
    expect(rows[0]).toMatchObject({ event: 'dead_letter', tenantId, queue: 'inbound.process' });
    expect(response.body).not.toContain(MESSAGE);
  });

  it('is closed to anyone who is not an operator', async () => {
    expect((await problems(owner)).statusCode).toBe(FORBIDDEN);
  });
});
