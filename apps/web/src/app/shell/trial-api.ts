import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors apps/api/src/trial/trial-routes.ts; the web does not import server code.

export const TrialPhase = { none: 'none', active: 'active', ended: 'ended' } as const;
export type TrialPhase = (typeof TrialPhase)[keyof typeof TrialPhase];

export interface Trial {
  phase: TrialPhase;
  daysLeft: number;
  /** ISO time until which the data is kept; only when the trial ended. */
  dataKeptUntil: string | null;
  documentSet: boolean;
}

const TRIAL_PATH = '/api/trial';

export const useTrial = () =>
  useQuery({ queryKey: [TRIAL_PATH], queryFn: () => api<Trial>(TRIAL_PATH) });
