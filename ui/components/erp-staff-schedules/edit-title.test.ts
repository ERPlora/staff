// pm#450 (outfitkit#150): editing a schedule reused the ALTA panel with open('create'), so its
// header said «New» while the form held an existing template — and saving UPDATES it. The table
// now has an «edit» mode and takes the whole header title: the screen asks for
// open('edit', { title }) with «Edit · <schedule>», the same wording the members screen uses.
//
// Fallback for shells with OutfitKit < 0.1.94 (hub:stable 1.1.29 ships 0.1.73): they ignore the
// title and paint `labels.newRecord` for the «edit» panel, so the screen overrides `newRecord` with
// the same «Edit · <schedule>» while editing — the header is right on every shell.
import { beforeEach, describe, expect, it } from 'vitest';

const MEMBERS = [{ id: 'm1', full_name: 'Ana Ruiz', status: 'active' }];
const SCHEDULES = [
  { id: 'h1', staff_id: 'm1', name: 'Horario habitual', is_default: 1, effective_from: null, effective_until: null, is_active: 1 },
];

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.members.list') return MEMBERS;
      if (name === 'staff.schedules.list_for_member') return SCHEDULES;
      return [];
    },
    queryPage: async () => ({ rows: SCHEDULES, total: SCHEDULES.length }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    // Returns the key with its interpolated params, to assert WHICH one was used and with what.
    t: (_c: unknown, key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})` : key,
  };
});

type Mounted = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  editingId: string;
  newName: string;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void>;
};
type Table = HTMLElement & {
  open: (panel?: unknown, opts?: { title?: string }) => void;
  labels?: { newRecord?: string };
  shadowRoot: ShadowRoot;
};

async function mount(): Promise<Mounted> {
  await import('./erp-staff-schedules');
  const el = document.createElement('erp-staff-schedules') as Mounted;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const table = (el: Mounted) => el.shadowRoot.querySelector('ok-data-table') as Table;
const addButton = (el: Mounted) => table(el).shadowRoot.querySelector('[data-testid="staff-schedules-table-add"]') as HTMLElement;

async function edit(el: Mounted): Promise<void> {
  await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: SCHEDULES[0] } }));
  await el.updateComplete;
}

describe('editing a schedule titles the panel «Edit · <schedule>» (pm#450)', () => {
  it("opens the panel with open('edit', { title })", async () => {
    const el = await mount();
    const calls: unknown[][] = [];
    table(el).open = (...args: unknown[]) => void calls.push(args);
    await edit(el);
    expect(calls).toEqual([['edit', { title: 'ui.panelEdit(name=Horario habitual)' }]]);
  });

  it('creating keeps the «New» header', async () => {
    const el = await mount();
    expect(el.editingId).toBe('');
    expect(table(el).labels?.newRecord).toBe('ui.panelNew');
  });

  it('an older shell (title ignored) still reads «Edit · <schedule>»: newRecord is overridden while editing', async () => {
    const el = await mount();
    await edit(el);
    expect(table(el).labels?.newRecord, 'OutfitKit < 0.1.94 would say «New» over an edit').toBe(
      'ui.panelEdit(name=Horario habitual)',
    );
  });

  it('«Add» after an edit opens a CLEAN create form (the header says «New»: the form must agree)', async () => {
    const el = await mount();
    await edit(el);
    expect(addButton(el), 'the table paints its «Add» button').toBeTruthy();
    addButton(el).click();
    await el.updateComplete;
    expect(el.editingId, 'a submit here would UPDATE the edited schedule under a «New» header').toBe('');
    expect(el.newName).toBe('');
    expect(table(el).labels?.newRecord).toBe('ui.panelNew');
  });

  it('a click INSIDE the edit form (a field, the table) does not drop the edit — only «Add» does', async () => {
    const el = await mount();
    await edit(el);
    (el.shadowRoot.querySelector('[data-testid="staff-schedules-name"]') as HTMLElement).click();
    table(el).click();
    await el.updateComplete;
    expect(el.editingId, 'the table host hears every click of the projected form').toBe('h1');
  });

  it('«Add» with no edit in progress keeps what was typed', async () => {
    const el = await mount();
    el.newName = 'Verano';
    addButton(el).click();
    await el.updateComplete;
    expect(el.newName).toBe('Verano');
  });
});
