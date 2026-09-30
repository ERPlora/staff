// staff#88 — the module's tabs speak the hub's language.
//
// The runtime resolves each tab name from `locales/<lang>.json#navigation.<id>.label` (ADR-0055)
// and falls back to the manifest `navigation[].label`, which is therefore the ENGLISH source. The
// schedules tab shipped as «Horarios» in the manifest AND in `en.json`, so a hub in English showed
// the only Spanish tab of the module. Nothing caught it: the catalogues were complete, just wrong.
import { describe, expect, it } from 'vitest';
import manifest from '../../module.json' with { type: 'json' };
import en from '../../locales/en.json' with { type: 'json' };
import es from '../../locales/es.json' with { type: 'json' };

type Nav = Array<{ id: string; label: string }>;
type Catalog = { navigation?: Record<string, { label?: string }> };

const nav = (manifest as unknown as { navigation: Nav }).navigation;
const label = (catalog: unknown, id: string) => (catalog as Catalog).navigation?.[id]?.label ?? '';

// Tabs whose name is the same word in English and Spanish. Keep this list explicit: anything
// else with equal en/es labels is one side left untranslated.
const SHARED_WORD = new Set(['roles']);

describe('navigation labels (staff#88)', () => {
  it('the schedules tab is «Schedules» in English and «Horarios» in Spanish', () => {
    expect(nav.find((n) => n.id === 'schedules')?.label).toBe('Schedules');
    expect(label(en, 'schedules')).toBe('Schedules');
    expect(label(es, 'schedules')).toBe('Horarios');
  });

  it('«Roles» is the only tab allowed to read the same in both languages', () => {
    expect(label(en, 'roles')).toBe('Roles');
    expect(label(es, 'roles')).toBe('Roles');
  });

  it.each(nav.map((n) => [n.id, n.label] as const))(
    '%s: the manifest label is the English source and Spanish translates it',
    (id, source) => {
      expect(label(en, id)).toBe(source);
      expect(label(es, id)).not.toBe('');
      if (!SHARED_WORD.has(id)) expect(label(es, id)).not.toBe(label(en, id));
    },
  );
});
