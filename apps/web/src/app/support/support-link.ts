import { SupportCopy as Copy } from './support-copy';

const WHATSAPP_BASE = 'https://wa.me/';
const MAILTO = 'mailto:';

export interface SupportContext {
  tenant: string;
  plan: string;
  status: string;
  /** Path of the panel screen the owner was on. Never patient data. */
  page: string;
}

/** The prefilled message: account context only, so the support person knows where to look. */
export function supportMessage({ tenant, plan, status, page }: SupportContext): string {
  const { field } = Copy;
  return [
    Copy.messageIntro,
    `${field.account}: ${tenant}`,
    `${field.plan}: ${plan}`,
    `${field.status}: ${status}`,
    `${field.page}: ${page}`,
    '',
    Copy.messageHint,
  ].join('\n');
}

export function whatsappLink(number: string, context: SupportContext): string {
  const url = new URL(`${WHATSAPP_BASE}${number}`);
  url.searchParams.set('text', supportMessage(context));
  return url.toString();
}

/** `URLSearchParams` would encode spaces as "+", which mail clients show literally. */
export function emailLink(address: string, context: SupportContext): string {
  const subject = encodeURIComponent(Copy.emailSubject);
  const body = encodeURIComponent(supportMessage(context));
  return `${MAILTO}${address}?subject=${subject}&body=${body}`;
}
