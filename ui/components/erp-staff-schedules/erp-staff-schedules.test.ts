// Contrato de la BARRA de los horarios de un miembro.
//
// El alta de un horario (nombre + vigencia + la semana día a día) vive DENTRO de `ok-data-table`,
// detrás del «+» de su barra (panel `slot="create"`), como en /employees del core y en el CRUD de
// productos de `inventory`. La semana es PARTE del alta: sus checkboxes y sus horas se envían en el
// mismo `staff.schedules.create`, así que van dentro del mismo formulario del panel, no sueltas en
// la página. La vista tampoco pinta título propio: lo pinta el topbar del shell.
//
// El selector de MIEMBRO es la excepción y se queda fuera: no es un campo del alta, es el ÁMBITO de
// la lista (`staff.schedules.list_for_member` necesita un `staff_id` para poder listar nada).
import { beforeEach, describe, expect, it } from 'vitest';

const MIEMBROS = [
  { id: 'm1', full_name: 'Ana Ruiz', status: 'active' },
  { id: 'm2', full_name: 'Luis Gil', status: 'active' },
];

const HORARIOS = [
  { id: 'h1', staff_id: 'm1', name: 'Horario habitual', is_default: 1, effective_from: null, effective_until: null, is_active: 1 },
];

const comandos: { name: string; payload: Record<string, unknown> }[] = [];

beforeEach(() => {
  comandos.length = 0;
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.members.list') return MIEMBROS;
      if (name === 'staff.schedules.list_for_member') return HORARIOS;
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

async function montar() {
  await import('./erp-staff-schedules');
  const el = document.createElement('erp-staff-schedules');
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

  it('la semana (días de trabajo) es parte del alta: va dentro del mismo formulario', async () => {
    const el = await montar();
    const form = el.shadowRoot.querySelector('form[slot="create"]');
    expect(form?.querySelectorAll('.day').length, 'los 7 días no están dentro del panel de alta').toBe(7);
    expect(el.shadowRoot.querySelector('.week')?.closest('form[slot="create"]')).toBeTruthy();
  });

  it('fuera de la tabla solo queda el selector de MIEMBRO (el ámbito de la lista)', async () => {
    const el = await montar();
    const fuera = [...el.shadowRoot.querySelectorAll('form, ion-input, ion-select, ion-button, ion-checkbox')].filter(
      (n) => !n.closest('ok-data-table'),
    );
    expect(fuera.map((n) => n.tagName.toLowerCase()), 'hay controles de alta fuera de la tabla').toEqual(['ion-select']);
  });

  it('la vista no pinta título propio (lo pinta el topbar del shell)', async () => {
    const el = await montar();
    expect(el.shadowRoot.querySelector('h2'), 'título duplicado: el shell ya lo pinta').toBeNull();
  });
});

describe('el alta sigue funcionando desde el panel', () => {
  it('crear un horario manda staff.schedules.create con la semana marcada', async () => {
    const el = await montar();
    const wc = el as unknown as {
      staffId: string;
      newName: string;
      createSchedule: (ev: Event) => Promise<void>;
    };
    wc.staffId = 'm1';
    wc.newName = 'Turno mañana';
    await wc.createSchedule(new Event('submit'));

    const alta = comandos.find((c) => c.name === 'staff.schedules.create');
    expect(alta, 'no se mandó el alta del horario').toBeTruthy();
    expect(alta!.payload.staff_id).toBe('m1');
    expect(alta!.payload.name).toBe('Turno mañana');
    // La semana por defecto es L-V → 5 días de trabajo en el payload.
    expect((alta!.payload.working_hours as unknown[]).length).toBe(5);
  });
});
