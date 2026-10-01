// staff#98 — with no staff members at all, the schedules tab says ONE thing.
//
// The tab used to paint the «add staff members first» hint AND, right below it, the schedules
// table with its toolbar («Add» enabled) and its empty message «This member has no schedules yet» —
// about a member that does not exist, contradicting the hint. Market (Square Team, Deputy, Homebase,
// When I Work): an empty scheduler shows a single empty state that says why and offers the way out
// — «Add team member» — instead of an empty grid.
//
// So, once the members are KNOWN to be none: no member selector, no table, one empty state with
// the hint and a button to the staff tab. While the members are still loading nothing claims
// «no schedules», and a members list that failed keeps the table's error + Retry (staff#93).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';

class ShellTable extends HTMLElement {
  emptyMessage = '';
  error: unknown = '';
}

const MEMBER = { id: 'm1', full_name: 'Ana Ruiz' };
const REASON = 'The hub is not responding.';

let members: Array<typeof MEMBER> = [];
let membersGate: Promise<void> = Promise.resolve();
let failMembers = false;

beforeAll(async () => {
  customElements.define('ok-data-table', ShellTable);
  await import('./erp-staff-schedules');
});

beforeEach(() => {
  document.body.innerHTML = '';
  members = [];
  membersGate = Promise.resolve();
  failMembers = false;
  window.history.replaceState({}, '', '/m/staff/schedules');
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.members.list') {
        await membersGate;
        if (failMembers) throw new Error(REASON);
        return members;
      }
      return [];
    },
    queryOptional: async () => undefined,
    command: async () => ({}),
    hasPermission: () => true,
    on: () => () => {},
    locale: 'en',
    t: (_catalog: unknown, key: string) => key,
  };
});

type Screen = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

async function settle(el: Screen): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
  await el.updateComplete;
}

async function mount(): Promise<Screen> {
  const el = document.createElement('erp-staff-schedules') as Screen;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

const $ = (el: Screen, sel: string) => el.shadowRoot.querySelector(sel) as HTMLElement | null;

describe('no staff members: one empty state instead of an empty table', () => {
  it('paints the empty state with the hint and NOT the table nor the member selector', async () => {
    const el = await mount();
    const empty = $(el, '[data-testid="staff-schedules-no-members"]');
    expect(empty, 'no empty state').not.toBeNull();
    expect(empty!.tagName).toBe('OK-EMPTY-STATE');
    expect(empty!.getAttribute('heading')).toBe('ui.noMembersTitle');
    expect(empty!.getAttribute('message')).toBe('ui.hintNoMembers');
    expect($(el, 'ok-data-table'), 'the table (and its «no schedules» message) is still painted').toBeNull();
    expect($(el, '[data-testid="staff-schedules-member"]'), 'an empty member selector is still painted').toBeNull();
  });

  it('offers the way out: a button that opens the staff tab', async () => {
    const el = await mount();
    const go = $(el, '[data-testid="staff-schedules-no-members"] [data-testid="staff-schedules-go-members"]');
    expect(go, 'no «add staff member» button inside the empty state').not.toBeNull();
    expect(go!.getAttribute('slot')).toBe('action');
    expect(go!.textContent?.trim()).toBe('ui.actionAddFirstMember');
    let popped = 0;
    const onPop = () => popped++;
    const depth = window.history.length;
    window.addEventListener('popstate', onPop);
    go!.click();
    window.removeEventListener('popstate', onPop);
    expect(window.location.pathname).toBe('/m/staff/staff');
    expect(popped, 'the shell is not told to route').toBe(1);
    // A new history entry, not a replaced one: Back from the staff tab returns to Schedules.
    expect(window.history.length, 'Back no longer returns to Schedules').toBe(depth + 1);
  });
});

describe('the table keeps its own states when there is someone (or something) to say', () => {
  it('with a member: the table and its selector are there, no empty state', async () => {
    members = [MEMBER];
    const el = await mount();
    expect($(el, '[data-testid="staff-schedules-no-members"]')).toBeNull();
    expect($(el, '[data-testid="staff-schedules-member"]')).not.toBeNull();
    const table = $(el, 'ok-data-table') as ShellTable | null;
    expect(table).not.toBeNull();
    expect(table!.emptyMessage).toBe('ui.emptySchedules');
  });

  it('while the members are still loading nobody says «no schedules» nor «add members»', async () => {
    let release!: () => void;
    membersGate = new Promise<void>((r) => (release = r));
    const el = await mount();
    expect($(el, '[data-testid="staff-schedules-no-members"]'), 'empty state before knowing').toBeNull();
    const table = $(el, 'ok-data-table') as ShellTable | null;
    expect(table).not.toBeNull();
    expect(table!.emptyMessage).toBe('ui.loading');
    release();
    await settle(el);
    expect($(el, '[data-testid="staff-schedules-no-members"]')).not.toBeNull();
  });

  it('members that could not load keep the table error + Retry, not the «add members» state', async () => {
    failMembers = true;
    const el = await mount();
    expect($(el, '[data-testid="staff-schedules-no-members"]')).toBeNull();
    const table = $(el, 'ok-data-table') as ShellTable | null;
    expect(table).not.toBeNull();
    expect(table!.error).toBe(REASON);
  });

  it('coming back to the tab when the members can no longer be read shows the error, not a stale «none»', async () => {
    const el = await mount();
    expect($(el, '[data-testid="staff-schedules-no-members"]')).not.toBeNull();
    el.remove();
    failMembers = true;
    document.body.appendChild(el);
    await settle(el);
    expect($(el, '[data-testid="staff-schedules-no-members"]'), '«no members» said without being able to read them').toBeNull();
    const table = $(el, 'ok-data-table') as ShellTable | null;
    expect(table).not.toBeNull();
    expect(table!.error).toBe(REASON);
  });
});

describe('the new phrases exist in both catalogs', () => {
  const root = resolve(__dirname, '../../../locales');
  const en = JSON.parse(readFileSync(resolve(root, 'en.json'), 'utf8')).ui as Record<string, string>;
  const es = JSON.parse(readFileSync(resolve(root, 'es.json'), 'utf8')).ui as Record<string, string>;
  it.each(['noMembersTitle', 'actionAddFirstMember', 'hintNoMembers'])('%s is translated (en and es, different)', (key) => {
    expect(en[key]?.trim(), `en.ui.${key}`).toBeTruthy();
    expect(es[key]?.trim(), `es.ui.${key}`).toBeTruthy();
    expect(es[key]).not.toBe(en[key]);
  });
});
