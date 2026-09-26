// staff#74: the toolbar «+ Add» of each table OPENS the create panel, and the button that SENDS the
// form inside it was also called «Add» (members, roles and time-off). A screen reader heard two
// «Add» buttons and a test could not tell them apart. The submit is «Save», as in every other
// create form of ERPlora (pricing#50, customers#96) and in Odoo, Shopify or Square; «Add» stays
// for the toolbar button only, which ok-data-table labels itself.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

type Wc = HTMLElement & { shadowRoot: ShadowRoot; updateComplete: Promise<unknown> };

beforeEach(() => {
  document.body.innerHTML = '';
  (globalThis as Record<string, unknown>).erplora = {
    query: async () => [],
    queryPage: async () => ({ rows: [], total: 0 }),
    command: async () => ({}),
    on: () => () => {},
    locale: 'es',
    currency: 'EUR',
    formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
    hasPermission: () => true,
    t: (_catalog: unknown, key: string) => key,
  };
});

async function mount(tag: string, load: () => Promise<unknown>): Promise<Wc> {
  await load();
  const el = document.createElement(tag) as Wc;
  document.body.appendChild(el);
  await el.updateComplete;
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

const locale = (lang: 'en' | 'es') =>
  JSON.parse(readFileSync(join(__dirname, '..', '..', 'locales', `${lang}.json`), 'utf8')) as {
    ui: Record<string, string>;
  };

const VIEWS: [string, string, () => Promise<unknown>][] = [
  ['members', 'erp-staff-members', () => import('./erp-staff-members/erp-staff-members')],
  ['roles', 'erp-staff-roles', () => import('./erp-staff-roles/erp-staff-roles')],
  ['time-off', 'erp-staff-time-off', () => import('./erp-staff-time-off/erp-staff-time-off')],
];

describe('staff#74: the create panel submits with «Save», not a second «Add»', () => {
  it.each(VIEWS)('%s: the submit button of the create panel reads the «Save» key', async (_view, tag, load) => {
    const el = await mount(tag, load);
    const submit = el.shadowRoot.querySelector('form[slot="create"] ion-button[type="submit"]');
    expect(submit, `${tag} has no submit button in its create panel`).toBeTruthy();
    expect(submit?.textContent?.trim()).toBe('ui.actionSave');
  });

  it('«Save» is translated: en «Save», es «Guardar»', () => {
    expect(locale('en').ui.actionSave).toBe('Save');
    expect(locale('es').ui.actionSave).toBe('Guardar');
  });

  it('the orphaned «Add» key is gone: nothing in the module is labelled with it any more', () => {
    expect(locale('en').ui.actionAdd).toBeUndefined();
    expect(locale('es').ui.actionAdd).toBeUndefined();
  });
});
