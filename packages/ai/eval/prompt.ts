import { Sensitivity } from '@app/core';
import { conversationBlocks, Identity, type AgentProfile } from '../src/agent/prompt.ts';
import type { CacheableBlock } from '../src/gateway.ts';
import type { Appointment } from './agenda.ts';
import { CLINIC, HOURS, MIN_CANCEL_HOURS, NOW, SERVICES } from './data/clinic.ts';
import { formatSlot } from './format.ts';
import { isoLocal } from './tools.ts';

// The battery runs the production prompt (packages/ai/src/agent) over the fictitious clinic.

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

export interface PromptContext {
  pricesForbidden: boolean;
  contactName: string | undefined;
  mine: readonly Appointment[];
  done: readonly string[];
}

export function systemBlocks(context: PromptContext): CacheableBlock[] {
  const state = {
    now: `${formatSlot(NOW)} (${isoLocal(NOW)})`,
    contactName: context.contactName,
    appointments: context.mine.map(
      (item) =>
        `${item.id}: ${item.serviceId}, ${formatSlot(item.start)} (${isoLocal(item.start)})`,
    ),
    done: context.done,
    firstMessage: false,
    summary: undefined,
  };
  return conversationBlocks(clinicProfile(context.pricesForbidden), state);
}

function clinicProfile(pricesForbidden: boolean): AgentProfile {
  return {
    identity: Identity.assistant,
    assistantName: CLINIC.assistantName,
    professionalName: CLINIC.professional,
    specialty: CLINIC.specialty,
    sensitivity: Sensitivity.health,
    vocabulary: 'paciente',
    tone: CLINIC.tone,
    examples: CLINIC.examples,
    services: SERVICES.map(({ id, name, minutes, priceCents }) => ({
      id,
      name,
      minutes,
      priceCents,
    })),
    pricesForbidden,
    hours: Object.entries(HOURS).map(([day, windows]) => {
      const ranges = windows.map(([open, close]) => String(open) + 'h às ' + String(close) + 'h');
      return `${WEEKDAYS[Number(day)] ?? day}: ${ranges.join(' e ')}`;
    }),
    cancellationRule: `Cancelamento ou remarcação só com ${String(MIN_CANCEL_HOURS)} horas de antecedência.`,
    address: CLINIC.address,
    arrival: CLINIC.addressNotes,
    knowledge: CLINIC.knowledge.map((item) => ({ question: '', answer: item })),
  };
}
