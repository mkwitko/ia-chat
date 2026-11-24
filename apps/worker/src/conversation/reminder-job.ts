import { findPendingDraft, type AfterCommit, type Tx } from '@app/db';
import type { Job } from 'pg-boss';
import * as z from 'zod';
import { needsHandoffReminder } from './handoff.ts';

const jobData = z.object({ conversationId: z.uuid() });
const draftJobData = jobData.extend({ turnId: z.uuid() });

/** RF-13 hypothesis H-15: a draft left alone for 30 minutes reminds the professional once. */
export const DRAFT_REMINDER_DELAY_MS = 1_800_000;

/** RF-36: the handoff is still unanswered; tell the professional again. */
export async function remindHandoff(
  tx: Tx,
  data: Record<string, unknown>,
  notify: (conversationId: string) => void,
): Promise<AfterCommit | undefined> {
  const { conversationId } = jobData.parse(data);
  if (await needsHandoffReminder(tx, conversationId)) notify(conversationId);
  return undefined;
}

/** RF-13: the draft is still the one waiting (not approved, edited, discarded or stale). */
export async function remindDraft(
  tx: Tx,
  data: Record<string, unknown>,
  notify: (conversationId: string) => void,
): Promise<AfterCommit | undefined> {
  const { conversationId, turnId } = draftJobData.parse(data);
  const draft = await findPendingDraft(tx, conversationId);
  if (draft?.turnId === turnId) notify(conversationId);
  return undefined;
}

const envelope = z.object({ tenantId: z.uuid() });

/** The tenant a queue job belongs to (RN-03: every job carries it). */
export function tenantOf(job: Job<unknown>): string {
  return envelope.parse(job.data).tenantId;
}
