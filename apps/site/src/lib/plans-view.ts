import { PLANS, PlanId } from '@app/core';
import { formatBrl, formatCount } from './money.ts';

// Presentation of PLANS (the single source of prices and franchises, RF-72). Only labels live here.

export const PLAN_ORDER = [PlanId.essencial, PlanId.agenda, PlanId.pro, PlanId.clinica] as const;

export const PLAN_NAMES = {
  [PlanId.essencial]: 'Essencial',
  [PlanId.agenda]: 'Agenda',
  [PlanId.pro]: 'Pro',
  [PlanId.clinica]: 'Clínica',
} as const satisfies Record<PlanId, string>;

/** Plan highlighted in the table and used in the calculator comparison. */
export const FEATURED_PLAN = PlanId.agenda;

/** One-time setup fee in cents: owner hypothesis of 24/11/2026 (spec 07, "Taxa de implantação"). */
export const SETUP_FEE_CENTS = 49_700;

/** Clínica adds a package per extra professional, still unpriced (spec 01). */
const CLINICA_FRANCHISE_NOTE = ' + pacote por profissional';

export interface FeatureRow {
  label: string;
  /** First plan that includes it. */
  from: PlanId;
  /** Not built yet: shown as "em breve". */
  soon?: boolean;
}

export const FEATURE_ROWS: readonly FeatureRow[] = [
  { label: 'Atendimento no seu tom, áudio, preço e endereço', from: PlanId.essencial },
  { label: 'Painel de conversas e passagem para você', from: PlanId.essencial },
  { label: 'Agenda Google: marcar, remarcar, cancelar', from: PlanId.agenda },
  { label: 'Confirmação e lembrete de consulta', from: PlanId.agenda },
  {
    label: 'Sinal por Pix, lista de espera, retorno de pacientes, relatório de qualidade',
    from: PlanId.pro,
    soon: true,
  },
  { label: 'Vários profissionais, equipe e permissões', from: PlanId.clinica, soon: true },
];

export function includes(plan: PlanId, row: FeatureRow): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(row.from);
}

export interface PlanColumn {
  id: PlanId;
  name: string;
  price: string;
  franchise: string;
  overage: string;
}

export function planColumns(): PlanColumn[] {
  return PLAN_ORDER.map((id) => {
    const terms = PLANS[id];
    const note = id === PlanId.clinica ? CLINICA_FRANCHISE_NOTE : '';
    return {
      id,
      name: PLAN_NAMES[id],
      price: formatBrl(terms.monthlyCents),
      franchise: formatCount(terms.franchise) + note,
      overage: formatBrl(terms.overageCents),
    };
  });
}
