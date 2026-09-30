// staff#72 — on a phone, a refused save in Personal showed NOTHING: the person pressed «Add» and the
// screen stayed as it was.
//
// The refusal did arrive, and the screen did translate it; it was painted in the wrong place. Every
// form of this module lives in the `create` panel of its `ok-data-table`, and under 834 px that
// panel is a FULL-SCREEN sheet (`position: fixed; inset: 0; z-index: 1000`, outfitkit#75). The error
// banner was the first child of the PAGE, so on a phone it sat under the sheet, out of sight. On a
// desktop the panel sits beside the table and the banner happened to be visible, which is why it
// was only seen on mobile.
//
// So the rule this file fixes, for the four screens (members, roles, schedules, time off):
//
//   · what goes wrong while SAVING (or loading) the form is painted INSIDE the form, next to the
//     button that was pressed — visible whatever the width, because it travels with the panel;
//   · what goes wrong in a ROW action (deactivate, terminate, toggle, approve…) is painted on the
//     PAGE: no panel is open then, and a message inside a closed panel is just as invisible.
//
// It is what Square, Shopify and Odoo do in their side/sheet forms: the error of a submit lives in
// the form that was submitted.
import { beforeEach, describe, expect, it, vi } from 'vitest';

class DomainError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const MEMBERS = [{ id: 'm1', first_name: 'Lucía', last_name: 'Márquez', full_name: 'Lucía Márquez', status: 'active' }];
let refusal: Error | null = null;
/** Every element the component scrolled into view AFTER it had painted itself, in order. Scrolling a
 *  banner that has not rendered yet measures a 0-px box: in Chromium the sheet stops with the banner
 *  still half under the tab bar (seen in the bench at 390 px). */
let revealed: Element[] = [];

beforeEach(() => {
  refusal = null;
  revealed = [];
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(function (this: HTMLElement) {
    if ((this as HTMLElement & { hasUpdated?: boolean }).hasUpdated !== false) revealed.push(this);
  });
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'staff.members.list' ? MEMBERS : []),
    queryOptional: async () => undefined,
    queryPage: async () => ({ rows: MEMBERS, total: MEMBERS.length }),
    command: async () => {
      if (refusal) throw refusal;
      return {};
    },
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    hasPermission: () => true,
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> } & Record<string, any>;

async function mount(tag: string, path: string): Promise<Wc> {
  history.replaceState(null, '', '/');
  await import(path);
  const el = document.createElement(tag) as Wc;
  document.body.appendChild(el);
  await settle(el);
  return el;
}

async function settle(el: Wc): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await el.updateComplete;
    await new Promise((r) => setTimeout(r, 0));
  }
}

const submitEvent = (): Event => new Event('submit', { cancelable: true });

/** The error banner INSIDE the panel's form, or null. */
const inForm = (el: Wc, surface: string): Element | null =>
  el.shadowRoot.querySelector(`form[slot="create"] [data-testid="${surface}-form-error"]`);

/** The banner inside the form AND scrolled into view: pressing the button at the foot of a long
 *  form, the banner that appears above it is pushed half off a phone screen otherwise. */
const inFormAndRevealed = (el: Wc, surface: string): Element | null => {
  const banner = inForm(el, surface);
  return banner && revealed.includes(banner) ? banner : null;
};

/** The error banner on the PAGE (outside the panel), or null. */
const onPage = (el: Wc, surface: string): Element | null => {
  const banner = el.shadowRoot.querySelector(`[data-testid="${surface}-page-error"]`);
  return banner && !banner.closest('form[slot="create"]') ? banner : null;
};

describe('staff#72 · a refused save is shown INSIDE the form, where the phone can see it', () => {
  it('members: the refusal of «Save» lands in the form, translated', async () => {
    const el = await mount('erp-staff-members', '../components/erp-staff-members/erp-staff-members');
    el.patch({ first_name: 'Ana', last_name: 'Ruiz', user_id: 'u-1' });
    refusal = new DomainError('staff.user_already_linked', 'That Hub user is already linked (Lucía Márquez).');
    await el.createMember(submitEvent());
    await settle(el);
    const banner = inForm(el, 'staff-members');
    expect(banner, 'on a phone the panel covers the page: the refusal has to travel with the form').not.toBeNull();
    expect(inFormAndRevealed(el, 'staff-members'), 'and it is scrolled into view, not left half below the fold').not.toBeNull();
    expect(banner?.textContent?.trim()).toBe('That Hub user is already linked (Lucía Márquez).');
  });

  it('members: a failure to load the record being edited lands in the form too', async () => {
    const el = await mount('erp-staff-members', '../components/erp-staff-members/erp-staff-members');
    (globalThis as any).erplora.query = async (name: string) => {
      if (name === 'staff.members.get') throw new DomainError('hub.permission_denied', 'denied');
      return name === 'staff.members.list' ? MEMBERS : [];
    };
    el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: MEMBERS[0] } }));
    await settle(el);
    expect(inForm(el, 'staff-members'), 'the load of an edit fails inside the edit panel').not.toBeNull();
  });

  it('members: a refused deactivate (row action, no panel open) is shown on the page', async () => {
    const el = await mount('erp-staff-members', '../components/erp-staff-members/erp-staff-members');
    el.pendingAction = { kind: 'deactivate', id: 'm1', label: 'Lucía Márquez' };
    refusal = new DomainError('staff.has_pending_time_off', 'has pending time off');
    await el.onActionDismiss(new CustomEvent('x', { detail: { role: 'confirm' } }));
    await settle(el);
    expect(onPage(el, 'staff-members'), 'no panel is open: inside the form it would be invisible').not.toBeNull();
    expect(inForm(el, 'staff-members')).toBeNull();
  });

  it('members: opening «Add» again does not carry the page error of a row action into the form', async () => {
    const el = await mount('erp-staff-members', '../components/erp-staff-members/erp-staff-members');
    el.pendingAction = { kind: 'deactivate', id: 'm1', label: 'Lucía Márquez' };
    refusal = new DomainError('staff.has_pending_time_off', 'has pending time off');
    await el.onActionDismiss(new CustomEvent('x', { detail: { role: 'confirm' } }));
    refusal = null;
    el.patch({ first_name: 'Ana', last_name: 'Ruiz' });
    await el.createMember(submitEvent());
    await settle(el);
    expect(inForm(el, 'staff-members')).toBeNull();
  });

  it('roles: the refusal of «Save» lands in the form', async () => {
    const el = await mount('erp-staff-roles', '../components/erp-staff-roles/erp-staff-roles');
    el.newName = 'Estilista';
    refusal = new DomainError('staff.role_exists', 'role exists');
    await el.createRole(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, 'staff-roles')).not.toBeNull();
  });

  it('schedules: a client-side validation AND a server refusal land in the form', async () => {
    const el = await mount('erp-staff-schedules', '../components/erp-staff-schedules/erp-staff-schedules');
    el.staffId = 'm1';
    el.week = el.week.map((d: Record<string, unknown>) => ({ ...d, working: false }));
    await el.createSchedule(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, 'staff-schedules'), 'a week with no working day is refused in the form').not.toBeNull();

    el.week = el.week.map((d: Record<string, unknown>) => ({ ...d, working: d.day === 1 }));
    refusal = new DomainError('staff.schedule_overlap', 'overlap');
    revealed = []; // Lit reuses the banner node: only a reveal of THIS refusal counts
    await el.createSchedule(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, 'staff-schedules'), 'the server refusal is shown in the form').not.toBeNull();
    expect(onPage(el, 'staff-schedules')).toBeNull();
  });

  it('schedules: a refused toggle (row action) is shown on the page', async () => {
    const el = await mount('erp-staff-schedules', '../components/erp-staff-schedules/erp-staff-schedules');
    refusal = new DomainError('staff.schedule_in_use', 'in use');
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'toggle', row: { id: 's1', is_active: 1 } } }));
    await settle(el);
    expect(onPage(el, 'staff-schedules')).not.toBeNull();
    expect(inForm(el, 'staff-schedules')).toBeNull();
  });

  it('schedules: a refused delete (confirmed in the alert) is shown on the page', async () => {
    const el = await mount('erp-staff-schedules', '../components/erp-staff-schedules/erp-staff-schedules');
    el.pendingDelete = { id: 's1', label: 'Mañanas' };
    refusal = new DomainError('staff.schedule_in_use', 'in use');
    await el.onDeleteDismiss(new CustomEvent('x', { detail: { role: 'confirm' } }));
    await settle(el);
    expect(onPage(el, 'staff-schedules')).not.toBeNull();
    expect(inForm(el, 'staff-schedules')).toBeNull();
  });

  it('schedules: a failure loading the list is not an action refusal and never lands in the closed panel', async () => {
    (globalThis as any).erplora.query = async (name: string) => {
      if (name === 'staff.schedules.list_for_member') throw new Error('network');
      return name === 'staff.members.list' ? MEMBERS : [];
    };
    const el = await mount('erp-staff-schedules', '../components/erp-staff-schedules/erp-staff-schedules');
    // staff#93: the table says it with its Retry (the older-shell banner is anchored in
    // schedules-load-error.test.ts); the page banner is only for what an action was refused.
    const table = el.shadowRoot.querySelector('ok-data-table') as HTMLElement & { error?: string };
    const loadBanner = el.shadowRoot.querySelector('[data-testid="staff-schedules-load-error"]');
    expect(table.error === 'network' || loadBanner?.textContent?.includes('network'), 'the failure is shown nowhere').toBe(true);
    expect(onPage(el, 'staff-schedules'), 'a failed load reads as a refused action').toBeNull();
    expect(inForm(el, 'staff-schedules')).toBeNull();
    expect(loadBanner?.closest('form[slot="create"]') ?? null, 'the notice sits in the closed panel').toBeNull();
  });

  it('time off: validation and server refusal land in the form; a refused approval on the page', async () => {
    const el = await mount('erp-staff-time-off', '../components/erp-staff-time-off/erp-staff-time-off');
    await el.createTimeOff(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, 'staff-time-off'), 'an incomplete absence is refused in the form').not.toBeNull();

    el.patch({ staff_id: 'm1', start_date: '2026-10-01', end_date: '2026-10-02' });
    refusal = new DomainError('staff.time_off_overlap', 'overlap');
    revealed = []; // Lit reuses the banner node: only a reveal of THIS refusal counts
    await el.createTimeOff(submitEvent());
    await settle(el);
    expect(inFormAndRevealed(el, 'staff-time-off'), 'the server refusal is shown in the form').not.toBeNull();

    refusal = new DomainError('staff.time_off_bad_transition', 'bad transition');
    await el.onRowAction('approve', { id: 't1', status: 'pending' });
    await settle(el);
    expect(onPage(el, 'staff-time-off'), 'approving happens with the panel closed').not.toBeNull();
  });
});

// Review of staff#75: before the split there was ONE banner and every save cleared it, so the
// refusal of a row action went away as soon as the person did something that worked. With the
// page banner on its own, a successful save has to clear it too — otherwise «Cannot deactivate…»
// stays red on the page above a list where everything since then went fine.
describe('staff#72 · a page error of a row action goes away once a later save succeeds', () => {
  it('members: a refused deactivate, then a successful «Save» of a new member', async () => {
    const el = await mount('erp-staff-members', '../components/erp-staff-members/erp-staff-members');
    el.pendingAction = { kind: 'deactivate', id: 'm1', label: 'Lucía Márquez' };
    refusal = new DomainError('staff.has_pending_time_off', 'has pending time off');
    await el.onActionDismiss(new CustomEvent('x', { detail: { role: 'confirm' } }));
    await settle(el);
    expect(onPage(el, 'staff-members')).not.toBeNull();
    refusal = null;
    el.patch({ first_name: 'Ana', last_name: 'Ruiz' });
    await el.createMember(submitEvent());
    await settle(el);
    expect(onPage(el, 'staff-members'), 'the save went fine: the old refusal is no longer news').toBeNull();
  });

  it('schedules: a refused toggle, then a successful save', async () => {
    const el = await mount('erp-staff-schedules', '../components/erp-staff-schedules/erp-staff-schedules');
    refusal = new DomainError('staff.schedule_in_use', 'in use');
    await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'toggle', row: { id: 's1', is_active: 1 } } }));
    await settle(el);
    expect(onPage(el, 'staff-schedules')).not.toBeNull();
    refusal = null;
    el.staffId = 'm1';
    el.week = el.week.map((d: Record<string, unknown>) => ({ ...d, working: d.day === 1 }));
    await el.createSchedule(submitEvent());
    await settle(el);
    expect(onPage(el, 'staff-schedules'), 'the save went fine: the old refusal is no longer news').toBeNull();
  });

  it('time off: a refused approval, then a successful «Save» of a new absence', async () => {
    const el = await mount('erp-staff-time-off', '../components/erp-staff-time-off/erp-staff-time-off');
    refusal = new DomainError('staff.time_off_bad_transition', 'bad transition');
    await el.onRowAction('approve', { id: 't1', status: 'pending' });
    await settle(el);
    expect(onPage(el, 'staff-time-off')).not.toBeNull();
    refusal = null;
    el.patch({ staff_id: 'm1', start_date: '2026-10-01', end_date: '2026-10-02' });
    await el.createTimeOff(submitEvent());
    await settle(el);
    expect(onPage(el, 'staff-time-off'), 'the save went fine: the old refusal is no longer news').toBeNull();
  });
});
