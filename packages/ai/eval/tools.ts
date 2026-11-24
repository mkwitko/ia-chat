import { tool, type ToolSet } from 'ai';
import * as z from 'zod';
import {
  AgendaError,
  Period,
  serviceById,
  type Agenda,
  type AgendaResult,
  type Appointment,
} from './agenda.ts';
import { LOCAL_OFFSET_MS, UTC_OFFSET } from './data/clinic.ts';
import { formatSlot } from './format.ts';

// Spec 04 tools, against the in-memory agenda. Names stay in Portuguese, as in the spec.
export const ToolName = {
  slots: 'consultar_horarios',
  book: 'agendar',
  reschedule: 'remarcar',
  cancel: 'cancelar',
  listMine: 'listar_agendamentos_do_paciente',
  handoff: 'transferir_para_humano',
  unanswered: 'registrar_duvida_sem_resposta',
  rename: 'atualizar_nome_do_contato',
} as const;
export type ToolName = (typeof ToolName)[keyof typeof ToolName];

export const NEEDS_CONFIRMATION = 'needs_confirmation';
const CONFIRMATION_HINT = 'Proponha este horário ao paciente e só agende depois que ele confirmar.';
const HAS_OFFSET = /(?:[+-]\d{2}:\d{2}|Z)$/;

/** Every tool answers with a flat JSON object the model reads. */
type ToolReply = Readonly<Record<string, unknown>>;
const needsConfirmation = (): ToolReply => ({ erro: NEEDS_CONFIRMATION, dica: CONFIRMATION_HINT });

export interface ToolCall {
  turn: number;
  name: ToolName;
  input: unknown;
  output: unknown;
}

/** State shared by the tools across the turns of one conversation. */
export interface ToolState {
  agenda: Agenda;
  log: ToolCall[];
  /** Slot key → turn in which consultar_horarios offered it. */
  offered: Map<string, number>;
  contactName: string | undefined;
}

export function evalTools(state: ToolState, turn: number): ToolSet {
  const run =
    <I, O>(name: ToolName, execute: (input: I) => O) =>
    (input: I) => {
      const output = execute(input);
      state.log.push({ turn, name, input, output });
      return Promise.resolve(output);
    };
  return {
    [ToolName.slots]: tool({
      description: 'Lista até 6 horários livres para um serviço a partir de uma data (AAAA-MM-DD).',
      inputSchema: z.object({
        servico: z.string(),
        a_partir_de: z.string(),
        periodo: z.enum(Period).optional(),
      }),
      execute: run(ToolName.slots, ({ servico, a_partir_de, periodo }) =>
        offerSlots(state, { turn, servico, from: a_partir_de, periodo }),
      ),
    }),
    [ToolName.book]: tool({
      description: 'Agenda um serviço num horário já proposto ao paciente e confirmado por ele.',
      inputSchema: z.object({ servico: z.string(), inicio: z.string(), nome_paciente: z.string() }),
      execute: run(ToolName.book, ({ servico, inicio, nome_paciente }) =>
        bookConfirmed(state, { turn, servico, inicio, nome: nome_paciente }),
      ),
    }),
    ...appointmentTools(state, run, turn),
    ...contactTools(state, run),
  };
}

type Runner = <I, O>(name: ToolName, execute: (input: I) => O) => (input: I) => Promise<O>;

function appointmentTools(state: ToolState, run: Runner, turn: number): ToolSet {
  return {
    [ToolName.reschedule]: tool({
      description: 'Remarca um agendamento do paciente para um novo horário já confirmado por ele.',
      inputSchema: z.object({ agendamento: z.string(), novo_inicio: z.string() }),
      execute: run(ToolName.reschedule, ({ agendamento, novo_inicio }) =>
        rescheduleConfirmed(state, { turn, id: agendamento, inicio: novo_inicio }),
      ),
    }),
    [ToolName.cancel]: tool({
      description: 'Cancela um agendamento do paciente.',
      inputSchema: z.object({ agendamento: z.string(), motivo: z.string().optional() }),
      execute: run(ToolName.cancel, ({ agendamento }) => outcome(state.agenda.cancel(agendamento))),
    }),
    [ToolName.listMine]: tool({
      description: 'Lista os agendamentos futuros do paciente desta conversa.',
      inputSchema: z.object({}),
      execute: run(ToolName.listMine, () => state.agenda.mine().map(describe)),
    }),
  };
}

function contactTools(state: ToolState, run: Runner): ToolSet {
  return {
    [ToolName.handoff]: tool({
      description: 'Passa a conversa para o profissional ou a equipe humana.',
      inputSchema: z.object({ motivo: z.string() }),
      execute: run(ToolName.handoff, () => ({ ok: true })),
    }),
    [ToolName.unanswered]: tool({
      description: 'Registra uma pergunta que a base de conhecimento não responde.',
      inputSchema: z.object({ pergunta: z.string() }),
      execute: run(ToolName.unanswered, () => ({ ok: true })),
    }),
    [ToolName.rename]: tool({
      description: 'Atualiza o nome do contato, quando o paciente informar.',
      inputSchema: z.object({ nome: z.string() }),
      execute: run(ToolName.rename, ({ nome }) => {
        state.contactName = nome;
        return { ok: true };
      }),
    }),
  };
}

function offerSlots(
  state: ToolState,
  query: { turn: number; servico: string; from: string; periodo?: Period | undefined },
): ToolReply {
  if (!serviceById(query.servico)) return { erro: AgendaError.unknownService };
  const from = new Date(`${query.from.slice(0, 'AAAA-MM-DD'.length)}T00:00:00${UTC_OFFSET}`);
  const slots = state.agenda.slots(query.servico, from, query.periodo);
  // Keep the first turn a slot was offered: re-checking it while booking is not a new offer.
  for (const slot of slots) {
    const key = slotKey(query.servico, slot);
    if (!state.offered.has(key)) state.offered.set(key, query.turn);
  }
  return {
    horarios: slots.map((slot) => ({ inicio: isoLocal(slot), descricao: formatSlot(slot) })),
  };
}

function rescheduleConfirmed(
  state: ToolState,
  request: { turn: number; id: string; inicio: string },
): ToolReply {
  const start = parseStart(request.inicio);
  const serviceId = state.agenda.mine().find((item) => item.id === request.id)?.serviceId ?? '';
  if (!wasOffered(state, { serviceId, start, turn: request.turn })) return needsConfirmation();
  return outcome(state.agenda.reschedule(request.id, start));
}

/** Spec 04: a write needs the patient's confirmation of a slot proposed in an earlier turn. */
function bookConfirmed(
  state: ToolState,
  request: { turn: number; servico: string; inicio: string; nome: string },
): ToolReply {
  const start = parseStart(request.inicio);
  if (!wasOffered(state, { serviceId: request.servico, start, turn: request.turn }))
    return needsConfirmation();
  state.contactName ??= request.nome;
  return outcome(state.agenda.book(request.servico, start));
}

// ponytail: "offered in an earlier turn" stands in for the spec check (the previous
// assistant turn proposed exactly this slot); E-20 implements the real one. Cancel has none.
function wasOffered(
  state: ToolState,
  { serviceId, start, turn }: { serviceId: string; start: Date; turn: number },
): boolean {
  const offeredAt = state.offered.get(slotKey(serviceId, start));
  return offeredAt !== undefined && offeredAt < turn;
}

function outcome({ appointment, error }: AgendaResult): ToolReply {
  return appointment ? describe(appointment) : { erro: error };
}

function describe(item: Appointment) {
  return {
    agendamento: item.id,
    servico: item.serviceId,
    inicio: isoLocal(item.start),
    descricao: formatSlot(item.start),
  };
}

function slotKey(serviceId: string, start: Date): string {
  return `${serviceId}|${String(start.getTime())}`;
}

const WRITE_TOOLS = new Set<ToolName>([
  ToolName.book,
  ToolName.reschedule,
  ToolName.cancel,
  ToolName.handoff,
  ToolName.unanswered,
  ToolName.rename,
]);

/** Successful writes of the conversation, as lines for the prompt state. */
export function doneSoFar(log: readonly ToolCall[]): string[] {
  return log
    .filter((call) => WRITE_TOOLS.has(call.name) && !hasError(call.output))
    .map((call) => `${call.name}: ${JSON.stringify(call.output)}`);
}

function hasError(output: unknown): boolean {
  return output instanceof Object && 'erro' in output;
}

export function parseStart(value: string): Date {
  return new Date(HAS_OFFSET.test(value) ? value : `${value}${UTC_OFFSET}`);
}

export function isoLocal(date: Date): string {
  const shifted = new Date(date.getTime() + LOCAL_OFFSET_MS);
  return `${shifted.toISOString().slice(0, 'AAAA-MM-DDTHH:MM'.length)}:00${UTC_OFFSET}`;
}
