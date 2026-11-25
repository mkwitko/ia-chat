import raw from '../data/status.json';

// Public status page (spec 09). The source of truth is src/data/status.json, edited in a PR:
// change `state` and add an entry to the top of `incidents` when something happens.

export const StatusState = {
  prelaunch: 'prelaunch',
  operational: 'operational',
  degraded: 'degraded',
  outage: 'outage',
} as const;
export type StatusState = (typeof StatusState)[keyof typeof StatusState];

export const STATE_LABEL: Record<StatusState, string> = {
  prelaunch: 'Em pré-lançamento',
  operational: 'Tudo funcionando',
  degraded: 'Funcionando com problemas',
  outage: 'Fora do ar',
};

export const STATE_NOTE: Record<StatusState, string> = {
  prelaunch:
    'O serviço ainda não está em produção, então não há o que monitorar nem incidentes a relatar. Esta página passa a mostrar o estado real no lançamento.',
  operational: 'Todos os componentes estão funcionando normalmente.',
  degraded: 'Alguns componentes estão com problemas. Veja o incidente abaixo.',
  outage: 'O serviço está fora do ar. Veja o incidente abaixo.',
};

export interface IncidentUpdate {
  /** ISO date and time, e.g. 2027-01-15T14:30:00-03:00. */
  at: string;
  /** What we know and what we are doing, in plain language. */
  text: string;
}

export interface Incident {
  title: string;
  startedAt: string;
  /** Absent while the incident is still open. */
  resolvedAt?: string;
  updates: IncidentUpdate[];
}

export interface StatusData {
  state: StatusState;
  updatedAt: string;
  incidents: Incident[];
}

export const status = raw as StatusData;
