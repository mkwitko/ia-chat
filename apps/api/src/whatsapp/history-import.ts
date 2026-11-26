import { HistoryImportState } from '@app/db';

// E-24b: Meta lets a partner request the coexistence contacts and history sync for 24 hours after
// the onboarding, once each. The owner authorizes it in the panel first.

export const HISTORY_WINDOW_MS = 86_400_000;

/** What the panel sees: the stored state, with "offered" turned into "expired" when the window closed. */
export const HistoryView = { ...HistoryImportState, expired: 'expired' } as const;
export type HistoryView = (typeof HistoryView)[keyof typeof HistoryView];

interface HistoryRow {
  historyImport: HistoryImportState;
  onboardedAt: Date | null;
  historyProgress: number | null;
}

export function historyOffer(row: HistoryRow, now: Date = new Date()) {
  const offered = row.historyImport === HistoryImportState.offered;
  const expiresAt = row.onboardedAt
    ? new Date(row.onboardedAt.getTime() + HISTORY_WINDOW_MS)
    : null;
  const expired = offered && expiresAt !== null && expiresAt <= now;
  return {
    state: expired ? HistoryView.expired : row.historyImport,
    expiresAt: offered && !expired ? (expiresAt?.toISOString() ?? null) : null,
    progress: row.historyProgress,
  };
}
