// The settings screen must render CONTROLS, not raw storage (staff#24).
//
// The shell paints the module's settings tab from `schemas/settings_update.json` with a generic
// renderer (`hub/apps/web/src/lib/module-settings.ts`). That renderer only understands FLAT types:
// `boolean`, or `integer` + `enum: [0, 1]`, is a toggle; `integer`/`number` is a number input;
// `string` is a text input. staff was the only module publishing nullable arrays
// (`type: ["integer", "null"]`, `enum: [0, 1, null]`), so every flag fell through to a `0/1/null`
// select and every number to a bare text field — the business had to guess that `1` means "on".
//
// The shell's decision function is replicated here VERBATIM, so this test fails the day the
// schema drifts back to something the shell cannot render — without needing a hub checkout.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'module.json'), 'utf8')) as {
  settings: { schema: string; title: string };
};
const schema = JSON.parse(readFileSync(join(ROOT, manifest.settings.schema), 'utf8')) as {
  properties: Record<string, SettingsSchemaProperty>;
};

interface SettingsSchemaProperty {
  type?: string | string[];
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  default?: unknown;
  title?: string;
}

// ── verbatim from hub/apps/web/src/lib/module-settings.ts ────────────────────────────────────
function isStoredBoolean(prop: SettingsSchemaProperty): boolean {
  if (prop.type === 'boolean') return true;
  if (prop.type !== 'integer' || prop.enum?.length !== 2) return false;
  const values = new Set(prop.enum);
  return values.has(0) && values.has(1);
}
function settingControl(prop: SettingsSchemaProperty): 'toggle' | 'select' | 'number' | 'text' {
  if (isStoredBoolean(prop)) return 'toggle';
  if (prop.enum?.length) return 'select';
  if (prop.type === 'integer' || prop.type === 'number') return 'number';
  return 'text';
}
// ─────────────────────────────────────────────────────────────────────────────────────────────

const FLAGS = [
  'show_staff_photos',
  'show_staff_bio',
  'allow_staff_selection',
  'notify_new_appointment',
  'notify_cancellation',
];
const LIMITS = ['default_break_duration', 'min_advance_booking', 'max_daily_hours', 'overtime_threshold'];
const TIMES = ['default_work_start', 'default_work_end'];

describe('the staff settings schema renders as controls in the shell', () => {
  it('declares only flat types — the shell does not read type arrays', () => {
    for (const [key, prop] of Object.entries(schema.properties)) {
      expect(typeof prop.type, `${key}: type must be a single JSON type`).toBe('string');
      expect(prop.enum ?? [], `${key}: null is not a value the user can pick`).not.toContain(null);
    }
  });

  it('every flag is a toggle (Activado/Desactivado), never a 0/1 stepper or select', () => {
    for (const key of FLAGS) {
      const prop = schema.properties[key];
      expect(prop, `${key} must exist`).toBeDefined();
      expect(settingControl(prop), `${key}`).toBe('toggle');
      // Stored as INTEGER (0/1) for SQLite/Postgres parity: the schema says so, the shell converts.
      expect(prop.type).toBe('integer');
      expect(prop.default, `${key}: default must be a stored value`).toBe(1);
    }
  });

  it('every duration/limit is a number input with a sensible bounded range', () => {
    for (const key of LIMITS) {
      const prop = schema.properties[key];
      expect(prop, `${key} must exist`).toBeDefined();
      expect(settingControl(prop), `${key}`).toBe('number');
      expect(prop.minimum, `${key}: negatives must be rejected`).toBeGreaterThanOrEqual(0);
      expect(prop.maximum, `${key}: an upper bound keeps typos out`).toBeGreaterThan(prop.minimum!);
    }
    // A break longer than a whole day and a daily cap over 24 h are impossible rules.
    expect(schema.properties.default_break_duration.maximum).toBeLessThanOrEqual(24 * 60);
    expect(schema.properties.max_daily_hours.minimum).toBeGreaterThanOrEqual(1);
    expect(schema.properties.max_daily_hours.maximum).toBeLessThanOrEqual(24);
  });

  it('working-day times are text inputs that only accept a valid clock time', () => {
    for (const key of TIMES) {
      const prop = schema.properties[key];
      expect(prop, `${key} must exist`).toBeDefined();
      expect(settingControl(prop), `${key}`).toBe('text');
      expect(prop.pattern, `${key}: without a pattern any text is "a time"`).toBeTruthy();
      const re = new RegExp(prop.pattern!);
      for (const ok of ['00:00', '09:00', '18:30', '23:59', '09:00:00']) {
        expect(re.test(ok), `${key}: ${ok} is a valid time`).toBe(true);
      }
      for (const bad of ['24:00', '9:00', '18:60', 'abc', '', '18h']) {
        expect(re.test(bad), `${key}: ${bad} is not a valid time`).toBe(false);
      }
    }
    // A night shift (end before start) is legitimate: the schema must not forbid it.
    const re = new RegExp(schema.properties.default_work_end.pattern!);
    expect(re.test('02:00')).toBe(true);
  });

  it('every field carries a label — the shell would otherwise humanise the column name', () => {
    for (const [key, prop] of Object.entries(schema.properties)) {
      expect(prop.title?.trim(), `${key}`).toBeTruthy();
    }
  });
});
