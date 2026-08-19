// staff#2 — a schedule template is OPERABLE from the screen: its intervals are visible, it can be
// edited (the week is replaced), activated/deactivated and deleted (with confirmation), and the
// server rules (validity range, at least one working day) are mirrored in the client.
//
// Market (Square staff availability, Fresha shifts, Booksy working hours, Microsoft Bookings
// employee hours): the weekly hours live on the professional, are edited in place, and can be
// switched off without deleting history.
import { beforeEach, describe, expect, it } from 'vitest';

const MIEMBROS = [{ id: 'm1', full_name: 'Ana Ruiz', status: 'active' }];

const HORARIOS = [
  { id: 'h1', staff_id: 'm1', name: 'Regular', is_default: 1, effective_from: null, effective_until: null, is_active: 1 },
  { id: 'h2', staff_id: 'm1', name: 'Summer', is_default: 0, effective_from: '2026-07-01', effective_until: '2026-08-31', is_active: 0 },
];

const HORAS = [
  { id: 'w1', schedule_id: 'h1', day_of_week: 0, start_time: '09:00:00', end_time: '18:00:00', break_start: '13:00:00', break_end: '14:00:00', is_working: 1 },
  { id: 'w2', schedule_id: 'h1', day_of_week: 2, start_time: '10:00:00', end_time: '16:00:00', break_start: null, break_end: null, is_working: 1 },
  { id: 'w3', schedule_id: 'h2', day_of_week: 5, start_time: '10:00:00', end_time: '14:00:00', break_start: null, break_end: null, is_working: 1 },
];

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.members.list') return MIEMBROS;
      if (name === 'staff.schedules.list_for_member') return HORARIOS;
      if (name === 'staff.schedules.hours_for_member') return HORAS;
      return [];
    },
    queryPage: async () => ({ rows: HORARIOS, total: HORARIOS.length }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  actions: { id: string; label: string; disabled?: (r: Record<string, unknown>) => boolean }[];
  columns: { key: string; format?: (r: Record<string, unknown>) => string }[];
  hours: Record<string, unknown>[];
  editingId: string;
  newName: string;
  effectiveFrom: string;
  effectiveUntil: string;
  week: { day: number; working: boolean; start: string; end: string; breakStart: string; breakEnd: string }[];
  formError: string;
  pendingDelete: { id: string; label: string } | null;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void> | void;
  createSchedule: (ev: Event) => Promise<void>;
  onDeleteDismiss: (ev: CustomEvent<{ role?: string }>) => Promise<void>;
};

async function montar(): Promise<Wc> {
  await import('./erp-staff-schedules');
  const el = document.createElement('erp-staff-schedules') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const accion = (el: Wc, id: string, row: Record<string, unknown>) =>
  el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: id, row } }));

describe('la lista enseña las franjas de cada plantilla', () => {
  it('carga staff.schedules.hours_for_member junto con la lista y las agrupa por plantilla', async () => {
    const el = await montar();
    expect(el.hours.length).toBe(3);
    const col = el.columns.find((c) => c.key === 'hours');
    expect(col, 'no hay columna de franjas').toBeTruthy();
    const txt = col!.format!(HORARIOS[0]);
    expect(txt).toContain('ui.dayMonday');
    expect(txt).toContain('09:00');
    expect(txt).toContain('13:00'); // the break is visible
    expect(txt).toContain('ui.dayWednesday');
    expect(txt).not.toContain('ui.daySaturday'); // that day belongs to the other template
  });
});

describe('acciones por fila: editar, activar/desactivar, borrar', () => {
  it('ofrece edit / toggle / delete', async () => {
    const el = await montar();
    expect(el.actions.map((a) => a.id)).toEqual(['edit', 'toggle', 'delete']);
  });

  it('editar precarga el panel con la plantilla y SU semana, y guardar manda schedules.update con la semana entera', async () => {
    const el = await montar();
    await accion(el, 'edit', HORARIOS[0]);
    expect(el.editingId).toBe('h1');
    expect(el.newName).toBe('Regular');
    const monday = el.week.find((d) => d.day === 0)!;
    expect(monday.working).toBe(true);
    expect(monday.start).toBe('09:00');
    expect(monday.breakStart).toBe('13:00');
    expect(el.week.find((d) => d.day === 1)!.working).toBe(false);

    el.newName = 'Regular v2';
    await el.createSchedule(new Event('submit'));
    const upd = comandos.find((c) => c.name === 'staff.schedules.update');
    expect(upd, 'no se mandó schedules.update').toBeTruthy();
    expect(upd!.payload.schedule_id).toBe('h1');
    expect(upd!.payload.name).toBe('Regular v2');
    const wh = upd!.payload.working_hours as { day_of_week: number; break_start: string | null }[];
    expect(wh.map((w) => w.day_of_week)).toEqual([0, 2]);
    expect(wh[0].break_start).toBe('13:00');
    expect(comandos.find((c) => c.name === 'staff.schedules.create')).toBeUndefined();
    expect(el.editingId, 'tras guardar el panel vuelve al modo alta').toBe('');
  });

  it('toggle manda set_active con el valor contrario al de la fila', async () => {
    const el = await montar();
    await accion(el, 'toggle', HORARIOS[0]);
    expect(comandos.at(-1)).toEqual({ name: 'staff.schedules.set_active', payload: { schedule_id: 'h1', is_active: 0 } });
    await accion(el, 'toggle', HORARIOS[1]);
    expect(comandos.at(-1)).toEqual({ name: 'staff.schedules.set_active', payload: { schedule_id: 'h2', is_active: 1 } });
  });

  it('borrar pide confirmación y solo entonces manda schedules.delete', async () => {
    const el = await montar();
    await accion(el, 'delete', HORARIOS[1]);
    expect(el.pendingDelete?.id).toBe('h2');
    expect(comandos.find((c) => c.name === 'staff.schedules.delete')).toBeUndefined();
    await el.onDeleteDismiss(new CustomEvent('ionAlertDidDismiss', { detail: { role: 'cancel' } }));
    expect(comandos.find((c) => c.name === 'staff.schedules.delete')).toBeUndefined();
    await accion(el, 'delete', HORARIOS[1]);
    await el.onDeleteDismiss(new CustomEvent('ionAlertDidDismiss', { detail: { role: 'confirm' } }));
    expect(comandos.find((c) => c.name === 'staff.schedules.delete')!.payload).toEqual({ schedule_id: 'h2' });
  });
});

describe('las reglas del servidor se reflejan en cliente', () => {
  it('una vigencia invertida no se envía', async () => {
    const el = await montar();
    el.effectiveFrom = '2026-09-10';
    el.effectiveUntil = '2026-09-01';
    await el.createSchedule(new Event('submit'));
    expect(comandos.length).toBe(0);
    expect(el.formError).toBe('ui.valRangeOrder');
  });
});
