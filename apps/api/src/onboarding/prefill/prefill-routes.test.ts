import { dbUsageStore } from '@app/ai';
import { createDb } from '@app/db';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { fakeGateway, type Step } from '../../simulator/fake-gateway.ts';
import {
  createTenant,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../../test-support.ts';
import { PREFILL_PATH } from './prefill-routes.ts';
import { FetchError, PageFetchError } from './safe-fetch.ts';

// Spec 09 prefill: fake page and fake model, nothing billed. The suggestion is returned and
// nothing is written to the tenant until the owner approves it on the review screen.

const PAGE = `<html><head><title>Clínica Exemplo Fictícia</title></head><body>
  <p>Rua Fictícia, 10 - Centro. Telefone (11) 3000-0000.</p>
  <p>Terça a quinta, 07:00 às 20:00. Primeira consulta 60 min R$ 250,00.</p></body></html>`;
const EXTRACTED = {
  name: 'Clínica Exemplo Fictícia',
  description: null,
  phone: '(11) 3000-0000',
  address: 'Rua Fictícia, 10 - Centro',
  website: null,
  social: null,
  hours: [2, 3, 4].map((weekday) => ({ weekday, start: '07:00', end: '20:00' })),
  services: [
    { name: 'Primeira consulta', durationMinutes: 60, priceCents: 25_000 },
    { name: 'Retorno', durationMinutes: 30, priceCents: 19_900 },
  ],
  packages: [],
};

const steps: Step[] = [];
const fetchPage = vi.fn((url: string) =>
  url.includes('fora-do-ar')
    ? Promise.reject(new PageFetchError(FetchError.timeout))
    : Promise.resolve(PAGE),
);
let ctx: TestContext;
let cookie: string;
let tenantId: string;

beforeAll(async () => {
  const store = dbUsageStore(createDb(process.env.DATABASE_URL ?? ''));
  ctx = await startTestApp(undefined, {
    simulatorGateway: fakeGateway(steps, store).gateway,
    prefillFetch: fetchPage,
  });
  cookie = await signUpVerified(ctx);
  tenantId = await createTenant(ctx, cookie);
});
afterAll(() => ctx.app.close());

const prefill = (source: string) =>
  ctx.app.inject({ method: 'POST', url: PREFILL_PATH, headers: { cookie }, payload: { source } });

describe('POST /api/onboarding/prefill', () => {
  it('reads the page, keeps written prices only and saves nothing', async () => {
    steps.push({ text: JSON.stringify(EXTRACTED) });
    const response = await prefill('exemplo-ficticio.com.br');
    expect(response.statusCode).toBe(200);
    expect(fetchPage).toHaveBeenCalledWith('https://exemplo-ficticio.com.br');
    const { suggestion } = response.json<{ suggestion: typeof EXTRACTED }>();
    expect(suggestion.name).toBe('Clínica Exemplo Fictícia');
    expect(suggestion.hours).toHaveLength(3);
    expect(suggestion.services).toEqual([
      { name: 'Primeira consulta', durationMinutes: 60, priceCents: 25_000 },
      { name: 'Retorno', durationMinutes: 30, priceCents: null },
    ]);
    const saved = await ctx.db.withTenant(tenantId, async (tx) => ({
      services: await tx.service.count(),
      places: await tx.location.count(),
      rules: await tx.availabilityRule.count(),
    }));
    expect(saved).toEqual({ services: 0, places: 0, rules: 0 });
  });

  it('takes pasted text (an Instagram bio) without fetching anything', async () => {
    fetchPage.mockClear();
    steps.push({ text: JSON.stringify({ ...EXTRACTED, services: [] }) });
    const response = await prefill('Quiropraxia e acupuntura. Atendo terça a quinta. Agende!');
    expect(response.statusCode).toBe(200);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('asks for the bio text instead of reading a social network link', async () => {
    const response = await prefill('https://www.instagram.com/exemplo_ficticio');
    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({ error: 'paste_text' });
  });

  it('treats a link with a port as a link (so the SSRF guard sees it), not as text', async () => {
    fetchPage.mockClear();
    steps.push({ text: JSON.stringify(EXTRACTED) });
    await prefill('http://127.0.0.1:8088/clinica.html');
    expect(fetchPage).toHaveBeenCalledWith('http://127.0.0.1:8088/clinica.html');
  });

  it('says the page could not be read when the fetch fails', async () => {
    const response = await prefill('https://fora-do-ar.exemplo.com.br');
    expect(response.json()).toEqual({ error: 'page_unreadable' });
  });
});
