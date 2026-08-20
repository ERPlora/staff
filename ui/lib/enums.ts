// The module's enums and dates, as the USER reads them (staff#37).
//
// A column used to print the raw value (`active`, `vacation`, `pending`) while the `<ion-select>`
// right next to it printed «Activo» for the very same field: two sources for one enum, and the
// table had the untranslated one. So the catalogue of every closed domain of this module lives
// HERE, and both the cell and the picker read from it — there is nowhere else to drift to.
//
// The keys are the module's public values (its schemas and its SQL); the labels are i18n keys
// resolved at RENDER time through `erplora.t()` (ADR-0055), never at module load: when this file is
// imported the shell has not published the client yet, and the user can change language later.
import esLocale from '../../locales/es.json';
import enLocale from '../../locales/en.json';

const CATALOG: Record<string, unknown> = { es: esLocale, en: enLocale };

interface Translator {
  locale: string;
  t(catalog: Record<string, unknown>, key: string, params?: Record<string, unknown>): string;
}

function erplora(): Translator {
  const c = (globalThis as { erplora?: Translator }).erplora;
  if (!c) throw new Error('erplora SDK no inicializado por el shell');
  return c;
}

/** `staff_member.status` — the lifecycle of a person. `terminated` is only reached by Terminate. */
export const MEMBER_STATUS_KEY: Record<string, string> = {
  active: 'ui.status_active',
  inactive: 'ui.status_inactive',
  on_leave: 'ui.status_on_leave',
  terminated: 'ui.status_terminated',
};

/** `staff_time_off.leave_type` — the enum of `schemas/time_off_create.json`. */
export const LEAVE_TYPE_KEY: Record<string, string> = {
  vacation: 'ui.leaveVacation',
  sick: 'ui.leaveSick',
  personal: 'ui.leavePersonal',
  training: 'ui.leaveTraining',
  other: 'ui.leaveOther',
};

/** `staff_time_off.status` — where the row is born (`pending`) plus the state machine of
 *  `staff.time_off.set_status`. */
export const REQUEST_STATUS_KEY: Record<string, string> = {
  pending: 'ui.statusPending',
  approved: 'ui.statusApproved',
  rejected: 'ui.statusRejected',
  cancelled: 'ui.statusCancelled',
};

/**
 * The label of `value` in the active language.
 *
 * A value the catalogue does not know is printed AS IS: a hub running a module version newer than
 * its catalogue must still show the row, not a blank cell — the operative screen says who is off
 * and when, and a missing translation is not a reason to hide it.
 */
export function enumLabel(keys: Record<string, string>, value: unknown): string {
  const raw = value == null ? '' : String(value);
  const key = keys[raw];
  return key ? erplora().t(CATALOG, key) : raw;
}

/** The options of a closed domain, for an `<ion-select>` or a column filter — the same labels the
 *  cell prints, by construction. */
export function enumOptions(keys: Record<string, string>): { value: string; label: string }[] {
  return Object.keys(keys).map((value) => ({ value, label: enumLabel(keys, value) }));
}

/**
 * An ISO date (`YYYY-MM-DD`, or the date half of a timestamp) in the hub's locale: `10/09/2026` in
 * `es-ES`, not `2026-09-10`. Formatted in **UTC** on purpose — these are calendar days, not
 * instants, and formatting them in the browser's zone moves a day off by one west of Greenwich.
 */
export function formatDate(value: unknown): string {
  const raw = value == null ? '' : String(value);
  const iso = raw.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return raw;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat(erplora().locale || 'es', {
      day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC',
    }).format(d);
  } catch {
    return iso; // an unknown locale is not a reason to lose the date
  }
}
