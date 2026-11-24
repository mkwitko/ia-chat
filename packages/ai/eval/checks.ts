import { AppointmentStatus, type Agenda } from './agenda.ts';
import type { EvalCase, Expectation } from './case.ts';
import { SERVICES } from './data/clinic.ts';
import { formatCents } from './format.ts';
import { ToolName, type ToolCall } from './tools.ts';

// Automatic checks per case (spec 04): the right tools, the final agenda state and the
// deterministic output validation. Each failure is a short reason for the report.

const MAX_REPLY_CHARS = 900;
// Thousands with dots, cents with comma; a trailing period or ".00" is not part of the value.
const MONEY = /R\$\s?\d+(?:\.\d{3})*(?:,\d{2})?/g;
const CATALOG = new Set(SERVICES.map((service) => normalizeMoney(formatCents(service.priceCents))));
const SYSTEM_MARKUP = /<\/?[a-z_]+>|\{\s*"|\[\s*\{/i;

export interface Outcome {
  agenda: Agenda;
  log: readonly ToolCall[];
  replies: readonly string[];
}

export function checkCase(evalCase: EvalCase, outcome: Outcome): string[] {
  return [
    ...validateReplies(evalCase, outcome.replies),
    ...checkAgenda(evalCase.expect, outcome.agenda),
    ...checkTools(evalCase.expect, outcome),
  ];
}

function validateReplies(evalCase: EvalCase, replies: readonly string[]): string[] {
  return replies.flatMap((reply, index) => {
    const failures: string[] = [];
    const where = `resposta ${String(index + 1)}`;
    if (!reply.trim()) failures.push(`${where}: vazia`);
    if (reply.length > MAX_REPLY_CHARS)
      failures.push(`${where}: ${String(reply.length)} caracteres`);
    if (SYSTEM_MARKUP.test(reply)) failures.push(`${where}: marcação de sistema`);
    const values = reply.match(MONEY) ?? [];
    if (evalCase.pricesForbidden && values.length)
      failures.push(`${where}: valor com preço proibido`);
    const unknown = values.filter((value) => !CATALOG.has(normalizeMoney(value)));
    if (!evalCase.pricesForbidden && unknown.length)
      failures.push(`${where}: valor fora do catálogo (${unknown.join(', ')})`);
    return failures;
  });
}

function checkAgenda(expect: Expectation, agenda: Agenda): string[] {
  const created = agenda.appointments.filter(
    (item) => item.mine && item.id.startsWith('ag-') && item.status === AppointmentStatus.booked,
  );
  const original = agenda.appointments.find((item) => item.mine && !item.id.startsWith('ag-'));
  const failures: string[] = [];
  const wantsNew = expect.booked !== undefined || expect.rescheduled === true;
  if (wantsNew && !created.length) failures.push('nenhum agendamento novo');
  if (!wantsNew && !expect.bookingAllowed && created.length)
    failures.push('criou agendamento indevido');
  if (expect.booked && created.length && !created.some((item) => item.serviceId === expect.booked))
    failures.push(`agendou serviço errado (esperado ${expect.booked})`);
  const originalCancelled = original?.status === AppointmentStatus.cancelled;
  const wantsCancelled = expect.cancelled === true || expect.rescheduled === true;
  if (wantsCancelled !== originalCancelled && original)
    failures.push(
      wantsCancelled
        ? 'agendamento original não foi cancelado'
        : 'cancelou agendamento indevidamente',
    );
  return failures;
}

function checkTools(expect: Expectation, { log, replies }: Outcome): string[] {
  const called = new Set(log.map((call) => call.name));
  const failures: string[] = [];
  if (expect.handoff !== undefined && called.has(ToolName.handoff) !== expect.handoff)
    failures.push(expect.handoff ? 'não transferiu para humano' : 'transferiu sem necessidade');
  if (expect.unanswered && !called.has(ToolName.unanswered))
    failures.push('não registrou a dúvida sem resposta');
  const text = replies.join('\n').toLowerCase();
  for (const fragment of expect.mentions ?? []) {
    if (!text.includes(fragment.toLowerCase())) failures.push(`não mencionou "${fragment}"`);
  }
  return failures;
}

function normalizeMoney(value: string): string {
  return value.replace(/\s/g, '').replace(/,00$/, '');
}
