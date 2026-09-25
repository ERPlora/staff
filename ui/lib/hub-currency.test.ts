// staff#64 (recipe of inventory#101) — the hub currency's scale, read from the shell SDK (JPY 0, EUR 2, KWD 3).
import { afterEach, describe, expect, it } from 'vitest';
import { hubDecimals, majorToMinor, minorToInput, minorToMajor, moneyStep } from './hub-currency.js';

function withScale(d: unknown): void {
  (globalThis as Record<string, unknown>).erplora = { currencyDecimals: d };
}
afterEach(() => {
  delete (globalThis as Record<string, unknown>).erplora;
});

describe('hubDecimals', () => {
  it.each([0, 2, 3])('returns the scale the SDK publishes (%s)', (d) => {
    withScale(d);
    expect(hubDecimals()).toBe(d);
  });

  it('without an SDK the hub is a two-decimal hub', () => {
    expect(hubDecimals()).toBe(2);
  });

  it.each([undefined, -1, 2.5, '0', Number.NaN, null])('an invalid scale (%s) falls back to 2', (bad) => {
    withScale(bad);
    expect(hubDecimals()).toBe(2);
  });
});

describe('minorToMajor / majorToMinor', () => {
  it.each([
    { d: 0, minor: 480, major: 480 },
    { d: 2, minor: 220, major: 2.2 },
    { d: 3, minor: 1234, major: 1.234 },
  ])('round-trips with the hub scale ($d decimals)', ({ d, minor, major }) => {
    withScale(d);
    expect(minorToMajor(minor)).toBe(major);
    expect(majorToMinor(major)).toBe(minor);
  });

  it('rounds the typed amount to the minor unit instead of storing a fraction of a cent', () => {
    withScale(2);
    expect(majorToMinor(1.005 + 0.001)).toBe(101);
    expect(Number.isInteger(majorToMinor(0.1 + 0.2))).toBe(true);
  });
});

describe('minorToInput / moneyStep (the edit field)', () => {
  it.each([
    { d: 0, minor: 480, text: '480', step: '1' },
    { d: 2, minor: 220, text: '2.20', step: '0.01' },
    { d: 3, minor: 1234, text: '1.234', step: '0.001' },
  ])('fills the field and steps by the smallest unit ($d decimals)', ({ d, minor, text, step }) => {
    withScale(d);
    expect(minorToInput(minor)).toBe(text);
    expect(moneyStep()).toBe(step);
  });

  it('an absent amount is an empty field, not «0» (no price is not the same as free)', () => {
    withScale(2);
    expect(minorToInput(undefined)).toBe('');
    expect(minorToInput(null)).toBe('');
  });
});
