// staff#4 — the record (ficha) and its lifecycle from the screen, against the model of ADR-0191/0192
// (the record hangs from a hub user; the directory is the core's).
//
//  * EDIT loads the FULL record (`staff.members.get`, plus `staff.members.compensation` when the
//    session may read it) and saves a full snapshot: every operable field, explicit clearing of the
//    role (`''`, the same sentinel as `user_id`), rate typed in euros → cents, commission as %.
//  * STATUS and BOOKABLE are explicit controls; `terminated` is not one of the options — it is only
//    reachable through Terminate (schemas pinned below).
//  * DEACTIVATE and TERMINATE are row actions that ask first (ion-alert); terminate carries the last
//    day and a reason.
//  * A record is LINKABLE: `?member=<id>` opens it.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const schema = (rel: string) => JSON.parse(readFileSync(join(ROOT, 'schemas', rel), 'utf8')) as {
  properties: Record<string, { enum?: unknown[] }>;
};

const ROW = {
  id: 'm1', first_name: 'Ana', last_name: 'Ruiz', full_name: 'Ana Ruiz', email: 'ana@salon.es', phone: '600',
  role_id: 'r1', role_name: 'Peluquera', user_id: 'u1', status: 'active', is_bookable: 1, hire_date: '2026-01-15', color: '#ff0000',
};
const DETAIL = { ...ROW, employee_id: 'E-7', photo: '', termination_date: null, bio: 'Bio', specialties: 'color,cut', booking_buffer: 15, order: 0 };

const comandos: { name: string; payload: Record<string, unknown> }[] = [];
let permisos: string[] = ['staff.view_staff_member', 'staff.change_staff_member', 'staff.delete_staff_member', 'staff.view_compensation'];

beforeEach(() => {
  comandos.length = 0;
  permisos = ['staff.view_staff_member', 'staff.change_staff_member', 'staff.delete_staff_member', 'staff.view_compensation'];
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params?: Record<string, unknown>) => {
      if (name === 'staff.roles.list') return [{ id: 'r1', name: 'Peluquera' }];
      if (name === 'hub.users.list') return [{ id: 'u1', name: 'Ana', role: 'employee', is_active: true }];
      if (name === 'staff.members.get') return params?.staff_id === 'm1' ? [DETAIL] : [];
      if (name === 'staff.members.compensation') return [{ id: 'm1', full_name: 'Ana Ruiz', hourly_rate: 1550, commission_rate: 12.5 }];
      if (name === 'staff.services.list_for_member') return [];
      return [];
    },
    queryOptional: async () => undefined,
    queryPage: async () => ({ rows: [ROW, { ...ROW, id: 'm2', first_name: 'Bea', status: 'inactive', is_bookable: 0 }], total: 2 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    hasPermission: (p: string) => permisos.includes(p),
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  actions: { id: string; disabled?: (r: Record<string, unknown>) => boolean }[];
  editingId: string;
  form: Record<string, string | number | boolean>;
  pendingAction: { kind: 'deactivate' | 'terminate'; id: string; label: string } | null;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void> | void;
  createMember: (ev: Event) => Promise<void>;
  onActionDismiss: (ev: CustomEvent<{ role?: string; data?: { values?: Record<string, string> } }>) => Promise<void>;
};

async function montar(search = ''): Promise<Wc> {
  history.replaceState(null, '', search ? `/?${search}` : '/');
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  return el;
}

const accion = (el: Wc, id: string, row: Record<string, unknown> = ROW) =>
  el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: id, row } }));

describe('terminated is unreachable through create/update (schemas)', () => {
  it('status enums exclude terminated; delete carries date + reason', () => {
    expect(schema('member_create.json').properties.status.enum).not.toContain('terminated');
    expect(schema('member_update.json').properties.status.enum).not.toContain('terminated');
    const del = schema('member_delete.json').properties;
    expect(Object.keys(del)).toEqual(expect.arrayContaining(['staff_id', 'termination_date', 'reason']));
  });
});

describe('the record: edit loads everything and saves a full snapshot', () => {
  it('edit loads staff.members.get (+ compensation when allowed) into the form', async () => {
    const el = await montar();
    await accion(el, 'edit');
    await new Promise((r) => setTimeout(r, 0));
    expect(el.editingId).toBe('m1');
    expect(el.form.employee_id).toBe('E-7');
    expect(el.form.booking_buffer).toBe('15');
    expect(el.form.status).toBe('active');
    expect(el.form.is_bookable).toBe(true);
    expect(el.form.hire_date).toBe('2026-01-15');
    expect(el.form.color).toBe('#ff0000');
    expect(el.form.bio).toBe('Bio');
    expect(el.form.hourly_rate, 'cents → euros in the field').toBe('15.50');
    expect(el.form.commission_rate).toBe('12.5');
  });

  it('save sends the whole record: role cleared with "", euros → cents, commission %, status, bookable', async () => {
    const el = await montar();
    await accion(el, 'edit');
    await new Promise((r) => setTimeout(r, 0));
    el.form = { ...el.form, role_id: '', hourly_rate: '20', commission_rate: '15', status: 'inactive', is_bookable: false, booking_buffer: '10' };
    await el.createMember(new Event('submit'));
    const upd = comandos.find((c) => c.name === 'staff.members.update')!;
    expect(upd.payload).toMatchObject({
      staff_id: 'm1', role_id: '', hourly_rate: 2000, commission_rate: 15, status: 'inactive', is_bookable: 0,
      booking_buffer: 10, employee_id: 'E-7', bio: 'Bio', specialties: 'color,cut', color: '#ff0000', hire_date: '2026-01-15',
    });
  });

  it('without view_compensation the form neither loads nor sends compensation', async () => {
    permisos = ['staff.view_staff_member', 'staff.change_staff_member'];
    const el = await montar();
    await accion(el, 'edit');
    await new Promise((r) => setTimeout(r, 0));
    await el.createMember(new Event('submit'));
    const upd = comandos.find((c) => c.name === 'staff.members.update')!;
    expect('hourly_rate' in upd.payload).toBe(false);
    expect('commission_rate' in upd.payload).toBe(false);
    expect(el.shadowRoot.querySelector('[data-section="compensation"]')).toBeNull();
  });

  it('create sends the explicit bookable control and status active', async () => {
    const el = await montar();
    el.form = { ...el.form, first_name: 'Luz', last_name: 'Vega', is_bookable: false };
    await el.createMember(new Event('submit'));
    const cre = comandos.find((c) => c.name === 'staff.members.create')!;
    expect(cre.payload).toMatchObject({ first_name: 'Luz', is_bookable: 0, status: 'active' });
  });

  it('a record is linkable: ?member=m1 opens it', async () => {
    const el = await montar('member=m1');
    expect(el.editingId).toBe('m1');
  });
});

describe('lifecycle from the screen: deactivate and terminate ask first', () => {
  it('offers edit / deactivate / terminate; deactivate is disabled on an inactive row', async () => {
    const el = await montar();
    expect(el.actions.map((a) => a.id)).toEqual(['edit', 'deactivate', 'terminate']);
    const de = el.actions.find((a) => a.id === 'deactivate')!;
    expect(de.disabled!({ ...ROW, status: 'inactive' })).toBe(true);
    expect(de.disabled!(ROW)).toBe(false);
  });

  it('deactivate: confirm → staff.members.deactivate; cancel → nothing', async () => {
    const el = await montar();
    await accion(el, 'deactivate');
    expect(el.pendingAction?.kind).toBe('deactivate');
    await el.onActionDismiss(new CustomEvent('x', { detail: { role: 'cancel' } }));
    expect(comandos.length).toBe(0);
    await accion(el, 'deactivate');
    await el.onActionDismiss(new CustomEvent('x', { detail: { role: 'confirm' } }));
    expect(comandos.at(-1)).toEqual({ name: 'staff.members.deactivate', payload: { staff_id: 'm1' } });
  });

  it('terminate: confirm with last day + reason → staff.members.delete', async () => {
    const el = await montar();
    await accion(el, 'terminate');
    expect(el.pendingAction?.kind).toBe('terminate');
    await el.onActionDismiss(new CustomEvent('x', { detail: { role: 'confirm', data: { values: { termination_date: '2026-08-31', reason: 'moved' } } } }));
    expect(comandos.at(-1)).toEqual({
      name: 'staff.members.delete',
      payload: { staff_id: 'm1', termination_date: '2026-08-31', reason: 'moved' },
    });
  });

  it('the destructive actions only show for a session that may delete', async () => {
    permisos = ['staff.view_staff_member', 'staff.change_staff_member'];
    const el = await montar();
    expect(el.actions.map((a) => a.id)).toEqual(['edit']);
  });
});
