// A list that could not load must not read «No …» + «0 records» (pm#533, hub#2328).
//
// The shell's `<ok-data-table>` (OutfitKit ≥ 0.1.113) paints a failed load itself: «could not
// load», the reason and a Retry button. Each staff list (members, roles, time off) hands it its
// controller's `error` and reloads on its `retry` event — and drops its own red banner, which would
// say the same thing twice. But a module paints with the SHELL's OutfitKit (ADR-0451): on a hub
// whose table has no `error` property the banner is the only place the reason is shown, so it stays.
//
// The shell's table is stood in for by a bare element registered BEFORE the screens load (as the
// shell does at boot; the screens' own `define()` then loses, like in the hub). Its `error`
// property is added or removed per test, which is exactly what `dataTableShowsLoadError()` reads.
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

const SCREENS = [
  { tag: 'erp-staff-members', table: 'staff-members-table', banner: 'staff-members-load-error' },
  { tag: 'erp-staff-roles', table: 'staff-roles-table', banner: 'staff-roles-load-error' },
  { tag: 'erp-staff-time-off', table: 'staff-time-off-table', banner: 'staff-time-off-load-error' },
] as const;

const ROW = { id: 'r1', full_name: 'Ana Ruiz', name: 'Ana Ruiz', staff_name: 'Ana Ruiz' };

let hubAnswers = false;
let pageCalls = 0;
let queryCalls: string[] = [];

beforeAll(async () => {
  customElements.define('ok-data-table', ShellTable);
  await import('../components/erp-staff-members/erp-staff-members');
  await import('../components/erp-staff-roles/erp-staff-roles');
  await import('../components/erp-staff-time-off/erp-staff-time-off');
});

beforeEach(() => {
  document.body.innerHTML = '';
  history.replaceState(null, '', '/');
  hubAnswers = false;
  pageCalls = 0;
  queryCalls = [];
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      queryCalls.push(name);
      if (!hubAnswers) throw new Error('The hub is not responding.');
      if (name === 'staff.roles.list') return [{ id: 'role1', name: 'Estilista' }];
      if (name === 'hub.users.list') return [{ id: 'u1', name: 'Ana', is_active: true }];
      if (name === 'staff.members.compensation') return [{ id: 'r1', hourly_rate: 1500 }];
      if (name === 'staff.members.list') return [ROW];
      return [];
    },
    queryOptional: async () => undefined,
    queryPage: async () => {
      pageCalls++;
      if (!hubAnswers) throw new Error('The hub is not responding.');
      return { rows: [ROW], total: 1 };
    },
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
    currency: 'EUR',
    currencyDecimals: 2,
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
  };
});

type Screen = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function mountFailed(tag: string, testid: string): Promise<{ el: Screen; table: HTMLElement }> {
  const el = document.createElement(tag) as Screen;
  document.body.appendChild(el);
  await vi.waitFor(() => {
    if (pageCalls === 0) throw new Error('the list has not asked for its page yet');
  });
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  const table = el.shadowRoot.querySelector<HTMLElement>(`ok-data-table[testid="${testid}"]`);
  expect(table, `${tag} paints its table`).toBeTruthy();
  return { el, table: table! };
}

async function retry(el: Screen, table: HTMLElement): Promise<void> {
  const before = pageCalls;
  hubAnswers = true;
  table.dispatchEvent(new CustomEvent('retry', { detail: {} }));
  await vi.waitFor(() => {
    if (pageCalls === before) throw new Error('Retry did not ask the hub again');
  });
  await vi.waitFor(async () => {
    await el.updateComplete;
    if ((table as unknown as { error: string }).error !== '') throw new Error('the error is still on the table');
  });
}

describe.each(SCREENS)('$tag — a list that could not load (pm#533)', ({ tag, table: testid, banner }) => {
  it('hands the reason to the shell table and paints no second banner', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(tag, testid);
    expect((table as unknown as { error: string }).error).toBe('The hub is not responding.');
    expect(el.shadowRoot.querySelector(`[data-testid="${banner}"]`), 'the reason would be said twice').toBeNull();
  });

  it('Retry on the table asks the hub again and paints the rows that now arrive', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed(tag, testid);
    await retry(el, table);
    expect((table as unknown as { rows: unknown[] }).rows).toEqual([ROW]);
  });

  it('on a shell whose table cannot paint the error, keeps its own banner with the reason', async () => {
    shellTableKnowsErrors(false);
    const { el } = await mountFailed(tag, testid);
    const node = el.shadowRoot.querySelector(`[data-testid="${banner}"]`);
    expect(node, 'an older hub would show the failure nowhere').toBeTruthy();
    expect(node!.textContent).toContain('The hub is not responding.');
  });
});

describe('what Retry asks again besides the list (pm#533)', () => {
  // Read once when the screen opens and silent on failure: after a failed start the «new member»
  // form had no roles or Hub users to pick and the rate column stayed blank even once the hub
  // answered. Retry reads them again with the list.
  it.each(['staff.roles.list', 'hub.users.list', 'staff.members.compensation'])(
    'members: Retry also asks again for %s',
    async (query) => {
      shellTableKnowsErrors(true);
      const { el, table } = await mountFailed('erp-staff-members', 'staff-members-table');
      expect(queryCalls.filter((n) => n === query).length, 'asked with the list').toBe(1);
      await retry(el, table);
      await vi.waitFor(() => {
        if (queryCalls.filter((n) => n === query).length < 2) throw new Error(`${query} was not asked again`);
      });
    },
  );

  it('time off: Retry also asks again for the members the «new absence» form picks from', async () => {
    shellTableKnowsErrors(true);
    const { el, table } = await mountFailed('erp-staff-time-off', 'staff-time-off-table');
    expect(queryCalls.filter((n) => n === 'staff.members.list').length, 'asked with the list').toBe(1);
    await retry(el, table);
    await vi.waitFor(() => {
      if (queryCalls.filter((n) => n === 'staff.members.list').length < 2) throw new Error('the members were not asked again');
    });
  });
});
