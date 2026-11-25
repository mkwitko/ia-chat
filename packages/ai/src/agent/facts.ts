// What the tools of this turn established (spec 04, "Validação da saída"): only these
// prices, times and actions may appear in the answer besides the tenant's catalog.

export const ActionKind = {
  booked: 'booked',
  cancelled: 'cancelled',
  rescheduled: 'rescheduled',
} as const;
export type ActionKind = (typeof ActionKind)[keyof typeof ActionKind];

/** Spec 04 write tools whose success allows the matching claim in the answer. */
const ACTION_BY_TOOL: Readonly<Record<string, ActionKind>> = {
  agendar: ActionKind.booked,
  remarcar: ActionKind.rescheduled,
  cancelar: ActionKind.cancelled,
  // "Está confirmado" claims count as the booking standing (validate.ts maps them to `booked`).
  confirmar_presenca: ActionKind.booked,
};
const TIME_KEYS = new Set(['inicio', 'fim', 'novo_inicio', 'start']);
const CENTS_KEYS = new Set(['valor_centavos', 'price_cents', 'priceCents']);
const ERROR_KEY = 'erro';
const ISO_TIME = /T(\d{2}:\d{2})/;

export interface ToolFacts {
  cents: number[];
  times: string[];
  actions: ActionKind[];
}

export interface ToolOutput {
  tool: string;
  output: unknown;
}

export function factsFromToolOutputs(outputs: readonly ToolOutput[]): ToolFacts {
  const facts: ToolFacts = { cents: [], times: [], actions: [] };
  for (const { tool, output } of outputs) {
    collect(output, facts);
    const action = ACTION_BY_TOOL[tool];
    if (action && !hasError(output)) facts.actions.push(action);
  }
  return {
    cents: [...new Set(facts.cents)],
    times: [...new Set(facts.times)],
    actions: [...new Set(facts.actions)],
  };
}

function collect(value: unknown, facts: ToolFacts): void {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, facts);
    return;
  }
  if (!(value instanceof Object)) return;
  for (const [key, item] of Object.entries(value)) collectEntry(key, item, facts);
}

function collectEntry(key: string, item: unknown, facts: ToolFacts): void {
  if (TIME_KEYS.has(key)) {
    const time = ISO_TIME.exec(String(item))?.[1];
    if (time) facts.times.push(time);
    return;
  }
  if (CENTS_KEYS.has(key) && Number.isInteger(item)) {
    facts.cents.push(Number(item));
    return;
  }
  collect(item, facts);
}

function hasError(output: unknown): boolean {
  return output instanceof Object && ERROR_KEY in output;
}
