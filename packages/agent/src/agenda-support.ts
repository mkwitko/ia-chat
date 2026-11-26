import { toLocalIso } from '@app/core';
import {
  AgendaError,
  findProfessional,
  offeredBefore,
  type AppointmentView,
  type CalendarResolver,
  type Db,
  type Tx,
} from '@app/db';
import * as z from 'zod';
import { AgentCopy } from './copy.ts';
import type { ToolEffects } from './shared-tools.ts';

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
  /** Google Calendar of the tenant (E-21); absent means the agenda runs on our own rules. */
  calendar?: CalendarResolver | undefined;
  /** Where an unavailable calendar asks for the professional (A-13). */
  effects?: ToolEffects | undefined;
}

const LOCALE = 'pt-BR';

export const failure = (erro: string) => ({ erro });

export async function calendarOf(context: OfferContext) {
  return (await context.calendar?.(context.tenantId)) ?? undefined;
}

/** A calendar that cannot be read or written hands the patient to the professional (A-13). */
export const needsProfessional = (code: string): boolean =>
  code === AgendaError.calendarUnavailable || code === AgendaError.notSynced;

export interface Gate {
  serviceId: string;
  startsAt: Date;
  confirmed: boolean;
  /** The professional the client named, if any: the offer must have been with them. */
  professionalId?: string | undefined;
}

export type GateResult =
  { ok: false; error: string } | { ok: true; professionalId: string | undefined };

/**
 * The code, not the model, enforces the confirmation: the patient said yes (the model's flag)
 * to a slot the assistant offered in an earlier turn. On success, who serves: the named
 * professional, else the one the slot was offered with.
 */
export async function confirmedSlot(context: OfferContext, gate: Gate): Promise<GateResult> {
  if (!gate.confirmed) return { ok: false, error: ToolError.notConfirmed };
  const offer = await context.db.withTenant(context.tenantId, (tx) =>
    offeredBefore(tx, {
      conversationId: context.conversationId,
      serviceId: gate.serviceId,
      startsAt: gate.startsAt,
      turnStartedAt: context.now,
      professionalId: gate.professionalId,
    }),
  );
  if (!offer) return { ok: false, error: ToolError.notOffered };
  return { ok: true, professionalId: gate.professionalId ?? offer.professionalId };
}

export const professionalArg = z
  .string()
  .min(1)
  .optional()
  .describe('nome do profissional, só se o cliente pediu um');

export type Wanted =
  | { ok: true; id: string | undefined }
  | { ok: false; refusal: { erro: string; profissionais: string[] } };

/** The professional the client named; an unknown name returns the team to choose from. */
export async function wantedProfessional(tx: Tx, name: string | undefined): Promise<Wanted> {
  if (!name) return { ok: true, id: undefined };
  const { found, team } = await findProfessional(tx, name);
  if (found) return { ok: true, id: found.id };
  return {
    ok: false,
    refusal: {
      ...failure(AgendaError.professionalNotFound),
      profissionais: team.map((one) => one.name),
    },
  };
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
    ...(view.professionalName ? { profissional: view.professionalName } : {}),
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

/** RF-14: the return date comes from the database, formatted here; the model only repeats it. */
export function vacationOutput(returnsAt: Date, timezone: string) {
  const retorno = returnsAt.toLocaleDateString(LOCALE, { timeZone: timezone });
  return { ferias: { retorno, aviso: AgentCopy.vacation(retorno) } };
}
