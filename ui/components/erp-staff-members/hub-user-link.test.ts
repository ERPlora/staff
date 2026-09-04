// staff#46 — una ficha sin usuario del Hub cobra media jornada, y el formulario no lo decía.
//
// Desde sales#179 ninguna venta queda sin atribuir: la que nombra a un profesional (una cita) va a
// su `staff_member.id`, y la de MOSTRADOR —el grueso del TPV— va al **usuario del Hub** que tiene la
// sesión. El cierre del día suma las dos mitades como una sola persona porque la ficha dice de qué
// usuario cuelga (`user_id`, ADR-0192). Si ese vínculo está vacío, no hay nada que sumar: lo que esa
// persona cobra en el mostrador no le cuenta para su comisión, y nada en la pantalla lo avisaba.
//
// El selector «Usuario del Hub» ya existía; lo que faltaba era la CONSECUENCIA de dejarlo en blanco.
// Es lo que hacen Square Team («this team member has no login»), Toast y Fresha: el estado «sin
// acceso» se enseña, no se deduce. NO se preselecciona a nadie — adivinar el usuario ata la nómina
// de una persona a la sesión de otra, que es un daño peor que el que se arregla.
//
// El aviso desaparece en cuanto hay vínculo: una ficha correcta no arrastra una advertencia.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');

const ROW = {
  id: 'm1', first_name: 'Lucía', last_name: 'Márquez', full_name: 'Lucía Márquez',
  email: '', phone: '', role_id: '', role_name: '', user_id: null, status: 'active', is_bookable: 1,
};

beforeEach(() => {
  (globalThis as Record<string, unknown>).erplora = {
    query: async (name: string) => {
      if (name === 'hub.users.list') return [{ id: 'u-ana', name: 'Ana', is_active: true }];
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
    // Devuelve la CLAVE, para afirmar cuál se usa — un literal cableado no pasaría por aquí.
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  patch: (p: Record<string, unknown>) => void;
};

async function montar(): Promise<Wc> {
  history.replaceState(null, '', '/');
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const aviso = (el: Wc): HTMLElement | null =>
  el.shadowRoot.querySelector('[data-hint="hub-user"]');

describe('staff#46 · el vínculo con el usuario del Hub se pide, no se adivina', () => {
  it('sin vínculo, el formulario avisa de que el mostrador no le contará', async () => {
    const el = await montar();
    const hint = aviso(el);
    expect(hint, 'una ficha sin usuario del Hub tiene que decir qué le cuesta').not.toBeNull();
    expect(hint?.textContent?.trim()).toBe('ui.hubUserWhyLink');
  });

  it('con vínculo, el aviso desaparece', async () => {
    const el = await montar();
    el.patch({ user_id: 'u-ana' });
    await el.updateComplete;
    expect(aviso(el), 'una ficha ya vinculada no arrastra la advertencia').toBeNull();
  });

  it('no preselecciona a nadie: el usuario lo elige una persona', async () => {
    const el = await montar();
    const select = el.shadowRoot.querySelector('ion-select[label="ui.hubUser"]') as
      | (HTMLElement & { value?: unknown })
      | null;
    expect(select, 'el selector de usuario del Hub sigue en el formulario').not.toBeNull();
    expect(select?.value, 'adivinar el usuario ataría la nómina de uno a la sesión de otro').toBe('');
  });

  it('el aviso está TRADUCIDO, no solo escrito en inglés', () => {
    const en = JSON.parse(readFileSync(join(ROOT, 'locales/en.json'), 'utf8')) as {
      ui: Record<string, string>;
    };
    const es = JSON.parse(readFileSync(join(ROOT, 'locales/es.json'), 'utf8')) as {
      ui: Record<string, string>;
    };
    expect(en.ui.hubUserWhyLink, 'la cadena fuente es el inglés').toBeTruthy();
    expect(es.ui.hubUserWhyLink, 'y toda cadena visible se traduce al español').toBeTruthy();
    // Copiar el inglés en `es.json` deja el test verde y la app en inglés (ADR-0055/0199).
    expect(es.ui.hubUserWhyLink).not.toBe(en.ui.hubUserWhyLink);
  });
});
