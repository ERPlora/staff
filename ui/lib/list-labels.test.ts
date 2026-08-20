// staff#37 — los listados pintaban el valor CRUDO del enum y la fecha en ISO.
//
// En un hub en español la fila decía `active`, `vacation`, `pending`, `2026-09-10`: cabeceras
// traducidas y contenido en inglés técnico. Y lo que lo convierte en bug y no en tarea pendiente es
// que la traducción YA EXISTÍA en la misma pantalla — el `<ion-select>` de la ficha ofrecía
// «Activo / Inactivo / De baja» para el MISMO campo `status`. Había dos fuentes para un solo enum y
// la de la tabla era el valor sin traducir.
//
// Por eso este fichero comprueba dos cosas a la vez: que la columna pinta la etiqueta, y que la
// etiqueta sale del MISMO catálogo que el desplegable (`ui/lib/enums.ts`). El `t` de estos tests
// resuelve el catálogo REAL del módulo, así que lo que se afirma es el texto que ve el usuario.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../..');
const CATALOGS: Record<string, Record<string, unknown>> = {
  es: JSON.parse(readFileSync(join(ROOT, 'locales/es.json'), 'utf8')),
  en: JSON.parse(readFileSync(join(ROOT, 'locales/en.json'), 'utf8')),
};

let locale = 'es';

/** Resolutor equivalente al del shell: `ui.foo` → catálogo del idioma activo, con fallback a `en`. */
function resolve(key: string, params?: Record<string, unknown>): string {
  const pick = (lang: string): unknown =>
    key.split('.').reduce<unknown>((acc, part) => (acc as Record<string, unknown>)?.[part], CATALOGS[lang]);
  const text = (pick(locale) ?? pick('en') ?? key) as string;
  return params
    ? Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), text)
    : text;
}

const MEMBER_ROW = {
  id: 'm1', first_name: 'Lucía', last_name: 'Márquez', full_name: 'Lucía Márquez',
  email: 'lucia@example.com', phone: '600999888', role_id: 'r1', role_name: 'Peluquera',
  user_id: null, status: 'active', is_bookable: 1,
};
const TIME_OFF_ROW = {
  id: 't1', staff_id: 'm1', staff_name: 'Lucía Márquez', leave_type: 'vacation',
  start_date: '2026-09-10', end_date: '2026-09-15', is_full_day: 1, status: 'pending',
};

beforeEach(() => {
  locale = 'es';
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => (name === 'staff.roles.list' ? [{ id: 'r1', name: 'Peluquera' }] : []),
    queryOptional: async () => undefined,
    queryPage: async (name: string) => ({ rows: name === 'staff.members.list' ? [MEMBER_ROW] : [TIME_OFF_ROW], total: 1 }),
    command: async () => ({}),
    on: () => () => {},
    get locale() {
      return locale;
    },
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    hasPermission: () => true,
    t: (_c: unknown, key: string, params?: Record<string, unknown>) => resolve(key, params),
  };
});

type Col = { key: string; format?: (r: Record<string, unknown>) => unknown; options?: { value: string; label: string }[] };

async function montar(
  tag: 'erp-staff-members' | 'erp-staff-time-off' | 'erp-staff-schedules',
): Promise<HTMLElement & { columns: Col[]; shadowRoot: ShadowRoot }> {
  history.replaceState(null, '', '/');
  if (tag === 'erp-staff-members') await import('../components/erp-staff-members/erp-staff-members');
  else if (tag === 'erp-staff-schedules') await import('../components/erp-staff-schedules/erp-staff-schedules');
  else await import('../components/erp-staff-time-off/erp-staff-time-off');
  const el = document.createElement(tag) as HTMLElement & { columns: Col[]; shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const pinta = (el: { columns: Col[] }, key: string, row: Record<string, unknown>): unknown =>
  el.columns.find((c) => c.key === key)?.format?.(row);

describe('los listados hablan el idioma del hub, no el del enum (staff#37)', () => {
  it('Personal: la columna ESTADO pinta «Activo», no `active`', async () => {
    const el = await montar('erp-staff-members');
    expect(pinta(el, 'status', MEMBER_ROW)).toBe('Activo');
  });

  it('Personal: los estados que la ficha SÍ sabe nombrar también salen en la tabla', async () => {
    const el = await montar('erp-staff-members');
    expect(pinta(el, 'status', { ...MEMBER_ROW, status: 'on_leave' })).toBe('De baja');
    expect(pinta(el, 'status', { ...MEMBER_ROW, status: 'terminated' })).toBeTruthy();
    expect(pinta(el, 'status', { ...MEMBER_ROW, status: 'terminated' })).not.toBe('terminated');
  });

  it('Ausencias: TIPO y ESTADO se leen en español', async () => {
    const el = await montar('erp-staff-time-off');
    expect(pinta(el, 'leave_type', TIME_OFF_ROW)).toBe('Vacaciones');
    expect(pinta(el, 'status', TIME_OFF_ROW)).toBe('Pendiente');
    expect(pinta(el, 'status', { ...TIME_OFF_ROW, status: 'approved' })).toBe('Aprobada');
  });

  it('Ausencias: las fechas salen en el formato del hub, no en ISO', async () => {
    const el = await montar('erp-staff-time-off');
    expect(pinta(el, 'start_date', TIME_OFF_ROW)).toBe('10/09/2026');
    expect(pinta(el, 'end_date', TIME_OFF_ROW)).toBe('15/09/2026');
  });

  it('en un hub en inglés se lee en inglés: no queda cableado al español', async () => {
    locale = 'en';
    const el = await montar('erp-staff-time-off');
    expect(pinta(el, 'leave_type', TIME_OFF_ROW)).toBe('Vacation');
    expect(pinta(el, 'status', TIME_OFF_ROW)).toBe('Pending');
    expect(pinta(el, 'start_date', TIME_OFF_ROW)).toBe('09/10/2026');
  });

  it('Horarios: la vigencia tampoco se lee en ISO — y un horario sin fin sigue diciendo «—»', async () => {
    const el = await montar('erp-staff-schedules');
    const fila = { effective_from: '2026-09-10', effective_until: null };
    expect(pinta(el, 'effective_from', fila)).toBe('10/09/2026');
    expect(pinta(el, 'effective_until', fila)).toBe('—');
  });

  it('un valor que el catálogo no conoce se pinta tal cual, sin romper la fila', async () => {
    const el = await montar('erp-staff-time-off');
    expect(pinta(el, 'leave_type', { ...TIME_OFF_ROW, leave_type: 'sabbatical' })).toBe('sabbatical');
    expect(pinta(el, 'start_date', { ...TIME_OFF_ROW, start_date: '' })).toBe('');
  });
});

describe('una sola fuente de etiquetas: la tabla y el desplegable leen del mismo sitio (staff#37)', () => {
  it('Ausencias: las opciones del filtro de estado son las mismas etiquetas que pinta la columna', async () => {
    const el = await montar('erp-staff-time-off');
    const estado = el.columns.find((c) => c.key === 'status')!;
    for (const opcion of estado.options ?? []) {
      expect(opcion.label, `el filtro y la celda dicen cosas distintas para \`${opcion.value}\``).toBe(
        estado.format?.({ status: opcion.value }),
      );
    }
  });

  it('Ausencias: el desplegable TIPO del alta ofrece las mismas etiquetas que la columna', async () => {
    const el = await montar('erp-staff-time-off');
    const tipo = el.columns.find((c) => c.key === 'leave_type')!;
    const opciones = [...el.shadowRoot.querySelectorAll('[data-field="leave_type"] ion-select-option')];
    expect(opciones.length, 'el alta de #36 dejó de ofrecer tipos').toBeGreaterThan(0);
    for (const o of opciones) {
      const value = (o as unknown as { value: string }).value;
      expect(o.textContent?.trim()).toBe(tipo.format?.({ leave_type: value }));
    }
  });

  it('Personal: las opciones del filtro de estado son las mismas etiquetas que pinta la columna', async () => {
    const el = await montar('erp-staff-members');
    const estado = el.columns.find((c) => c.key === 'status')!;
    for (const opcion of estado.options ?? []) {
      expect(opcion.label).toBe(estado.format?.({ status: opcion.value }));
    }
  });
});
