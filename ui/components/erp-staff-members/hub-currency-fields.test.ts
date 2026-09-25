// staff#64 — the money typed in a staff record (hourly rate, a service's custom price) is in the
// HUB currency, not in euros. Money crosses the module in minor units of the hub currency
// (ADR-0123): yen in JPY (0 decimals), cents in EUR, fils in KWD (3). A fixed `× 100` / `/ 100`
// stored 1500 ¥ as 150000 and the directory column (already on `formatMoney`) showed 150.000 ¥.
//
// The step of the field is part of the fix, and it is read from the RENDERED attribute: a
// `type=number` input with `step=0.01` makes the browser reject 1.234 KWD on submit, and a test
// that calls createMember() directly never sees that (invoice#96).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const ROW = { id: 'm1', first_name: 'Ana', last_name: 'Ruiz', full_name: 'Ana Ruiz', email: '', role_id: null, user_id: null, status: 'active', is_bookable: 1 };

const commands: { name: string; payload: Record<string, unknown> }[] = [];
let storedRate = 0;

function hub(currencyDecimals: number | undefined): void {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.members.get') return [{ ...ROW, employee_id: '', bio: '', specialties: '', booking_buffer: 0, color: '', hire_date: null }];
      if (name === 'staff.members.compensation') return [{ id: 'm1', hourly_rate: storedRate, commission_rate: 0 }];
      if (name === 'staff.services.list_for_member') return [];
      return [];
    },
    queryOptional: async (name: string) =>
      name === 'services.services.list' ? [{ id: 'svc-color', name: 'Color', duration_minutes: 90, price: 4500, is_bookable: 1 }] : undefined,
    queryPage: async () => ({ rows: [ROW], total: 1 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      commands.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    currencyDecimals,
    formatMoney: (minor: number) => String(minor),
    hasPermission: () => true,
    t: (_c: unknown, key: string) => key,
  };
}

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  form: Record<string, string | number | boolean>;
  newServiceId: string;
  newServicePrice: string;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void> | void;
  createMember: (ev: Event) => Promise<void>;
  assignService: (ev: Event) => Promise<void>;
};

async function editMember(): Promise<Wc> {
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: ROW } }));
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const rateInput = (el: Wc) => el.shadowRoot.querySelector('[data-section="compensation"] ion-input')!;
const servicePriceInput = (el: Wc) => el.shadowRoot.querySelectorAll('[data-section="services"] ion-input')[1]!;

beforeEach(() => {
  commands.length = 0;
  storedRate = 0;
});
afterEach(() => {
  document.body.innerHTML = '';
});

describe('hourly rate in the hub currency (staff#64)', () => {
  it.each([
    { d: 0, stored: 1500, field: '1500', typed: '1500', sent: 1500, step: '1' },
    { d: 2, stored: 1550, field: '15.50', typed: '15.75', sent: 1575, step: '0.01' },
    { d: 3, stored: 1234, field: '1.234', typed: '2.345', sent: 2345, step: '0.001' },
  ])('$d decimals: loads $stored → «$field», saves «$typed» → $sent, step $step', async ({ d, stored, field, typed, sent, step }) => {
    hub(d);
    storedRate = stored;
    const el = await editMember();
    expect(el.form.hourly_rate).toBe(field);
    expect(rateInput(el).getAttribute('step')).toBe(step);
    el.form = { ...el.form, hourly_rate: typed };
    await el.createMember(new Event('submit'));
    const upd = commands.find((c) => c.name === 'staff.members.update')!;
    expect(upd.payload.hourly_rate).toBe(sent);
  });

  it('a hub whose SDK publishes no scale keeps the two-decimal behaviour', async () => {
    hub(undefined);
    storedRate = 1550;
    const el = await editMember();
    expect(el.form.hourly_rate).toBe('15.50');
    expect(rateInput(el).getAttribute('step')).toBe('0.01');
  });
});

describe("a service's custom price in the hub currency (staff#64)", () => {
  it.each([
    { d: 0, typed: '1500', sent: 1500, step: '1' },
    { d: 2, typed: '40', sent: 4000, step: '0.01' },
    { d: 3, typed: '1.234', sent: 1234, step: '0.001' },
  ])('$d decimals: «$typed» → $sent, step $step', async ({ d, typed, sent, step }) => {
    hub(d);
    const el = await editMember();
    expect(servicePriceInput(el).getAttribute('step')).toBe(step);
    el.newServiceId = 'svc-color';
    el.newServicePrice = typed;
    await el.assignService(new Event('submit'));
    expect(commands.find((c) => c.name === 'staff.services.assign')!.payload.custom_price).toBe(sent);
  });

  it('an empty price still means «use the catalogue price» (null)', async () => {
    hub(0);
    const el = await editMember();
    el.newServiceId = 'svc-color';
    el.newServicePrice = '';
    await el.assignService(new Event('submit'));
    expect(commands.find((c) => c.name === 'staff.services.assign')!.payload.custom_price).toBeNull();
  });
});

describe('no label pins the euro (staff#64)', () => {
  it.each(['en', 'es'])('%s: rate labels carry no € (the amount itself shows the hub currency)', (lang) => {
    const ui = JSON.parse(readFileSync(join(ROOT, 'locales', `${lang}.json`), 'utf8')).ui as Record<string, string>;
    const rateKeys = Object.keys(ui).filter((k) => /rate/i.test(k));
    expect(rateKeys.length).toBeGreaterThan(0);
    expect(rateKeys.filter((k) => ui[k].includes('€'))).toEqual([]);
  });
});
