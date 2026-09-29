// staff#86 — the working hours of Staff follow the HUB's language, not the browser's.
//
// With the hub in Spanish, the weekly schedule of an employee (start, end, break) and the hours of
// a part-day absence read «09:00 AM» / «06:00 PM» on an English browser. Those fields were native
// `<input type="time">`: Chromium paints that control with the BROWSER's (operating system's)
// clock and ignores the hub language — the finding schedules#50 and appointments#214 closed. The
// fix is the same one: the module paints the time itself, in the hub clock (24 h in Spanish), as a
// text field read back by `parseWallTime` (it understands «14:30», «1430», «9» or «2:30 pm»), and
// what is stored and sent is always 'HH:MM'. The list of templates reads that very clock.
import { beforeEach, describe, expect, it } from 'vitest';

const MEMBERS = [{ id: 'm1', full_name: 'Ana Ruiz', status: 'active' }];

const SCHEDULES = [
  { id: 'h1', staff_id: 'm1', name: 'Regular', is_default: 1, effective_from: null, effective_until: null, is_active: 1 },
  { id: 'h2', staff_id: 'm1', name: 'Summer', is_default: 0, effective_from: null, effective_until: null, is_active: 1 },
];

const HOURS = [
  { id: 'w1', schedule_id: 'h1', day_of_week: 0, start_time: '09:00:00', end_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00', is_working: 1 },
  { id: 'w2', schedule_id: 'h2', day_of_week: 0, start_time: '08:00:00', end_time: '15:00:00', break_start: null, break_end: null, is_working: 1 },
];

const commands: { name: string; payload: Record<string, unknown> }[] = [];

function install(locale: 'es' | 'en') {
  commands.length = 0;
  document.body.innerHTML = '';
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.members.list') return MEMBERS;
      if (name === 'staff.schedules.list_for_member') return SCHEDULES;
      if (name === 'staff.schedules.hours_for_member') return HOURS;
      return [];
    },
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      commands.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale,
    hasPermission: () => true,
    // Keys, not prose (ADR-0055): the assertions below read the error CODE.
    t: (_catalog: unknown, key: string) => key,
  };
}

type Day = { day: number; working: boolean; start: string; end: string; breakStart: string; breakEnd: string };
type SchedulesWc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  columns: { key: string; format?: (r: Record<string, unknown>) => string }[];
  week: Day[];
  newName: string;
  formError: string;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void> | void;
  createSchedule: (ev: Event) => Promise<void>;
};
type TimeOffWc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  draft: Record<string, unknown>;
  formError: string;
  createTimeOff: (ev: Event) => Promise<void>;
};

async function mount<T extends HTMLElement & { updateComplete: Promise<unknown> }>(tag: string): Promise<T> {
  if (tag === 'erp-staff-schedules') await import('./erp-staff-schedules/erp-staff-schedules');
  else await import('./erp-staff-time-off/erp-staff-time-off');
  const el = document.createElement(tag) as T;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

type Field = HTMLElement & { value?: string };
const field = (el: HTMLElement, testid: string) => el.shadowRoot!.querySelector(`[data-testid="${testid}"]`) as Field | null;

/** Blank spaces normalized: `Intl` separates «AM/PM» with a narrow no-break space. */
const plain = (s: string) => s.replace(/\s/g, ' ');
const shown = (el: HTMLElement, testid: string) => plain(String(field(el, testid)?.value ?? ''));

/** What the browser hands over while she types: `ion-input` re-emits it as `ionInput`. */
async function type(el: HTMLElement & { updateComplete: Promise<unknown> }, testid: string, value: string) {
  const input = field(el, testid);
  expect(input, `${testid} must be rendered`).toBeTruthy();
  input!.value = value;
  input!.dispatchEvent(new CustomEvent('ionInput', { detail: { value }, bubbles: true, composed: true }));
  await el.updateComplete;
}

/** Leaving the field (blur / Enter): `ion-input` emits `ionChange`. */
async function leave(el: HTMLElement & { updateComplete: Promise<unknown> }, testid: string) {
  const input = field(el, testid)!;
  input.dispatchEvent(new CustomEvent('ionChange', { detail: { value: input.value }, bubbles: true, composed: true }));
  await el.updateComplete;
}

/** A paste event carrying `text` (happy-dom has no DataTransfer-backed ClipboardEvent). */
async function paste(el: HTMLElement & { updateComplete: Promise<unknown> }, testid: string, text: string) {
  const input = field(el, testid)!;
  const ev = new Event('paste', { bubbles: true, composed: true, cancelable: true }) as Event & { clipboardData: unknown };
  ev.clipboardData = { getData: () => text };
  input.dispatchEvent(ev);
  await el.updateComplete;
  return ev;
}

async function editTemplate(el: SchedulesWc, id: string) {
  const row = SCHEDULES.find((s) => s.id === id)!;
  await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row } }));
  await el.updateComplete;
}

const EXPECTED = {
  es: { nine: '09:00', six: '18:00', one: '13:00', eight: '08:00', afternoon: '14:30', nineThirty: '09:30', summary: '09:00-18:00 (13:00-14:00)' },
  en: { nine: '09:00 AM', six: '06:00 PM', one: '01:00 PM', eight: '08:00 AM', afternoon: '02:30 PM', nineThirty: '09:30 AM', summary: '09:00 AM-06:00 PM (01:00 PM-02:00 PM)' },
} as const;

const SCHEDULE_TIME_FIELDS = ['staff-schedules-day-start-0', 'staff-schedules-day-end-0', 'staff-schedules-day-break-start-0', 'staff-schedules-day-break-end-0'];
const TIME_OFF_FIELDS = ['staff-time-off-start-time', 'staff-time-off-end-time'];

for (const locale of ['es', 'en'] as const) {
  const want = EXPECTED[locale];

  describe(`staff#86 — the weekly schedule in the hub clock (${locale})`, () => {
    beforeEach(() => install(locale));

    it('the list of templates reads the hub clock', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      const col = el.columns.find((c) => c.key === 'hours')!;
      expect(plain(col.format!(SCHEDULES[0]))).toBe(`ui.dayMonday ${want.summary}`);
    });

    it('editing a template paints start, end and break in the hub clock', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      expect(shown(el, 'staff-schedules-day-start-0')).toBe(want.nine);
      expect(shown(el, 'staff-schedules-day-end-0')).toBe(want.six);
      expect(shown(el, 'staff-schedules-day-break-start-0')).toBe(want.one);
    });

    it('typing «1430» on the numeric keypad stores 14:30 and, on leaving, repaints it in the hub clock', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      await type(el, 'staff-schedules-day-end-0', '1430');
      expect(el.week[0].end).toBe('14:30');
      expect(shown(el, 'staff-schedules-day-end-0'), 'what she is typing stays on screen').toBe('1430');
      await leave(el, 'staff-schedules-day-end-0');
      expect(shown(el, 'staff-schedules-day-end-0')).toBe(want.afternoon);
    });

    it('the save sends HH:MM whatever the spelling typed', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      await type(el, 'staff-schedules-day-start-0', '9:30');
      await type(el, 'staff-schedules-day-end-0', '2:30 pm');
      await el.createSchedule(new Event('submit'));
      const cmd = commands.find((c) => c.name === 'staff.schedules.update' || c.name === 'staff.schedules.create');
      expect(cmd, 'the week must be saved').toBeTruthy();
      const monday = (cmd!.payload.working_hours as Record<string, unknown>[]).find((h) => h.day_of_week === 0)!;
      expect(monday.start_time).toBe('09:30');
      expect(monday.end_time).toBe('14:30');
      expect(monday.break_start).toBe('13:00');
    });

    it('a half-typed end («14:») never keeps the last valid hour: the save is refused, saying why', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      await type(el, 'staff-schedules-day-end-0', '14:');
      expect(el.week[0].end).toBe('');
      await leave(el, 'staff-schedules-day-end-0');
      expect(shown(el, 'staff-schedules-day-end-0'), 'the unreadable text stays so the refusal points at it').toBe('14:');
      await el.createSchedule(new Event('submit'));
      expect(el.formError).toBe('ui.valTimeUnreadable');
      expect(commands.filter((c) => c.name.startsWith('staff.schedules.'))).toHaveLength(0);
    });

    it('an unreadable break is refused, never silently saved as «no break»', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      await type(el, 'staff-schedules-day-break-start-0', '13:');
      await type(el, 'staff-schedules-day-break-end-0', '');
      await el.createSchedule(new Event('submit'));
      expect(el.formError).toBe('ui.valTimeUnreadable');
      expect(commands.filter((c) => c.name.startsWith('staff.schedules.'))).toHaveLength(0);
    });

    it('a time pasted as «2:30 pm» is stored as 14:30 and painted in the hub clock at once', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      const ev = await paste(el, 'staff-schedules-day-end-0', '2:30 pm');
      expect(ev.defaultPrevented).toBe(true);
      expect(el.week[0].end).toBe('14:30');
      expect(shown(el, 'staff-schedules-day-end-0')).toBe(want.afternoon);
    });

    it('pasting text that is not a time is left to the browser (not swallowed)', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      const ev = await paste(el, 'staff-schedules-day-end-0', 'lunch');
      expect(ev.defaultPrevented).toBe(false);
      expect(el.week[0].end).toBe('18:00');
    });

    it('an emptied start is still «enter a start and end time»', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      await type(el, 'staff-schedules-day-start-0', '');
      await el.createSchedule(new Event('submit'));
      expect(el.formError).toBe('ui.valNeedStartEnd');
      expect(commands.filter((c) => c.name.startsWith('staff.schedules.'))).toHaveLength(0);
    });

    it('a half-typed text never leaks onto another template loaded into the form', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      await type(el, 'staff-schedules-day-start-0', '7');
      await editTemplate(el, 'h2');
      expect(shown(el, 'staff-schedules-day-start-0')).toBe(want.eight);
    });

    it('after a save the next template starts with the default hours (no stale text)', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      await type(el, 'staff-schedules-day-start-0', '930');
      await el.createSchedule(new Event('submit'));
      await el.updateComplete;
      expect(el.formError).toBe('');
      expect(shown(el, 'staff-schedules-day-start-0')).toBe(want.nine);
    });

    it('the time fields are numeric text in md mode, never a native type=time', async () => {
      const el = await mount<SchedulesWc>('erp-staff-schedules');
      await editTemplate(el, 'h1');
      expect(el.shadowRoot.querySelector('ion-input[type="time"]'), 'a native time field paints the browser clock').toBeNull();
      for (const id of SCHEDULE_TIME_FIELDS) {
        const f = field(el, id)!;
        expect(f.getAttribute('type'), id).toBe('text');
        expect(f.getAttribute('inputmode'), `${id}: the phone must open the numeric keypad`).toBe('numeric');
        expect(f.getAttribute('mode'), `${id}: fill=outline only paints in md`).toBe('md');
        expect(f.getAttribute('placeholder'), id).toBe('ui.timePlaceholder');
      }
    });
  });

  describe(`staff#86 — the hours of a part-day absence in the hub clock (${locale})`, () => {
    beforeEach(() => install(locale));

    async function partDay(): Promise<TimeOffWc> {
      const el = await mount<TimeOffWc>('erp-staff-time-off');
      el.draft = { ...el.draft, staff_id: 'm1', start_date: '2026-10-05', end_date: '2026-10-05', is_full_day: false };
      await el.updateComplete;
      return el;
    }

    it('typed hours are stored as HH:MM and repainted in the hub clock', async () => {
      const el = await partDay();
      await type(el, 'staff-time-off-start-time', '930');
      await type(el, 'staff-time-off-end-time', '2:30 pm');
      expect(el.draft.start_time).toBe('09:30');
      expect(el.draft.end_time).toBe('14:30');
      await leave(el, 'staff-time-off-start-time');
      await leave(el, 'staff-time-off-end-time');
      expect(shown(el, 'staff-time-off-start-time')).toBe(want.nineThirty);
      expect(shown(el, 'staff-time-off-end-time')).toBe(want.afternoon);
    });

    it('the save sends HH:MM', async () => {
      const el = await partDay();
      await type(el, 'staff-time-off-start-time', '930');
      await type(el, 'staff-time-off-end-time', '1430');
      await el.createTimeOff(new Event('submit'));
      const cmd = commands.find((c) => c.name === 'staff.time_off.create');
      expect(cmd, 'the absence must be saved').toBeTruthy();
      expect(cmd!.payload.start_time).toBe('09:30');
      expect(cmd!.payload.end_time).toBe('14:30');
    });

    it('a half-typed hour is refused, never sent', async () => {
      const el = await partDay();
      await type(el, 'staff-time-off-start-time', '930');
      await type(el, 'staff-time-off-end-time', '14:');
      await el.createTimeOff(new Event('submit'));
      expect(el.formError).toBe('ui.valTimeOffHours');
      expect(commands).toHaveLength(0);
    });

    it('a pasted «2:30 pm» is stored and painted in the hub clock at once', async () => {
      const el = await partDay();
      const ev = await paste(el, 'staff-time-off-end-time', '2:30 pm');
      expect(ev.defaultPrevented).toBe(true);
      expect(el.draft.end_time).toBe('14:30');
      expect(shown(el, 'staff-time-off-end-time')).toBe(want.afternoon);
    });

    it('after a save the next absence starts with empty hours (no stale text)', async () => {
      const el = await partDay();
      await type(el, 'staff-time-off-start-time', '930');
      await type(el, 'staff-time-off-end-time', '1430');
      await el.createTimeOff(new Event('submit'));
      await el.updateComplete;
      el.draft = { ...el.draft, is_full_day: false };
      await el.updateComplete;
      expect(shown(el, 'staff-time-off-start-time')).toBe('');
      expect(shown(el, 'staff-time-off-end-time')).toBe('');
    });

    it('the time fields are numeric text in md mode, never a native type=time', async () => {
      const el = await partDay();
      expect(el.shadowRoot.querySelector('ion-input[type="time"]'), 'a native time field paints the browser clock').toBeNull();
      for (const id of TIME_OFF_FIELDS) {
        const f = field(el, id)!;
        expect(f, id).toBeTruthy();
        expect(f.getAttribute('type'), id).toBe('text');
        expect(f.getAttribute('inputmode'), `${id}: the phone must open the numeric keypad`).toBe('numeric');
        expect(f.getAttribute('mode'), `${id}: fill=outline only paints in md`).toBe('md');
        expect(f.getAttribute('placeholder'), id).toBe('ui.timePlaceholder');
      }
    });
  });
}

describe('staff#86 — the placeholder of a time field exists in both languages', () => {
  it('en and es carry ui.timePlaceholder and ui.valTimeUnreadable', async () => {
    const en = (await import('../../locales/en.json')).default as { ui: Record<string, string> };
    const es = (await import('../../locales/es.json')).default as { ui: Record<string, string> };
    for (const key of ['timePlaceholder', 'valTimeUnreadable']) {
      expect(en.ui[key], `en ui.${key}`).toBeTruthy();
      expect(es.ui[key], `es ui.${key}`).toBeTruthy();
    }
  });
});
