import { toLocalIso } from '@app/core';
import { AgendaError, wasOfferedBefore, type AppointmentView, type Db, type Tx } from '@app/db';

// Shared pieces of the agenda tools: the confirmation gate, service lookup and output shape.
// Key names (`inicio`, `fim`, `erro`) are what the output validation reads as facts.

export const ToolError = {
  notConfirmed: 'confirmacao_pendente',
  notOffered: 'horario_nao_oferecido',
} as const;

/** What the agenda tools need of a turn; the worker's ToolContext satisfies it. */
export interface OfferContext {
  db: Db;
  tenantId: string;
  conversationId: string;
  now: Date;
}

const LOCALE = 'pt-BR';

export const failure = (erro: string) => ({ erro });

export interface Gate {
  serviceId: string;
  startsAt: Date;
  confirmed: boolean;
}

/**
 * The code, not the model, enforces the confirmation: the patient said yes (the model's flag)
 * to a slot the assistant offered in an earlier turn. Returns the error to hand back, if any.
 */
export async function confirmationError(
  context: OfferContext,
  gate: Gate,
): Promise<string | undefined> {
  if (!gate.confirmed) return ToolError.notConfirmed;
  const offered = await context.db.withTenant(context.tenantId, (tx) =>
    wasOfferedBefore(tx, {
      conversationId: context.conversationId,
      serviceId: gate.serviceId,
      startsAt: gate.startsAt,
      turnStartedAt: context.now,
    }),
  );
  return offered ? undefined : ToolError.notOffered;
}

const plain = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** The service the patient named: exact id, then name match among the visible ones. */
export async function findService(tx: Tx, requested: string) {
  const services = await tx.service.findMany({ where: { active: true, visibleToPatient: true } });
  const wanted = plain(requested);
  const byId = services.find((service) => service.id === requested);
  const matches = services.filter((service) => plain(service.name).includes(wanted));
  const exact = services.find((service) => plain(service.name) === wanted);
  return byId ?? exact ?? (matches.length === 1 ? matches[0] : undefined);
}

export const serviceMissing = failure(AgendaError.serviceNotFound);

export function appointmentOutput(view: AppointmentView, timezone: string) {
  return {
    id: view.id,
    servico: view.serviceName,
    status: view.status,
    ...slotOutput({ start: view.startsAt, end: view.endsAt }, timezone),
  };
}

export function slotOutput(slot: { start: Date; end: Date }, timezone: string) {
  return {
    inicio: toLocalIso(slot.start, timezone),
    fim: toLocalIso(slot.end, timezone),
    dia_da_semana: slot.start.toLocaleDateString(LOCALE, { weekday: 'long', timeZone: timezone }),
  };
}
