// The hub currency's scale (ADR-0123 §7, staff#64 — same recipe as inventory#101). Money crosses the
// module in MINOR units of the HUB currency — cents in EUR, yen in JPY, fils in KWD — so a fixed
// `× 100` / `/ 100` is wrong everywhere but in two-decimal currencies. What a person types is read
// by `@erplora/module-toolkit/money-input` with this scale (pm#521); the screen shows money through
// `formatMoney`.

/** What the shell SDK publishes (JPY 0, KWD 3), else 2. Read at call time: the SDK arrives after
 *  the bundle. */
export function hubDecimals(): number {
  const d = (globalThis as { erplora?: { currencyDecimals?: unknown } }).erplora?.currencyDecimals;
  return typeof d === 'number' && Number.isInteger(d) && d >= 0 ? d : 2;
}
