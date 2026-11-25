import { randomUUID } from 'node:crypto';
import {
  ChannelKind,
  ChannelStatus,
  MessageAuthor,
  MessageDirection,
  MessageStatus,
  MessageType,
  Autonomy,
  Plan,
  ScheduledMessageKind,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  PipelineStage,
  StageSource,
  type Db,
  type Tx,
} from './index.ts';
import { FIXTURE, SEED_TENANT_NAME } from './seed-data.ts';

interface Ids {
  tenantId: string;
  professionalId: string;
  channelId: string;
  serviceId: string;
  locationId: string;
  contactId: string;
  conversationId: string;
}

/**
 * Creates a complete fictitious tenant with at least one row in every business table.
 * Used by the dev seed and by the isolation test.
 */
export async function seedTenant(db: Db, name: string = SEED_TENANT_NAME): Promise<string> {
  const tenant = await db.client.tenant.create({
    // Automatic on the dev tenant: there is no screen to approve drafts until E-16.
    data: { name, slug: `seed-${randomUUID()}`, plan: Plan.agenda, autonomy: Autonomy.auto },
  });
  await db.withTenant(tenant.id, async (tx) => {
    const ids = await seedSetup(tx, tenant.id);
    await seedConversation(tx, ids);
    await seedSchedule(tx, ids);
  });
  return tenant.id;
}

async function seedSetup(tx: Tx, tenantId: string): Promise<Ids> {
  const professional = await tx.professional.create({
    data: {
      tenantId,
      ...FIXTURE.professional,
      messageExamples: [...FIXTURE.professional.messageExamples],
    },
  });
  const professionalId = professional.id;
  const channel = await tx.channel.create({
    data: {
      tenantId,
      kind: ChannelKind.cloud_api,
      status: ChannelStatus.connected,
      ...FIXTURE.channel,
    },
  });
  const service = await tx.service.create({ data: { tenantId, ...FIXTURE.service } });
  const location = await tx.location.create({ data: { tenantId, ...FIXTURE.location } });
  await tx.availabilityRule.create({ data: { tenantId, professionalId, ...FIXTURE.availability } });
  await tx.timeOff.create({ data: { tenantId, professionalId, ...FIXTURE.timeOff } });
  await tx.knowledgeItem.create({ data: { tenantId, ...FIXTURE.knowledge } });
  const contact = await tx.contact.create({
    data: { tenantId, bsuid: `BR.${tenantId}`, ...FIXTURE.contact },
  });
  const conversation = await tx.conversation.create({
    data: { tenantId, channelId: channel.id, contactId: contact.id },
  });
  return {
    tenantId,
    professionalId,
    channelId: channel.id,
    serviceId: service.id,
    locationId: location.id,
    contactId: contact.id,
    conversationId: conversation.id,
  };
}

async function seedConversation(tx: Tx, ids: Ids): Promise<void> {
  const { tenantId, channelId, conversationId } = ids;
  const message = await tx.message.create({
    data: {
      tenantId,
      conversationId,
      channelId,
      direction: MessageDirection.inbound,
      author: MessageAuthor.patient,
      type: MessageType.text,
      text: FIXTURE.message.text,
      providerMessageId: `wamid.${tenantId}`,
      providerTimestamp: new Date(),
      status: MessageStatus.received,
    },
  });
  await tx.inboundEvent.create({
    data: {
      tenantId,
      channelId,
      provider: FIXTURE.inboundProvider,
      payload: { fake: true },
      payloadHash: `hash-${tenantId}`,
    },
  });
  const turn = await tx.turn.create({
    data: { tenantId, conversationId, version: 1, messageIds: [message.id] },
  });
  await tx.aiUsage.create({
    data: { tenantId, conversationId, turnId: turn.id, ...FIXTURE.aiUsage },
  });
  await tx.usageCounter.create({ data: { tenantId, ...FIXTURE.usage } });
  await tx.metaMessageUsage.create({
    data: { tenantId, channelId, providerMessageId: `wamid.out.${tenantId}`, ...FIXTURE.metaUsage },
  });
  const user = await tx.user.create({
    data: { name: FIXTURE.userName, email: `seed-${randomUUID()}@exemplo.test` },
  });
  const { endpoint, ...keys } = FIXTURE.pushSubscription;
  await tx.pushSubscription.create({
    data: { tenantId, userId: user.id, endpoint: `${endpoint}${tenantId}`, ...keys },
  });
  await tx.calendarIntegration.create({ data: { tenantId, ...FIXTURE.calendarIntegration } });
  await tx.auditLog.create({ data: { tenantId, entityId: tenantId, ...FIXTURE.audit } });
}

async function seedSchedule(tx: Tx, ids: Ids): Promise<void> {
  const { tenantId, contactId } = ids;
  const { startsAt, endsAt } = FIXTURE.appointment;
  const { id: appointmentId } = await tx.appointment.create({
    data: {
      tenantId,
      professionalId: ids.professionalId,
      contactId,
      serviceId: ids.serviceId,
      locationId: ids.locationId,
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
    },
  });
  await tx.scheduledMessage.create({
    data: {
      tenantId,
      contactId,
      appointmentId,
      kind: ScheduledMessageKind.reminder,
      ...FIXTURE.reminder,
    },
  });
  await tx.payment.create({ data: { tenantId, appointmentId, ...FIXTURE.payment } });
  await tx.contactStageEvent.create({
    data: { tenantId, contactId, toStage: PipelineStage.new_contact, source: StageSource.derived },
  });
  await tx.consentEvent.create({
    data: {
      tenantId,
      contactId,
      kind: ConsentKind.opt_in,
      category: ConsentCategory.service,
      source: ConsentSource.patient_message,
      actorType: 'contact',
    },
  });
}
