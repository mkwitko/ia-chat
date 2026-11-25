import type { ChannelSend, ChannelSendTemplate } from '@app/channels';
import {
  MessageAuthor,
  Prisma,
  ScheduledMessageKind,
  ScheduledMessageState,
  lockConversation,
  proactiveGate,
  recordOutbound,
  type Tx,
} from '@app/db';
import { PlannedKind, renderTemplate, templateFor, templateParams } from '@app/core';

// RF-46 and RF-47: sends one scheduled confirmation or reminder. Every proactive message
// passes the gate first (M-01, A-15); the conversation row is locked like any other send
// (spec 03, "Trava de envio"). Appointment reminders go on in human control (RF-31).

export const DeliveryOutcome = {
  sent: 'sent',
  /** Opt-out, or the appointment is cancelled, moved or past. */
  refused: 'refused',
  /** Outside the 24 h window and no template allowed for this message (RF-47). */
  windowClosed: 'window_closed',
  /** The contact has no conversation to send through. */
  noConversation: 'no_conversation',
  /** Another sweep holds it, or it is no longer scheduled. */
  skipped: 'skipped',
} as const;
export type DeliveryOutcome = (typeof DeliveryOutcome)[keyof typeof DeliveryOutcome];

export interface ReminderChannel {
  send: ChannelSend;
  sendTemplate: ChannelSendTemplate;
}

export interface DeliverRequest {
  messageId: string;
  now: Date;
  channel: ReminderChannel;
}

type Message = NonNullable<Awaited<ReturnType<typeof hold>>>;

export async function deliverScheduled(tx: Tx, request: DeliverRequest): Promise<DeliveryOutcome> {
  const { messageId, now, channel } = request;
  const message = await hold(tx, messageId);
  if (!message) return DeliveryOutcome.skipped;
  const close = (state: ScheduledMessageState, outcome: DeliveryOutcome) =>
    settle(tx, messageId, { state, outcome });
  const gate = await proactiveGate(tx, {
    contactId: message.contactId,
    appointmentId: message.appointmentId ?? undefined,
    now,
  });
  if (!gate.ok || !message.appointment)
    return close(ScheduledMessageState.cancelled, DeliveryOutcome.refused);
  const conversation = await findConversation(tx, message);
  if (!conversation) return close(ScheduledMessageState.failed, DeliveryOutcome.noConversation);
  await lockConversation(tx, conversation.id);
  const content = await compose(tx, { message, appointment: message.appointment });
  const windowOpen = conversation.windowExpiresAt !== null && conversation.windowExpiresAt > now;
  if (!windowOpen && !content.templateAllowed)
    return close(ScheduledMessageState.cancelled, DeliveryOutcome.windowClosed);
  const { template, params, text } = content;
  const conversationId = conversation.id;
  const { providerMessageId } = windowOpen
    ? await channel.send(tx, { conversationId, text })
    : await channel.sendTemplate(tx, { conversationId, template, vars: params });
  await recordOutbound(tx, {
    tenantId: message.tenantId,
    conversationId,
    author: MessageAuthor.system,
    text,
    providerMessageId,
  });
  return close(ScheduledMessageState.sent, DeliveryOutcome.sent);
}

/** Takes the row lock (skipping one another sweep holds) while it is still scheduled. */
async function hold(tx: Tx, messageId: string) {
  const [held] = await tx.$queryRaw<{ id: string }[]>(
    Prisma.sql`select id from scheduled_messages where id = ${messageId}::uuid and state = 'scheduled' for update skip locked`,
  );
  if (!held) return null;
  return tx.scheduledMessage.findUniqueOrThrow({
    where: { id: messageId },
    include: { appointment: { include: { service: true, location: true } } },
  });
}

function findConversation(tx: Tx, message: Message) {
  return tx.conversation.findFirst({
    where: message.conversationId
      ? { id: message.conversationId }
      : { contactId: message.contactId },
    orderBy: { lastMessageAt: { sort: 'desc', nulls: 'last' } },
  });
}

type Appointment = NonNullable<Message['appointment']>;

/** The template and the variables, read now so a changed address or time is never stale. */
async function compose(tx: Tx, input: { message: Message; appointment: Appointment }) {
  const { message, appointment } = input;
  const { timezone } = await tx.tenant.findUniqueOrThrow({
    where: { id: message.tenantId },
    select: { timezone: true },
  });
  const { location } = appointment;
  const params = templateParams({
    serviceName: appointment.service.name,
    startsAt: appointment.startsAt,
    timezone,
    address:
      location && [location.address, location.arrivalInstructions].filter(Boolean).join('. '),
  });
  const kind =
    message.kind === ScheduledMessageKind.confirmation
      ? PlannedKind.confirmation
      : PlannedKind.reminder;
  const choice = templateFor(kind, message.sequence);
  return { ...choice, params, text: renderTemplate(choice.template, params) };
}

async function settle(
  tx: Tx,
  messageId: string,
  { state, outcome }: { state: ScheduledMessageState; outcome: DeliveryOutcome },
): Promise<DeliveryOutcome> {
  await tx.scheduledMessage.update({ where: { id: messageId }, data: { state } });
  return outcome;
}
