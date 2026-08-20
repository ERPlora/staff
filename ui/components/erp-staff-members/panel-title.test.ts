// staff#38 — editar un empleado abría un panel titulado «Nuevo».
//
// El panel de la ficha es UNO y tiene dos modos (`editingId` decide cuál), y el rótulo se quedó
// cableado al del alta: el botón sí decía «Guardar», pero la cabecera decía «Nuevo». Para el
// usuario el título es lo que le dice QUÉ va a pasar al pulsar, así que guardar da miedo — parece
// que va a duplicar la ficha. Y esta ficha lleva la nómina (tarifa por hora y % de comisión).
//
// La cabecera del drawer la pinta `ok-data-table` (`this.t.newRecord`), que acepta overrides
// parciales por la prop `.labels`. Así que el módulo NO necesita tocar OutfitKit: pasa el rótulo
// que corresponde a su modo. Lo que fija este fichero es eso — que el rótulo depende del modo, en
// los dos sentidos, y que está traducido en las dos lenguas del módulo.
//
// El nombre en el título es lo que hacen Odoo, Dynamics 365 BC, Square Team y Fresha: identificar
// EN LA CABECERA el registro que se está tocando, para no editar a la persona equivocada.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');

const ROW = {
  id: 'm1', first_name: 'Lucía', last_name: 'Márquez', full_name: 'Lucía Márquez',
  email: 'lucia@example.com', phone: '600999888', role_id: 'r1', role_name: 'Peluquera',
  user_id: null, status: 'active', is_bookable: 1,
};
const DETAIL = { ...ROW, employee_id: 'E-1', hire_date: '2026-01-15', color: '', bio: '', specialties: '', booking_buffer: 0 };

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string, params?: Record<string, unknown>) => {
      if (name === 'staff.roles.list') return [{ id: 'r1', name: 'Peluquera' }];
      if (name === 'staff.members.get') return params?.staff_id === 'm1' ? [DETAIL] : [];
      return [];
    },
    queryOptional: async () => undefined,
    queryPage: async () => ({ rows: [ROW], total: 1 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    hasPermission: () => true,
    // Devuelve la clave con sus parámetros interpolados, para poder afirmar CUÁL se usó y con qué.
    t: (_c: unknown, key: string, params?: Record<string, unknown>) =>
      params ? `${key}(${Object.entries(params).map(([k, v]) => `${k}=${v}`).join(',')})` : key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  editingId: string;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => Promise<void> | void;
  createMember: (ev: Event) => Promise<void>;
};

async function montar(): Promise<Wc> {
  history.replaceState(null, '', '/');
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  return el;
}

const rotulo = (el: Wc): string | undefined =>
  (el.shadowRoot.querySelector('ok-data-table') as unknown as { labels?: { newRecord?: string } } | null)?.labels
    ?.newRecord;

async function editar(el: Wc): Promise<void> {
  await el.onRowAction(new CustomEvent('rowAction', { detail: { actionId: 'edit', row: ROW } }));
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

describe('el rótulo del panel dice lo que va a pasar (staff#38)', () => {
  it('dar de alta: el panel se titula «Nuevo» (lo que ya estaba bien, y no se rompe)', async () => {
    const el = await montar();
    expect(el.editingId).toBe('');
    expect(rotulo(el)).toBe('ui.panelNew');
  });

  it('editar: el panel se titula «Editar», con el nombre del empleado', async () => {
    const el = await montar();
    await editar(el);
    expect(el.editingId).toBe('m1');
    expect(rotulo(el), 'el panel de edición sigue diciendo «Nuevo»').toBe('ui.panelEdit(name=Lucía Márquez)');
  });

  it('cerrar la edición devuelve el rótulo a «Nuevo» (el panel es el MISMO)', async () => {
    const el = await montar();
    await editar(el);
    await el.createMember(new Event('submit'));
    await el.updateComplete;
    expect(el.editingId).toBe('');
    expect(rotulo(el)).toBe('ui.panelNew');
  });
});

describe('el rótulo está traducido en las dos lenguas del módulo (staff#38)', () => {
  it.each(['en', 'es'])('%s trae panelNew y panelEdit, y panelEdit lleva {name}', (lang) => {
    const cat = JSON.parse(readFileSync(join(ROOT, `locales/${lang}.json`), 'utf8')) as {
      ui: Record<string, string>;
    };
    expect(cat.ui.panelNew, `falta ui.panelNew en ${lang}`).toBeTruthy();
    expect(cat.ui.panelEdit, `falta ui.panelEdit en ${lang}`).toBeTruthy();
    expect(cat.ui.panelEdit, 'el rótulo de edición tiene que poder nombrar al empleado').toContain('{name}');
  });
});
