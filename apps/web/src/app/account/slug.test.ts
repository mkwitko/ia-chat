import { describe, expect, it } from 'vitest';
import { slugFor } from './slug';

describe('slugFor', () => {
  it('strips accents and symbols and adds a suffix', () => {
    expect(slugFor('Consultório Dr. Rafael', () => 0.5)).toBe('consultorio-dr-rafael-i');
    expect(slugFor('  Fisio & Cia  ', () => 0.123456789)).toMatch(/^fisio-cia-[a-z0-9]+$/);
  });

  it('still works with a name of symbols only', () => {
    expect(slugFor('!!!', () => 0.5)).toBe('i');
  });
});
