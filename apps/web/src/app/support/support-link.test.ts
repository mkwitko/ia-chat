import { describe, expect, it } from 'vitest';
import { emailLink, supportMessage, whatsappLink } from './support-link';

const context = {
  tenant: 'a1b2c3d4',
  plan: 'essencial',
  status: 'trial',
  page: '/mais/plano-e-uso',
};

describe('support links', () => {
  it('puts the account context in the message', () => {
    const text = supportMessage(context);
    expect(text).toContain('a1b2c3d4');
    expect(text).toContain('essencial');
    expect(text).toContain('/mais/plano-e-uso');
  });

  it('builds a wa.me link with the encoded message', () => {
    const url = new URL(whatsappLink('5511999999999', context));
    expect(url.origin + url.pathname).toBe('https://wa.me/5511999999999');
    expect(url.searchParams.get('text')).toBe(supportMessage(context));
  });

  it('builds a mailto with subject and body', () => {
    const url = new URL(emailLink('ajuda@exemplo.test', context));
    expect(url.protocol).toBe('mailto:');
    expect(url.pathname).toBe('ajuda@exemplo.test');
    expect(url.searchParams.get('body')).toBe(supportMessage(context));
  });
});
