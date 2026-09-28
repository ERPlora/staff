// staff#64 (recipe of inventory#101) — the hub currency's scale, read from the shell SDK (JPY 0, EUR 2, KWD 3).
import { afterEach, describe, expect, it } from 'vitest';
import { hubDecimals } from './hub-currency.js';

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
