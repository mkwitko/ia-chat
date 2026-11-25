import { randomUUID } from 'node:crypto';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import {
  AgendaError,
  Attendance,
  ConsentActor,
  ManualStageError,
  bookAppointment,
  cancelAppointment,
  createDb,
  loadFacts,
  markAttendance,
  recordConsent,
  setManualStage,
  syncStage,
  type Tx,
} from '../index.ts';
import {
  AppointmentCreator,
  ConsentCategory,
  ConsentKind,
  ConsentSource,
  LostReason,
  PipelineStage,
} from '../../generated/prisma/enums.ts';

const db = createDb(process.env.DATABASE_URL ?? '', { max: 8 });
afterAll(() => db.client.$disconnect());

// Fri 2027-01-01 09:00 in Sao Paulo; Mondays 09:00-12:00 are open.
const NOW = new Date('2027-01-01T12:00:00Z');
const MONDAY_9 = new Date('2027-01-04T12:00:00Z');
const MONDAY_10 = new Date('2027-01-04T13:00:00Z');
const AFTER_MONDAY = new Date('2027-01-05T12:00:00Z');
const DAY = 86_400_000;
const at = (time: string) => new Date(`1970-01-01T${time}:00Z`);

interface World {
  tenantId: string;
  serviceId: string;
  contactId: string;
}
let world: World;

async function makeWorld(): Promise<World> {
  const tenant = await db.client.tenant.create({
    data: { name: 'Clientes (fictício)', slug: `cl-${randomUUID()}` },
  });
  const tenantId = tenant.id;
  return db.withTenant(tenantId, async (tx) => {
    const professional = await tx.professional.create({ data: { tenantId, name: 'Dr. Exemplo' } });
    await tx.availabilityRule.create({
      data: {
        tenantId,
        professionalId: professional.id,
        weekday: 1,
        startTime: at('09:00'),
        endTime: at('12:00'),
      },
    });
    const service = await tx.service.create({
      data: { tenantId, name: 'Sessão', durationMinutes: 60, priceCents: 18_000 },
    });
    const contact = await tx.contact.create({
      data: { tenantId, bsuid: `BR.${randomUUID()}`, createdAt: NOW },
    });
    return { tenantId, serviceId: service.id, contactId: contact.id };
  });
}

beforeEach(async () => {
  world = await makeWorld();
});

const book = (startsAt: Date, now = NOW) =>
  bookAppointment(db, {
    tenantId: world.tenantId,
    contactId: world.contactId,
    serviceId: world.serviceId,
    startsAt,
    key: randomUUID(),
    createdBy: AppointmentCreator.human,
    now,
  });
const inTenant = <T>(fn: (tx: Tx) => Promise<T>) => db.withTenant(world.tenantId, fn);
const history = () =>
  inTenant(async (tx) =>
    (await tx.contactStageEvent.findMany({ orderBy: { createdAt: 'asc' } })).map(
      (event) => event.toStage,
    ),
  );
const stageNow = async (now: Date) => {
  const stage = await inTenant((tx) =>
    syncStage(tx, { tenantId: world.tenantId, contactId: world.contactId, now }),
  );
  return stage;
};

describe('stage history', () => {
  it('follows booking, attendance and a second booking, from the same transaction', async () => {
    expect((await book(MONDAY_9)).ok).toBe(true);
    const marked = await markAttendance(db, {
      tenantId: world.tenantId,
      appointmentId: await inTenant(async (tx) => (await tx.appointment.findFirstOrThrow()).id),
      outcome: Attendance.attended,
      now: AFTER_MONDAY,
    });
    expect(marked.ok).toBe(true);
    expect(await history()).toEqual([
      PipelineStage.new_contact,
      PipelineStage.booked,
      PipelineStage.attended,
    ]);
    expect((await book(MONDAY_10, AFTER_MONDAY)).ok).toBe(false); // MONDAY_10 is in the past then
  });

  it('logs the time-based "não agendou" before the booking that recovers the contact', async () => {
    const quiet = new Date(NOW.getTime() - 10 * DAY);
    await inTenant((tx) =>
      tx.contact.update({ where: { id: world.contactId }, data: { createdAt: quiet } }),
    );
    expect((await book(MONDAY_9)).ok).toBe(true);
    expect(await history()).toEqual([PipelineStage.not_booked, PipelineStage.booked]);
  });

  it('a cancelled booking sends the contact to "não agendou"', async () => {
    const booked = await book(MONDAY_9);
    if (!booked.ok) throw new Error('booking failed');
    await cancelAppointment(db, {
      tenantId: world.tenantId,
      contactId: world.contactId,
      appointmentId: booked.value.id,
      now: NOW,
    });
    expect(await stageNow(NOW)).toBe(PipelineStage.not_booked);
  });
});

describe('attendance', () => {
  it('refuses a future appointment and a cancelled one; corrects faltou to compareceu', async () => {
    const booked = await book(MONDAY_9);
    if (!booked.ok) throw new Error('booking failed');
    const mark = (outcome: Attendance, now: Date) =>
      markAttendance(db, {
        tenantId: world.tenantId,
        appointmentId: booked.value.id,
        outcome,
        now,
      });
    expect(await mark(Attendance.attended, NOW)).toEqual({
      ok: false,
      error: AgendaError.notStarted,
    });
    expect((await mark(Attendance.noShow, AFTER_MONDAY)).ok).toBe(true);
    expect(await stageNow(AFTER_MONDAY)).toBe(PipelineStage.not_booked);
    expect((await mark(Attendance.attended, AFTER_MONDAY)).ok).toBe(true);
    expect(await stageNow(AFTER_MONDAY)).toBe(PipelineStage.attended);
    await cancelAppointment(db, {
      tenantId: world.tenantId,
      contactId: world.contactId,
      appointmentId: booked.value.id,
      createdBy: AppointmentCreator.human,
      now: NOW,
    });
    expect(await mark(Attendance.attended, AFTER_MONDAY)).toEqual({
      ok: false,
      error: AgendaError.notMarkable,
    });
  });
});

describe('manual stage', () => {
  const lost = (reason?: LostReason) => ({
    tenantId: world.tenantId,
    contactId: world.contactId,
    userId: 'user-1',
    now: NOW,
    stage: PipelineStage.lost,
    lostReason: reason,
  });

  it('needs a reason to be lost, keeps it until a new fact, and returns to automatic', async () => {
    expect(await inTenant((tx) => setManualStage(tx, lost()))).toBe(
      ManualStageError.lostNeedsReason,
    );
    expect(await inTenant((tx) => setManualStage(tx, lost(LostReason.price)))).toBe(
      PipelineStage.lost,
    );
    expect(await stageNow(NOW)).toBe(PipelineStage.lost);
    const back = await inTenant((tx) =>
      setManualStage(tx, { ...lost(), stage: null, now: new Date(NOW.getTime() + DAY) }),
    );
    expect(back).toBe(PipelineStage.new_contact);
    expect(
      await inTenant((tx) => tx.contactStageEvent.findMany({ where: { source: 'manual' } })),
    ).toHaveLength(2);
  });
});

describe('consent log', () => {
  const change = (kind: ConsentKind, category: ConsentCategory) => ({
    tenantId: world.tenantId,
    contactId: world.contactId,
    kind,
    category,
    source: ConsentSource.patient_message,
    actor: { type: ConsentActor.contact },
    now: NOW,
  });

  it('keeps opt_out_at in step, writes one entry per change and none for a repeated opt-out', async () => {
    const optOut = change(ConsentKind.opt_out, ConsentCategory.all);
    expect(await inTenant((tx) => recordConsent(tx, optOut))).toBe(true);
    expect(await inTenant((tx) => recordConsent(tx, optOut))).toBe(false);
    const contact = await inTenant((tx) => tx.contact.findFirstOrThrow());
    expect(contact.optOutAt).toEqual(NOW);
    await inTenant((tx) => recordConsent(tx, change(ConsentKind.opt_in, ConsentCategory.all)));
    expect((await inTenant((tx) => tx.contact.findFirstOrThrow())).optOutAt).toBeNull();
    const kinds = await inTenant(async (tx) =>
      (await tx.consentEvent.findMany({ orderBy: { createdAt: 'asc' } })).map((e) => e.kind),
    );
    expect(kinds).toEqual([ConsentKind.opt_out, ConsentKind.opt_in]);
  });
});

describe('tenant isolation', () => {
  it('another tenant sees none of the facts, history or consent, and cannot change the stage', async () => {
    await inTenant((tx) =>
      recordConsent(tx, {
        tenantId: world.tenantId,
        contactId: world.contactId,
        kind: ConsentKind.opt_out,
        category: ConsentCategory.all,
        source: ConsentSource.owner_panel,
        actor: { type: ConsentActor.user },
        now: NOW,
      }),
    );
    await stageNow(NOW);
    const other = await makeWorld();
    const seen = await db.withTenant(other.tenantId, async (tx) => ({
      facts: (await loadFacts(tx)).map((row) => row.contactId),
      stages: await tx.contactStageEvent.count(),
      consent: await tx.consentEvent.count(),
      changed: await setManualStage(tx, {
        tenantId: other.tenantId,
        contactId: world.contactId,
        userId: 'user-2',
        now: NOW,
        stage: PipelineStage.attended,
      }),
    }));
    expect(seen.facts).toEqual([other.contactId]);
    expect(seen.stages).toBe(0);
    expect(seen.consent).toBe(0);
    expect(seen.changed).toBeNull();
  });
});
