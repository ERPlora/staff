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
import { beforeEach, describe, expect, it } from 'vitest';

class DomainError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const MEMBERS = [{ id: 'm1', first_name: 'Lucía', last_name: 'Márquez', full_name: 'Lucía Márquez', status: 'active' }];
let refusal: Error | null = null;

beforeEach(() => {
  refusal = null;
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

/** The error banner on the PAGE (outside the panel), or null. */
const onPage = (el: Wc, surface: string): Element | null => {
  const banner = el.shadowRoot.querySelector(`[data-testid="${surface}-page-error"]`);
  return banner && !banner.closest('form[slot="create"]') ? banner : null;
};

describe('staff#72 · a refused save is shown INSIDE the form, where the phone can see it', () => {
  it('members: the refusal of «Add» lands in the form, translated', async () => {
    const el = await mount('erp-staff-members', '../components/erp-staff-members/erp-staff-members');
    el.patch({ first_name: 'Ana', last_name: 'Ruiz', user_id: 'u-1' });
    refusal = new DomainError('staff.user_already_linked', 'That Hub user is already linked (Lucía Márquez).');
    await el.createMember(submitEvent());
    await settle(el);
    const banner = inForm(el, 'staff-members');
    expect(banner, 'on a phone the panel covers the page: the refusal has to travel with the form').not.toBeNull();
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

  it('roles: the refusal of «Add» lands in the form', async () => {
    const el = await mount('erp-staff-roles', '../components/erp-staff-roles/erp-staff-roles');
    el.newName = 'Estilista';
    refusal = new DomainError('staff.role_exists', 'role exists');
    await el.createRole(submitEvent());
    await settle(el);
    expect(inForm(el, 'staff-roles')).not.toBeNull();
  });

  it('schedules: a client-side validation AND a server refusal land in the form', async () => {
    const el = await mount('erp-staff-schedules', '../components/erp-staff-schedules/erp-staff-schedules');
    el.staffId = 'm1';
    el.week = el.week.map((d: Record<string, unknown>) => ({ ...d, working: false }));
    await el.createSchedule(submitEvent());
    await settle(el);
    expect(inForm(el, 'staff-schedules'), 'a week with no working day is refused in the form').not.toBeNull();

    el.week = el.week.map((d: Record<string, unknown>) => ({ ...d, working: d.day === 1 }));
    refusal = new DomainError('staff.schedule_overlap', 'overlap');
    await el.createSchedule(submitEvent());
    await settle(el);
    expect(inForm(el, 'staff-schedules'), 'the server refusal is shown in the form').not.toBeNull();
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

  it('schedules: a failure loading the list is shown on the page, not in the closed panel', async () => {
    (globalThis as any).erplora.query = async (name: string) => {
      if (name === 'staff.schedules.list_for_member') throw new Error('network');
      return name === 'staff.members.list' ? MEMBERS : [];
    };
    const el = await mount('erp-staff-schedules', '../components/erp-staff-schedules/erp-staff-schedules');
    expect(onPage(el, 'staff-schedules')).not.toBeNull();
    expect(inForm(el, 'staff-schedules')).toBeNull();
  });

  it('time off: validation and server refusal land in the form; a refused approval on the page', async () => {
    const el = await mount('erp-staff-time-off', '../components/erp-staff-time-off/erp-staff-time-off');
    await el.createTimeOff(submitEvent());
    await settle(el);
    expect(inForm(el, 'staff-time-off'), 'an incomplete absence is refused in the form').not.toBeNull();

    el.patch({ staff_id: 'm1', start_date: '2026-10-01', end_date: '2026-10-02' });
    refusal = new DomainError('staff.time_off_overlap', 'overlap');
    await el.createTimeOff(submitEvent());
    await settle(el);
    expect(inForm(el, 'staff-time-off'), 'the server refusal is shown in the form').not.toBeNull();

    refusal = new DomainError('staff.time_off_bad_transition', 'bad transition');
    await el.onRowAction('approve', { id: 't1', status: 'pending' });
    await settle(el);
    expect(onPage(el, 'staff-time-off'), 'approving happens with the panel closed').not.toBeNull();
  });
});
