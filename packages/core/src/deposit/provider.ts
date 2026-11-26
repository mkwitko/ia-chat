import { MINUTES_PER_DAY } from '../agenda/zoned.ts';
import { pixCopyPaste } from './brcode.ts';

// Spec 05, "Sinal via Pix": every deposit provider sits behind this interface, like the WhatsApp
// channel. Now: the professional's own Pix key with manual confirmation (H-52). Later: Mercado
// Pago by OAuth, which adds status reads and webhooks to this interface.

export interface DepositRequest {
  amountCents: number;
  /** Our payment id: the reference the payer sees. */
  reference: string;
}

export interface DepositCharge {
  copyPaste: string;
  /** False: only the professional's tap marks it paid (A-17: a receipt image proves nothing). */
  confirmsAutomatically: boolean;
}

export interface DepositProvider {
  createCharge(request: DepositRequest): Promise<DepositCharge>;
}

export interface PixReceiver {
  key: string;
  receiverName: string;
  city: string;
}

const NOT_TXID = /[^A-Za-z0-9]/g;

export function manualPixProvider(receiver: PixReceiver): DepositProvider {
  return {
    createCharge: ({ amountCents, reference }) =>
      Promise.resolve({
        copyPaste: pixCopyPaste({
          ...receiver,
          amountCents,
          txid: reference.replace(NOT_TXID, ''),
        }),
        confirmsAutomatically: false,
      }),
  };
}

/** Spec 05: the slot is held this long by default while the deposit is not confirmed. */
export const DEFAULT_HOLD_MINUTES = 30;
export const MIN_HOLD_MINUTES = 10;
export const MAX_HOLD_MINUTES = MINUTES_PER_DAY;
