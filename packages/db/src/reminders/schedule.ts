import { planMessages, templateFor } from '@app/core';
import { ScheduledMessageState } from '../../generated/prisma/enums.ts';
import type { Tx } from '../index.ts';

// RF-46 and RF-47: booking leaves the confirmation and the reminders in scheduled_messages, in
// the booking's own transaction; the worker sweep sends them (apps/worker/src/reminders).

export interface ScheduleInput {
  tenantId: string;
  appointment: { id: string; contactId: string; startsAt: Date };
  now: Date;
}

export async function scheduleMessages(tx: Tx, input: ScheduleInput): Promise<void> {
  const { tenantId, appointment, now } = input;
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { reminderOffsetsMinutes: true },
  });
  const conversation = await tx.conversation.findFirst({
    where: { contactId: appointment.contactId },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
    select: { id: true },
  });
  const planned = planMessages({
    startsAt: appointment.startsAt,
    now,
    offsetsMinutes: tenant.reminderOffsetsMinutes,
  });
  await tx.scheduledMessage.createMany({
    data: planned.map(({ kind, sequence, sendAt }) => ({
      tenantId,
      contactId: appointment.contactId,
      appointmentId: appointment.id,
      conversationId: conversation?.id ?? null,
      kind,
      sequence,
      templateName: templateFor(kind, sequence).template.name,
      sendAt,
    })),
  });
}

/** Cancelled or moved appointment: whatever is still waiting for it never goes out (A-15). */
export async function cancelPendingMessages(tx: Tx, appointmentId: string): Promise<void> {
  await tx.scheduledMessage.updateMany({
    where: { appointmentId, state: ScheduledMessageState.scheduled },
    data: { state: ScheduledMessageState.cancelled },
  });
}
