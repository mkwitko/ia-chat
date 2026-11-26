import { isValidDocument, normalizeDocument } from '../trial/document.ts';

// Pix "copia e cola" (spec 05, "Sinal via Pix", manual key; H-52): the static EMV BR Code of the
// Banco Central built from the professional's own key. The money goes straight to their account.
// Each field is ID (2 digits) + length (2 digits) + value; the code ends with CRC-16/CCITT-FALSE.

const Id = {
  format: '00',
  account: '26',
  gui: '00',
  key: '01',
  category: '52',
  currency: '53',
  amount: '54',
  country: '58',
  name: '59',
  city: '60',
  extra: '62',
  txid: '05',
  crc: '63',
} as const;

const FORMAT = '01';
const GUI = 'br.gov.bcb.pix';
const NO_CATEGORY = '0000';
const BRL = '986';
const BRAZIL = 'BR';
const NO_TXID = '***';
const CRC_LENGTH = '04';
const MAX_NAME = 25;
const MAX_CITY = 15;
const MAX_TXID = 25;
const LENGTH_DIGITS = 2;
const CENTS_PER_REAL = 100;
const DECIMALS = 2;

const CRC_INIT = 0xff_ff;
const CRC_POLY = 0x10_21;
const CRC_TOP_BIT = 0x80_00;
const CRC_MASK = 0xff_ff;
const BYTE_SHIFT = 8;
const BITS = 8;
const HEX = 16;
const CRC_HEX_DIGITS = 4;

/** CRC-16/CCITT-FALSE of the text (ASCII), as 4 uppercase hex digits. */
export function crc16(text: string): string {
  let crc = CRC_INIT;
  for (const char of text) {
    crc ^= (char.codePointAt(0) ?? 0) << BYTE_SHIFT;
    for (let bit = 0; bit < BITS; bit += 1)
      crc = crc & CRC_TOP_BIT ? ((crc << 1) ^ CRC_POLY) & CRC_MASK : (crc << 1) & CRC_MASK;
  }
  return crc.toString(HEX).toUpperCase().padStart(CRC_HEX_DIGITS, '0');
}

const field = (id: string, value: string) =>
  `${id}${String(value.length).padStart(LENGTH_DIGITS, '0')}${value}`;

const MARKS = /\p{M}/gu;
const UNSAFE = /[^A-Za-z0-9 ]/g;

/** Plain ASCII letters, digits and spaces, cut to the field limit. */
const plain = (text: string, max: number) =>
  text.normalize('NFD').replace(MARKS, '').replace(UNSAFE, '').trim().slice(0, max);

const reais = (cents: number) => (cents / CENTS_PER_REAL).toFixed(DECIMALS);

export interface PixCharge {
  /** Already normalized by normalizePixKey. */
  key: string;
  receiverName: string;
  city: string;
  /** Integer cents; absent: the payer types the amount. */
  amountCents?: number;
  /** Reference shown on the payer's statement; letters and digits only. */
  txid?: string;
}

export function pixCopyPaste(charge: PixCharge): string {
  const txid = charge.txid ? plain(charge.txid, MAX_TXID).replaceAll(' ', '') : NO_TXID;
  const payload = [
    field(Id.format, FORMAT),
    field(Id.account, field(Id.gui, GUI) + field(Id.key, charge.key)),
    field(Id.category, NO_CATEGORY),
    field(Id.currency, BRL),
    charge.amountCents === undefined ? '' : field(Id.amount, reais(charge.amountCents)),
    field(Id.country, BRAZIL),
    field(Id.name, plain(charge.receiverName, MAX_NAME)),
    field(Id.city, plain(charge.city, MAX_CITY)),
    field(Id.extra, field(Id.txid, txid || NO_TXID)),
  ].join('');
  const head = `${payload}${Id.crc}${CRC_LENGTH}`;
  return head + crc16(head);
}

export const PixKeyKind = {
  cpf: 'cpf',
  cnpj: 'cnpj',
  phone: 'phone',
  email: 'email',
  random: 'random',
} as const;
export type PixKeyKind = (typeof PixKeyKind)[keyof typeof PixKeyKind];

const CPF_DIGITS = 11;
const PHONE = /^\+55\d{10,11}$/;
const PHONE_NOISE = /[\s()-]/g;
const SPACE = /\s/;
const AT = '@';
const DOT = '.';
const RANDOM = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
const DOCUMENT_CHARS = /^[\d./-]+$/;

/** One "@", something before it and a dot after it, no spaces. */
function isEmail(text: string): boolean {
  const at = text.indexOf(AT);
  return (
    at > 0 &&
    at === text.lastIndexOf(AT) &&
    text.lastIndexOf(DOT) > at + 1 &&
    !text.endsWith(DOT) &&
    !SPACE.test(text)
  );
}

/** What kind of Pix key this is, or null when it is none. */
export function pixKeyKind(raw: string): PixKeyKind | null {
  const text = raw.trim();
  if (RANDOM.test(text)) return PixKeyKind.random;
  if (isEmail(text)) return PixKeyKind.email;
  if (PHONE.test(text.replace(PHONE_NOISE, ''))) return PixKeyKind.phone;
  if (!DOCUMENT_CHARS.test(text) || !isValidDocument(text)) return null;
  return normalizeDocument(text).length === CPF_DIGITS ? PixKeyKind.cpf : PixKeyKind.cnpj;
}

/** The key as the BR Code carries it: digits for CPF/CNPJ, +55... for phones, lowercase e-mail. */
export function normalizePixKey(raw: string): string | null {
  const kind = pixKeyKind(raw);
  const text = raw.trim();
  switch (kind) {
    case null:
      return null;
    case PixKeyKind.cpf:
    case PixKeyKind.cnpj:
      return normalizeDocument(text);
    case PixKeyKind.phone:
      return text.replace(PHONE_NOISE, '');
    case PixKeyKind.email:
    case PixKeyKind.random:
      return text.toLowerCase();
    default: {
      const never: never = kind;
      return never;
    }
  }
}
