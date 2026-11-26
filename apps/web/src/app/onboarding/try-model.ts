import { Locale } from '@/i18n/locale';
import { defineMessages } from '@/i18n/messages';
import { Route } from '@/routes';
import { SourceKind, type SimulationReply } from '../simulator/simulator-api';
import { Step } from './onboarding-api';

// "Ajustar" opens the field the answer came from: services and packages, hours, address,
// knowledge; an answer that used nothing registered is about tone and the knowledge base.

export const TryCopy = defineMessages({
  [Locale.ptBR]: {
    starters: ['Quanto custa?', 'Tem horário amanhã?', 'Onde fica?'],
    placeholder: 'Ou escreva como um cliente escreveria',
    good: 'Boa',
    markedGood: 'Marcada como boa',
    adjust: (label: string) => `Ajustar ${label}`,
  },
  [Locale.enUS]: {},
});

export type AdjustTarget = { label: string } & ({ step: Step } | { to: string });

const TARGETS = {
  services: { label: 'serviços', step: Step.services },
  hours: { label: 'horários', step: Step.hours },
  address: { label: 'endereço', to: Route.clinicAddress },
  knowledge: { label: 'respostas', to: Route.knowledge },
} as const satisfies Record<string, AdjustTarget>;

const BY_SOURCE: Readonly<Record<SourceKind, AdjustTarget>> = {
  [SourceKind.service]: TARGETS.services,
  [SourceKind.package]: TARGETS.services,
  [SourceKind.address]: TARGETS.address,
  [SourceKind.arrival]: TARGETS.address,
  [SourceKind.knowledge]: TARGETS.knowledge,
  // The only tool the simulator runs is the free-slot lookup.
  [SourceKind.tool]: TARGETS.hours,
};

export function adjustTarget(reply: SimulationReply): AdjustTarget {
  const first = reply.sources[0];
  return first ? BY_SOURCE[first.kind] : TARGETS.knowledge;
}
