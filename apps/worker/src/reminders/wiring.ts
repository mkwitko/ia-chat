import { createChannelSender, createTemplateSender } from '@app/channels';
import { NodeEnv, channelTokenReader } from '@app/core';
import { REMINDER_SWEEP_QUEUE, type Db } from '@app/db';
import type { Alert } from '@app/observability';
import type { PgBoss } from 'pg-boss';
import type { Notifier } from '../notify/index.ts';
import { sweepNoShows } from '../waitlist/no-show.ts';
import { sweepWaitlist } from '../waitlist/offer-sweep.ts';
import { sweepScheduledMessages } from './sweep.ts';

const EVERY_MINUTE = '* * * * *';
const SWEPT = 'reminder sweep done';
const FOLLOWED = 'waitlist and no-show sweep done';

export interface ReminderWiring {
  boss: PgBoss;
  db: Db;
  alert: Alert;
  /** M-09: the professional hears about a waitlist offer or no-show message that could not go out. */
  notify: Notifier;
  nodeEnv: string;
  accessToken: string | undefined;
  /** META_TOKEN_KEY: reads each channel's own token (E-24). */
  tokenKey: string | undefined;
  log: (fields: object, message: string) => void;
}

/**
 * E-22: the minute sweep of due confirmations and reminders, through the same channel as turns.
 * M-09 rides on it: waitlist offers and the message after a no-show.
 */
export async function startReminderSweep(wiring: ReminderWiring): Promise<void> {
  const { boss, db, alert, log } = wiring;
  const config = {
    accessToken: wiring.accessToken,
    readChannelToken: channelTokenReader(wiring.tokenKey),
    devFallback: wiring.nodeEnv !== NodeEnv.production,
    log,
  };
  const channel = { send: createChannelSender(config), sendTemplate: createTemplateSender(config) };
  await boss.schedule(REMINDER_SWEEP_QUEUE.name, EVERY_MINUTE);
  await boss.work(REMINDER_SWEEP_QUEUE.name, async () => {
    const now = new Date();
    const result = await sweepScheduledMessages({ db, channel, alert, now });
    if (Object.values(result).some(Boolean)) log(result, SWEPT);
    const follow = { db, channel, alert, notify: wiring.notify, now };
    const waitlist = await sweepWaitlist(follow);
    const noShows = await sweepNoShows(follow);
    if (waitlist.offered + waitlist.skipped + noShows > 0) log({ ...waitlist, noShows }, FOLLOWED);
  });
}
