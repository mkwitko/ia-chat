import { describe, expect, it } from 'vitest';
import { draftOf, hasContent, servicesToSave } from './prefill-model';

// Spec 09 review screen: a price never comes pre-approved unless the page wrote it, and a
// service without a price is not saved. Fictitious data.

const FOUND = {
  name: 'Clínica Exemplo',
  description: null,
  phone: null,
  address: null,
  website: null,
  social: null,
  hours: [],
  services: [
    { name: 'Primeira consulta', durationMinutes: 60, priceCents: 25_000 },
    { name: 'Retorno', durationMinutes: null, priceCents: null },
  ],
  packages: [{ name: '4 sessões', priceCents: 80_000 }],
};

describe('review draft', () => {
  it('keeps only priced services by default and fills a default duration', () => {
    const draft = draftOf(FOUND);
    expect(draft.services).toEqual([
      { name: 'Primeira consulta', minutes: '60', price: '250', keep: true },
      { name: 'Retorno', minutes: '60', price: '', keep: false },
    ]);
    expect(draft.keepHours).toBe(false);
  });

  it('saves kept services with a valid price only', () => {
    const draft = draftOf(FOUND);
    const services = draft.services.map((service) => ({ ...service, keep: true }));
    expect(servicesToSave(services)).toEqual([
      {
        name: 'Primeira consulta',
        durationMinutes: 60,
        priceCents: 25_000,
        visibleToPatient: true,
      },
    ]);
  });

  it('has nothing to save when every field is empty', () => {
    const empty = draftOf({ ...FOUND, name: null, services: [], packages: [] });
    expect(hasContent(empty)).toBe(false);
    expect(hasContent(draftOf(FOUND))).toBe(true);
  });
});
