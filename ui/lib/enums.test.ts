// staff#37 — el catálogo de enums y fechas del módulo, probado como lo que es: una función pura
// sobre el catálogo i18n real. Lo que aquí se fija es el COMPORTAMIENTO DE BORDE, que es donde una
// tabla se rompe de verdad; el cableado con las columnas se prueba en `list-labels.test.ts`.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { LEAVE_TYPE_KEY, MEMBER_STATUS_KEY, REQUEST_STATUS_KEY, enumLabel, enumOptions, formatDate } from './enums';

const ROOT = join(__dirname, '../..');
const CATALOGS: Record<string, Record<string, unknown>> = {
  es: JSON.parse(readFileSync(join(ROOT, 'locales/es.json'), 'utf8')),
  en: JSON.parse(readFileSync(join(ROOT, 'locales/en.json'), 'utf8')),
};

let locale = 'es';

beforeEach(() => {
  locale = 'es';
  (globalThis as Record<string, unknown>).erplora = {
    get locale() {
      return locale;
    },
    t: (_c: unknown, key: string) =>
      (key.split('.').reduce<unknown>((acc, p) => (acc as Record<string, unknown>)?.[p], CATALOGS[locale]) ??
        key) as string,
  };
});

describe('enumLabel: el valor se lee, y lo que no se conoce no se pierde', () => {
  it('traduce cada valor del dominio en el idioma activo', () => {
    expect(enumLabel(MEMBER_STATUS_KEY, 'active')).toBe('Activo');
    expect(enumLabel(LEAVE_TYPE_KEY, 'sick')).toBe('Baja por enfermedad');
    expect(enumLabel(REQUEST_STATUS_KEY, 'approved')).toBe('Aprobada');
    locale = 'en';
    expect(enumLabel(MEMBER_STATUS_KEY, 'active')).toBe('Active');
  });

  it('un valor desconocido se pinta TAL CUAL: un hub con catálogo viejo enseña la fila igual', () => {
    expect(enumLabel(LEAVE_TYPE_KEY, 'sabbatical')).toBe('sabbatical');
  });

  it('vacío y nulo no ensucian la celda', () => {
    expect(enumLabel(LEAVE_TYPE_KEY, '')).toBe('');
    expect(enumLabel(LEAVE_TYPE_KEY, null)).toBe('');
    expect(enumLabel(LEAVE_TYPE_KEY, undefined)).toBe('');
  });

  it('los tres dominios cubren exactamente los valores que declara el módulo', () => {
    expect(Object.keys(MEMBER_STATUS_KEY)).toEqual(['active', 'inactive', 'on_leave', 'terminated']);
    const schema = JSON.parse(readFileSync(join(ROOT, 'schemas/time_off_create.json'), 'utf8')) as {
      properties: { leave_type: { enum: string[] } };
    };
    expect(Object.keys(LEAVE_TYPE_KEY)).toEqual(schema.properties.leave_type.enum);
    const setStatus = JSON.parse(readFileSync(join(ROOT, 'schemas/time_off_set_status.json'), 'utf8')) as {
      properties: { status: { enum: string[] } };
    };
    // `pending` no es un destino de la máquina de estados, pero SÍ es el estado en que nace la fila.
    expect(Object.keys(REQUEST_STATUS_KEY).sort()).toEqual([...new Set(['pending', ...setStatus.properties.status.enum])].sort());
  });
});

describe('enumOptions: el desplegable y la celda dicen lo mismo, por construcción', () => {
  it('cada opción lleva el valor crudo y la etiqueta traducida', () => {
    expect(enumOptions(REQUEST_STATUS_KEY)).toEqual([
      { value: 'pending', label: 'Pendiente' },
      { value: 'approved', label: 'Aprobada' },
      { value: 'rejected', label: 'Rechazada' },
      { value: 'cancelled', label: 'Cancelada' },
    ]);
  });
});

describe('formatDate: día de calendario, en el formato del hub', () => {
  it('una fecha ISO se lee como la escribe la gente en ese idioma', () => {
    expect(formatDate('2026-09-10')).toBe('10/09/2026');
    locale = 'en';
    expect(formatDate('2026-09-10')).toBe('09/10/2026');
  });

  it('se formatea en UTC: una fecha NO se mueve un día por la zona horaria del navegador', () => {
    // `2026-01-01` es un día del calendario, no un instante. Formateado en local, al oeste de
    // Greenwich se pintaría «31/12/2025» — un día de vacaciones que empieza antes de empezar.
    expect(formatDate('2026-01-01')).toBe('01/01/2026');
    expect(formatDate('2026-12-31')).toBe('31/12/2026');
  });

  it('acepta la mitad fecha de un timestamp', () => {
    expect(formatDate('2026-09-10T16:09:57.123Z')).toBe('10/09/2026');
  });

  it('lo que no es una fecha vuelve tal cual, sin `Invalid Date`', () => {
    expect(formatDate('')).toBe('');
    expect(formatDate(null)).toBe('');
    expect(formatDate('mañana')).toBe('mañana');
    expect(formatDate('2026-13-45')).toBe('2026-13-45');
  });
});
