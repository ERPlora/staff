// The hub currency's scale (ADR-0123 §7, staff#64 — same recipe as inventory#101). Money crosses the
// module in MINOR units of the HUB currency — cents in EUR, yen in JPY, fils in KWD — so a fixed
// `× 100` / `/ 100` is wrong everywhere but in two-decimal currencies. The arithmetic is the SDK's,
// bound to the hub scale.
import { majorToMinor as sdkMajorToMinor, minorToMajor as sdkMinorToMajor } from '@erplora/module-sdk';

/** What the shell SDK publishes (JPY 0, KWD 3), else 2. Read at call time: the SDK arrives after
 *  the bundle. */
export function hubDecimals(): number {
  const d = (globalThis as { erplora?: { currencyDecimals?: unknown } }).erplora?.currencyDecimals;
  return typeof d === 'number' && Number.isInteger(d) && d >= 0 ? d : 2;
}

/** Minor units → the amount a person reads (480 ¥ → 480, 220 c → 2.2, 1234 fils → 1.234). */
export function minorToMajor(minor: number): number {
  return sdkMinorToMajor(minor, hubDecimals());
}

/** A typed amount → integer minor units, rounded to the hub currency's smallest unit. Garbage → 0. */
export function majorToMinor(major: string | number): number {
  return sdkMajorToMinor(major, hubDecimals());
}

/** Minor units → the text an edit field starts with («480», «2.20», «1.234»). This is the value of a
 *  `type="number"` input, not a display string: the screen shows money through `formatMoney`.
 *  Nothing stored → an empty field (no price is not the same as free). */
export function minorToInput(minor: number | null | undefined): string {
  if (minor == null) return '';
  const d = hubDecimals();
  return sdkMinorToMajor(minor, d).toFixed(d);
}

/** The `step` of a money input: the currency's smallest unit (JPY «1», EUR «0.01», KWD «0.001»). */
export function moneyStep(): string {
  const d = hubDecimals();
  return d === 0 ? '1' : `0.${'0'.repeat(d - 1)}1`;
}
