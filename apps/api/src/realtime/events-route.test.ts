import { randomUUID } from 'node:crypto';
import http from 'node:http';
import * as z from 'zod';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createTenant,
  newConversation,
  signUpVerified,
  startTestApp,
  type TestContext,
} from '../test-support.ts';
import { createInboxHub, type InboxChange } from './inbox-hub.ts';

const DATA_PREFIX = 'data: ';
const STREAM_TIMEOUT = { timeout: 5000, interval: 50 };
// Time left for a leak to tenant B to show up after A received its change.
const GRACE_MS = 300;
const changeSchema = z.object({ conversationId: z.string() });

// E-16: SSE over Postgres LISTEN/NOTIFY, and never across tenants.

describe('inbox hub filtering', () => {
  it('delivers a payload only to the listeners of its tenant', async () => {
    const hub = createInboxHub(process.env.DATABASE_URL ?? '', { warn: () => undefined });
    const [tenantA, tenantB, conversationId] = [randomUUID(), randomUUID(), randomUUID()];
    const seen: Record<string, InboxChange[]> = { a: [], b: [] };
    await hub.subscribe(tenantA, (change) => {
      seen.a?.push(change);
    });
    await hub.subscribe(tenantB, (change) => {
      seen.b?.push(change);
    });
    hub.dispatch(JSON.stringify({ t: tenantA, c: conversationId }));
    hub.dispatch('not json');
    hub.dispatch(JSON.stringify({ t: 'not-a-uuid', c: conversationId }));
    await hub.close();
    expect(seen).toEqual({ a: [{ conversationId }], b: [] });
  });
});

describe('SSE stream', () => {
  let ctx: TestContext;
  let baseUrl: string;
  let cookieA: string;
  let tenantA: string;
  let cookieB: string;

  beforeAll(async () => {
    ctx = await startTestApp();
    baseUrl = await ctx.app.listen({ port: 0, host: '127.0.0.1' });
    cookieA = await signUpVerified(ctx);
    tenantA = await createTenant(ctx, cookieA);
    cookieB = await signUpVerified(ctx);
    await createTenant(ctx, cookieB);
  });
  afterAll(() => ctx.app.close());

  /** Collects the `data:` lines of a stream until it is closed. */
  function openStream(cookie: string) {
    return new Promise<{ contentType: string | undefined; events: string[]; close: () => void }>(
      (resolve) => {
        const events: string[] = [];
        const request = http.get(`${baseUrl}/api/events`, { headers: { cookie } }, (response) => {
          response.setEncoding('utf8');
          response.on('data', (chunk: string) => {
            for (const line of chunk.split('\n'))
              if (line.startsWith(DATA_PREFIX)) events.push(line.slice(DATA_PREFIX.length));
          });
          resolve({
            contentType: response.headers['content-type'],
            events,
            close: () => {
              request.destroy();
            },
          });
        });
      },
    );
  }

  const wait = (ms: number) =>
    new Promise((resolve) => {
      setTimeout(resolve, ms);
    });

  it('sends the tenant its own changes, with ids only, and nothing from another tenant', async () => {
    const streamA = await openStream(cookieA);
    const streamB = await openStream(cookieB);
    expect(streamA.contentType).toBe('text/event-stream');
    const conversationId = await newConversation(ctx, tenantA);
    const changesOfA = () => streamA.events.map((line) => changeSchema.parse(JSON.parse(line)));
    // Wait for the change itself instead of a fixed delay (LISTEN/NOTIFY timing varies in CI).
    await vi.waitFor(() => {
      expect(changesOfA()).toContainEqual({ conversationId });
    }, STREAM_TIMEOUT);
    await wait(GRACE_MS);
    streamA.close();
    streamB.close();
    expect(streamB.events).toEqual([]);
  });

  it('refuses a stream without a session', async () => {
    const response = await fetch(`${baseUrl}/api/events`);
    expect(response.status).toBe(401);
  });
});
