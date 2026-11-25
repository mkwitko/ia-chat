import { randomInt } from 'node:crypto';
import { Provider, encryptToken, translateProviderError } from '@app/core';
import { ChannelKind, ChannelStatus, type Tx } from '@app/db';
import { SetupStep, isReady } from './steps.ts';

const PIN_LIMIT = 1_000_000;
const PIN_DIGITS = 6;

/** Two-step verification PIN set when we register the number. Kept encrypted, never shown. */
const newPin = () => String(randomInt(PIN_LIMIT)).padStart(PIN_DIGITS, '0');

export interface SavedSignup {
  tenantId: string;
  tokenKey: string;
  token: string;
  wabaId: string;
  phoneNumberId: string;
  displayPhone: string | undefined;
  coexistence: boolean;
}

/** Creates or refreshes the tenant's channel for this number; steps done on the same WABA stay. */
export async function saveChannel(tx: Tx, input: SavedSignup) {
  const { tenantId, tokenKey, wabaId, phoneNumberId } = input;
  const existing = await tx.channel.findFirst({ where: { phoneNumberId } });
  const data = {
    kind: ChannelKind.cloud_api,
    status: ChannelStatus.pending,
    phoneNumberId,
    wabaId,
    coexistence: input.coexistence,
    displayPhone: input.displayPhone ?? null,
    accessTokenEnc: encryptToken(input.token, tokenKey),
    registerPinEnc: existing?.registerPinEnc ?? encryptToken(newPin(), tokenKey),
    setupDone: existing?.wabaId === wabaId ? existing.setupDone : [],
    setupError: null,
  };
  return existing
    ? tx.channel.update({ where: { id: existing.id }, data })
    : tx.channel.create({ data: { tenantId, ...data } });
}

/** The tenant's number connected by Embedded Signup, the most recent one. */
export function signupChannel(tx: Tx) {
  return tx.channel.findFirst({
    where: { kind: ChannelKind.cloud_api, accessTokenEnc: { not: null } },
    orderBy: { updatedAt: 'desc' },
  });
}

interface ChannelRow {
  status: ChannelStatus;
  displayPhone: string | null;
  coexistence: boolean;
  setupDone: string[];
  setupError: string | null;
}

/** What the panel shows: never the token nor the PIN. */
export function channelView(row: ChannelRow | null) {
  if (!row) return null;
  const error = row.setupError
    ? translateProviderError({ provider: Provider.meta, code: Number(row.setupError) })
    : null;
  return {
    status: row.status,
    displayPhone: row.displayPhone,
    coexistence: row.coexistence,
    ready: isReady(row.setupDone),
    paymentMethod: row.setupDone.includes(SetupStep.paymentMethod),
    error,
  };
}
