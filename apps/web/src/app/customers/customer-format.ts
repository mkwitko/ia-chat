import { locale } from '@/i18n/locale';
import { CustomersCopy } from './customers-copy';
import type { CustomerSummary } from './customers-types';

const LOCALE = locale;
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

// "+5511900000000" → "+55 11 90000-0000"; other numbers stay as they came.
const BR_MOBILE = /^\+55(\d{2})(\d{4,5})(\d{4})$/;

/** A Brazilian number the way people write it; anything else unchanged. */
export function formatPhone(e164: string): string {
  const match = BR_MOBILE.exec(e164);
  if (!match) return e164;
  const [, area = '', first = '', last = ''] = match;
  return `+55 ${area} ${first}-${last}`;
}
