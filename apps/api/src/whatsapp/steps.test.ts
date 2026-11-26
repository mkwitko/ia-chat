import { CloudApiError, type BusinessClient } from '@app/channels';
import { MessageTemplates } from '@app/core';
import { describe, expect, it } from 'vitest';
import { SetupStep, isReady, runSetup, type StepContext } from './steps.ts';

// E-24: the setup steps after Embedded Signup are idempotent and resume where they stopped.

const PAYMENT_CODE = '131042';

function fakeClient(failSubscribe = false) {
  const calls: string[] = [];
  const client = {
    phoneNumbers: () => Promise.resolve([]),
    subscribeApp: () => {
      calls.push(SetupStep.subscribed);
      if (failSubscribe) return Promise.reject(new CloudApiError(400, PAYMENT_CODE, 'no payment'));
      return Promise.resolve();
    },
    register: (_id: string, pin: string) => {
      calls.push(`register:${pin}`);
      return Promise.resolve();
    },
    requestAppData: () => Promise.resolve(),
    templateKeys: () => Promise.resolve(new Set([`${MessageTemplates.confirmation.name}:pt_BR`])),
    createTemplate: (_waba: string, template: { name: string }) => {
      calls.push(`template:${template.name}`);
      return Promise.resolve();
    },
  } satisfies BusinessClient;
  return { client, calls };
}

const context = (client: BusinessClient, extra: Partial<StepContext> = {}): StepContext => ({
  client,
  wabaId: '111',
  phoneNumberId: '222',
  coexistence: false,
  pin: '123456',
  ...extra,
});

describe('runSetup', () => {
  it('registers with the PIN and creates only the missing template', async () => {
    const { client, calls } = fakeClient();
    const result = await runSetup(context(client), []);
    expect(calls).toEqual([
      SetupStep.subscribed,
      'register:123456',
      `template:${MessageTemplates.reminder.name}`,
    ]);
    expect(result).toEqual({
      done: Object.values(SetupStep),
      error: null,
    });
    expect(isReady(result.done)).toBe(true);
  });

  it('never registers a coexistence number', async () => {
    const { client, calls } = fakeClient();
    const result = await runSetup(context(client, { coexistence: true }), []);
    expect(calls.some((call) => call.startsWith('register'))).toBe(false);
    expect(result.error).toBeNull();
    expect(isReady(result.done)).toBe(true);
  });

  it('stops at the failing step with the Meta code, and skips what was done on retry', async () => {
    const failing = fakeClient(true);
    const first = await runSetup(context(failing.client), []);
    expect(first).toEqual({ done: [], error: PAYMENT_CODE });
    expect(isReady(first.done)).toBe(false);

    const { client, calls } = fakeClient();
    await runSetup(context(client), [SetupStep.subscribed, SetupStep.registered]);
    expect(calls).toEqual([`template:${MessageTemplates.reminder.name}`]);
  });
});
