import { formatCents, type AgentProfile } from '@app/ai';
import type { ModelMessage } from 'ai';
import * as z from 'zod';
import { AgendaToolName, ToolName } from '../shared-tools.ts';

// Spec 10, "Simulador": what an answer used. Tool calls come from the model's tool messages
// and the profile facts from comparing the answer with the registered data; the model's own
// claims about its sources are never read.

export const SourceKind = {
  service: 'service',
  package: 'package',
  address: 'address',
  arrival: 'arrival',
  knowledge: 'knowledge',
  tool: 'tool',
} as const;
export type SourceKind = (typeof SourceKind)[keyof typeof SourceKind];

export interface Source {
  kind: SourceKind;
  label: string;
  detail?: string;
}

const TOOL_LABEL: Readonly<Record<string, string>> = {
  [AgendaToolName.availability]: 'Consultou os horários livres da agenda',
  [ToolName.handoff]: 'Passaria a conversa para você',
  [ToolName.unanswered]: 'Registraria a dúvida na sua base de conhecimento',
};
// The tool input worth showing next to the label (never patient data: the simulator has none).
const TOOL_DETAIL_KEY: Readonly<Record<string, string>> = {
  [AgendaToolName.availability]: 'servico',
  [ToolName.handoff]: 'motivo',
  [ToolName.unanswered]: 'pergunta',
};
const TOOL_CALL = 'tool-call';
const ASSISTANT = 'assistant';
const MIN_WORD_LENGTH = 4;
const MIN_OVERLAP = 0.6;
const SPACES = /\s+/g;
const DIACRITICS = /\p{Diacritic}/gu;
const NON_WORD = /[^\p{L}\p{N}]+/gu;
const ADDRESS_SEPARATOR = ',';
const WHOLE_REAIS = /,00$/;

export function sourcesOf(
  { text, messages }: { text: string; messages: readonly ModelMessage[] },
  profile: AgentProfile,
): Source[] {
  return [...profileSources(text, profile), ...toolSources(messages)];
}

function toolSources(messages: readonly ModelMessage[]): Source[] {
  return messages.flatMap((message) => {
    if (message.role !== ASSISTANT || !Array.isArray(message.content)) return [];
    return message.content.flatMap((part) => {
      if (part.type !== TOOL_CALL) return [];
      const label = TOOL_LABEL[part.toolName];
      if (!label) return [];
      const detail = detailOf(part.toolName, part.input);
      return [{ kind: SourceKind.tool, label, ...(detail ? { detail } : {}) }];
    });
  });
}

function detailOf(toolName: string, input: unknown): string | undefined {
  const key = TOOL_DETAIL_KEY[toolName];
  const fields = z.record(z.string(), z.unknown()).safeParse(input);
  if (!key || !fields.success) return undefined;
  const value = z.string().safeParse(fields.data[key]);
  return value.success ? value.data : undefined;
}

function profileSources(text: string, profile: AgentProfile): Source[] {
  const said = plain(text);
  const sources: Source[] = [
    ...pricedSources(said, { kind: SourceKind.service, items: profile.services }),
    ...pricedSources(said, { kind: SourceKind.package, items: profile.business?.packages ?? [] }),
  ];
  const street = profile.address?.split(ADDRESS_SEPARATOR)[0] ?? '';
  if (street && has(said, street))
    sources.push({ kind: SourceKind.address, label: 'Endereço', detail: profile.address ?? '' });
  if (profile.arrival && overlaps(profile.arrival, said))
    sources.push({ kind: SourceKind.arrival, label: 'Como chegar' });
  for (const item of profile.knowledge)
    if (overlaps(item.answer, said))
      sources.push({ kind: SourceKind.knowledge, label: item.question });
  return sources;
}

interface Priced {
  kind: SourceKind;
  items: readonly { name: string; priceCents: number }[];
}

function pricedSources(said: string, { kind, items }: Priced): Source[] {
  return items
    .filter((item) => priced(said, item))
    .map((item) => ({ kind, label: item.name, detail: formatCents(item.priceCents) }));
}

/** The reply names the item or quotes its price ("R$ 800,00" or "R$ 800"). */
function priced(said: string, item: { name: string; priceCents: number }): boolean {
  const price = formatCents(item.priceCents);
  const prices = [price, price.replace(WHOLE_REAIS, '')];
  return has(said, item.name) || prices.some((candidate) => has(said, candidate));
}

/** Whole-word containment, so "R$ 18" does not match "R$ 180". */
function has(said: string, term: string): boolean {
  return ` ${said} `.includes(` ${plain(term)} `);
}

/** Most of the registered answer's words show up in the reply: it was used, even reworded. */
function overlaps(registered: string, said: string): boolean {
  const words = plain(registered)
    .split(' ')
    .filter((word) => word.length >= MIN_WORD_LENGTH);
  if (words.length === 0) return false;
  const present = new Set(said.split(' '));
  return words.filter((word) => present.has(word)).length / words.length >= MIN_OVERLAP;
}

function plain(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(NON_WORD, ' ')
    .replace(SPACES, ' ')
    .trim();
}
