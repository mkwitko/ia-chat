import type { AddressInfo } from 'node:net';
import type { ErrorEvent } from '@sentry/node';
import { describe, expect, it } from 'vitest';
import { AlertEvent, createAlert, type AlertRecord } from './alert.ts';
import { withLogContext } from './context.ts';
import { createLogger } from './logger.ts';
import { startReadinessServer } from './readiness.ts';
import { scrubEvent } from './sentry.ts';

// Fictitious data only.
const PHONE = '5511912345678';
const PHONE_FORMATTED = '(11) 91234-5678';
const MESSAGE = 'Quero marcar uma consulta para dor nas costas';
const EMAIL = 'paciente.ficticio@example.com';
const TENANT = '0192f3a0-1111-7222-8333-444455556666';

function capture() {
  const lines: string[] = [];
  const stream = {
    write: (line: string) => {
      lines.push(line);
    },
  };
  return { lines, logger: createLogger({ service: 'test' }, stream) };
}

describe('logger', () => {
  it('never writes message content, phones, emails or credentials', () => {
    const { lines, logger } = capture();
    logger.info(
      {
        req: { headers: { cookie: 'session=abc', authorization: 'Bearer xyz' } },
        message: { from: PHONE, text: { body: MESSAGE } },
        phone: PHONE,
        text: MESSAGE,
        body: MESSAGE,
        emailBody: MESSAGE,
        apiToken: 'tok_123',
        note: `ligar para ${PHONE_FORMATTED} ou ${PHONE} ou ${EMAIL}`,
        err: new Error(`failed for ${EMAIL}`),
      },
      'something happened',
    );
    const output = lines.join('');
    for (const leak of [
      PHONE,
      '91234-5678',
      MESSAGE,
      EMAIL,
      'session=abc',
      'Bearer xyz',
      'tok_123',
    ]) {
      expect(output).not.toContain(leak);
    }
    expect(output).toContain('something happened');
  });

  it('keeps ids and puts service and the job context on every line', () => {
    const { lines, logger } = capture();
    withLogContext({ jobId: 'job-1', tenantId: TENANT }, () => {
      logger.info({ conversationId: TENANT, turnId: 'turn-1' }, 'in a job');
    });
    const line = JSON.parse(lines.join('')) as Record<string, unknown>;
    expect(line).toMatchObject({
      service: 'test',
      jobId: 'job-1',
      tenantId: TENANT,
      conversationId: TENANT,
      turnId: 'turn-1',
    });
  });
});

describe('Sentry scrubber', () => {
  it('drops request body, headers, cookies, user and contact data but keeps tags', () => {
    const event: ErrorEvent = {
      type: undefined,
      message: `falhou para ${PHONE} / ${EMAIL}`,
      tags: { tenantId: TENANT },
      user: { id: 'u1', email: EMAIL, ip_address: '{{auto}}' },
      request: {
        method: 'POST',
        url: `https://api.example.com/webhooks?token=secret&phone=${PHONE}`,
        data: { text: { body: MESSAGE } },
        headers: { cookie: 'session=abc' },
        cookies: { session: 'abc' },
      },
      extra: { phone: PHONE, text: MESSAGE, turnId: 'turn-1' },
      breadcrumbs: [{ message: `msg ${MESSAGE}`, data: { body: MESSAGE, status: 200 } }],
    };
    const clean = scrubEvent(event);
    const output = JSON.stringify(clean);
    for (const leak of [PHONE, EMAIL, MESSAGE, 'session=abc', 'token=secret', '{{auto}}']) {
      expect(output).not.toContain(leak);
    }
    expect(clean.breadcrumbs).toEqual([{}]);
    expect(clean.tags).toEqual({ tenantId: TENANT });
    expect(clean.request).toEqual({ method: 'POST', url: 'https://api.example.com/webhooks' });
    expect(clean.extra).toMatchObject({ turnId: 'turn-1' });
  });
});

describe('alert', () => {
  it('logs, records only ids and a code, and drops extra fields', async () => {
    const logged: object[] = [];
    const recorded: AlertRecord[] = [];
    const alert = createAlert({
      log: { error: (fields) => logged.push(fields), warn: () => undefined },
      record: (row) => {
        recorded.push(row);
        return Promise.resolve();
      },
    });
    const leaky = { tenantId: TENANT, code: '131047', text: MESSAGE, phone: PHONE };
    alert(AlertEvent.deliveryFailure, leaky);
    await Promise.resolve();
    expect(recorded).toEqual([{ event: 'delivery_failure', tenantId: TENANT, code: '131047' }]);
    expect(JSON.stringify(logged)).not.toContain(MESSAGE);
  });
});

describe('readiness server', () => {
  it('answers 200 while the check passes and 503 when it fails', async () => {
    let healthy = true;
    const server = await startReadinessServer(0, {
      database: () => (healthy ? Promise.resolve() : Promise.reject(new Error('secret detail'))),
    });
    const { port } = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${String(port)}/ready`;
    expect((await fetch(url)).status).toBe(200);
    healthy = false;
    const down = await fetch(url);
    expect(down.status).toBe(503);
    expect(await down.json()).toEqual({ ready: false, checks: { database: 'fail' } });
    server.close();
  });
});
