// Início's one status card (Nielsen 1): of everything the panel could announce at the top, only
// the most important thing is shown, with one button. Pure, so the order is tested.

export const StatusKind = {
  /** Something stops the service: patients are not being answered or notified. */
  problem: 'problem',
  /** The guided setup is unfinished. */
  setup: 'setup',
  /** The trial ends in a few days. */
  trialEnding: 'trialEnding',
  /** An optional improvement after setup. */
  tip: 'tip',
  /** Nothing to do. */
  ok: 'ok',
} as const;
export type StatusKind = (typeof StatusKind)[keyof typeof StatusKind];

export const TRIAL_WARNING_DAYS = 3;

export interface StatusAction {
  label: string;
  to?: string;
  onAction?: () => void;
}

export type TopStatus =
  | { kind: typeof StatusKind.problem; title: string; action: StatusAction }
  | {
      kind: typeof StatusKind.setup;
      title: string;
      done: number;
      total: number;
      action: StatusAction;
    }
  | { kind: typeof StatusKind.trialEnding; daysLeft: number; action: StatusAction }
  | { kind: typeof StatusKind.tip; title: string; action: StatusAction }
  | { kind: typeof StatusKind.ok };

export interface StatusInputs {
  /** Already prioritized problems (WhatsApp, Google Agenda, notifications, trial ended). */
  problems: readonly { title: string; action: StatusAction }[];
  setup: { title: string; done: number; total: number; action: StatusAction } | null;
  trialDaysLeft: number | null;
  trialAction: StatusAction;
  tip: { title: string; action: StatusAction } | null;
}

/** The one thing Início shows at the top. */
export function topStatus(inputs: StatusInputs): TopStatus {
  const [problem] = inputs.problems;
  if (problem) return { kind: StatusKind.problem, ...problem };
  if (inputs.setup) return { kind: StatusKind.setup, ...inputs.setup };
  const days = inputs.trialDaysLeft;
  if (days !== null && days <= TRIAL_WARNING_DAYS)
    return { kind: StatusKind.trialEnding, daysLeft: days, action: inputs.trialAction };
  if (inputs.tip) return { kind: StatusKind.tip, ...inputs.tip };
  return { kind: StatusKind.ok };
}

/** What cannot wait goes above "Precisa de você"; an "all fine" or a tip waits at the bottom. */
export const isUrgent = (status: TopStatus): boolean =>
  status.kind === StatusKind.problem ||
  status.kind === StatusKind.setup ||
  status.kind === StatusKind.trialEnding;
