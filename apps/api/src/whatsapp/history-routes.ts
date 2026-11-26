import type { AiGateway } from '@app/ai';
import { AppDataSync, createBusinessClient } from '@app/channels';
import { decryptToken } from '@app/core';
import { HistoryImportState } from '@app/db';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import * as z from 'zod';
import { Permission } from '../auth/access.ts';
import { requireTenant } from '../auth/tenant-guard.ts';
import { ErrorCode, HttpStatus } from '../http.ts';
import { audit, AuditAction } from '../setup/audit.ts';
import { parsed, tenantOf } from '../setup/guarded.ts';
import { historyOffer, HistoryView } from './history-import.ts';
import { recentPatientQuestions, savePending, suggestFromHistory } from './history-faq.ts';
import { errorCodeOf } from './steps.ts';
import { channelView, signupChannel } from './store.ts';
import type { WhatsappSignupDeps } from './routes.ts';

// E-24b, spec 03 "Histórico da coexistência": the owner authorizes (or refuses) the import of the
// WhatsApp Business app's contacts and history. Each request to Meta is made once and recorded in
// `channels.setup_done`, so a failed second call is retried (same click again) without repeating the first.

const PATH = '/api/whatsapp/history-import';
const ENTITY = 'channel';
const UNKNOWN = 'unknown';
const SUGGEST_FAILED = 'history faq suggestion failed';
const REQUEST_FAILED = 'whatsapp history sync request failed';
/** Extra `setup_done` marks, one per request to Meta. */
const REQUESTED = {
  [AppDataSync.contacts]: 'history_contacts_requested',
  [AppDataSync.history]: 'history_requested',
} as const;
const SYNCS = [AppDataSync.contacts, AppDataSync.history] as const;

const decideBody = z.object({ authorize: z.boolean() }).strict();

type Deps = WhatsappSignupDeps & { config: NonNullable<WhatsappSignupDeps['config']> };

export function registerHistoryRoutes(app: FastifyInstance, deps: WhatsappSignupDeps): void {
  const { config } = deps;
  app.post(PATH, { preHandler: requireTenant(Permission.whatsappManage) }, (request, reply) =>
    config
      ? decide(request, reply, { ...deps, config })
      : reply.code(HttpStatus.unavailable).send({ error: ErrorCode.whatsappOff }),
  );
  app.post(
    `${PATH}/suggestions`,
    { preHandler: requireTenant(Permission.assistantManage) },
    (request, reply) => suggest(request, reply, deps.gateway),
  );
}

/** "IA sugere" over the imported history, behind an explicit click. Nothing is answered or enabled. */
async function suggest(request: FastifyRequest, reply: FastifyReply, gateway?: AiGateway) {
  if (!gateway) return reply.code(HttpStatus.unavailable).send({ error: ErrorCode.suggestOff });
  const tenant = tenantOf(request);
  try {
    const messages = await tenant.withTenant(recentPatientQuestions);
    const questions = await suggestFromHistory({ tenantId: tenant.tenantId, gateway }, messages);
    const added = await tenant.withTenant((tx) =>
      savePending(tx, { tenantId: tenant.tenantId, questions }),
    );
    return { added };
  } catch (error) {
    // The error name only: provider errors may carry the generated text.
    request.log.warn({ error: error instanceof Error ? error.name : UNKNOWN }, SUGGEST_FAILED);
    return reply.code(HttpStatus.badGateway).send({ error: ErrorCode.suggestFailed });
  }
}

async function decide(request: FastifyRequest, reply: FastifyReply, deps: Deps) {
  const input = parsed(request, reply, decideBody);
  if (!input) return reply;
  const { tenant, body } = input;
  const row = await tenant.withTenant(signupChannel);
  if (!row) return reply.code(HttpStatus.notFound).send({ error: ErrorCode.notFound });
  const { state } = historyOffer(row);
  if (state === HistoryView.expired)
    return reply.code(HttpStatus.conflict).send({ error: ErrorCode.historyWindowClosed });
  if (state !== HistoryImportState.offered)
    return reply.code(HttpStatus.conflict).send({ error: ErrorCode.historyNotOffered });
  if (!body.authorize) return saveState(request, row.id, HistoryImportState.declined);
  const failed = await requestSyncs(request, row, deps);
  if (failed) return reply.code(HttpStatus.badGateway).send({ error: ErrorCode.whatsappFailed });
  return saveState(request, row.id, HistoryImportState.requested);
}

async function requestSyncs(
  request: FastifyRequest,
  row: {
    id: string;
    setupDone: string[];
    phoneNumberId: string | null;
    accessTokenEnc: string | null;
  },
  deps: Deps,
): Promise<boolean> {
  const tenant = tenantOf(request);
  const client = createBusinessClient({
    accessToken: decryptToken(row.accessTokenEnc ?? '', deps.config.tokenKey),
    fetch: deps.fetch,
  });
  const done = [...row.setupDone];
  for (const sync of SYNCS) {
    if (done.includes(REQUESTED[sync])) continue;
    try {
      await client.requestAppData(row.phoneNumberId ?? '', sync);
    } catch (error) {
      request.log.warn(
        { tenantId: tenant.tenantId, code: errorCodeOf(error), sync },
        REQUEST_FAILED,
      );
      await tenant.withTenant((tx) =>
        tx.channel.update({ where: { id: row.id }, data: { setupDone: done } }),
      );
      return true;
    }
    done.push(REQUESTED[sync]);
  }
  await tenant.withTenant((tx) =>
    tx.channel.update({ where: { id: row.id }, data: { setupDone: done } }),
  );
  return false;
}

async function saveState(request: FastifyRequest, channelId: string, state: HistoryImportState) {
  const tenant = tenantOf(request);
  const saved = await tenant.withTenant(async (tx) => {
    const channel = await tx.channel.update({
      where: { id: channelId },
      data: {
        historyImport: state,
        ...(state === HistoryImportState.requested ? { historyAuthorizedAt: new Date() } : {}),
      },
    });
    await audit(tx, tenant, {
      entity: ENTITY,
      entityId: channelId,
      action: AuditAction.update,
      after: { historyImport: state },
    });
    return channel;
  });
  return { channel: channelView(saved) };
}
