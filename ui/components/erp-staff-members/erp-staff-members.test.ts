// Contrato de la BARRA de la lista de personal.
//
// El alta de un miembro vive DENTRO de `ok-data-table`, detrás del «+» de su barra (panel
// `slot="create"`), como en /employees del core y en el CRUD de productos de `inventory`. Nada de
// formularios sueltos flotando encima de la tabla, y nada de título propio: el topbar del shell ya
// pinta el nombre de la vista.
//
// Los filtros van dentro de la tabla (embudo) y los de DOMINIO CERRADO se eligen, no se teclean:
// el rol sale de los roles REALES (`staff.roles.list`) y el estado de su dominio (`active|inactive`).
// El servidor filtra ambos por `eq` (module.json → staff.members.list.filters).
import { beforeEach, describe, expect, it } from 'vitest';

const ROLES = [
  { id: 'r1', name: 'Peluquero' },
  { id: 'r2', name: 'Recepción' },
];

// Usuarios REALES del Hub (core, `hub.users.list`): la ficha del profesional cuelga de uno.
const HUB_USERS = [
  { id: 'u1', name: 'Ana Ruiz', role: 'employee', is_active: true },
  { id: 'u2', name: 'Ioan Beilic', role: 'owner', is_active: true },
  { id: 'u3', name: 'Ex Empleado', role: 'employee', is_active: false },
];

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) =>
      name === 'staff.roles.list' ? ROLES : name === 'hub.users.list' ? HUB_USERS : [],
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    queryPage: async () => ({
      rows: [
        {
          id: 'm1',
          first_name: 'Ana',
          last_name: 'Ruiz',
          full_name: 'Ana Ruiz',
          email: 'ana@salon.es',
          phone: '600',
          role_id: 'r1',
          role_name: 'Peluquero',
          user_id: 'u1',
          status: 'active',
          is_bookable: 1,
          hourly_rate: '12.00',
        },
      ],
      total: 1,
    }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    t: (_catalog: unknown, key: string) => key,
  };
});

async function montar() {
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const tabla = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { addable: boolean; fill: boolean }) | null;

type Col = { key: string; filterType?: string; options?: { value: string; label: string }[] };
const columnas = (el: HTMLElement) => (el as unknown as { columns: Col[] }).columns;

describe('el alta vive DENTRO de la tabla (paridad con /employees e inventory)', () => {
  it('la tabla declara `addable` → pinta el «+» en su barra', async () => {
    const el = await montar();
    expect(tabla(el)?.addable, 'sin `addable` no hay «+» en la barra de la tabla').toBe(true);
  });

  it('la tabla llena el alto (`fill`): scroll interno y pie siempre visible', async () => {
    const el = await montar();
    expect(tabla(el)?.fill).toBe(true);
  });

  it('el formulario de alta se proyecta en el panel `create` de la tabla', async () => {
    const el = await montar();
    const form = el.shadowRoot.querySelector('form[slot="create"]');
    expect(form, 'el formulario de alta no está en el slot `create`').toBeTruthy();
    expect(form?.closest('ok-data-table'), 'el formulario de alta cuelga fuera de la tabla').toBeTruthy();
  });

  it('no queda NINGÚN control de alta suelto fuera de la tabla', async () => {
    const el = await montar();
    const sueltos = [...el.shadowRoot.querySelectorAll('form, ion-input, ion-select, ion-button')].filter(
      (n) => !n.closest('ok-data-table'),
    );
    expect(sueltos.map((n) => n.tagName.toLowerCase()), 'hay controles de alta fuera de la tabla').toEqual([]);
  });

  it('la vista no pinta título propio (lo pinta el topbar del shell)', async () => {
    const el = await montar();
    expect(el.shadowRoot.querySelector('h2'), 'título duplicado: el shell ya lo pinta').toBeNull();
  });
});

describe('los filtros van en la tabla, y los de dominio cerrado son `select`', () => {
  it('el rol se filtra con un select poblado con los roles reales', async () => {
    const el = await montar();
    const rol = columnas(el).find((c) => c.key === 'role_name');
    expect(rol?.filterType, 'el rol se filtra tecleando texto libre').toBe('select');
    expect(rol?.options?.map((o) => o.label)).toEqual(['Peluquero', 'Recepción']);
  });

  it('el estado sigue siendo un select con su dominio (regresión: ya estaba bien)', async () => {
    const el = await montar();
    const estado = columnas(el).find((c) => c.key === 'status');
    expect(estado?.filterType).toBe('select');
    expect(estado?.options?.map((o) => o.value)).toEqual(['active', 'inactive']);
  });
});

describe('el alta sigue funcionando desde el panel', () => {
  it('crear un miembro manda staff.members.create con los datos del panel', async () => {
    const el = await montar();
    const wc = el as unknown as {
      newFirst: string;
      newLast: string;
      newEmail: string;
      newRole: string;
      createMember: (ev: Event) => Promise<void>;
    };
    wc.newFirst = 'Ana';
    wc.newLast = 'Ruiz';
    wc.newEmail = 'ana@salon.es';
    wc.newRole = 'r1';
    await wc.createMember(new Event('submit'));

    const alta = comandos.find((c) => c.name === 'staff.members.create');
    expect(alta, 'no se mandó el alta del miembro').toBeTruthy();
    expect(alta!.payload.first_name).toBe('Ana');
    expect(alta!.payload.role_id).toBe('r1');
  });
});


describe('la tarifa por hora habla céntimos → formatMoney (bug ×100)', () => {
  it('1500 céntimos/hora se pintan «15.00 €», no «1500.00»', async () => {
    const el = await montar();
    const cols = (el as unknown as { columns: { key: string; format?: (r: unknown) => string }[] }).columns;
    const rate = cols.find((c) => c.key === 'hourly_rate');
    expect(rate?.format, 'la columna hourly_rate no tiene formato de dinero').toBeTruthy();
    expect(rate!.format!({ hourly_rate: 1500 })).toBe('15.00 €');
  });
});


// ── La ficha de staff cuelga de un usuario del Hub (ADR-0192) ───────────────────────────────
// `staff` es una capa SOBRE la identidad del core: quien atiende suele ser alguien que entra al
// Hub. El vínculo se elige en el panel, con los usuarios que sirve el core por el dispatcher.
describe('vínculo con el usuario del Hub', () => {
  it('ofrece los usuarios ACTIVOS del Hub, no los dados de baja', async () => {
    const el = await montar();
    const usuarios = (el as unknown as { hubUsers: { id: string; name: string }[] }).hubUsers;
    expect(usuarios.map((u) => u.name), 'un usuario de baja no puede recibir fichas nuevas').toEqual([
      'Ana Ruiz',
      'Ioan Beilic',
    ]);
  });

  it('el alta manda el user_id elegido', async () => {
    const el = await montar();
    const wc = el as unknown as {
      newFirst: string; newLast: string; newUserId: string;
      createMember: (ev: Event) => Promise<void>;
    };
    wc.newFirst = 'Ana';
    wc.newLast = 'Ruiz';
    wc.newUserId = 'u1';
    await wc.createMember(new Event('submit'));
    expect(comandos.find((c) => c.name === 'staff.members.create')!.payload.user_id).toBe('u1');
  });

  it('editar precarga el vínculo actual y permite DESvincular con cadena vacía', async () => {
    const el = await montar();
    const wc = el as unknown as {
      newUserId: string; editingId: string;
      onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => void;
      createMember: (ev: Event) => Promise<void>;
    };
    wc.onRowAction(
      new CustomEvent('rowAction', {
        detail: { actionId: 'edit', row: { id: 'm1', first_name: 'Ana', last_name: 'Ruiz', email: '', role_id: 'r1', user_id: 'u1' } },
      }),
    );
    expect(wc.newUserId, 'el panel no muestra de quién es la ficha').toBe('u1');

    wc.newUserId = '';
    await wc.createMember(new Event('submit'));
    // '' (no null) es el centinela de DESVINCULAR del command: null significaría «no lo toques».
    expect(comandos.find((c) => c.name === 'staff.members.update')!.payload.user_id).toBe('');
  });
});
