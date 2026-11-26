import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb, recentOpsEvents, recordOpsEvent } from './index.ts';

// E-26: the operator log of problems. A platform table: the app appends and reads only.

const url = process.env.DATABASE_URL ?? '';
if (!url) throw new Error('DATABASE_URL is required for integration tests');

const db = createDb(url);
const RECENT = 20;
const ABORTED = { event: 'turn_aborted', code: 'timeout' } as const;
afterAll(() => db.client.$disconnect());

describe('ops_events', () => {
  it('stores ids and a code, newest first, and tolerates a malformed id', async () => {
    const tenantId = randomUUID();
    await recordOpsEvent(db, {
      event: 'dead_letter',
      tenantId,
      queue: 'inbound.process',
      jobId: 'j-1',
    });
    await recordOpsEvent(db, { event: 'turn_aborted', tenantId: 'not-a-uuid', code: 'timeout' });
    // Other test files write to this platform table at the same time: find ours, check the order.
    const rows = await recentOpsEvents(db, RECENT);
    const older = rows.findIndex((row) => row.tenantId === tenantId);
    const newest = rows.findIndex(
      (row) => row.event === ABORTED.event && row.code === ABORTED.code,
    );
    expect(rows[newest]).toMatchObject({ event: 'turn_aborted', tenantId: null, code: 'timeout' });
    expect(rows[older]).toMatchObject({ event: 'dead_letter', tenantId, queue: 'inbound.process' });
    expect(newest).toBeLessThan(older);
  });

  it('the app role cannot update or truncate it', async () => {
    await expect(
      db.client.$executeRawUnsafe('update "ops_events" set code = code'),
    ).rejects.toThrow('permission denied');
    await expect(db.client.$executeRawUnsafe('truncate "ops_events"')).rejects.toThrow(
      'permission denied',
    );
  });
});
