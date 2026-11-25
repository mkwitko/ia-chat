import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

// Mirrors SimRole and SourceKind of @app/agent (the web does not import packages).
export const SimRole = { patient: 'patient', assistant: 'assistant' } as const;
export type SimRole = (typeof SimRole)[keyof typeof SimRole];

export const SourceKind = {
  service: 'service',
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

export interface SimulatedMessage {
  role: SimRole;
  text: string;
}

export interface SimulationReply {
  text: string;
  fixed: boolean;
  handoff: boolean;
  sources: Source[];
}

/** A line of the test chat; only assistant lines carry what was used. */
export type ChatLine = SimulatedMessage & { reply?: SimulationReply };

const PATH = '/api/simulator';
const POST = 'POST';
export const TOO_MANY_REQUESTS = 429;

export function useSimulatorTurn() {
  return useMutation({
    mutationFn: (messages: SimulatedMessage[]) =>
      api<SimulationReply>(PATH, { method: POST, body: { messages } }),
  });
}
