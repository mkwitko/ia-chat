import { AsyncLocalStorage } from 'node:async_hooks';

/** Ids only. Never put message content or contact data here. */
export interface LogContext {
  tenantId?: string;
  requestId?: string;
  jobId?: string;
  queue?: string;
  conversationId?: string;
  turnId?: string;
}

const storage = new AsyncLocalStorage<LogContext>();

/** Every log line written while `run` is pending carries `fields` (merged over the outer ones). */
export function withLogContext<T>(fields: LogContext, run: () => T): T {
  return storage.run({ ...storage.getStore(), ...fields }, run);
}

export const currentLogContext = (): LogContext => storage.getStore() ?? {};
