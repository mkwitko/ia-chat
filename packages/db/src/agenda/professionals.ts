import type { Interval } from '@app/core';
import type { Tx } from '../index.ts';
import { slotsIn, type SlotWindow } from './availability.ts';

// Spec 05, "Agenda por profissional": each professional has their own rules, blocks and
// appointments; a service is performed by the professionals linked to it. A professional with no
// link performs every service (H-42), so a one-professional tenant needs no setup.

const FIRST = { createdAt: 'asc' } as const;

export interface Performer {
  id: string;
  name: string;
}

export interface PerformerQuery {
  serviceId: string;
  /** Narrows to this professional (the client named one); empty when they do not perform it. */
  professionalId?: string | undefined;
}

/** Professionals who perform the service, oldest first. */
export function performersOf(
  tx: Tx,
  { serviceId, professionalId }: PerformerQuery,
): Promise<Performer[]> {
  return tx.professional.findMany({
    where: {
      ...(professionalId ? { id: professionalId } : {}),
      OR: [{ services: { none: {} } }, { services: { some: { serviceId } } }],
    },
    orderBy: FIRST,
    select: { id: true, name: true },
  });
}

export interface ProfessionalSlot extends Interval {
  professionalId: string;
  professionalName: string;
}

export type AcrossWindow = Omit<SlotWindow, 'professionalId'> & PerformerQuery;

/** Free slots of every professional who performs the service, by start (ties: oldest first). */
export async function slotsAcross(tx: Tx, window: AcrossWindow): Promise<ProfessionalSlot[]> {
  const { serviceId, professionalId, ...rest } = window;
  const performers = await performersOf(tx, { serviceId, professionalId });
  const lists = await Promise.all(
    performers.map(async (performer) =>
      (await slotsIn(tx, { ...rest, professionalId: performer.id })).map((slot) => ({
        ...slot,
        professionalId: performer.id,
        professionalName: performer.name,
      })),
    ),
  );
  return lists.flat().sort((a, b) => a.start.getTime() - b.start.getTime());
}

const plain = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

/** The professional the client named: exact id, exact name, then the only partial match. */
export async function findProfessional(tx: Tx, requested: string) {
  const team = await tx.professional.findMany({ orderBy: FIRST, select: { id: true, name: true } });
  const wanted = plain(requested);
  const byId = team.find((one) => one.id === requested);
  const exact = team.find((one) => plain(one.name) === wanted);
  const matches = team.filter((one) => plain(one.name).includes(wanted));
  return { found: byId ?? exact ?? (matches.length === 1 ? matches[0] : undefined), team };
}
