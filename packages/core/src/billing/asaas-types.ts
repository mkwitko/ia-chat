import * as z from 'zod';

// Only the fields we read; Asaas adds attributes over time, so unknown ones are ignored.

export const customerSchema = z.object({ id: z.string() });

export const subscriptionSchema = z.object({
  id: z.string(),
  status: z.string().optional(),
  deleted: z.boolean().optional(),
  nextDueDate: z.string().nullish(),
});

export const paymentSchema = z.object({
  id: z.string(),
  customer: z.string(),
  subscription: z.string().nullish(),
  status: z.string(),
  dueDate: z.string(),
  /** In reais, as Asaas sends it. */
  value: z.number(),
  invoiceUrl: z.string().nullish(),
});
export type AsaasPayment = z.infer<typeof paymentSchema>;

export const paymentListSchema = z.object({ data: z.array(paymentSchema) });

/** Payment events carry `payment`; subscription events carry `subscription`. */
export const webhookEventSchema = z.object({
  id: z.string(),
  event: z.string(),
  payment: paymentSchema.optional(),
  subscription: subscriptionSchema.optional(),
});
export type AsaasWebhookEvent = z.infer<typeof webhookEventSchema>;
