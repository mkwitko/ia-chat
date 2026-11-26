import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, type Prisma } from '../generated/prisma/client.ts';
import { INVALID_TENANT_ID, TENANT_SETTING, isUuid } from './tenant-context.ts';

export { TENANT_CONTEXT_MISSING, TENANT_SETTING } from './tenant-context.ts';
export * from '../generated/prisma/enums.ts';
export { Prisma } from '../generated/prisma/client.ts';

export type Tx = Prisma.TransactionClient;

export interface Db {
  /**
   * Runs fn in a transaction scoped to one tenant (RN-01). Every business query goes through here.
   * set_config(..., true) is local to the transaction, so a pooled connection never carries the
   * tenant into the next request.
   */
  withTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>): Promise<T>;
  /** Unscoped client: only for tables without tenant_id. RLS still blocks tenant tables. */
  client: PrismaClient;
}

export interface PoolOptions {
  max?: number;
}

export function createDb(connectionString: string, pool: PoolOptions = {}): Db {
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString, ...pool }) });
  return {
    client,
    async withTenant(tenantId, fn) {
      if (!isUuid(tenantId)) throw new Error(INVALID_TENANT_ID);
      return client.$transaction(async (tx) => {
        await tx.$queryRaw`select set_config(${TENANT_SETTING}, ${tenantId}, true)`;
        return fn(tx);
      });
    },
  };
}

export {
  DEFAULT_QUEUE_OPTIONS,
  INBOUND_QUEUE,
  MEDIA_QUEUE,
  RECONCILE_QUEUE,
  TURN_QUEUE,
  HANDOFF_REMINDER_QUEUE,
  DRAFT_REMINDER_QUEUE,
  SUMMARY_QUEUE,
  SUMMARY_SYNC_QUEUE,
  TRIAL_SWEEP_QUEUE,
  REMINDER_SWEEP_QUEUE,
  BILLING_RECONCILE_QUEUE,
  TENANT_DELETION_QUEUE,
  IMPORT_STAGING_PURGE_QUEUE,
  MESSAGE_RETENTION_QUEUE,
  WEEKLY_REPORT_QUEUE,
  SESSION_HEALTH_QUEUE,
  QUEUES,
  QUEUE_SCHEMA,
  deadLetterName,
  type QueueDefinition,
} from './queue/definitions.ts';
export {
  sendTenantJob,
  watchDeadLetters,
  workTenantQueue,
  type AfterCommit,
  type DeadLetter,
  type TenantJob,
} from './queue/tenant-job.ts';
export {
  ActorType,
  ControlReason,
  setControl,
  type ControlChange,
} from './conversation/control.ts';
export {
  lockConversation,
  recordOutbound,
  turnMayDeliver,
  type LockedConversation,
  type OutboundRecord,
} from './conversation/send-lock.ts';
export { findPendingDraft, type PendingDraft } from './conversation/draft.ts';
export {
  bookAppointment,
  cancelAppointment,
  rescheduleAppointment,
  type BookRequest,
  type CancelRequest,
  type MoveRequest,
} from './agenda/appointments.ts';
export {
  calendarAccessToken,
  createCalendarResolver,
  googleClientOf,
  type ResolverOptions,
} from './calendar/resolver.ts';
export { externalBusyOf, type CalendarLink, type CalendarResolver } from './calendar/link.ts';
export { listUpcoming } from './agenda/upcoming.ts';
export { loadScope, slotsIn } from './agenda/availability.ts';
export {
  findProfessional,
  performersOf,
  slotsAcross,
  type Performer,
  type ProfessionalSlot,
} from './agenda/professionals.ts';
export { offeredBefore, recordOffers, wasOfferedBefore } from './agenda/offers.ts';
export { dayBounds, isoDay, localDayRange, tomorrowCount } from './agenda/day.ts';
export { vacationReturn } from './agenda/vacation.ts';
export {
  joinWaitlist,
  removeWaitlistEntry,
  waitlistBetween,
  type JoinRequest,
} from './agenda/waitlist.ts';
export {
  claimSlotOffer,
  expireWaitlist,
  freedSlots,
  OFFER_TTL_MINUTES,
  skipSlotOffer,
  type ClaimedOffer,
} from './agenda/slot-offers.ts';
export {
  AgendaError,
  AgendaFailure,
  MAX_FUTURE_APPOINTMENTS,
  isExclusionViolation,
  type AgendaResult,
  type AppointmentView,
} from './agenda/types.ts';
export {
  recordOpsEvent,
  recentOpsEvents,
  RECENT_OPS_EVENTS,
  type OpsEventInput,
} from './ops-events.ts';
export { Attendance, markAttendance, type MarkRequest } from './agenda/attendance.ts';
export { NOT_BOOKED_AFTER_DAYS, deriveStage, type StageFacts } from './customers/stage.ts';
export { loadFacts, stageOf, type ContactFacts } from './customers/facts.ts';
export { logStage, syncStage, withStageSync, type StageSync } from './customers/sync.ts';
export { ManualStageError, setManualStage, type ManualStage } from './customers/manual.ts';
export { ConsentActor, recordConsent, type ConsentChange } from './customers/consent.ts';
export {
  GateRefusal,
  MessageCategory,
  proactiveGate,
  type GateInput,
  type GateResult,
} from './reminders/gate.ts';
export { cancelPendingMessages, scheduleMessages } from './reminders/schedule.ts';
export { confirmAppointment, type ConfirmRequest } from './agenda/confirm.ts';
export { applyPayment, markSubscriptionCancelled } from './billing/apply.ts';
export { handleBillingEvent, EventOutcome } from './billing/events.ts';
export {
  MIN_SAMPLE,
  recoveredMoney,
  type RecoveredMoney,
  type RecoveredWeek,
} from './results/recovered.ts';
export {
  contactPackages,
  endingPackages,
  type EndingPackage,
  type PackageBalance,
  type PackageEntryView,
} from './packages/balance.ts';
export { registerPackage, type PackagePurchase } from './packages/register.ts';
export {
  adjustPackage,
  MANUAL_REASONS,
  PackageError,
  type AdjustResult,
  type Adjustment,
  type ManualReason,
} from './packages/adjust.ts';
