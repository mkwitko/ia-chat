import { describe, expect, it } from 'vitest';
import { businessProfileSchema, parseBusinessProfile, PaymentMethod } from './business-profile.ts';

// M-04: the business profile the owner fills and the assistant reads. Fictitious data only.

describe('business profile', () => {
  it('reads an empty column as an empty profile', () => {
    expect(parseBusinessProfile({})).toEqual({ paymentMethods: [], packages: [] });
    expect(parseBusinessProfile(null)).toEqual({ paymentMethods: [], packages: [] });
  });

  it('keeps packages with whole-cent prices', () => {
    const profile = parseBusinessProfile({
      paymentMethods: [PaymentMethod.pix],
      packages: [{ name: '4 sessões', priceCents: 80_000 }],
    });
    expect(profile.packages).toEqual([{ name: '4 sessões', priceCents: 80_000 }]);
  });

  it('refuses a fractional price, an unknown payment method and a non-http site', () => {
    const base = { paymentMethods: [], packages: [] };
    expect(
      businessProfileSchema.safeParse({ ...base, packages: [{ name: 'x', priceCents: 1.5 }] })
        .success,
    ).toBe(false);
    expect(businessProfileSchema.safeParse({ ...base, paymentMethods: ['cheque'] }).success).toBe(
      false,
    );
    expect(
      businessProfileSchema.safeParse({ ...base, website: 'javascript:alert(1)' }).success,
    ).toBe(false);
  });

  it('falls back to empty when a stored value is broken, instead of failing the agent', () => {
    expect(parseBusinessProfile({ packages: 'oops' })).toEqual({
      paymentMethods: [],
      packages: [],
    });
  });
});
