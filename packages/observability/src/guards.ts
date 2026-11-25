// `typeof x === "string"` is the only form TypeScript narrows on; the lint rule against string
// literals in comparisons does not fit here, so the two checks live in this one file.

/* eslint-disable no-restricted-syntax -- typeof narrowing needs the literal */
export const isString = (value: unknown): value is string => typeof value === 'string';
export const isObject = (value: unknown): value is object =>
  typeof value === 'object' && value !== null;
/* eslint-enable no-restricted-syntax */
