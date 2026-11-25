import { CloudApiError, templateKey, type BusinessClient } from '@app/channels';
import { SIGNUP_TEMPLATES, TEMPLATE_EXAMPLE } from '@app/core';

// E-24, spec 03 "Onboarding do canal": what we do at Meta after Embedded Signup. Each step is
// idempotent and recorded in `channels.setup_done`, so a retry resumes where it stopped.

export const SetupStep = {
  subscribed: 'subscribed',
  registered: 'registered',
  templates: 'templates',
  paymentMethod: 'payment_method',
} as const;
export type SetupStep = (typeof SetupStep)[keyof typeof SetupStep];

const UNKNOWN_ERROR = 'unknown';

export interface StepContext {
  client: BusinessClient;
  wabaId: string;
  phoneNumberId: string;
  coexistence: boolean;
  pin: string;
}

/** True when the step is done; false when it is left for later without an error. */
const RUN: Record<SetupStep, (ctx: StepContext) => Promise<boolean>> = {
  [SetupStep.subscribed]: async ({ client, wabaId }) => {
    await client.subscribeApp(wabaId);
    return true;
  },
  // Meta: a coexistence number is already registered by the Business app; skip the call.
  [SetupStep.registered]: async ({ client, coexistence, phoneNumberId, pin }) => {
    if (!coexistence) await client.register(phoneNumberId, pin);
    return true;
  },
  [SetupStep.templates]: async ({ client, wabaId }) => {
    const existing = await client.templateKeys(wabaId);
    for (const template of SIGNUP_TEMPLATES) {
      if (existing.has(templateKey(template.name, template.language))) continue;
      await client.createTemplate(wabaId, { ...template, example: TEMPLATE_EXAMPLE });
    }
    return true;
  },
  // H-05: the client pays Meta with their own card; we only check one is there. Advisory: the
  // field read is not verified against Meta yet, so a "no" or a failed read never blocks the
  // assistant; the panel keeps asking for the card and every retry checks again.
  [SetupStep.paymentMethod]: ({ client, wabaId }) =>
    client.hasPaymentMethod(wabaId).catch(() => false),
};

export interface SetupResult {
  done: SetupStep[];
  /** Meta error code of the step that failed; null when every step ran. */
  error: string | null;
}

export async function runSetup(ctx: StepContext, already: readonly string[]): Promise<SetupResult> {
  const done = Object.values(SetupStep).filter((step) => already.includes(step));
  for (const step of Object.values(SetupStep)) {
    if (done.includes(step)) continue;
    try {
      if (await RUN[step](ctx)) done.push(step);
    } catch (error) {
      return { done, error: errorCodeOf(error) };
    }
  }
  return { done, error: null };
}

const REQUIRED = Object.values(SetupStep).filter((step) => step !== SetupStep.paymentMethod);

/** Spec 03 step 3: live once every step but the (advisory) card check is done. */
export const isReady = (done: readonly string[]) => REQUIRED.every((step) => done.includes(step));

export function errorCodeOf(error: unknown): string {
  return error instanceof CloudApiError && error.code ? error.code : UNKNOWN_ERROR;
}
