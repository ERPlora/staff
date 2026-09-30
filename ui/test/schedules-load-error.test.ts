// Schedules that could not load must not read «0 records» with no way to retry (staff#93).
//
// The schedules tab does not page through `createListController` (it lists the schedules of ONE
// member), so pm#533 left it out: a failed load went to the page's own red banner — the same one row
// actions use — and the table below said «0 records» with no Retry. Now, like members, roles and
// time off (staff#92), the reason goes to the shell's `<ok-data-table>` (`.error`, OutfitKit ≥
// 0.1.113) and its `retry` reads the members and the schedules again. The page banner keeps only
// what an ACTION was refused; on a hub whose table cannot paint the error, a load banner of its own
// says the reason instead.
//
// The shell's table is stood in for by a bare element registered BEFORE the screen loads (as the
// shell does at boot). Its `error` property is added or removed per test, which is exactly what
// `dataTableShowsLoadError()` reads.
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

class ShellTable extends HTMLElement {}
const errors = new WeakMap<HTMLElement, unknown>();

function shellTableKnowsErrors(yes: boolean) {
  if (yes) {
    Object.defineProperty(ShellTable.prototype, 'error', {
      configurable: true,
      get(this: HTMLElement) { return errors.get(this) ?? ''; },
      set(this: HTMLElement, v: unknown) { errors.set(this, v); },
    });
  } else {
    delete (ShellTable.prototype as { error?: unknown }).error;
  }
}

const REASON = 'The hub is not responding.';
const REFUSED = 'The hub refused the change.';
const MEMBER = { id: 'm1', full_name: 'Ana Ruiz' };
const SCHEDULE = { id: 's1', staff_id: 'm1', name: 'Morning shift', is_default: 1, is_active: 1, effective_from: null, effective_until: null };

let failing = new Set<string>();
let queryCalls: string[] = [];
let commandCalls: string[] = [];
let refuseCommands = false;

beforeAll(async () => {
  customElements.define('ok-data-table', ShellTable);
  await import('../components/erp-staff-schedules/erp-staff-schedules');
});

beforeEach(() => {
  document.body.innerHTML = '';
  failing = new Set();
  queryCalls = [];
  commandCalls = [];
  refuseCommands = false;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      queryCalls.push(name);
      if (failing.has(name)) throw new Error(REASON);
      if (name === 'staff.members.list') return [MEMBER];
      if (name === 'staff.schedules.list_for_member') return [SCHEDULE];
      return [];
    },
    queryOptional: async () => undefined,
    command: async (name: string) => {
      commandCalls.push(name);
      if (refuseCommands) throw new Error(REFUSED);
      return {};
    },
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    currencyDecimals: 2,
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

type Screen = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  onRowAction(ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>): Promise<void>;
};

async function settle(el: Screen): Promise<void> {
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

/** Mounts the tab and waits until it asked the hub for `lastQuery` (and the answer landed). */
async function mount(lastQuery: string): Promise<{ el: Screen; table: HTMLElement }> {
  const el = document.createElement('erp-staff-schedules') as Screen;
  document.body.appendChild(el);
  await vi.waitFor(() => {
    if (!queryCalls.includes(lastQuery)) throw new Error(`the tab has not asked for ${lastQuery} yet`);
  });
  await settle(el);
  const table = el.shadowRoot.querySelector<HTMLElement>('ok-data-table[testid="staff-schedules-table"]');
  expect(table, 'the tab paints its table').toBeTruthy();
  return { el, table: table! };
}

const tableError = (table: HTMLElement): string => (table as unknown as { error: string }).error;
const tableRows = (table: HTMLElement): unknown[] => (table as unknown as { rows: unknown[] }).rows;
const timesSaid = (el: Screen, text: string): number => el.shadowRoot.textContent!.split(text).length - 1;

async function retry(el: Screen, table: HTMLElement): Promise<void> {
  const before = queryCalls.length;
  failing.clear();
  table.dispatchEvent(new CustomEvent('retry', { detail: {} }));
  await vi.waitFor(() => {
    if (queryCalls.length === before) throw new Error('Retry did not ask the hub again');
  });
  await vi.waitFor(async () => {
    await settle(el);
    if (tableError(table) !== '') throw new Error('the error is still on the table');
  });
}

describe('erp-staff-schedules — schedules that could not load (staff#93)', () => {
  it('members that cannot load: the table says why, no page banner and no «add members» hint', async () => {
    shellTableKnowsErrors(true);
    failing.add('staff.members.list');
    const { el, table } = await mount('staff.members.list');
    expect(tableError(table)).toBe(REASON);
    expect(el.shadowRoot.querySelector('[data-testid="staff-schedules-page-error"]'), 'the reason would be said twice').toBeNull();
    expect(el.shadowRoot.querySelector('[data-testid="staff-schedules-load-error"]'), 'the reason would be said twice').toBeNull();
    // Any notice counts, not only the one with this testid (rv-schedules-61).
    expect(timesSaid(el, REASON), 'another notice repeats the reason').toBe(0);
    // «Add members first» is false: they exist, they just did not arrive.
    expect(el.shadowRoot.querySelector('[data-testid="staff-schedules-no-members"]'), 'claims there are no members').toBeNull();
  });

  it('schedules that cannot load: the table says why and paints no second notice', async () => {
    shellTableKnowsErrors(true);
    failing.add('staff.schedules.list_for_member');
    const { el, table } = await mount('staff.schedules.list_for_member');
    expect(tableError(table)).toBe(REASON);
    expect(tableRows(table)).toEqual([]);
    expect(el.shadowRoot.querySelector('[data-testid="staff-schedules-page-error"]'), 'the reason would be said twice').toBeNull();
    expect(timesSaid(el, REASON), 'another notice repeats the reason').toBe(0);
  });

  it('the week of hours that cannot load is a failed load too', async () => {
    shellTableKnowsErrors(true);
    failing.add('staff.schedules.hours_for_member');
    const { table } = await mount('staff.schedules.hours_for_member');
    expect(tableError(table)).toBe(REASON);
  });

  it('Retry reads the members and the schedules again, paints the rows and sends no command', async () => {
    shellTableKnowsErrors(true);
    failing.add('staff.members.list');
    const { el, table } = await mount('staff.members.list');
    queryCalls = [];
    await retry(el, table);
    await vi.waitFor(() => {
      if (!tableRows(table).length) throw new Error('the schedules did not arrive');
    });
    expect(queryCalls).toEqual(expect.arrayContaining(['staff.members.list', 'staff.schedules.list_for_member', 'staff.schedules.hours_for_member']));
    expect(tableRows(table)).toEqual([SCHEDULE]);
    const select = el.shadowRoot.querySelector('[data-testid="staff-schedules-member"]') as HTMLElement & { value: string };
    expect(select.value, 'the member the schedules belong to is picked').toBe('m1');
    // Retry only reads: it must never repeat a write the person did not ask for (rv-schedules-61).
    expect(commandCalls, 'Retry sent a command').toEqual([]);
  });

  it('Retry after a schedules failure asks for that member again, not only the members', async () => {
    shellTableKnowsErrors(true);
    failing.add('staff.schedules.list_for_member');
    const { el, table } = await mount('staff.schedules.list_for_member');
    queryCalls = [];
    await retry(el, table);
    expect(queryCalls).toContain('staff.schedules.list_for_member');
    expect(tableRows(table)).toEqual([SCHEDULE]);
  });

  it('a refused row action stays in the page banner, and Retry does not erase it', async () => {
    shellTableKnowsErrors(true);
    failing.add('staff.schedules.list_for_member');
    const { el, table } = await mount('staff.schedules.list_for_member');
    refuseCommands = true;
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'toggle', row: SCHEDULE } }));
    await settle(el);
    const banner = () => el.shadowRoot.querySelector('[data-testid="staff-schedules-page-error"]');
    expect(banner()?.textContent, 'the refusal is on the page').toContain(REFUSED);
    const sent = [...commandCalls];
    await retry(el, table);
    expect(banner()?.textContent, 'Retry erased what the action answered').toContain(REFUSED);
    expect(commandCalls, 'Retry sent a command').toEqual(sent);
  });

  it('picking another member whose schedules load clears the failed load', async () => {
    shellTableKnowsErrors(true);
    failing.add('staff.schedules.list_for_member');
    const { el, table } = await mount('staff.schedules.list_for_member');
    failing.clear();
    const select = el.shadowRoot.querySelector('[data-testid="staff-schedules-member"]') as HTMLElement;
    select.dispatchEvent(new CustomEvent('ionChange', { detail: { value: 'm1' } }));
    await vi.waitFor(async () => {
      await settle(el);
      if (tableError(table) !== '') throw new Error('the old failure is still on the table');
    });
    expect(tableRows(table)).toEqual([SCHEDULE]);
  });

  it('on a shell whose table cannot paint the error, keeps its own banner with the reason', async () => {
    shellTableKnowsErrors(false);
    failing.add('staff.members.list');
    const { el } = await mount('staff.members.list');
    const node = el.shadowRoot.querySelector('[data-testid="staff-schedules-load-error"]');
    expect(node, 'an older hub would show the failure nowhere').toBeTruthy();
    expect(node!.textContent).toContain(REASON);
    // On the PAGE, said once: a notice inside the closed «new» panel is invisible (rv-appointments-227).
    expect(node!.closest('[slot="create"]'), 'the notice sits in the «new» panel').toBeNull();
    expect(timesSaid(el, REASON), 'the reason is said once').toBe(1);
  });
});
