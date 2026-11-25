import { createChannelSender, createTemplateSender } from '@app/channels';
import { NodeEnv } from '@app/core';
import { REMINDER_SWEEP_QUEUE, type Db } from '@app/db';
import type { Alert } from '@app/observability';
import type { PgBoss } from 'pg-boss';
import { sweepScheduledMessages } from './sweep.ts';

const EVERY_MINUTE = '* * * * *';
const SWEPT = 'reminder sweep done';

export interface ReminderWiring {
  boss: PgBoss;
  db: Db;
  alert: Alert;
  nodeEnv: string;
  accessToken: string | undefined;
  log: (fields: object, message: string) => void;
}

/** E-22: the minute sweep of due confirmations and reminders, through the same channel as turns. */
export async function startReminderSweep(wiring: ReminderWiring): Promise<void> {
  const { boss, db, alert, log } = wiring;
  const config = {
    accessToken: wiring.accessToken,
    devFallback: wiring.nodeEnv !== NodeEnv.production,
    log,
  };
  const channel = { send: createChannelSender(config), sendTemplate: createTemplateSender(config) };
  await boss.schedule(REMINDER_SWEEP_QUEUE.name, EVERY_MINUTE);
  await boss.work(REMINDER_SWEEP_QUEUE.name, async () => {
    const result = await sweepScheduledMessages({ db, channel, alert, now: new Date() });
    if (Object.values(result).some(Boolean)) log(result, SWEPT);
  });
}
