// staff#36 — la pestaña Ausencias tiene que poder DAR DE ALTA una ausencia, no solo aprobarla.
//
// El motor ya estaba entero (`staff.time_off.create`: guardas autoritativas de miembro y de
// solapamiento, staff#1) y la pantalla no lo llamaba desde ningún sitio: una vista declarada en
// `navigation[]` sin puerta de entrada, que en un negocio real se queda vacía para siempre.
//
// La forma la decide el MERCADO, no nosotros (regla de ERPlora): en Fresha, Vagaro, Mangomint,
// DaySmart, Toast, Square Team, Odoo Empleados y Dynamics 365 BC el encargado registra la ausencia
// ÉL — «Miembro · Tipo · Desde · Hasta · Día completo · (horas) · Motivo» y guardar; la aprobación
// es el SEGUNDO paso, nunca el único. Eso es lo que fija este fichero:
//
//  * el «+» de la barra existe y está gateado por `staff.manage_time_off` (mostrar/ocultar; el
//    runtime revalida igual);
//  * el formulario vive en el panel `create` de la propia tabla (paridad con Personal y Roles);
//  * lo que se manda es EXACTAMENTE lo que admite `schemas/time_off_create.json`;
//  * lo que el usuario puede corregir antes de enviar se valida ANTES (rango invertido, horas), y
//    lo que solo sabe el servidor (el solape) se pinta con su mensaje de dominio traducido.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const SCHEMA = JSON.parse(readFileSync(join(ROOT, 'schemas/time_off_create.json'), 'utf8')) as {
  properties: Record<string, unknown>;
  required: string[];
};

const MEMBERS = [
  { id: 'm1', full_name: 'Lucía Márquez', status: 'active' },
  { id: 'm2', full_name: 'Bea Soto', status: 'active' },
];

const comandos: { name: string; payload: Record<string, unknown> }[] = [];
let permisos: string[] = [];
let rechazo: Error | null = null;

class DomainError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

beforeEach(() => {
  comandos.length = 0;
  rechazo = null;
  permisos = ['staff.view_time_off', 'staff.manage_time_off'];
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'staff.members.list' ? MEMBERS : []),
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      if (rechazo) throw rechazo;
      return {};
    },
    on: () => () => {},
    locale: 'es',
    hasPermission: (p: string) => permisos.includes(p),
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  draft: Record<string, unknown>;
  formError: string;
  createTimeOff: (ev: Event) => Promise<void>;
};

async function montar(): Promise<Wc> {
  await import('./erp-staff-time-off');
  const el = document.createElement('erp-staff-time-off') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const tabla = (el: Wc) => el.shadowRoot.querySelector('ok-data-table') as (HTMLElement & { addable: boolean }) | null;

/** Rellena el borrador del formulario y guarda. */
async function guardar(el: Wc, draft: Record<string, unknown>): Promise<void> {
  el.draft = { ...el.draft, ...draft };
  await el.createTimeOff(new Event('submit'));
  await el.updateComplete;
}

describe('la puerta de alta existe y está donde el usuario la busca (staff#36)', () => {
  it('la tabla declara `addable` → hay «+» en la barra, como en Personal y Roles', async () => {
    const el = await montar();
    expect(tabla(el)?.addable, 'sin `addable` no hay «+»: la pantalla solo aprueba').toBe(true);
  });

  it('sin `staff.manage_time_off` no se pinta el «+»', async () => {
    permisos = ['staff.view_time_off'];
    const el = await montar();
    expect(tabla(el)?.addable, 'un employee no da de alta ausencias').toBe(false);
  });

  it('el formulario se proyecta en el panel `create` de la propia tabla', async () => {
    const el = await montar();
    const form = el.shadowRoot.querySelector('form[slot="create"]');
    expect(form, 'no hay formulario de alta en el slot `create`').toBeTruthy();
    expect(form?.closest('ok-data-table'), 'el formulario cuelga fuera de la tabla').toBeTruthy();
  });

  it('el formulario ofrece los campos que ofrece el mercado: miembro, tipo, fechas, día completo y motivo', async () => {
    const el = await montar();
    const form = el.shadowRoot.querySelector('form[slot="create"]')!;
    const campos = [...form.querySelectorAll('[data-field]')].map((n) => n.getAttribute('data-field'));
    expect(campos).toEqual(
      expect.arrayContaining(['staff_id', 'leave_type', 'start_date', 'end_date', 'is_full_day', 'reason']),
    );
  });

  it('el selector de miembro se puebla con los miembros REALES del hub', async () => {
    const el = await montar();
    const opciones = [...el.shadowRoot.querySelectorAll('[data-field="staff_id"] ion-select-option')];
    expect(opciones.map((o) => o.textContent?.trim())).toEqual(['Lucía Márquez', 'Bea Soto']);
  });
});

describe('guardar llama al command que ya existía, con su contrato (staff#36)', () => {
  it('una ausencia de día completo manda staff.time_off.create', async () => {
    const el = await montar();
    await guardar(el, {
      staff_id: 'm1', leave_type: 'vacation', start_date: '2026-09-10', end_date: '2026-09-15',
      is_full_day: true, reason: 'Vacaciones de verano',
    });
    const alta = comandos.find((c) => c.name === 'staff.time_off.create');
    expect(alta, 'no se llamó a staff.time_off.create').toBeTruthy();
    expect(alta!.payload).toMatchObject({
      staff_id: 'm1', leave_type: 'vacation', start_date: '2026-09-10', end_date: '2026-09-15',
      is_full_day: 1, start_time: null, end_time: null, reason: 'Vacaciones de verano',
    });
  });

  it('el payload solo lleva claves del schema (`additionalProperties: false` lo rechazaría)', async () => {
    const el = await montar();
    await guardar(el, { staff_id: 'm1', start_date: '2026-09-10', end_date: '2026-09-10', is_full_day: true });
    const alta = comandos.find((c) => c.name === 'staff.time_off.create')!;
    for (const clave of Object.keys(alta.payload)) {
      expect(Object.keys(SCHEMA.properties), `\`${clave}\` no existe en el schema del command`).toContain(clave);
    }
    for (const obligatoria of SCHEMA.required) {
      expect(alta.payload[obligatoria], `falta la clave obligatoria \`${obligatoria}\``).toBeTruthy();
    }
  });

  it('una ausencia de MEDIO día viaja con sus horas', async () => {
    const el = await montar();
    await guardar(el, {
      staff_id: 'm2', leave_type: 'personal', start_date: '2026-09-10', end_date: '2026-09-10',
      is_full_day: false, start_time: '09:00', end_time: '13:00',
    });
    const alta = comandos.find((c) => c.name === 'staff.time_off.create')!;
    expect(alta.payload).toMatchObject({ is_full_day: 0, start_time: '09:00', end_time: '13:00' });
  });
});

describe('lo que el usuario puede arreglar, se le dice ANTES de enviar (staff#36)', () => {
  it('fin antes que inicio: mensaje y NINGUNA llamada al command', async () => {
    const el = await montar();
    await guardar(el, { staff_id: 'm1', start_date: '2026-10-20', end_date: '2026-10-01', is_full_day: true });
    expect(comandos, 'se mandó al servidor un rango que la pantalla ya sabía inválido').toEqual([]);
    expect(el.formError, 'el usuario no ve por qué no se ha guardado').toBeTruthy();
  });

  it('sin miembro elegido no se manda nada', async () => {
    const el = await montar();
    await guardar(el, { staff_id: '', start_date: '2026-09-10', end_date: '2026-09-15', is_full_day: true });
    expect(comandos).toEqual([]);
    expect(el.formError).toBeTruthy();
  });

  it('media jornada sin horas, o con la salida antes de la entrada, tampoco sale', async () => {
    const el = await montar();
    await guardar(el, { staff_id: 'm1', start_date: '2026-09-10', end_date: '2026-09-10', is_full_day: false });
    expect(comandos).toEqual([]);
    expect(el.formError).toBeTruthy();

    el.formError = '';
    await guardar(el, { is_full_day: false, start_time: '13:00', end_time: '09:00' });
    expect(comandos).toEqual([]);
    expect(el.formError).toBeTruthy();
  });
});

describe('lo que solo sabe el servidor se pinta con su mensaje de dominio (staff#36)', () => {
  it('un solape se lee traducido, no como un error genérico', async () => {
    const es = JSON.parse(readFileSync(join(ROOT, 'locales/es.json'), 'utf8')) as { errors: Record<string, string> };
    rechazo = new DomainError('staff.overlapping_time_off', 'That staff member already has…');
    const el = await montar();
    await guardar(el, { staff_id: 'm1', start_date: '2026-09-12', end_date: '2026-09-18', is_full_day: true });
    expect(el.formError).toBe(es.errors['staff.overlapping_time_off']);
  });
});
