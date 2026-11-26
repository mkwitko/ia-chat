import { describe, expect, it } from 'vitest';
import { StatusKind, topStatus, type StatusInputs } from './status-model';

const action = { label: 'Abrir', to: '/x' };
const base: StatusInputs = {
  problems: [],
  setup: null,
  trialDaysLeft: null,
  trialAction: action,
  tip: null,
};

describe('topStatus', () => {
  it('is calm when nothing is pending', () => {
    expect(topStatus(base).kind).toBe(StatusKind.ok);
  });

  it('puts a problem above an unfinished setup', () => {
    const status = topStatus({
      ...base,
      problems: [{ title: 'WhatsApp desconectado', action }],
      setup: { title: 'Horários', done: 1, total: 6, action },
    });
    expect(status.kind).toBe(StatusKind.problem);
  });

  it('shows the setup step before the trial and tips', () => {
    const status = topStatus({
      ...base,
      setup: { title: 'Horários', done: 1, total: 6, action },
      trialDaysLeft: 1,
      tip: { title: 'Tom de voz', action },
    });
    expect(status.kind).toBe(StatusKind.setup);
  });

  it('warns about the trial only in its last days', () => {
    expect(topStatus({ ...base, trialDaysLeft: 10 }).kind).toBe(StatusKind.ok);
    expect(topStatus({ ...base, trialDaysLeft: 3 }).kind).toBe(StatusKind.trialEnding);
  });

  it('offers a tip when everything else is settled', () => {
    expect(topStatus({ ...base, tip: { title: 'Tom de voz', action } }).kind).toBe(StatusKind.tip);
  });
});
