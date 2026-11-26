import { Feature, MS_PER_MINUTE, manualPixProvider, toLocalIso } from '@app/core';
import { featureEnabled, pendingDepositOf, type DepositHold } from '@app/db';
import type { ToolContext } from './tools.ts';

// H-52 (spec 05, "Sinal via Pix"): when the service asks for a deposit, the feature is on and
// the professional saved a Pix key, the booking holds the slot and the Pix code goes to the
// patient in a message of its own, written by code (the model never copies it).

export const DEPOSIT_WAITING = 'aguardando';
export const DEPOSIT_PAID = 'pago';

const INSTRUCTION =
  'O horário fica reservado até expira_em, esperando o sinal. O código Pix copia e cola vai numa mensagem separada logo depois da sua; não escreva o código. Diga o valor, o prazo e que o profissional confirma o recebimento. Nunca diga que o pagamento foi recebido.';

interface ServiceDeposit {
  depositCents: number | null;
}

/** The hold for this booking, or undefined when no deposit applies. */
export async function depositHold(
  context: ToolContext,
  service: ServiceDeposit,
): Promise<DepositHold | undefined> {
  const { db, tenantId, now } = context;
  if (!service.depositCents) return undefined;
  if (!(await featureEnabled(db, tenantId, Feature.pixDeposit))) return undefined;
  const settings = await db.withTenant(tenantId, (tx) =>
    tx.depositSettings.findUnique({ where: { tenantId } }),
  );
  if (!settings) return undefined;
  const expiresAt = new Date(now.getTime() + settings.holdMinutes * MS_PER_MINUTE);
  return { amountCents: service.depositCents, expiresAt };
}

/** What the tool adds after a held booking; sets the Pix code the turn sends after the answer. */
export async function depositOutput(context: ToolContext, appointmentId: string) {
  const { db, tenantId, timezone } = context;
  const found = await db.withTenant(tenantId, async (tx) => ({
    payment: await pendingDepositOf(tx, appointmentId),
    settings: await tx.depositSettings.findUnique({ where: { tenantId } }),
  }));
  const { payment, settings } = found;
  if (!payment?.expiresAt || !settings) return {};
  const provider = manualPixProvider({
    key: settings.pixKey,
    receiverName: settings.receiverName,
    city: settings.city,
  });
  const charge = await provider.createCharge({
    amountCents: payment.amountCents,
    reference: payment.id,
  });
  context.effects.pixCode = charge.copyPaste;
  return {
    sinal: {
      situacao_sinal: DEPOSIT_WAITING,
      valor_centavos: payment.amountCents,
      expira_em: toLocalIso(payment.expiresAt, timezone),
      ...(settings.refundPolicy ? { devolucao: settings.refundPolicy } : {}),
      instrucao: INSTRUCTION,
    },
  };
}
