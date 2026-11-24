import type { AfterCommit, Tx } from '@app/db';
import * as z from 'zod';
import { needsHandoffReminder } from './handoff.ts';

const jobData = z.object({ conversationId: z.uuid() });

/** RF-36: the handoff is still unanswered; tell the professional again (push in E-16). */
export async function remindHandoff(
  tx: Tx,
  data: Record<string, unknown>,
  notify: (conversationId: string) => void,
): Promise<AfterCommit | undefined> {
  const { conversationId } = jobData.parse(data);
  if (await needsHandoffReminder(tx, conversationId)) notify(conversationId);
  return undefined;
}
