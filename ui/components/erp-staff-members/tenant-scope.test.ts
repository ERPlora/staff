// Nothing of another hub may come in through a relation (staff#12).
//
// The FKs of this module point at GLOBAL ids, so `hub_id` on the row does not protect a JOIN nor
// an INSERT: a `role_id` of hub B glued to a member of hub A joins by id just fine. Two doors:
//
//   * READ — every JOIN carries the hub. PR #27 closed it for `staff_role` and `staff_member`;
//     this test walks EVERY `.sql` of the module so the next JOIN written without the equality is
//     born red instead of re-opening the leak.
//   * WRITE — a relation is only written against a parent of the SAME hub, and when it does not
//     resolve the command FAILS (`expect_rows`, hub#139) instead of writing nothing and reporting
//     success. That is `staff._insert_member` / `staff._update_member` (the SQL behind the public
//     `staff.members.create` / `staff.members.update` handlers, staff#55) for the role, and the
//     WASM intentions `_insert_schedule` / `_insert_working_hours` / `_insert_time_off` for the
//     member and the schedule.
//
// The two-hub proof against a real Postgres is `tests/tenant_role.postgres.test.py`. This file
// pins the text the module ships and the gate it declares.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'module.json'), 'utf8')) as {
  id: string;
  commands: Record<
    string,
    { sql?: string[]; expect_rows?: { op: string; n: number; error: string; message?: string } }
  >;
};

/** A .sql file without its `--` comments — a JOIN named in a comment joins nothing. */
const sqlOf = (rel: string) =>
  readFileSync(join(ROOT, rel), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

const sqlFiles = (dir: string) =>
  readdirSync(join(ROOT, dir))
    .filter((f) => f.endsWith('.sql'))
    .map((f) => `${dir}/${f}`);

/** Every `JOIN <table> <alias> ON …` of a statement, with the ON clause up to the next keyword. */
function joinsOf(sql: string): { table: string; on: string }[] {
  const out: { table: string; on: string }[] = [];
  const re =
    /\bJOIN\s+([a-z_]+)\s+([a-z]\w*)\s+ON\b([\s\S]*?)(?=\b(?:LEFT|RIGHT|INNER|JOIN|WHERE|GROUP|ORDER|LIMIT|UNION|\)|;)|$)/gi;
  for (const m of sql.matchAll(re)) out.push({ table: m[1], on: m[3] });
  return out;
}

const HUB_EQUALITY = /\bhub_id\s*=\s*(:hub_id|[a-z]\w*\.hub_id)/i;

describe('every JOIN carries the hub — an id alone is not ownership', () => {
  const files = [...sqlFiles('queries'), ...sqlFiles('commands')];

  it('the scan sees the JOINs of this module (a scan that finds nothing proves nothing)', () => {
    const total = files.reduce((n, f) => n + joinsOf(sqlOf(f)).length, 0);
    expect(total).toBeGreaterThanOrEqual(7);
  });

  it.each(files)('%s', (file) => {
    const unscoped = joinsOf(sqlOf(file))
      .filter(({ on }) => !HUB_EQUALITY.test(on))
      .map(({ table }) => table);
    expect(
      unscoped,
      `${file} joins ${unscoped.join(', ')} by id alone: a row of another hub matches`,
    ).toEqual([]);
  });
});

describe('a relation is only written against a parent of the same hub', () => {
  const guarded = (name: string) => {
    const sql = (manifest.commands[name].sql ?? []).map(sqlOf).join('\n');
    return { sql, gate: manifest.commands[name].expect_rows };
  };

  it('creating a member resolves the role against staff_role of THIS hub (or takes none)', () => {
    const { sql } = guarded('staff._insert_member');
    expect(sql, 'a bare INSERT … VALUES takes any role_id, including another hub\'s').not.toMatch(
      /INSERT\s+INTO\s+staff_member[\s\S]*VALUES/i,
    );
    expect(sql).toMatch(/FROM\s+staff_role\s+r[\s\S]*r\.hub_id\s*=\s*:hub_id/i);
    expect(sql, 'a deleted or retired role is not assignable').toMatch(/r\.is_deleted\s*=\s*0[\s\S]*r\.is_active\s*=\s*1/i);
    expect(sql, 'a member without a role is legitimate').toMatch(/COALESCE\(\s*:role_id\s*,\s*''\s*\)\s*=\s*''/i);
  });

  it('updating a member checks the same thing, and NULL means "do not touch the role"', () => {
    const { sql } = guarded('staff._update_member');
    expect(sql).toMatch(/FROM\s+staff_role\s+r[\s\S]*r\.hub_id\s*=\s*:hub_id/i);
    expect(sql).toMatch(/COALESCE\(\s*:role_id\s*,\s*''\s*\)\s*=\s*''/i);
    expect(sql).toMatch(/WHERE\s+id\s*=\s*:staff_id\s+AND\s+hub_id\s*=\s*:hub_id/i);
  });

  it.each([
    ['staff._insert_member', 'staff.role_not_found'],
    ['staff._update_member', 'staff.member_update_rejected'],
  ])('%s fails instead of writing nothing and reporting success', (name, code) => {
    const { gate } = guarded(name);
    expect(gate, `${name} declares no expect_rows: 0 rows would still emit its event`).toBeDefined();
    expect(gate!.op).toBe('min');
    expect(gate!.n).toBe(1);
    expect(gate!.error).toBe(code);
    expect(gate!.error.startsWith(`${manifest.id}.`), 'the code lives in the module namespace').toBe(true);
  });

  // The WASM intentions were already INSERT … SELECT against the parent of `:hub_id` (audited for
  // staff#12): pinned so they stay that way.
  it.each([
    ['staff._insert_schedule', 'staff_member'],
    ['staff._insert_working_hours', 'staff_schedule'],
    ['staff._insert_time_off', 'staff_member'],
  ])('%s resolves its parent %s in this hub', (name, parent) => {
    const { sql } = guarded(name);
    expect(sql).toMatch(new RegExp(`FROM\\s+${parent}\\s+[a-z]+[\\s\\S]*\\.hub_id\\s*=\\s*:hub_id`, 'i'));
    expect(sql).not.toMatch(/\bVALUES\b/i);
  });
});
