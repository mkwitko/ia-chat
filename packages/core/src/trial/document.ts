// RF-81: one trial per CPF or CNPJ. Digits only; check digits validated.

const CPF_LENGTH = 11;
const CNPJ_LENGTH = 14;
// Weights of the second CNPJ check digit; the first one drops the leading 6.
const CNPJ_WEIGHTS = Array.from('6543298765432', Number);
const MOD = 11;
const MIN_REST = 2;
const CHECK_DIGITS = 2;

export const normalizeDocument = (raw: string): string => raw.replaceAll(/\D/g, '');

function checkDigit(digits: number[], weights: number[]): number {
  const sum = digits.reduce((acc, digit, i) => acc + digit * (weights[i] ?? 0), 0);
  const rest = sum % MOD;
  return rest < MIN_REST ? 0 : MOD - rest;
}

type WeightsOf = (count: number) => number[];

const cpfWeights: WeightsOf = (count) => Array.from({ length: count }, (_, i) => count + 1 - i);
const cnpjWeights: WeightsOf = (count) => CNPJ_WEIGHTS.slice(CNPJ_WEIGHTS.length - count);

function validCheckDigits(digits: number[], weightsOf: WeightsOf): boolean {
  const base = digits.slice(0, -CHECK_DIGITS);
  const first = checkDigit(base, weightsOf(base.length));
  const second = checkDigit([...base, first], weightsOf(base.length + 1));
  return digits.at(base.length) === first && digits.at(base.length + 1) === second;
}

/** True for a CPF or CNPJ with correct check digits (all-equal digits rejected). */
export function isValidDocument(raw: string): boolean {
  const value = normalizeDocument(raw);
  if (value.length !== CPF_LENGTH && value.length !== CNPJ_LENGTH) return false;
  if (new Set(value).size === 1) return false;
  const digits = Array.from(value, Number);
  return validCheckDigits(digits, value.length === CPF_LENGTH ? cpfWeights : cnpjWeights);
}
