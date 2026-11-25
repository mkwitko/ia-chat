import { CustomersCopy } from './customers-copy';
import type { CustomerSummary } from './customers-types';

const LOCALE = 'pt-BR';
const DAY = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: '2-digit' });
const DAY_TIME = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export const customerName = (customer: Pick<CustomerSummary, 'name' | 'phone'>) =>
  customer.name ?? customer.phone ?? CustomersCopy.noName;

/** "24/11" */
export const dayLabel = (iso: string) => DAY.format(new Date(iso));

/** "24/11, 15:00" (the API sends no timezone for customers: the device's zone is used). */
export const dayTimeLabel = (iso: string) => DAY_TIME.format(new Date(iso));
