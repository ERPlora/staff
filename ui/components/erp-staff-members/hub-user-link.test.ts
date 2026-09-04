// staff#46 — a record with no Hub user earns half a day, and the form did not say so.
//
// Since sales#179 no sale is left unattributed: the one that names a professional (an appointment)
// goes to their `staff_member.id`, and the COUNTER sale — the bulk of the till — goes to the **Hub
// user** holding the session. The day close adds the two halves up as one person because the record
// says which user it hangs from (`user_id`, ADR-0192). If that link is empty there is nothing to
// add: what this person charges at the counter does not count towards their commission, and
// nothing on the screen warned about it.
//
// The «Hub user» selector already existed; what was missing was the CONSEQUENCE of leaving it
// blank. It is what Square Team («this team member has no login»), Toast and Fresha do: the «no
// access» state is shown, not inferred. Nobody is preselected — guessing the user would tie one
// person's payroll to somebody else's session, a worse harm than the one being fixed.
//
// The hint disappears as soon as there is a link: a correct record does not drag a warning around.
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
    // Returns the KEY, so the test can assert which one is used — a hardcoded literal would not pass.
    t: (_c: unknown, key: string) => key,
  };
});

type Wc = HTMLElement & {
  shadowRoot: ShadowRoot;
  updateComplete: Promise<unknown>;
  patch: (p: Record<string, unknown>) => void;
};

async function mount(): Promise<Wc> {
  history.replaceState(null, '', '/');
  await import('./erp-staff-members');
  const el = document.createElement('erp-staff-members') as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const hint = (el: Wc): HTMLElement | null =>
  el.shadowRoot.querySelector('[data-hint="hub-user"]');

describe('staff#46 · the link to the Hub user is asked for, not guessed', () => {
  it('without a link, the form warns that the counter will not count for this person', async () => {
    const el = await mount();
    const warning = hint(el);
    expect(warning, 'a record with no Hub user has to say what that costs').not.toBeNull();
    expect(warning?.textContent?.trim()).toBe('ui.hubUserWhyLink');
  });

  it('with a link, the warning disappears', async () => {
    const el = await mount();
    el.patch({ user_id: 'u-ana' });
    await el.updateComplete;
    expect(hint(el), 'an already linked record does not drag the warning around').toBeNull();
  });

  it('preselects nobody: a person chooses the user', async () => {
    const el = await mount();
    const select = el.shadowRoot.querySelector('ion-select[label="ui.hubUser"]') as
      | (HTMLElement & { value?: unknown })
      | null;
    expect(select, 'the Hub user selector is still on the form').not.toBeNull();
    expect(select?.value, "guessing the user would tie one person's payroll to another's session").toBe('');
  });

  it('the warning is TRANSLATED, not only written in English', () => {
    const en = JSON.parse(readFileSync(join(ROOT, 'locales/en.json'), 'utf8')) as {
      ui: Record<string, string>;
    };
    const es = JSON.parse(readFileSync(join(ROOT, 'locales/es.json'), 'utf8')) as {
      ui: Record<string, string>;
    };
    expect(en.ui.hubUserWhyLink, 'English is the source string').toBeTruthy();
    expect(es.ui.hubUserWhyLink, 'and every visible string is translated to Spanish').toBeTruthy();
    // Copying the English into `es.json` keeps the test green and the app in English (ADR-0055/0199).
    expect(es.ui.hubUserWhyLink).not.toBe(en.ui.hubUserWhyLink);
  });
});
