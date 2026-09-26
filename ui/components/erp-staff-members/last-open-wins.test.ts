// pm#459 — two «edit» taps in a row: the last opening wins.
//
// «Edit» paints the row at once and then awaits the FULL record (staff.members.get + compensation)
// and, in parallel, the member's services. The data of a late reply was already dropped by id, but
// three things still leaked from an opening the person had already left:
//   - a late FAILURE of the first member's read painted «couldn't load» under the second one;
//   - on a double tap of the SAME row, the stale first reply landed after the fresh one and wiped
//     what the person had typed meanwhile;
//   - a late failure of the first member's services painted its error under the second one.
// And «Add» (the table's REAL button) tapped while an edit was loading must stay a clean ALTA.
import { beforeEach, describe, expect, it } from 'vitest';

const ROW_A = {
  id: 'm1', first_name: 'Lucía', last_name: 'Márquez', full_name: 'Lucía Márquez',
  email: 'lucia@example.com', phone: '600999888', role_id: 'r1', role_name: 'Peluquera',
  user_id: null, status: 'active', is_bookable: 1,
};
const ROW_B = { ...ROW_A, id: 'm2', first_name: 'Pablo', last_name: 'Ruiz', full_name: 'Pablo Ruiz', email: 'pablo@example.com' };
const detail = (row: typeof ROW_A) => ({ ...row, employee_id: 'E-1', hire_date: '2026-01-15', color: '', bio: '', specialties: '', booking_buffer: 0 });

type Query = (name: string, params?: Record<string, unknown>) => Promise<unknown>;
type Sdk = { query: Query; queryOptional: Query };
let sdk: Sdk;

beforeEach(() => {
  sdk = {
    query: async (name: string, params?: Record<string, unknown>) => {
      if (name === 'staff.members.get') return [detail(params?.staff_id === 'm2' ? ROW_B : ROW_A)];
      return [];
    },
    queryOptional: async () => [],
  };
  (globalThis as Record<string, unknown>).erplora = {
    query: (name: string, params?: Record<string, unknown>) => sdk.query(name, params),
    queryOptional: (name: string, params?: Record<string, unknown>) => sdk.queryOptional(name, params),
    queryPage: async () => ({ rows: [ROW_A, ROW_B], total: 2 }),
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

type Mounted = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  editingId: string;
  formError: string;
  servicesError: string;
  form: { first_name: string; last_name: string; email: string };
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void>;
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

const settle = async (el: Mounted) => {
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
};
const editRow = (el: Mounted, row: Record<string, unknown>) =>
  el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row } }));
const addButton = (el: Mounted) =>
  (el.shadowRoot.querySelector('ok-data-table') as HTMLElement).shadowRoot?.querySelector(
    '[data-testid="staff-members-table-add"]',
  ) as HTMLElement;

/** A gate the test opens by hand: the held reply resolves (or fails) only when released. */
function hold(): { wait: Promise<void>; release: () => void } {
  let release: () => void = () => {};
  const wait = new Promise<void>((r) => (release = r));
  return { wait, release };
}

describe('two «edit» in a row: the last opening wins (pm#459)', () => {
  it('a slow reply for the FIRST member does not overwrite the form of the second', async () => {
    const el = await mount();
    const first = hold();
    sdk.query = async (name, params) => {
      if (name !== 'staff.members.get') return [];
      if (params?.staff_id === 'm1') await first.wait;
      return [detail(params?.staff_id === 'm2' ? ROW_B : ROW_A)];
    };
    const a = editRow(el, ROW_A);
    await editRow(el, ROW_B);
    first.release();
    await a;
    await settle(el);
    expect(el.editingId, 'a submit here would UPDATE the first member').toBe('m2');
    expect(el.form.first_name).toBe('Pablo');
    expect(el.form.email).toBe('pablo@example.com');
  });

  it('a late FAILURE of the first member does not paint «could not load» under the second', async () => {
    const el = await mount();
    const first = hold();
    sdk.query = async (name, params) => {
      if (name !== 'staff.members.get') return [];
      if (params?.staff_id === 'm1') {
        await first.wait;
        throw new Error('network');
      }
      return [detail(ROW_B)];
    };
    const a = editRow(el, ROW_A);
    await editRow(el, ROW_B);
    first.release();
    await a;
    await settle(el);
    expect(el.editingId).toBe('m2');
    expect(el.formError, 'the error belongs to a member nobody is editing any more').toBe('');
    expect(el.shadowRoot.querySelector('[data-testid="staff-members-form-error"]')).toBeNull();
  });

  it('a double tap on «edit» of the SAME member: the stale first reply does not wipe what was typed', async () => {
    const el = await mount();
    const first = hold();
    let reads = 0;
    sdk.query = async (name) => {
      if (name !== 'staff.members.get') return [];
      const n = ++reads;
      if (n === 1) await first.wait;
      return [detail(ROW_A)];
    };
    const a = editRow(el, ROW_A);
    await new Promise((r) => setTimeout(r, 0));
    expect(reads).toBe(1);
    await editRow(el, ROW_A);
    el.form = { ...el.form, email: 'typed@example.com' };
    first.release();
    await a;
    await settle(el);
    expect(el.form.email, 'the first tap was already superseded by the second').toBe('typed@example.com');
  });

  it("the table's «Add» button tapped while an edit is still loading keeps a clean ALTA, even if that read fails late", async () => {
    const el = await mount();
    const first = hold();
    sdk.query = async (name) => {
      if (name !== 'staff.members.get') return [];
      await first.wait;
      throw new Error('network');
    };
    const a = editRow(el, ROW_A);
    await new Promise((r) => setTimeout(r, 0));
    expect(addButton(el), 'the table paints its «Add» button').toBeTruthy();
    addButton(el).click();
    first.release();
    await a;
    await settle(el);
    expect(el.editingId, 'the header says «New»: a late reply must not turn it into an edit').toBe('');
    expect(el.form.first_name).toBe('');
    expect(el.formError, 'the create form shows no error of a read it no longer waits for').toBe('');
  });

  it("a late failure of the FIRST member's services does not paint its error under the second", async () => {
    const el = await mount();
    const first = hold();
    sdk.query = async (name, params) => {
      if (name === 'staff.members.get') return [detail(params?.staff_id === 'm2' ? ROW_B : ROW_A)];
      if (name === 'staff.services.list_for_member' && params?.staff_id === 'm1') {
        await first.wait;
        throw new Error('network');
      }
      return [];
    };
    const a = editRow(el, ROW_A);
    await new Promise((r) => setTimeout(r, 0));
    await editRow(el, ROW_B);
    await settle(el);
    first.release();
    await a;
    await settle(el);
    await settle(el);
    expect(el.editingId).toBe('m2');
    expect(el.servicesError, "the second member's services loaded fine").toBe('');
    expect(el.shadowRoot.querySelector('[data-testid="staff-members-services-error"]')).toBeNull();
  });

  it('a double tap on the SAME member: a late failure of the first services load does not paint an error', async () => {
    const el = await mount();
    const first = hold();
    let loads = 0;
    sdk.query = async (name) => {
      if (name === 'staff.members.get') return [detail(ROW_A)];
      if (name === 'staff.services.list_for_member') {
        const n = ++loads;
        if (n === 1) {
          await first.wait;
          throw new Error('network');
        }
      }
      return [];
    };
    const a = editRow(el, ROW_A);
    await new Promise((r) => setTimeout(r, 0));
    expect(loads).toBe(1);
    await editRow(el, ROW_A);
    await settle(el);
    first.release();
    await a;
    await settle(el);
    await settle(el);
    expect(el.servicesError, 'the second load of the same member succeeded').toBe('');
  });
});

describe('the same, through the REAL row and «Add» clicks (pm#459, review of staff#69)', () => {
  const rowOf = (el: Mounted, index: number) =>
    (el.shadowRoot.querySelector('ok-data-table') as HTMLElement).shadowRoot?.querySelectorAll('.grow-data.clickable')[index] as HTMLElement;

  it('a double tap on the SAME row: a late FAILURE of the first read paints no error under a form that loaded fine', async () => {
    const el = await mount();
    const first = hold();
    let reads = 0;
    sdk.query = async (name) => {
      if (name !== 'staff.members.get') return [];
      const n = ++reads;
      if (n === 1) {
        await first.wait;
        throw new Error('network');
      }
      return [detail(ROW_A)];
    };
    expect(rowOf(el, 0), 'the table paints a clickable row for the first member').toBeTruthy();
    rowOf(el, 0).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(reads, 'the first tap started its read').toBe(1);
    rowOf(el, 0).click();
    await settle(el);
    expect(reads, 'the second tap started its own read').toBe(2);
    first.release();
    await settle(el);
    await settle(el);
    expect(el.editingId).toBe('m1');
    expect(el.form.first_name, 'the second read filled the form').toBe('Lucía');
    expect(el.formError, 'the failure belongs to a read the second tap already superseded').toBe('');
    expect(el.shadowRoot.querySelector('[data-testid="staff-members-form-error"]')).toBeNull();
  });

  it('«Add» after an edit whose read already FAILED shows no stale error under the create form', async () => {
    const el = await mount();
    sdk.query = async (name) => {
      if (name === 'staff.members.get') throw new Error('network');
      return [];
    };
    await editRow(el, ROW_A);
    await settle(el);
    expect(el.formError, 'positive control: the failed read IS reported while that member is being edited').not.toBe('');
    addButton(el).click();
    await settle(el);
    expect(el.editingId).toBe('');
    expect(el.formError, 'the create form is not the place for the previous edit’s error').toBe('');
    expect(el.shadowRoot.querySelector('[data-testid="staff-members-form-error"]')).toBeNull();
  });
});
