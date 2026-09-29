// staff#87 — the dates of Staff follow the HUB's language, not the browser's.
//
// With the hub in Spanish, a schedule's «Effective from/until», an absence's «From/To» and a
// member's hire date were native `<input type="date">`: Chromium paints that control with the
// BROWSER's (operating system's) locale, so on a US-English laptop the 5th of October read
// «10/05/2026» and «03/04/2026» typed as the 3rd of April saved the 4th of March. The fix is the
// one schedules#56 and appointments#214 made: the module paints the date itself in the hub order
// (day/month in Spanish) as a text field read back by `parseCalendarDate`, and what is stored and
// sent is always the ISO date. A text that is not a date stops the save instead of being dropped:
// the «until» of a schedule and the hire date are optional, so a dropped text would save «no date».
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');
const catalog = (locale: string) =>
  (JSON.parse(readFileSync(join(ROOT, `locales/${locale}.json`), 'utf8')) as { ui: Record<string, string> }).ui;

const MEMBERS = [{ id: 'm1', full_name: 'Ana Ruiz', status: 'active' }];

const SCHEDULES = [
  { id: 'h1', staff_id: 'm1', name: 'Regular', is_default: 1, effective_from: '2026-10-05', effective_until: '2026-12-24', is_active: 1 },
  { id: 'h2', staff_id: 'm1', name: 'Summer', is_default: 0, effective_from: '2026-06-01', effective_until: null, is_active: 1 },
];

const HOURS = [
  { id: 'w1', schedule_id: 'h1', day_of_week: 0, start_time: '09:00:00', end_time: '18:00:00', break_start: null, break_end: null, is_working: 1 },
  { id: 'w2', schedule_id: 'h2', day_of_week: 0, start_time: '08:00:00', end_time: '15:00:00', break_start: null, break_end: null, is_working: 1 },
];

const MEMBER_ROW = { id: 'm1', first_name: 'Ana', last_name: 'Ruiz', full_name: 'Ana Ruiz', email: '', role_id: null, user_id: null, status: 'active', is_bookable: 1 };

const commands: { name: string; payload: Record<string, unknown> }[] = [];

function install(locale: 'es' | 'en') {
  commands.length = 0;
  document.body.innerHTML = '';
  // Members remembers the open record in `?member=` and reopens it on mount: start each test clean.
  window.history.replaceState({}, '', '/m/staff/');
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.members.list') return MEMBERS;
      if (name === 'staff.schedules.list_for_member') return SCHEDULES;
      if (name === 'staff.schedules.hours_for_member') return HOURS;
      if (name === 'staff.members.get') return [{ ...MEMBER_ROW, employee_id: '', bio: '', specialties: '', booking_buffer: 0, color: '', hire_date: '2026-10-05' }];
      return [];
    },
    queryOptional: async () => undefined,
    queryPage: async () => ({ rows: [MEMBER_ROW], total: 1 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      commands.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale,
    currency: 'EUR',
    currencyDecimals: 2,
    formatMoney: (minor: number) => String(minor),
    hasPermission: () => true,
    // Keys, not prose (ADR-0055): the assertions below read the error CODE.
    t: (_catalog: unknown, key: string) => key,
  };
}

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  formError: string;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void> | void;
};
type SchedulesWc = Wc & { effectiveFrom: string; effectiveUntil: string; createSchedule: (ev: Event) => Promise<void> };
type TimeOffWc = Wc & { draft: Record<string, unknown>; createTimeOff: (ev: Event) => Promise<void> };
type MembersWc = Wc & { form: Record<string, unknown>; createMember: (ev: Event) => Promise<void> };

const settle = async (el: Wc) => {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
};

async function mount<T extends Wc>(tag: string): Promise<T> {
  if (tag === 'erp-staff-schedules') await import('./erp-staff-schedules/erp-staff-schedules');
  else if (tag === 'erp-staff-time-off') await import('./erp-staff-time-off/erp-staff-time-off');
  else await import('./erp-staff-members/erp-staff-members');
  const el = document.createElement(tag) as T;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

type Field = HTMLElement & { value?: string };
const field = (el: Wc, testid: string) => el.shadowRoot.querySelector(`[data-testid="${testid}"]`) as Field | null;
const shown = (el: Wc, testid: string) => String(field(el, testid)?.value ?? '');

/** What the browser hands over while she types: `ion-input` re-emits it as `ionInput`. */
async function type(el: Wc, testid: string, value: string) {
  const input = field(el, testid);
  expect(input, `${testid} must be rendered`).toBeTruthy();
  input!.value = value;
  input!.dispatchEvent(new CustomEvent('ionInput', { detail: { value }, bubbles: true, composed: true }));
  await el.updateComplete;
}

/** Leaving the field (blur / Enter): `ion-input` emits `ionChange`. */
async function leave(el: Wc, testid: string) {
  const input = field(el, testid)!;
  input.dispatchEvent(new CustomEvent('ionChange', { detail: { value: input.value }, bubbles: true, composed: true }));
  await el.updateComplete;
}

async function edit(el: Wc, row: Record<string, unknown>) {
  await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row } }));
  await settle(el);
}

const EXPECTED = {
  es: { october: '05/10/2026', christmas: '24/12/2026', june: '01/06/2026', typed: '03/04/2026', typedIso: '2026-04-03', digits: '03042026', loose: '3/4/2026', placeholder: 'dd/mm/aaaa' },
  en: { october: '10/05/2026', christmas: '12/24/2026', june: '06/01/2026', typed: '03/04/2026', typedIso: '2026-03-04', digits: '03042026', loose: '3/4/2026', placeholder: 'mm/dd/yyyy' },
} as const;

const SCHEDULE_DATES = ['staff-schedules-effective-from', 'staff-schedules-effective-until'];
const TIME_OFF_DATES = ['staff-time-off-start-date', 'staff-time-off-end-date'];
const HIRE_DATE = 'staff-members-hire-date';

describe('staff#87 — the date placeholder names the hub order in each language', () => {
  it('Spanish asks for dd/mm/aaaa, English for mm/dd/yyyy', () => {
    expect(catalog('es').datePlaceholder).toBe(EXPECTED.es.placeholder);
    expect(catalog('en').datePlaceholder).toBe(EXPECTED.en.placeholder);
  });

  it('the refusal of an unreadable date exists in both languages', () => {
    expect(catalog('es').valDateUnreadable).toBeTruthy();
    expect(catalog('en').valDateUnreadable).toBeTruthy();
    expect(catalog('es').valDateUnreadable).not.toBe(catalog('en').valDateUnreadable);
  });
});

for (const locale of ['es', 'en'] as const) {
  const want = EXPECTED[locale];

  describe(`staff#87 — the dates in the hub order (${locale})`, () => {
    beforeEach(() => install(locale));

    it('no date field is a native date input, whose order the browser decides', async () => {
      const checks: [Wc, string][] = [];
      const schedules = await mount<SchedulesWc>('erp-staff-schedules');
      for (const id of SCHEDULE_DATES) checks.push([schedules, id]);
      const timeOff = await mount<TimeOffWc>('erp-staff-time-off');
      for (const id of TIME_OFF_DATES) checks.push([timeOff, id]);
      const members = await mount<MembersWc>('erp-staff-members');
      checks.push([members, HIRE_DATE]);
      for (const [el, testid] of checks) {
        const input = field(el, testid);
        expect(input, `${testid} must be rendered`).toBeTruthy();
        expect(input!.getAttribute('type'), `${testid}: a native date field paints the browser locale`).toBe('text');
        // The phone keypad of a date: digits (a text keypad hides them behind a second layer).
        expect(input!.getAttribute('inputmode'), testid).toBe('numeric');
        // `fill="outline"` only paints its box in md mode (a no-op in ios).
        expect(input!.getAttribute('mode'), testid).toBe('md');
        expect(input!.getAttribute('autocomplete'), testid).toBe('off');
        expect(input!.getAttribute('placeholder'), testid).toBe('ui.datePlaceholder');
      }
    });

    // ── Schedules: «Effective from» / «Effective until» ──────────────────────────────────────

    it('editing a schedule paints its dates in the hub order', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await edit(el, SCHEDULES[0]);
      expect(shown(el, 'staff-schedules-effective-from')).toBe(want.october);
      expect(shown(el, 'staff-schedules-effective-until')).toBe(want.christmas);
    });

    it('a schedule typed in the hub order is saved on those very days', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await type(el, 'staff-schedules-effective-from', want.typed);
      await type(el, 'staff-schedules-effective-until', want.christmas);
      await el.createSchedule(new Event('submit'));
      const cmd = commands.find((c) => c.name === 'staff.schedules.create');
      expect(cmd, 'the schedule must be saved').toBeTruthy();
      expect(cmd!.payload.effective_from).toBe(want.typedIso);
      expect(cmd!.payload.effective_until).toBe('2026-12-24');
    });

    it('digits only (the phone keypad has no slash) are read in the hub order', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await type(el, 'staff-schedules-effective-from', want.digits);
      expect(el.effectiveFrom).toBe(want.typedIso);
    });

    it('a date that stops being valid never keeps the last valid one', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await type(el, 'staff-schedules-effective-until', want.typed);
      expect(el.effectiveUntil).toBe(want.typedIso);
      await type(el, 'staff-schedules-effective-until', `${want.typed}9`);
      expect(el.effectiveUntil).toBe('');
    });

    it('an unreadable «until» is refused, never saved as a schedule with no end', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await type(el, 'staff-schedules-effective-until', '31/02/2026');
      await leave(el, 'staff-schedules-effective-until');
      expect(shown(el, 'staff-schedules-effective-until'), 'the unreadable text stays so the refusal points at it').toBe('31/02/2026');
      await el.createSchedule(new Event('submit'));
      expect(el.formError).toBe('ui.valDateUnreadable');
      expect(commands.filter((c) => c.name.startsWith('staff.schedules.'))).toHaveLength(0);
    });

    it('leaving a date field repaints what she typed in the hub order', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      for (const testid of SCHEDULE_DATES) {
        await type(el, testid, want.loose);
        expect(shown(el, testid), testid).toBe(want.loose);
        await leave(el, testid);
        expect(shown(el, testid), testid).toBe(want.typed);
      }
    });

    it('a half-typed date is not painted over another schedule loaded into the form', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await edit(el, SCHEDULES[0]);
      await type(el, 'staff-schedules-effective-until', '24/1');
      await edit(el, SCHEDULES[1]);
      expect(shown(el, 'staff-schedules-effective-from')).toBe(want.june);
      expect(shown(el, 'staff-schedules-effective-until')).toBe('');
    });

    it('after a save the date fields are empty again, not left with the typed text', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await type(el, 'staff-schedules-effective-from', want.loose);
      await type(el, 'staff-schedules-effective-until', want.loose);
      await el.createSchedule(new Event('submit'));
      expect(commands.some((c) => c.name === 'staff.schedules.create')).toBe(true);
      for (const testid of SCHEDULE_DATES) expect(shown(el, testid), testid).toBe('');
    });

    // ── Absences: «From» / «To» ───────────────────────────────────────────────────────────────

    it('an absence typed in the hub order is saved on those very days', async () => {
      const el = await mount<TimeOffWc>('erp-staff-time-off');
      el.draft = { ...el.draft, staff_id: 'm1' };
      await type(el, 'staff-time-off-start-date', want.typed);
      await type(el, 'staff-time-off-end-date', want.christmas);
      await el.createTimeOff(new Event('submit'));
      const cmd = commands.find((c) => c.name === 'staff.time_off.create');
      expect(cmd, 'the absence must be saved').toBeTruthy();
      expect(cmd!.payload.start_date).toBe(want.typedIso);
      expect(cmd!.payload.end_date).toBe('2026-12-24');
    });

    it('an absence date typed with digits only is read in the hub order', async () => {
      const el = await mount<TimeOffWc>('erp-staff-time-off');
      await type(el, 'staff-time-off-end-date', want.digits);
      expect(el.draft.end_date).toBe(want.typedIso);
    });

    it('an unreadable absence date is refused saying it cannot be read, not that it is missing', async () => {
      const el = await mount<TimeOffWc>('erp-staff-time-off');
      el.draft = { ...el.draft, staff_id: 'm1' };
      await type(el, 'staff-time-off-start-date', want.typed);
      await type(el, 'staff-time-off-end-date', '24/12');
      await leave(el, 'staff-time-off-end-date');
      expect(shown(el, 'staff-time-off-end-date')).toBe('24/12');
      expect(el.draft.end_date).toBe('');
      await el.createTimeOff(new Event('submit'));
      expect(el.formError).toBe('ui.valDateUnreadable');
      expect(commands.filter((c) => c.name === 'staff.time_off.create')).toHaveLength(0);
    });

    it('an absence date that stops being valid never keeps the last valid one', async () => {
      const el = await mount<TimeOffWc>('erp-staff-time-off');
      await type(el, 'staff-time-off-start-date', want.typed);
      expect(el.draft.start_date).toBe(want.typedIso);
      await type(el, 'staff-time-off-start-date', `${want.typed}9`);
      expect(el.draft.start_date).toBe('');
    });

    it('leaving an absence date repaints it in the hub order', async () => {
      const el = await mount<TimeOffWc>('erp-staff-time-off');
      for (const testid of TIME_OFF_DATES) {
        await type(el, testid, want.loose);
        await leave(el, testid);
        expect(shown(el, testid), testid).toBe(want.typed);
      }
    });

    it('after saving an absence the date fields are empty again', async () => {
      const el = await mount<TimeOffWc>('erp-staff-time-off');
      el.draft = { ...el.draft, staff_id: 'm1' };
      await type(el, 'staff-time-off-start-date', want.loose);
      await type(el, 'staff-time-off-end-date', want.loose);
      await el.createTimeOff(new Event('submit'));
      expect(commands.some((c) => c.name === 'staff.time_off.create')).toBe(true);
      for (const testid of TIME_OFF_DATES) expect(shown(el, testid), testid).toBe('');
    });

    // ── Members: hire date ────────────────────────────────────────────────────────────────────

    it('editing a member paints the hire date in the hub order', async () => {
      const el = await mount<MembersWc>('erp-staff-members');
      await edit(el, MEMBER_ROW);
      expect(shown(el, HIRE_DATE)).toBe(want.october);
    });

    it('a hire date typed in the hub order is saved on that very day', async () => {
      const el = await mount<MembersWc>('erp-staff-members');
      await edit(el, MEMBER_ROW);
      await type(el, HIRE_DATE, want.typed);
      await el.createMember(new Event('submit'));
      const cmd = commands.find((c) => c.name === 'staff.members.update');
      expect(cmd, 'the member must be saved').toBeTruthy();
      expect(cmd!.payload.hire_date).toBe(want.typedIso);
    });

    it('an unreadable hire date is refused, never saved as «no hire date»', async () => {
      const el = await mount<MembersWc>('erp-staff-members');
      await edit(el, MEMBER_ROW);
      await type(el, HIRE_DATE, 'mañana');
      await leave(el, HIRE_DATE);
      expect(shown(el, HIRE_DATE)).toBe('mañana');
      await el.createMember(new Event('submit'));
      expect(el.formError).toBe('ui.valDateUnreadable');
      expect(commands.filter((c) => c.name.startsWith('staff.members.'))).toHaveLength(0);
    });

    it('a hire date that stops being valid never keeps the last valid one', async () => {
      const el = await mount<MembersWc>('erp-staff-members');
      await edit(el, MEMBER_ROW);
      expect(el.form.hire_date).toBe('2026-10-05');
      await type(el, HIRE_DATE, '24/1');
      expect(el.form.hire_date).toBe('');
    });

    it('leaving the hire date repaints what she typed in the hub order', async () => {
      const el = await mount<MembersWc>('erp-staff-members');
      await type(el, HIRE_DATE, want.loose);
      expect(shown(el, HIRE_DATE)).toBe(want.loose);
      await leave(el, HIRE_DATE);
      expect(shown(el, HIRE_DATE)).toBe(want.typed);
    });

    it('after adding a member the hire date is empty again, not left with the typed text', async () => {
      const el = await mount<MembersWc>('erp-staff-members');
      await type(el, 'staff-members-first-name', 'Bea');
      await type(el, 'staff-members-last-name', 'Soto');
      await type(el, HIRE_DATE, want.loose);
      await el.createMember(new Event('submit'));
      const cmd = commands.find((c) => c.name === 'staff.members.create');
      expect(cmd, 'the member must be saved').toBeTruthy();
      expect(cmd!.payload.hire_date).toBe(want.typedIso);
      expect(shown(el, HIRE_DATE)).toBe('');
    });

    it('a half-typed hire date is not painted over another member loaded into the form', async () => {
      const el = await mount<MembersWc>('erp-staff-members');
      await edit(el, MEMBER_ROW);
      await type(el, HIRE_DATE, '24/1');
      await edit(el, { ...MEMBER_ROW, id: 'm2' });
      expect(shown(el, HIRE_DATE)).toBe(want.october);
    });
  });
}
