import { it, expect } from 'vitest';
import { checkMoneyDisplay } from '@erplora/module-toolkit/money-display-guard';

// GUARD (pm#289, shared since pm#505/pm#508): money on screen is never formatted by hand in this
// module, and OutfitKit comes in by entry point, never as a value from the barrel.
//
// The rules live in `@erplora/module-toolkit/money-display-guard` (one piece for every module,
// tested there against its own positives); this test only says what is specific to Personal:
//
// * witnesses — the two amounts this module paints (the hourly-rate column of the directory and a
//   member's custom service price, both in the members screen) go through the shell's formatter.
//   They count the CALL, not the name: the screen also declares `formatMoney(cents: number, …)` in
//   its `erplora()` interface, and a scan over empty or over-stripped content must not stay green on
//   that declaration (rv-combos-22). The helpers of `lib/` are witnesses too: a shared money helper
//   would land there first, so the scan must provably read them (rv-taxes-78).
// * outfitkitImporters — each of the four screens imports OutfitKit (entry points + types), so the
//   barrel scan provably read all four (rv-pricing-53).
it('money on screen goes through the shared formatter and OutfitKit by entry point (pm#289)', () => {
  expect(
    checkMoneyDisplay({
      from: import.meta.url,
      witnesses: {
        'components/erp-staff-members/erp-staff-members.ts': { text: 'erplora().formatMoney(', atLeast: 2 },
        'lib/hub-currency.ts': 'export function hubDecimals(',
        'lib/enums.ts': 'export function formatDate(',
        'lib/domain-error.ts': 'export function domainMessage(',
      },
      outfitkitImporters: [
        'components/erp-staff-members/erp-staff-members.ts',
        'components/erp-staff-roles/erp-staff-roles.ts',
        'components/erp-staff-schedules/erp-staff-schedules.ts',
        'components/erp-staff-time-off/erp-staff-time-off.ts',
      ],
    }),
  ).toEqual([]);
});
