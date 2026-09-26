// staff#70 — closing the member panel while it loads cancels the load.
//
// «Edit» opens the panel with what the row carries and then awaits the FULL record
// (staff.members.get) and the member's services. If the person closes the panel meanwhile — the X,
// the backdrop or Escape — the late reply must not fill the closed form, paint an error nor reopen
// the panel: closing is «I am done with this member». ok-data-table ≥0.1.97 emits `panelClose`
// (outfitkit#195) on every open→closed transition; the screen retires the pending load on it.
// Every close below goes through the REAL table (its shadow DOM), never a handler called by hand.
import { beforeEach, describe, expect, it } from 'vitest';

const ROW_A = {
  id: 'm1', first_name: 'Lucía', last_name: 'Márquez', full_name: 'Lucía Márquez',
  email: 'lucia@example.com', phone: '600999888', role_id: 'r1', role_name: 'Peluquera',
  user_id: null, status: 'active', is_bookable: 1,
};
const detail = { ...ROW_A, employee_id: 'E-1', hire_date: '2026-01-15', color: '', bio: 'Colorista', specialties: '', booking_buffer: 10 };

type Query = (name: string, params?: Record<string, unknown>) => Promise<unknown>;
let query: Query;

beforeEach(() => {
  query = async (name) => (name === 'staff.members.get' ? [detail] : []);
  (globalThis as Record<string, unknown>).erplora = {
    query: (name: string, params?: Record<string, unknown>) => query(name, params),
    queryOptional: async () => [],
    queryPage: async () => ({ rows: [ROW_A], total: 1 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    hasPermission: () => true,
    t: (_c: unknown, key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})` : key,
  };
});

type Table = HTMLElement & { panel: string; shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };
type Mounted = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  formError: string;
  servicesError: string;
  memberServices: unknown[];
  form: { first_name: string; employee_id: string; bio: string; booking_buffer: string };
};

async function mount(): Promise<Mounted> {
  history.replaceState(null, '', '/');
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members') as Mounted;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  return el;
}

const tick = () => new Promise((r) => setTimeout(r, 0));
const settle = async (el: Mounted) => {
  await tick();
  await el.updateComplete;
  await tick();
  await el.updateComplete;
};
const table = (el: Mounted) => el.shadowRoot.querySelector('ok-data-table') as Table;
const row = (el: Mounted) => table(el).shadowRoot.querySelector('.grow-data.clickable') as HTMLElement;

function hold(): { wait: Promise<void>; release: () => void } {
  let release: () => void = () => {};
  const wait = new Promise<void>((r) => (release = r));
  return { wait, release };
}

const CLOSES: Array<[string, (t: Table) => void]> = [
  ['the X button', (t) => (t.shadowRoot.querySelector('.drawer .dh ion-button') as HTMLElement).click()],
  ['the backdrop', (t) => (t.shadowRoot.querySelector('.tk-scrim') as HTMLElement).click()],
  ['Escape', (t) => t.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true, cancelable: true }))],
];

/** Taps the REAL row, waits until the read is in flight with the panel open, closes it the given way. */
async function openThenClose(el: Mounted, close: (t: Table) => void): Promise<void> {
  expect(row(el), 'the table paints a clickable row').toBeTruthy();
  row(el).click();
  await tick();
  await table(el).updateComplete;
  expect(table(el).panel, 'positive control: the tap opened the edit panel').toBe('edit');
  close(table(el));
  await table(el).updateComplete;
  expect(table(el).panel, 'the close really closed the panel').toBe('none');
}

describe('closing the member panel while it loads cancels the load (staff#70)', () => {
  it.each(CLOSES)('closed with %s: the late record does not fill the form nor reopen the panel', async (_how, close) => {
    const el = await mount();
    const gate = hold();
    let reads = 0;
    query = async (name) => {
      if (name !== 'staff.members.get') return [];
      reads++;
      await gate.wait;
      return [detail];
    };
    await openThenClose(el, close);
    expect(reads, 'the read was in flight when the panel closed').toBe(1);
    gate.release();
    await settle(el);
    expect(el.form.employee_id, 'the closed form must not be filled by a read nobody waits for').toBe('');
    expect(el.form.bio).toBe('');
    expect(el.form.booking_buffer).toBe('');
    expect(table(el).panel, 'the panel stays closed').toBe('none');
  });

  it.each(CLOSES)('closed with %s: a late FAILURE of the record paints no error', async (_how, close) => {
    const el = await mount();
    const gate = hold();
    query = async (name) => {
      if (name !== 'staff.members.get') return [];
      await gate.wait;
      throw new Error('network');
    };
    await openThenClose(el, close);
    gate.release();
    await settle(el);
    expect(el.formError, 'the error belongs to an edit the person already closed').toBe('');
  });

  it('closed with the X: a late reply of the member services neither lands nor paints an error', async () => {
    const el = await mount();
    const gate = hold();
    let fail = false;
    query = async (name) => {
      if (name === 'staff.members.get') return [detail];
      if (name === 'staff.services.list_for_member') {
        await gate.wait;
        if (fail) throw new Error('network');
        return [{ id: 's1', staff_id: 'm1', service_id: 'x', service_name: 'Corte' }];
      }
      return [];
    };
    await openThenClose(el, CLOSES[0][1]);
    fail = true;
    gate.release();
    await settle(el);
    expect(el.servicesError, 'the services error belongs to an edit the person already closed').toBe('');
  });

  it('positive control: with the panel left OPEN the same slow read does fill the form', async () => {
    const el = await mount();
    const gate = hold();
    query = async (name) => {
      if (name !== 'staff.members.get') return [];
      await gate.wait;
      return [detail];
    };
    row(el).click();
    await tick();
    gate.release();
    await settle(el);
    expect(el.form.employee_id).toBe('E-1');
    expect(table(el).panel).toBe('edit');
  });
});
