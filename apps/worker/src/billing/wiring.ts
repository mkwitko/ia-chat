import { AsaasClient, billingEnvSchema, parseEnvWith, type EmailSender } from '@app/core';
import { BILLING_RECONCILE_QUEUE, type Db } from '@app/db';
import type { Alert } from '@app/observability';
import type { PgBoss } from 'pg-boss';
import { runBillingDaily } from './daily.ts';

// 06:00 in the clinics' time zone, after the nightly reconciliation of messages.
const BILLING_CRON = '0 6 * * *';
const BILLING_TZ = 'America/Sao_Paulo';
const BILLING_DONE = 'billing daily done';
const BILLING_OFF = 'billing off: no ASAAS_API_KEY';

export interface BillingWiring {
  boss: PgBoss;
  db: Db;
  alert: Alert;
  email: EmailSender;
  panelUrl: string;
  log: (fields: object, message: string) => void;
}

/** Schedules the daily billing run. Off, with a log line, when ASAAS_API_KEY is absent. */
export async function startBilling(wiring: BillingWiring): Promise<void> {
  const env = parseEnvWith(billingEnvSchema, process.env);
  if (!env.ASAAS_API_KEY) {
    wiring.log({}, BILLING_OFF);
    return;
  }
  const provider = new AsaasClient({ apiKey: env.ASAAS_API_KEY, baseUrl: env.ASAAS_BASE_URL });
  const { boss, db, alert, email, panelUrl } = wiring;
  await boss.schedule(BILLING_RECONCILE_QUEUE.name, BILLING_CRON, null, { tz: BILLING_TZ });
  await boss.work(BILLING_RECONCILE_QUEUE.name, async () => {
    const result = await runBillingDaily({ db, provider, email, alert, panelUrl, now: new Date() });
    wiring.log(result, BILLING_DONE);
  });
}
