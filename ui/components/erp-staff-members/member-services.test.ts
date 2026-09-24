// staff#9 — services a professional PERFORMS, edited from their record (Fresha / Square /
// Booksy / Phorest: «Services» section in the team member profile; the booking picker then only
// offers the professionals who perform the chosen service).
//
// The catalogue is resolved through `services.services.list` (a PUBLIC query of the services
// module — never its tables); what staff stores is the opaque `service_id` + a name snapshot.
// If `services` is not installed the section degrades to a hint, and the record still saves.
import { beforeEach, describe, expect, it } from 'vitest';

const comandos: { name: string; payload: Record<string, unknown> }[] = [];
let servicesInstalled = true;
let assigned: Record<string, unknown>[] = [];

beforeEach(() => {
  comandos.length = 0;
  servicesInstalled = true;
  assigned = [
    { id: 'ss1', staff_id: 'm1', service_id: 'svc-cut', service_name: 'Corte', custom_duration: null, custom_price: null, is_primary: 1, is_active: 1 },
  ];
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'staff.roles.list') return [];
      if (name === 'hub.users.list') return [];
      if (name === 'staff.services.list_for_member') return assigned;
      return [];
    },
    // ADR-0127: an optional integration answers `undefined` when the owner module is not installed.
    queryOptional: async (name: string) => {
      if (name !== 'services.services.list') return undefined;
      if (!servicesInstalled) return undefined;
      return [
        { id: 'svc-cut', name: 'Corte', duration_minutes: 30, price: 1500, is_bookable: 1 },
        { id: 'svc-color', name: 'Color', duration_minutes: 90, price: 4500, is_bookable: 1 },
      ];
    },
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async (name: string, payload: Record<string, unknown>) => {
      comandos.push({ name, payload });
      return {};
    },
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    hasPermission: () => true,
    t: (_catalog: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  editingId: string;
  memberServices: { id: string; service_id: string; service_name: string; is_primary: number }[];
  catalogUnavailable: boolean;
  newServiceId: string;
  newServiceDuration: string;
  newServicePrice: string;
  onRowAction: (ev: CustomEvent<{ actionId: string; row: Record<string, unknown> }>) => void;
  assignService: (ev: Event) => Promise<void>;
  removeService: (id: string) => Promise<void>;
  setPrimaryService: (row: { id: string }) => Promise<void>;
  updateComplete: Promise<unknown>;
};

async function montar(): Promise<Wc> {
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

async function editar(el: Wc): Promise<void> {
  el.onRowAction(
    new CustomEvent('rowAction', {
      detail: { actionId: 'edit', row: { id: 'm1', first_name: 'Ana', last_name: 'Ruiz', email: '', role_id: null, user_id: null } },
    }),
  );
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
}

describe('la ficha muestra los servicios que realiza el profesional (staff#9)', () => {
  it('en modo ALTA no hay sección de servicios (todavía no hay a quién asignar)', async () => {
    const el = await montar();
    expect(el.shadowRoot.querySelector('[data-section="services"]')).toBeNull();
  });

  it('al editar carga sus competencias por `staff.services.list_for_member` y las pinta', async () => {
    const el = await montar();
    await editar(el);
    expect(el.memberServices.map((s) => s.service_name)).toEqual(['Corte']);
    const seccion = el.shadowRoot.querySelector('[data-section="services"]');
    expect(seccion, 'la sección de servicios no se pinta al editar').toBeTruthy();
    expect(seccion!.textContent).toContain('Corte');
  });

  it('el selector ofrece SOLO los servicios del catálogo aún no asignados', async () => {
    const el = await montar();
    await editar(el);
    const opciones = [...el.shadowRoot.querySelectorAll('[data-section="services"] ion-select-option')].map(
      (o) => (o as HTMLElement & { value: string }).value,
    );
    expect(opciones).toEqual(['svc-color']);
  });

  it('asignar manda staff.services.assign con id opaco + snapshot del nombre (+ overrides)', async () => {
    const el = await montar();
    await editar(el);
    el.newServiceId = 'svc-color';
    el.newServiceDuration = '60';
    el.newServicePrice = '40';
    await el.assignService(new Event('submit'));
    const cmd = comandos.find((c) => c.name === 'staff.services.assign');
    expect(cmd, 'no se mandó la asignación').toBeTruthy();
    expect(cmd!.payload).toMatchObject({
      staff_id: 'm1',
      service_id: 'svc-color',
      service_name: 'Color',
      custom_duration: 60,
      custom_price: 4000, // euros typed → cents sent (ADR-0007)
      is_primary: 0,
    });
  });

  it('sin overrides tecleados se mandan null (usa la duración/precio del catálogo)', async () => {
    const el = await montar();
    await editar(el);
    el.newServiceId = 'svc-color';
    await el.assignService(new Event('submit'));
    const cmd = comandos.find((c) => c.name === 'staff.services.assign')!;
    expect(cmd.payload.custom_duration).toBeNull();
    expect(cmd.payload.custom_price).toBeNull();
  });

  it('quitar manda staff.services.remove; marcar principal manda staff.services.update', async () => {
    const el = await montar();
    await editar(el);
    await el.removeService('ss1');
    expect(comandos.find((c) => c.name === 'staff.services.remove')!.payload).toEqual({ id: 'ss1' });
    await el.setPrimaryService({ id: 'ss1' });
    expect(comandos.find((c) => c.name === 'staff.services.update')!.payload).toMatchObject({ id: 'ss1', is_primary: 1 });
  });

  it('paints the clear «✕» that removes a service in the medium tone from its own styles, not through color= (pm#392)', async () => {
    const el = await montar();
    await editar(el);
    const btn = el.shadowRoot.querySelector('[data-section="services"] [data-action="remove-service"]');
    expect(btn, 'each assigned service offers «✕»').not.toBeNull();
    expect(btn!.hasAttribute('color'), 'color= does not reach inside a shadow root').toBe(false);
    expect(btn!.getAttribute('fill')).toBe('clear');
    expect(btn!.classList.contains('tone-medium')).toBe(true);
    const css = (el.constructor as unknown as { elementStyles: { cssText: string }[] }).elementStyles
      .map((s) => s.cssText).join('\n').replace(/\s+/g, ' ');
    expect(css).toContain('ion-button.tone-medium[fill] {');
    expect(css).toContain('--color: var(--ion-color-medium, #636469)');
  });

  it('sin el módulo services instalado la sección degrada a un aviso y la ficha sigue editable', async () => {
    servicesInstalled = false;
    const el = await montar();
    await editar(el);
    expect(el.catalogUnavailable).toBe(true);
    expect(el.shadowRoot.querySelector('[data-section="services"] [data-hint="no-catalog"]')).toBeTruthy();
    expect(el.shadowRoot.querySelector('form[slot="create"]')).toBeTruthy();
  });
});
