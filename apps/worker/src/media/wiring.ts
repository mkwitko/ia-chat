import { aiConfigured, aiEnvSchema, createEnvGateway } from '@app/ai';
import { createMediaDownloadFor, wahaConfig, wahaEnvSchema } from '@app/channels';
import { channelTokenReader, createMediaStore, r2Config, r2EnvSchema } from '@app/core';
import { MEDIA_QUEUE, sendTenantJob, type Db } from '@app/db';
import { withLogContext } from '@app/observability';
import type { PgBoss } from 'pg-boss';
import * as z from 'zod';
import { turnScheduler } from '../conversation/turn-scheduler.ts';
import { processMedia } from './media-job.ts';

const NO_R2 = 'R2 variables missing: inbound media is not downloaded';
const NO_AI_KEY = 'VERCEL_API_KEY missing: audio is stored but not transcribed';

const mediaJob = z.object({ tenantId: z.uuid(), data: z.object({ messageId: z.uuid() }) });
const mediaEnvSchema = aiEnvSchema
  .extend(r2EnvSchema.shape)
  .extend(wahaEnvSchema.shape)
  .extend({
    META_ACCESS_TOKEN: z.string().min(1).optional(),
    META_TOKEN_KEY: z.string().min(1).optional(),
  });

interface MediaWiring {
  boss: PgBoss;
  db: Db;
  nodeEnv: string;
  source: Record<string, string | undefined>;
  log: {
    warn: (fields: object, message: string) => void;
    info: (fields: object, message: string) => void;
  };
}

/** Queued by the inbound job after commit: the download starts right away (Meta URLs expire). */
export function mediaScheduler(boss: PgBoss) {
  return async (tenantId: string, messageId: string): Promise<void> => {
    await sendTenantJob({
      boss,
      queue: MEDIA_QUEUE.name,
      job: { tenantId, data: { messageId } },
      options: { singletonKey: messageId },
    });
  };
}

/** E-10: the media.fetch consumer. Off (with a warning) until R2 is configured. */
export async function startMediaWorker({ boss, db, nodeEnv, source, log }: MediaWiring) {
  const env = mediaEnvSchema.parse(source);
  const r2 = r2Config(env);
  if (!r2) {
    log.warn({}, NO_R2);
    return;
  }
  if (!aiConfigured(env)) log.warn({}, NO_AI_KEY);
  const gateway = aiConfigured(env) ? createEnvGateway({ db, env, nodeEnv }) : undefined;
  const deps = {
    db,
    downloadFor: createMediaDownloadFor({
      accessToken: env.META_ACCESS_TOKEN,
      readChannelToken: channelTokenReader(env.META_TOKEN_KEY),
      waha: wahaConfig(env),
    }),
    store: createMediaStore(r2),
    transcribe: gateway
      ? (input: Parameters<typeof gateway.transcribe>[0]) => gateway.transcribe(input)
      : undefined,
    scheduleTurn: turnScheduler(boss),
    log: log.warn,
  };
  await boss.work(MEDIA_QUEUE.name, async (jobs) => {
    for (const job of jobs) {
      const { tenantId, data } = mediaJob.parse(job.data);
      await withLogContext({ jobId: job.id, queue: MEDIA_QUEUE.name, tenantId }, () =>
        processMedia(deps, { tenantId, messageId: data.messageId }),
      );
    }
  });
}
