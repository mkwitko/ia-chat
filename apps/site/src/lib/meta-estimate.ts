// Estimate of what the client pays Meta directly (spec 07, "Custo por perfil de consumo").
// Hypothesis figures from the cost spreadsheet; revise when Meta changes its table or the pilot
// gives real volumes.

export const META_ESTIMATE_DATE = '24/11/2026';

export interface MetaProfile {
  name: string;
  conversations: number;
  appointments: number;
  /** Cents per month, paid to Meta on the client's own card. */
  metaCents: number;
}

export const META_PROFILES: readonly MetaProfile[] = [
  { name: 'Baixo', conversations: 150, appointments: 30, metaCents: 210 },
  { name: 'Médio', conversations: 400, appointments: 80, metaCents: 5_460 },
  { name: 'Alto', conversations: 1_200, appointments: 200, metaCents: 23_100 },
];
