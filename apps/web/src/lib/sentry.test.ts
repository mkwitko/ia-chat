import type { ErrorEvent } from '@sentry/react';
import { describe, expect, it } from 'vitest';
import { scrubWebEvent } from './sentry';

describe('web Sentry scrubber', () => {
  it('removes user, request data, breadcrumb text, phones and emails; keeps tags', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: 'falhou para 5511912345678',
      tags: { tenantId: '0192f3a0-1111-7222-8333-444455556666' },
      user: { id: 'u1', email: 'paciente.ficticio@example.com' },
      extra: { text: 'dor nas costas' },
      request: {
        url: 'https://app.example.com/inbox?token=abc',
        data: { body: 'dor nas costas' },
        headers: { cookie: 'session=abc' },
      },
      exception: {
        values: [{ type: 'Error', value: 'sem resposta de paciente.ficticio@example.com' }],
      },
      breadcrumbs: [{ category: 'console', message: 'dor nas costas', data: { text: 'x' } }],
    };
    const clean = scrubWebEvent(event);
    const output = JSON.stringify(clean);
    for (const leak of [
      '5511912345678',
      'ficticio@',
      'dor nas costas',
      'session=abc',
      'token=abc',
    ]) {
      expect(output).not.toContain(leak);
    }
    expect(clean.tags).toEqual(event.tags);
  });
});
