import { MS_PER_DAY, addDays, zonedToUtc, type LocalDate } from '@app/core';
import { failure, findService, serviceMissing, ToolError } from '@app/agent';
import { joinWaitlist } from '@app/db';
import { tool } from 'ai';
import * as z from 'zod';
import type { ToolContext } from './tools.ts';

// M-09 (spec 05, "Lista de espera"): the client asks to be told when an earlier slot opens.
// The request is only written after the client confirmed the service and the dates.

/** Longest request window: past that the client should just book (hypothesis, README). */
export const MAX_WAIT_DAYS = 60;

export const WaitlistError = { invalidRange: 'periodo_invalido' } as const;

const NOTICE =
  'Se abrir um horário nesse período, o cliente recebe uma mensagem e fica com ele quem confirmar primeiro. Não prometa que vai abrir.';

const day = z.iso.date().describe('AAAA-MM-DD, no fuso do consultório');

function localDate(iso: string): LocalDate {
  const [year = 0, month = 0, dayOfMonth = 0] = iso.split('-').map(Number);
  return { year, month, day: dayOfMonth };
}

export function waitlistTool(context: ToolContext) {
  const { db, tenantId, contactId, now, timezone } = context;
  return tool({
    description:
      'Coloca o cliente na lista de espera de um serviço, para ser avisado se abrir um horário entre duas datas (por exemplo, mais cedo do que os horários oferecidos). Só chame depois que o cliente confirmar o serviço e o período.',
    inputSchema: z.object({
      servico: z.string().min(1),
      de: day,
      ate: day,
      confirmado: z.boolean().describe('true só se o cliente confirmou o serviço e o período'),
    }),
    execute: async ({ servico, de, ate, confirmado }) => {
      if (!confirmado) return failure(ToolError.notConfirmed);
      const service = await db.withTenant(tenantId, (tx) => findService(tx, servico));
      if (!service) return serviceMissing;
      const start = zonedToUtc(localDate(de), 0, timezone);
      const windowStart = start > now ? start : now;
      const windowEnd = zonedToUtc(addDays(localDate(ate), 1), 0, timezone);
      const days = (windowEnd.getTime() - windowStart.getTime()) / MS_PER_DAY;
      if (days <= 0 || days > MAX_WAIT_DAYS) return failure(WaitlistError.invalidRange);
      await joinWaitlist(db, {
        tenantId,
        contactId,
        serviceId: service.id,
        windowStart,
        windowEnd,
      });
      return { lista_de_espera: { servico: service.name, de, ate, aviso: NOTICE } };
    },
  });
}
