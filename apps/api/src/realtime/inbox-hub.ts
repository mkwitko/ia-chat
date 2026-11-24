import pg from 'pg';
import * as z from 'zod';

// Spec 10, "Tempo real": Postgres LISTEN/NOTIFY fans out to the SSE streams. The database
// triggers (migration push_and_inbox_events) notify on every change of a conversation, a
// message or a turn; the payload is ids only (RN-38). Each stream sees only its own tenant.

export const INBOX_CHANNEL = 'inbox_changes';
const RECONNECT_MS = 1000;
const LISTEN_FAILED = 'inbox listener lost, reconnecting';

const payloadSchema = z.object({ t: z.uuid(), c: z.uuid() });

export interface InboxChange {
  conversationId: string;
}

export type InboxListener = (change: InboxChange) => void;

export interface InboxHub {
  /** Streams of one tenant; returns the unsubscribe. Connects to Postgres on the first call. */
  subscribe(tenantId: string, listener: InboxListener): Promise<() => void>;
  /** Handles one NOTIFY payload. Public so tests can feed it without a database. */
  dispatch(raw: string): void;
  close(): Promise<void>;
}

export interface HubLog {
  warn: (fields: object, message: string) => void;
}

/** A dedicated connection (LISTEN cannot share a pooled one) that reports payloads and loss. */
async function listen(
  connectionString: string,
  handlers: { onPayload: (raw: string) => void; onLost: (lost: pg.Client) => void },
): Promise<pg.Client> {
  const client = new pg.Client({ connectionString });
  client.on('notification', (message) => {
    if (message.payload) handlers.onPayload(message.payload);
  });
  client.on('error', () => {
    handlers.onLost(client);
  });
  client.on('end', () => {
    handlers.onLost(client);
  });
  await client.connect();
  await client.query(`listen ${INBOX_CHANNEL}`);
  return client;
}

export function createInboxHub(connectionString: string, log: HubLog): InboxHub {
  return new PgInboxHub(connectionString, log);
}

class PgInboxHub implements InboxHub {
  private readonly listeners = new Map<string, Set<InboxListener>>();
  private client: pg.Client | null = null;
  private starting: Promise<void> | null = null;
  private closed = false;

  private readonly connectionString: string;
  private readonly log: HubLog;

  constructor(connectionString: string, log: HubLog) {
    this.connectionString = connectionString;
    this.log = log;
  }

  readonly dispatch = (raw: string): void => {
    const parsed = payloadSchema.safeParse(safeJson(raw));
    if (!parsed.success) return;
    for (const listener of this.listeners.get(parsed.data.t) ?? [])
      listener({ conversationId: parsed.data.c });
  };

  async subscribe(tenantId: string, listener: InboxListener): Promise<() => void> {
    await this.ensure();
    const set = this.listeners.get(tenantId) ?? new Set();
    set.add(listener);
    this.listeners.set(tenantId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(tenantId);
    };
  }

  async close(): Promise<void> {
    this.closed = true;
    this.listeners.clear();
    await this.client?.end();
  }

  private async ensure(): Promise<void> {
    this.starting ??= listen(this.connectionString, {
      onPayload: this.dispatch,
      onLost: (lost) => {
        this.lose(lost);
      },
    })
      .then((connected) => {
        this.client = connected;
      })
      .catch((error: unknown) => {
        this.starting = null;
        throw error;
      });
    await this.starting;
  }

  private lose(lost: pg.Client): void {
    if (this.client !== lost || this.closed) return;
    this.client = null;
    this.starting = null;
    this.log.warn({}, LISTEN_FAILED);
    this.scheduleRetry();
  }

  private scheduleRetry(): void {
    setTimeout(() => {
      if (!this.closed)
        this.ensure().catch(() => {
          this.scheduleRetry();
        });
    }, RECONNECT_MS).unref();
  }
}

function safeJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
