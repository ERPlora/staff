// Saving the settings of a hub that has none must CREATE them — not pretend (staff#13).
//
// `staff.settings.update` was a bare `UPDATE staff_settings SET …`. A hub installed without a
// blueprint has no row, so the statement touched 0 rows, the runtime called the command a success,
// `staff.settings.updated` went out, and the settings query kept returning nothing. The screen then
// painted the schema defaults, which look exactly like saved values — so the business believes it
// configured something it never did, and keeps believing it after every reload.
//
// Two halves, and one without the other is useless:
//   * the write UPSERTS, so the singleton exists after the first save (there is a unique index on
//     `hub_id`, which is what makes the conflict target legitimate);
//   * `expect_rows` guards it, so if it ever writes nothing again it fails loudly instead of
//     emitting the event over an empty table.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'module.json'), 'utf8')) as {
  id: string;
  commands: Record<string, { sql?: string[]; transaction?: boolean; expect_rows?: { op: string; n: number; error: string; message?: string } }>;
};
const cmd = manifest.commands['staff.settings.update'];
const sql = (cmd.sql ?? [])
  .map((f) => readFileSync(join(ROOT, f), 'utf8').split('\n').filter((l) => !l.trim().startsWith('--')).join('\n'))
  .join('\n');

describe('a hub without settings gets settings, not a lie', () => {
  it('the write creates the row when it is missing', () => {
    expect(sql, 'a bare UPDATE writes nothing on a hub that never had the row').toMatch(/INSERT\s+INTO\s+staff_settings/i);
    expect(sql, 'without ON CONFLICT a second save would fail on the unique index').toMatch(/ON\s+CONFLICT/i);
  });

  it('the conflict is resolved by hub — the settings are one per business', () => {
    expect(sql).toMatch(/ON\s+CONFLICT\s*\(\s*hub_id\s*\)/i);
  });

  // The row is created WITHOUT listing the setting columns, so they take the table's DEFAULT.
  // Repeating those defaults in the SQL would put them in two places, and two copies of a default
  // drift. The UPDATE that follows is what applies whatever the caller actually sent.
  it('creates the row on the table defaults, and lets the UPDATE apply the caller values', () => {
    const [ensure, update] = cmd.sql!;
    expect(ensure, 'the ensure statement must run FIRST').toMatch(/_settings_ensure/);
    expect(update).toMatch(/settings_update/);
    const ensureSql = readFileSync(join(ROOT, ensure), 'utf8');
    expect(
      /default_work_start|max_daily_hours|notify_cancellation/i.test(
        ensureSql.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n'),
      ),
      'the ensure statement lists setting columns: their defaults would live in two places',
    ).toBe(false);
  });

  it('the row it creates or updates is this hub\'s, never another\'s', () => {
    expect(sql).toMatch(/:hub_id/);
  });

  it('runs in a transaction', () => {
    expect(cmd.transaction).toBe(true);
  });
});

describe('and if it ever writes nothing again, it says so', () => {
  it('declares the expect_rows gate', () => {
    const gate = cmd.expect_rows;
    expect(gate, 'without the gate, 0 rows is reported as a successful save').toBeTruthy();
    expect(gate!.op).toBe('min');
    expect(gate!.n).toBeGreaterThanOrEqual(1);
  });

  it('uses a code in this module namespace, with a human fallback', () => {
    const gate = cmd.expect_rows!;
    expect(gate.error.split('.')[0], 'the installer rejects a foreign namespace').toBe(manifest.id);
    expect(gate.message).toBeTruthy();
  });
});
