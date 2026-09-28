// ERPlora/pm#521 — the two amounts a person TYPES or PASTES in Personal (the hourly rate of a record
// and a service's own price for that professional) are read the one way every module reads them
// (`@erplora/module-toolkit/money-input`). The screen itself prints «1.250,50»; copied back into
// the form it went through `replace(',', '.')` + `majorToMinor`: «1.250,50» and «1,250.50» became 0
// (a wage of nothing, stored in silence), «1.250» — one thousand two hundred and fifty to the
// person — became 1,25, and a pasted negative price was silently swapped for the catalogue price.
// In the browser a `type="number"` field threw the pasted text away before any of that. Garbage,
// an ambiguous amount and a negative one are refused with a code the screen explains, never a guess.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ROW = { id: 'm1', first_name: 'Ana', last_name: 'Ruiz', full_name: 'Ana Ruiz', email: '', role_id: null, user_id: null, status: 'active', is_bookable: 1 };

const commands: { name: string; payload: Record<string, unknown> }[] = [];
/** Every `t()` call with params, so the ambiguous refusal can be checked for its two readings. */
const translated: { key: string; params?: Record<string, unknown> }[] = [];
let storedRate = 0;

function hub(over: Record<string, unknown> = {}): void {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.members.get') return [{ ...ROW, employee_id: '', bio: '', specialties: '', booking_buffer: 0, color: '', hire_date: null }];
      if (name === 'staff.members.compensation') return [{ id: 'm1', hourly_rate: storedRate, commission_rate: 0 }];
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
    currencyDecimals: 2,
    formatMoney: (minor: number) => String(minor),
    hasPermission: () => true,
    t: (_c: unknown, key: string, params?: Record<string, unknown>) => {
      translated.push({ key, params });
      return key;
    },
    ...over,
  };
}

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  editingId: string | null;
  form: Record<string, string | number | boolean>;
  formError: string;
  servicesError: string;
  newServiceId: string;
  newServicePrice: string;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void> | void;
  createMember: (ev: Event) => Promise<void>;
  assignService: (ev: Event) => Promise<void>;
};

async function mount(): Promise<Wc> {
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  return el;
}

async function editMember(): Promise<Wc> {
  const el = await mount();
  await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: ROW } }));
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const sent = (name: string) => commands.find((c) => c.name === name);
const rateField = (el: Wc) => el.shadowRoot.querySelector('[data-testid="staff-members-hourly-rate"]');
const priceField = (el: Wc) => el.shadowRoot.querySelector('[data-testid="staff-members-service-price"]');

async function saveRate(typed: string): Promise<Wc> {
  const el = await editMember();
  el.form = { ...el.form, hourly_rate: typed };
  await el.createMember(new Event('submit'));
  return el;
}

async function assignPrice(typed: string): Promise<Wc> {
  const el = await editMember();
  el.newServiceId = 'svc-color';
  el.newServicePrice = typed;
  await el.assignService(new Event('submit'));
  return el;
}

beforeEach(() => {
  commands.length = 0;
  translated.length = 0;
  storedRate = 0;
  hub();
});
afterEach(() => {
  document.body.innerHTML = '';
});

// ` ` (NNBSP) and ` ` (NBSP) are what `Intl` prints between groups in fr / es: real pastes.
const READABLE = ['1.250,50', '1,250.50', '1250,5', '1 250,50', '1 250,50', '1 250,50 €', '1.250,50 €'];
// HALLAZGO rv-395/rv-397: a minus BEHIND the digits and accounting brackets are not guessed;
// `$12` in a euro hub is not this hub's money; letters glued to the figure are not an amount.
const GARBAGE = ['abc', '12abc', '12−', '(12)', '$12', '1.5k'];
// HALLAZGO rv-122: money-input KEEPS the sign; neither a wage nor a price is ever negative, and the
// schema's `minimum: 0` would answer with a raw English validation detail — the form refuses it.
const NEGATIVE = ['-1.250,50', '−1.250,50'];

describe('hourly rate: a pasted amount is read, never turned into 0 or 1,25 (pm#521)', () => {
  it.each(READABLE)('«%s» is saved as 125050, not 0', async (typed) => {
    const el = await saveRate(typed);
    expect(sent('staff.members.update'), `«${typed}» was refused: ${el.formError}`).toBeTruthy();
    expect(sent('staff.members.update')!.payload.hourly_rate).toBe(125050);
  });

  it('a new record reads its rate the same way (staff.members.create)', async () => {
    const el = await mount();
    el.editingId = null;
    el.form = { ...el.form, first_name: 'Eva', last_name: 'Gil', hourly_rate: '1.250,50' };
    await el.createMember(new Event('submit'));
    expect(sent('staff.members.create')?.payload.hourly_rate).toBe(125050);
  });

  it.each(GARBAGE)('«%s» is refused with not_an_amount inside the form and nothing is saved', async (typed) => {
    const el = await saveRate(typed);
    expect(sent('staff.members.update'), 'garbage must never be saved').toBeFalsy();
    expect(el.formError).toBe('ui.errNotAnAmount');
  });

  it.each(NEGATIVE)('a pasted negative «%s» is refused, never saved nor turned positive', async (typed) => {
    const el = await saveRate(typed);
    expect(sent('staff.members.update'), 'a negative wage must never be saved').toBeFalsy();
    expect(el.formError).toBe('ui.errNegativeAmount');
  });

  it('an ambiguous «1.250» is refused (it was stored as 1,25) and the message carries BOTH readings', async () => {
    hub({ locale: 'en' });
    const el = await saveRate(' 1.250 '); // what a paste brings along is not part of what is quoted back
    expect(sent('staff.members.update'), '«1.250» must not be guessed').toBeFalsy();
    expect(el.formError).toBe('ui.errAmbiguousAmount');
    expect(translated.find((c) => c.key === 'ui.errAmbiguousAmount')?.params)
      .toEqual({ typed: '1.250', grouped: '1250.00', decimal: '1.25' });
  });

  it('the readings of an ambiguous amount are written in the hub locale', async () => {
    const el = await saveRate('2,500');
    expect(el.formError).toBe('ui.errAmbiguousAmount');
    expect(translated.find((c) => c.key === 'ui.errAmbiguousAmount')?.params)
      .toEqual({ typed: '2,500', grouped: '2500,00', decimal: '2,50' });
  });

  it('the hub currency as the hub locale prints it is cleaned (JPY in ja: «1,250￥»)', async () => {
    hub({ currency: 'JPY', currencyDecimals: 0, locale: 'ja' });
    const el = await saveRate('1,250￥');
    expect(el.formError).toBe('');
    expect(sent('staff.members.update')!.payload.hourly_rate).toBe(1250);
  });

  it('the hub currency written by its code is cleaned («EUR 12» → 1200)', async () => {
    const el = await saveRate('EUR 12');
    expect(el.formError).toBe('');
    expect(sent('staff.members.update')!.payload.hourly_rate).toBe(1200);
  });

  // Only BELOW zero is refused: 0 is a real rate (a volunteer, an owner who draws no wage).
  it('a typed zero is saved as 0, not refused as negative', async () => {
    const el = await saveRate('0,00');
    expect(el.formError).toBe('');
    expect(sent('staff.members.update')!.payload.hourly_rate).toBe(0);
  });

  // The rate is NOT NULL (default 0) and the update is a full snapshot: a cleared field is «no rate».
  it('an empty rate is saved as 0 (no rate), not refused', async () => {
    const el = await saveRate('   ');
    expect(el.formError).toBe('');
    expect(sent('staff.members.update')!.payload.hourly_rate).toBe(0);
  });

  // es does not group four digits: 12345,50 is what proves the field is filled WITHOUT grouping.
  it.each([
    { over: {}, stored: 1234550, field: '12345,50' },
    { over: { locale: 'en' }, stored: 1234550, field: '12345.50' },
    { over: { currency: 'JPY', currencyDecimals: 0 }, stored: 1500, field: '1500' },
    { over: { currency: 'KWD', currencyDecimals: 3 }, stored: 1234, field: '1,234' },
  ])('reopening a record fills «$field» (hub locale and scale, no grouping) from $stored', async ({ over, stored, field }) => {
    hub(over);
    storedRate = stored;
    const el = await editMember();
    expect(el.form.hourly_rate).toBe(field);
    await el.createMember(new Event('submit'));
    expect(sent('staff.members.update')!.payload.hourly_rate, 'what the field shows must read back').toBe(stored);
  });

  it('the rate field is text + inputmode=decimal, never type=number (a number field drops «1.250,50»)', async () => {
    const el = await editMember();
    const input = rateField(el);
    expect(input, 'the rate field is not painted').toBeTruthy();
    expect(input!.getAttribute('type') ?? 'text', 'type=number throws a pasted «1.250,50» away').toBe('text');
    expect(input!.getAttribute('inputmode'), 'a tablet must offer the decimal keyboard').toBe('decimal');
  });

  it('leaving the field rewrites a readable rate in the hub format, and garbage EXACTLY as typed', async () => {
    const el = await editMember();
    el.form = { ...el.form, hourly_rate: 'EUR 1.250,5' };
    await el.updateComplete;
    rateField(el)!.dispatchEvent(new CustomEvent('ionBlur'));
    expect(el.form.hourly_rate).toBe('1250,50');
    el.form = { ...el.form, hourly_rate: '12 abc' };
    await el.updateComplete;
    rateField(el)!.dispatchEvent(new CustomEvent('ionBlur'));
    expect(el.form.hourly_rate, 'rewriting garbage throws away what the person wrote').toBe('12 abc');
  });

  it('a KWD hub rewrites the rate to its three decimals on blur', async () => {
    hub({ currency: 'KWD', currencyDecimals: 3, locale: 'en' });
    const el = await editMember();
    el.form = { ...el.form, hourly_rate: '12.5' };
    await el.updateComplete;
    rateField(el)!.dispatchEvent(new CustomEvent('ionBlur'));
    expect(el.form.hourly_rate).toBe('12.500');
  });
});

describe("a service's own price: a pasted amount is read, never turned into 0 or the catalogue price (pm#521)", () => {
  it.each(READABLE)('«%s» is assigned as 125050, not 0', async (typed) => {
    const el = await assignPrice(typed);
    expect(sent('staff.services.assign'), `«${typed}» was refused: ${el.servicesError}`).toBeTruthy();
    expect(sent('staff.services.assign')!.payload.custom_price).toBe(125050);
  });

  it.each(GARBAGE)('«%s» is refused with not_an_amount and nothing is assigned', async (typed) => {
    const el = await assignPrice(typed);
    expect(sent('staff.services.assign'), 'garbage must never be assigned').toBeFalsy();
    expect(el.servicesError).toBe('ui.errNotAnAmount');
  });

  // main swapped a negative for `null` = the catalogue price, without a word.
  it.each(NEGATIVE)('a pasted negative «%s» is refused, not swapped for the catalogue price', async (typed) => {
    const el = await assignPrice(typed);
    expect(sent('staff.services.assign'), 'a negative price must not be assigned at all').toBeFalsy();
    expect(el.servicesError).toBe('ui.errNegativeAmount');
  });

  it('an ambiguous «1.250» is refused with both readings in the hub locale', async () => {
    const el = await assignPrice('1.250');
    expect(sent('staff.services.assign'), '«1.250» must not be guessed').toBeFalsy();
    expect(el.servicesError).toBe('ui.errAmbiguousAmount');
    expect(translated.find((c) => c.key === 'ui.errAmbiguousAmount')?.params)
      .toEqual({ typed: '1.250', grouped: '1250,00', decimal: '1,25' });
  });

  it('a KWD price with three decimals is not ambiguous («1.234» → 1234 fils)', async () => {
    hub({ currency: 'KWD', currencyDecimals: 3, locale: 'en' });
    const el = await assignPrice('1.234');
    expect(el.servicesError).toBe('');
    expect(sent('staff.services.assign')!.payload.custom_price).toBe(1234);
  });

  // 0 is not «nothing typed»: this professional does the service for free (null would charge the catalogue price).
  it('a typed zero price is assigned as 0, not refused nor swapped for the catalogue price', async () => {
    const el = await assignPrice('0');
    expect(el.servicesError).toBe('');
    expect(sent('staff.services.assign')!.payload.custom_price).toBe(0);
  });

  it('an empty price still means «use the catalogue price» (null), also when only spaces were typed', async () => {
    await assignPrice('  ');
    expect(sent('staff.services.assign')!.payload.custom_price).toBeNull();
  });

  it('the price field is text + inputmode=decimal, never type=number', async () => {
    const el = await editMember();
    const input = priceField(el);
    expect(input, 'the price field is not painted').toBeTruthy();
    expect(input!.getAttribute('type') ?? 'text', 'type=number throws a pasted «1.250,50» away').toBe('text');
    expect(input!.getAttribute('inputmode'), 'a tablet must offer the decimal keyboard').toBe('decimal');
  });

  it('leaving the price field rewrites a readable price in the hub format, and garbage EXACTLY as typed', async () => {
    const el = await editMember();
    el.newServicePrice = '€ 40';
    await el.updateComplete;
    priceField(el)!.dispatchEvent(new CustomEvent('ionBlur'));
    expect(el.newServicePrice).toBe('40,00');
    el.newServicePrice = '4O';
    await el.updateComplete;
    priceField(el)!.dispatchEvent(new CustomEvent('ionBlur'));
    expect(el.newServicePrice).toBe('4O');
  });
});
