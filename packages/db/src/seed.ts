import type { Db } from './index.ts';

/**
 * Creates a complete fictitious tenant with at least one row in every business table.
 * Used by the dev seed and by the isolation test. All data is invented: no real patient,
 * phone numbers in the 0000 range.
 */
export async function seedTenant(db: Db, name = 'Clínica Exemplo'): Promise<string> {
  const tenant = await db.client.tenant.create({ data: { name, plan: 'agenda' } });

  await db.withTenant(tenant.id, async (tx) => {
    const tenantId = tenant.id;
    const professional = await tx.professional.create({
      data: {
        tenantId,
        name: 'Dra. Ana Exemplo',
        toneOfVoice: 'Cordial e direto',
        messageExamples: ['Oi! Tudo bem? Posso te ajudar a marcar um horário.'],
      },
    });
    const channel = await tx.channel.create({
      data: { tenantId, kind: 'cloud_api', displayPhone: '+55 11 90000-0000', status: 'connected' },
    });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão de quiropraxia', durationMinutes: 50, priceCents: 18000 },
    });
    const location = await tx.location.create({
      data: { tenantId, name: 'Consultório', address: 'Rua Exemplo, 100 - São Paulo, SP' },
    });
    await tx.availabilityRule.create({
      data: {
        tenantId,
        professionalId: professional.id,
        weekday: 1,
        startTime: new Date('1970-01-01T09:00:00Z'),
        endTime: new Date('1970-01-01T18:00:00Z'),
      },
    });
    await tx.timeOff.create({
      data: {
        tenantId,
        professionalId: professional.id,
        startsAt: new Date('2027-01-01T00:00:00Z'),
        endsAt: new Date('2027-01-02T00:00:00Z'),
        reason: 'Feriado',
      },
    });
    await tx.knowledgeItem.create({
      data: { tenantId, question: 'Tem estacionamento?', answer: 'Sim, conveniado na rua.' },
    });
    const contact = await tx.contact.create({
      data: {
        tenantId,
        bsuid: `BR.${tenantId}`,
        phoneE164: '+5511900000001',
        phoneKey: '+551100000001',
        name: 'Paciente Fictício',
      },
    });
    const conversation = await tx.conversation.create({
      data: { tenantId, channelId: channel.id, contactId: contact.id },
    });
    const message = await tx.message.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        channelId: channel.id,
        direction: 'inbound',
        author: 'patient',
        type: 'text',
        text: 'Oi, quanto custa a sessão?',
        providerMessageId: `wamid.${tenantId}`,
        providerTimestamp: new Date(),
        status: 'received',
      },
    });
    await tx.inboundEvent.create({
      data: {
        tenantId,
        channelId: channel.id,
        provider: 'cloud_api',
        payload: { fake: true },
        payloadHash: `hash-${tenantId}`,
      },
    });
    const turn = await tx.turn.create({
      data: { tenantId, conversationId: conversation.id, version: 1, messageIds: [message.id] },
    });
    // Prisma cannot write tstzrange (see schema.prisma), so this one is raw SQL.
    const [appointment] = await tx.$queryRaw<{ id: string }[]>`
      insert into appointments (tenant_id, professional_id, contact_id, service_id, location_id, during)
      values (${tenantId}::uuid, ${professional.id}::uuid, ${contact.id}::uuid, ${service.id}::uuid,
              ${location.id}::uuid, tstzrange('2027-01-04 12:00Z', '2027-01-04 12:50Z'))
      returning id`;
    if (!appointment) throw new Error('appointment insert returned nothing');
    await tx.scheduledMessage.create({
      data: {
        tenantId,
        contactId: contact.id,
        appointmentId: appointment.id,
        kind: 'reminder',
        sendAt: new Date('2027-01-03T12:00:00Z'),
      },
    });
    await tx.payment.create({
      data: {
        tenantId,
        appointmentId: appointment.id,
        amountCents: 5000,
        provider: 'pix_manual',
      },
    });
    await tx.aiUsage.create({
      data: {
        tenantId,
        conversationId: conversation.id,
        turnId: turn.id,
        task: 'conversation',
        provider: 'fake',
        model: 'fake-model',
        inputTokens: 100,
        outputTokens: 20,
        costMicroUsd: 15n,
      },
    });
    await tx.usageCounter.create({
      data: { tenantId, month: new Date('2027-01-01'), conversations: 1 },
    });
    await tx.auditLog.create({
      data: { tenantId, actorType: 'system', action: 'seed', entity: 'tenant', entityId: tenantId },
    });
  });

  return tenant.id;
}
