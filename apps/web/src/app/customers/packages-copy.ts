// Panel copy in pt-BR for the client's session packages (research 09 #7). Name and counts only:
// nothing clinical, no free text (spec 11).

const plural = (count: number, one: string, many: string) =>
  `${String(count)} ${count === 1 ? one : many}`;

export const ManualReason = {
  correction: 'correction',
  courtesy: 'courtesy',
  outsidePanel: 'outside_panel',
  other: 'other',
} as const;
export type ManualReason = (typeof ManualReason)[keyof typeof ManualReason];

/** Every ledger reason, automatic ones included, as the history shows it. */
export const EntryReasonLabel: Readonly<Record<string, string>> = {
  attended: 'Compareceu',
  attendance_undone: 'Presença desfeita',
  [ManualReason.correction]: 'Correção de contagem',
  [ManualReason.courtesy]: 'Sessão de cortesia',
  [ManualReason.outsidePanel]: 'Sessão marcada fora do painel',
  [ManualReason.other]: 'Outro motivo',
};

const ADJUST_ERRORS: Readonly<Record<string, string>> = {
  pacote_sem_sessao_usada: 'Nenhuma sessão usada para devolver.',
  pacote_completo: 'Todas as sessões deste pacote já foram usadas.',
};

export const PackagesCopy = {
  heading: 'Pacotes',
  registerFold: 'Registrar um pacote',
  intro:
    'Cada "Compareceu" usa uma sessão do pacote mais antigo que ainda tem saldo. Se a presença for desfeita, a sessão volta.',
  empty: 'Nenhum pacote registrado.',
  balance: (name: string, used: number, sessions: number) =>
    `${name}: ${String(used)} de ${String(sessions)} usadas`,
  remaining: (count: number) =>
    count === 0 ? 'Pacote concluído' : plural(count, 'sessão restante', 'sessões restantes'),
  bought: (day: string) => `Comprado em ${day}`,
  paid: 'Pago',
  unpaid: 'Pagamento pendente',
  history: 'Histórico',
  used: 'usou 1',
  givenBack: 'devolveu 1',
  adjust: 'Ajustar',
  reason: 'Motivo',
  useOne: 'Usar 1 sessão',
  giveBack: 'Devolver 1 sessão',
  adjusted: 'Saldo ajustado.',
  adjustErrors: ADJUST_ERRORS,
  registerHeading: 'Registrar pacote',
  package: 'Pacote',
  option: (name: string, sessions: number, price: string) =>
    `${name} (${plural(sessions, 'sessão', 'sessões')}, ${price})`,
  date: 'Data da compra',
  paidLabel: 'Já foi pago',
  register: 'Registrar',
  registered: 'Pacote registrado.',
  noOptions:
    'Para registrar, cadastre seus pacotes com o número de sessões em Mais > Perfil do negócio.',
  openProfile: 'Abrir perfil do negócio',
  failed: 'Não conseguimos salvar. Tente de novo.',
} as const;
