/* eslint-disable sonarjs/no-hardcoded-ip -- the test is about these addresses */
import { describe, expect, it } from 'vitest';
import { pageText } from './page-text.ts';
import { checkedUrl, FetchError, guardedLookup, isBlockedAddress } from './safe-fetch.ts';
import { priceWritten, suggestionOf } from './suggestion.ts';

// Spec 09 prefill: SSRF guard, page text, and the cleaning that keeps the model from being the
// source of a price. Fictitious data; no network beyond "localhost" resolution.

describe('SSRF guard', () => {
  it('blocks loopback, private, link-local, CGNAT and mapped addresses', () => {
    for (const address of [
      '127.0.0.1',
      '10.1.2.3',
      '172.20.0.1',
      '192.168.0.10',
      '169.254.169.254',
      '100.64.0.1',
      '0.0.0.0',
      '::1',
      'fd00::1',
      'fe80::1',
      '::ffff:127.0.0.1',
    ])
      expect(isBlockedAddress(address), address).toBe(true);
    expect(isBlockedAddress('93.184.215.14')).toBe(false);
    expect(isBlockedAddress('2606:4700::1111')).toBe(false);
  });

  it('accepts only http(s) without credentials and refuses literal private IPs', () => {
    expect(checkedUrl('https://exemplo.com.br/').hostname).toBe('exemplo.com.br');
    for (const url of [
      'data:text/html,oi',
      'file:///etc/passwd',
      'https://user:pw@exemplo.com.br',
      'not a url',
    ])
      expect(() => checkedUrl(url), url).toThrow(FetchError.badUrl);
    for (const url of ['http://127.0.0.1:3100/api', 'http://[::1]/', 'http://169.254.169.254/'])
      expect(() => checkedUrl(url), url).toThrow(FetchError.blocked);
  });

  it('refuses at connect time a name that resolves to loopback', async () => {
    const error = await new Promise<Error | null>((resolve) => {
      guardedLookup('localhost', {}, (failure) => {
        resolve(failure);
      });
    });
    expect(error?.message).toBe(FetchError.blocked);
  });
});

describe('page text', () => {
  it('keeps title, description, JSON-LD and body text; drops scripts and styles', () => {
    const html = `<html><head><title>Clínica Exemplo</title>
      <meta name="description" content="Quiropraxia no centro">
      <script type="application/ld+json">{"@type":"LocalBusiness","telephone":"(11) 3000-0000"}</script>
      <script>alert('x')</script><style>p{color:red}</style></head>
      <body><p>Rua Fictícia, 10 &amp; sala 2</p></body></html>`;
    const text = pageText(html);
    expect(text).toContain('Clínica Exemplo');
    expect(text).toContain('Quiropraxia no centro');
    expect(text).toContain('"telephone":"(11) 3000-0000"');
    expect(text).toContain('Rua Fictícia, 10 & sala 2');
    expect(text).not.toContain('alert');
    expect(text).not.toContain('color:red');
  });
});

describe('suggestion', () => {
  const source = 'Primeira consulta R$ 250,00. Pacote de 10 sessões: R$ 1.800. Retorno 250,50';
  it('keeps a price only when that value is written in the page', () => {
    expect(priceWritten(source, 25_000)).toBe(true);
    expect(priceWritten(source, 180_000)).toBe(true);
    expect(priceWritten(source, 25_050)).toBe(true);
    expect(priceWritten(source, 18_000)).toBe(false);
    expect(priceWritten('R$ 250,50', 25_000)).toBe(false);
  });

  it('cleans the extraction: invented price out, broken hours out, bad site out', () => {
    const suggestion = suggestionOf(
      {
        name: ' Clínica Exemplo ',
        description: '',
        phone: null,
        address: 'Rua Fictícia, 10',
        website: 'javascript:alert(1)',
        social: null,
        hours: [{ weekday: 2, start: '09:00', end: '08:00' }],
        services: [
          { name: 'Primeira consulta', durationMinutes: 60, priceCents: 25_000 },
          { name: 'Inventado', durationMinutes: 9999, priceCents: 9_900 },
          { name: '  ', durationMinutes: null, priceCents: null },
        ],
        packages: [
          { name: '10 sessões', priceCents: 180_000 },
          { name: 'Inventado', priceCents: 99_000 },
        ],
      },
      source,
    );
    expect(suggestion).toEqual({
      name: 'Clínica Exemplo',
      description: null,
      phone: null,
      address: 'Rua Fictícia, 10',
      website: null,
      social: null,
      hours: [],
      services: [
        { name: 'Primeira consulta', durationMinutes: 60, priceCents: 25_000 },
        { name: 'Inventado', durationMinutes: null, priceCents: null },
      ],
      packages: [{ name: '10 sessões', priceCents: 180_000 }],
    });
  });
});
