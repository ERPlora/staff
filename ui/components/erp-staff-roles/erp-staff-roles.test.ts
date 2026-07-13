// Contrato de la BARRA de la lista de roles.
//
// El alta de un rol vive DENTRO de `ok-data-table`, detrás del «+» de su barra (panel
// `slot="create"`), igual que en /employees del core y en el CRUD de productos de `inventory`; no
// hay formulario suelto encima de la tabla ni título propio (lo pinta el topbar del shell).
//
// Los roles NO tienen ningún campo de dominio cerrado en la lista (nombre, descripción y nº de
// miembros): sus filtros siguen siendo texto/rango, que es lo que el servidor sabe filtrar
// (module.json → staff.roles.list.filters: name/description `eq`, member_count `range`).
import { beforeEach, describe, expect, it } from 'vitest';

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({
      rows: [{ id: 'r1', name: 'Peluquero', description: 'Corte y color', color: '#aa0000', member_count: 2 }],
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
  await import('./erp-staff-roles');
  const el = document.createElement('erp-staff-roles');
  document.body.appendChild(el);
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
  return el as HTMLElement & { shadowRoot: ShadowRoot };
}

const tabla = (el: HTMLElement & { shadowRoot: ShadowRoot }) =>
  el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { addable: boolean; fill: boolean }) | null;

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

describe('el alta sigue funcionando desde el panel', () => {
  it('crear un rol manda staff.roles.create con los datos del panel', async () => {
    const el = await montar();
    const wc = el as unknown as {
      newName: string;
      newDesc: string;
      newColor: string;
      createRole: (ev: Event) => Promise<void>;
    };
    wc.newName = 'Peluquero';
    wc.newDesc = 'Corte y color';
    wc.newColor = '#aa0000';
    await wc.createRole(new Event('submit'));

    const alta = comandos.find((c) => c.name === 'staff.roles.create');
    expect(alta, 'no se mandó el alta del rol').toBeTruthy();
    expect(alta!.payload.name).toBe('Peluquero');
    expect(alta!.payload.description).toBe('Corte y color');
  });
});
