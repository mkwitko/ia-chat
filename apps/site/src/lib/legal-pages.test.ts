import { describe, expect, it } from 'vitest';
import { legalHref, LEGAL_PAGES } from './legal-pages.ts';

describe('legalHref', () => {
  it('maps docs/legal file links to site paths', () => {
    expect(legalHref('politica-de-privacidade.md')).toBe('/privacidade');
    expect(legalHref('aviso-privacidade-paciente.md')).toBe('/aviso-ao-paciente');
  });
  it('keeps other links', () => {
    expect(legalHref('https://example.com/a.md')).toBe('https://example.com/a.md');
    expect(legalHref('/precos')).toBe('/precos');
  });
  it('has unique slugs', () => {
    expect(new Set(LEGAL_PAGES.map((p) => p.slug)).size).toBe(LEGAL_PAGES.length);
  });
});
