// Who gets to read what about a colleague (staff#10).
//
// `employee` is granted `staff.view_staff_member` and `staff.view_time_off` by default, and both
// of those opened the GENERAL queries — the ones that carry the whole payroll. Measured end to end
// with exactly those permissions:
//
//   staff.members.list  -> hourly_rate=12345, commission_rate=42  of somebody else's record
//   staff.time_off.list -> reason='medical private reason', notes='private note'
//
// The module's half of this is not the runtime check (the hub already gates a query by its
// `permission`); it is WHICH COLUMNS each query returns and WHICH permission guards it. So that is
// what this file pins: a directory anyone can read, and compensation and leave detail behind their
// own permissions, which `employee` does not have.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
const manifest = JSON.parse(readFileSync(join(ROOT, 'module.json'), 'utf8')) as {
  permissions: string[];
  role_permissions: Record<string, string[]>;
  queries: Record<string, { permission: string; sql: string }>;
};

/** The SQL a query runs, WITHOUT its `--` comments: a column named in a comment is not returned,
 *  and the comments here explain precisely which columns were taken out. */
const sqlOf = (query: string) =>
  readFileSync(join(ROOT, manifest.queries[query].sql), 'utf8')
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

/** Does this query hand the caller that column? */
const selectsColumn = (query: string, column: string) =>
  new RegExp(`\\b${column}\\b`, 'i').test(sqlOf(query));

/** SELF-SERVICE (staff#19): a query whose rows are scoped to the CALLER — `user_id =
 *  :current_user_id`, injected by the runtime and non-spoofable (ARQUITECTURA §2.5, ADR-0192) —
 *  may return the caller's own compensation / leave detail under the everyday permission: the
 *  only row that can come out is theirs. The exemption is exactly that WHERE, pinned below; a
 *  «mine» query that loses it goes red here. */
const SELF_SCOPED = /\buser_id\s*=\s*:current_user_id\b/i;
const isSelfScoped = (query: string) => SELF_SCOPED.test(sqlOf(query));
const SELF_SERVICE_QUERIES = ['staff.members.mine', 'staff.time_off.mine'];

/** Every query a role can reach, resolving `*`. */
const queriesFor = (role: string) => {
  const granted = manifest.role_permissions[role] ?? [];
  const all = granted.includes('*');
  return Object.entries(manifest.queries).filter(([, q]) => all || granted.includes(q.permission));
};

const COMPENSATION = ['hourly_rate', 'commission_rate'];
const LEAVE_DETAIL = ['reason', 'notes'];

describe('an employee cannot read the payroll of the person next to them', () => {
  it.each(COMPENSATION)('no query an employee can reach returns %s', (column) => {
    const leaking = queriesFor('employee')
      .filter(([name]) => !isSelfScoped(name) && selectsColumn(name, column))
      .map(([name]) => name);
    expect(leaking, `an employee reaches ${column} through: ${leaking.join(', ')}`).toEqual([]);
  });

  it.each(LEAVE_DETAIL)('no query an employee can reach returns somebody else\'s %s', (column) => {
    const leaking = queriesFor('employee')
      .filter(([name]) => name.startsWith('staff.time_off.') && !isSelfScoped(name) && selectsColumn(name, column))
      .map(([name]) => name);
    expect(leaking, `an employee reaches ${column} through: ${leaking.join(', ')}`).toEqual([]);
  });
});

// Taking the column out of the SELECT is not enough. The list engine composes `ORDER BY` and
// `WHERE` from the `list` whitelist of the manifest (ARQUITECTURA.md §4, §8.2), so a column left in
// `sort`/`filters` stays reachable through the query string. A range filter on a value you cannot
// see is an oracle: `hourly_rate` between 0 and X, halve, repeat — and a colleague's salary is out
// in a dozen requests, without a single row ever showing it.
describe('what you cannot read, you cannot sort or filter by either', () => {
  const listSpec = (query: string) =>
    (manifest.queries[query] as unknown as {
      list?: { search?: string[]; sort?: string[]; filters?: Record<string, unknown> };
    }).list;

  it.each([
    ['staff.members.list', COMPENSATION],
    ['staff.time_off.list', LEAVE_DETAIL],
  ] as const)('%s exposes none of its private columns in sort/filter/search', (query, columns) => {
    const spec = listSpec(query);
    const reachable = [
      ...(spec?.sort ?? []),
      ...Object.keys(spec?.filters ?? {}),
      ...(spec?.search ?? []),
    ];
    const leaking = columns.filter((c) => reachable.includes(c));
    expect(leaking, `${query} can still be ordered/filtered by: ${leaking.join(', ')}`).toEqual([]);
  });

  it('every column the whitelist names is one the query actually returns', () => {
    for (const [name] of Object.entries(manifest.queries)) {
      const spec = listSpec(name);
      if (!spec) continue;
      const declared = [...(spec.sort ?? []), ...Object.keys(spec.filters ?? {}), ...(spec.search ?? [])];
      const phantom = [...new Set(declared)].filter((c) => !selectsColumn(name, c));
      expect(phantom, `${name} whitelists columns it does not select: ${phantom.join(', ')}`).toEqual([]);
    }
  });
});

describe('the directory stays readable — hiding it all would break the day', () => {
  it('an employee still sees who the team is, and who is off today', () => {
    const reachable = queriesFor('employee').map(([name]) => name);
    expect(reachable).toContain('staff.members.list');
    expect(reachable).toContain('staff.time_off.list');
  });

  it('the directory still carries what the operation needs', () => {
    for (const column of ['full_name', 'role_name', 'is_bookable', 'color', 'status']) {
      expect(selectsColumn('staff.members.list', column), `the directory lost ${column}`).toBe(true);
    }
  });
});

// staff#59: a CASHIER is part of the team too. The till («Serves», sales#318) and the kitchen
// screen (kitchen#82) name who served / fired an order from `staff.members.list`; without the
// directory the cashier's till showed only hub users and the KDS header came out blank. The
// cashier gets exactly the directory — never the payroll, the leave detail, or any write.
describe('a cashier sees who the team is, and nothing more', () => {
  it('the cashier reaches the directory the till and the kitchen read', () => {
    const reachable = queriesFor('cashier').map(([name]) => name);
    expect(reachable).toContain('staff.members.list');
  });

  it.each(COMPENSATION)('no query a cashier can reach returns somebody else\'s %s', (column) => {
    const leaking = queriesFor('cashier')
      .filter(([name]) => !isSelfScoped(name) && selectsColumn(name, column))
      .map(([name]) => name);
    expect(leaking, `a cashier reaches ${column} through: ${leaking.join(', ')}`).toEqual([]);
  });

  it('the cashier is granted reading the directory only: no payroll, no leave, no writes', () => {
    expect(manifest.role_permissions.cashier ?? []).toEqual(['staff.view_staff_member']);
  });
});

describe('compensation and leave detail live behind their own permission', () => {
  it('both permissions are declared by the module', () => {
    expect(manifest.permissions).toContain('staff.view_compensation');
    expect(manifest.permissions).toContain('staff.view_time_off_detail');
  });

  it('a manager gets them; an employee does not', () => {
    for (const perm of ['staff.view_compensation', 'staff.view_time_off_detail']) {
      expect(manifest.role_permissions.manager).toContain(perm);
      expect(manifest.role_permissions.employee ?? []).not.toContain(perm);
    }
  });

  it('every query that returns compensation is guarded by staff.view_compensation', () => {
    const badlyGuarded = Object.entries(manifest.queries)
      .filter(([name]) => !isSelfScoped(name))
      .filter(([name]) => COMPENSATION.some((c) => selectsColumn(name, c)))
      .filter(([, q]) => q.permission !== 'staff.view_compensation')
      .map(([name]) => name);
    expect(badlyGuarded, `these return money but are not guarded by it: ${badlyGuarded.join(', ')}`).toEqual([]);
  });

  it('leave detail is guarded by staff.view_time_off_detail', () => {
    const badlyGuarded = Object.entries(manifest.queries)
      .filter(([name]) => name.startsWith('staff.time_off.') && !isSelfScoped(name))
      .filter(([name]) => LEAVE_DETAIL.some((c) => selectsColumn(name, c)))
      .filter(([, q]) => q.permission !== 'staff.view_time_off_detail')
      .map(([name]) => name);
    expect(badlyGuarded).toEqual([]);
  });
});

// staff#19 — the employee's own door. Not a wider permission: a WHERE on the session user.
describe('self-service: an employee reads their OWN record and absences, nobody else\'s', () => {
  it.each(SELF_SERVICE_QUERIES)('%s is scoped to :current_user_id and reachable by an employee', (query) => {
    expect(manifest.queries[query], `${query} is missing from the manifest`).toBeTruthy();
    expect(isSelfScoped(query), `${query} does not carry user_id = :current_user_id`).toBe(true);
    expect(queriesFor('employee').map(([n]) => n)).toContain(query);
  });

  it('the exemption is only ever the self-scoped WHERE — every other query stays under the rule', () => {
    const exempt = Object.keys(manifest.queries).filter(isSelfScoped);
    expect(exempt.sort()).toEqual([...SELF_SERVICE_QUERIES].sort());
  });

  it('my own record carries my compensation; my own absences carry reason and notes', () => {
    for (const c of COMPENSATION) expect(selectsColumn('staff.members.mine', c)).toBe(true);
    for (const c of LEAVE_DETAIL) expect(selectsColumn('staff.time_off.mine', c)).toBe(true);
    // HR notes are the employer side of the record, not self-service.
    expect(selectsColumn('staff.members.mine', 'notes')).toBe(false);
  });
});

// The UI half. The runtime is what enforces this — the module-sdk says as much: `hasPermission` is
// for show/hide, never for security. But a column that the caller is not allowed to read now comes
// back empty, and «0,00 €» next to every colleague reads as «nobody earns anything», which is worse
// than not showing the column at all.
describe('the rate column follows the permission, not the layout', () => {
  const mount = async (permissions: string[]) => {
    (globalThis as Record<string, unknown>).erplora = {
      query: async () => [],
      queryPage: async () => ({ rows: [], total: 0 }),
      command: async () => ({}),
      on: () => () => {},
      locale: 'es',
      t: (_c: unknown, key: string) => key,
      currency: 'EUR',
      formatMoney: (cents: number) => `${(cents / 100).toFixed(2)} €`,
      hasPermission: (perm: string) => permissions.includes(perm),
    };
    await import('./erp-staff-members');
    const el = document.createElement('erp-staff-members');
    document.body.appendChild(el);
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    await new Promise((r) => setTimeout(r, 0));
    await (el as unknown as { updateComplete: Promise<unknown> }).updateComplete;
    return el as unknown as { columns: { key: string }[] };
  };

  it('an employee does not get a rate column at all', async () => {
    const el = await mount(['staff.view_staff_member']);
    expect(el.columns.map((c) => c.key)).not.toContain('hourly_rate');
  });

  it('a manager does', async () => {
    const el = await mount(['staff.view_staff_member', 'staff.view_compensation']);
    expect(el.columns.map((c) => c.key)).toContain('hourly_rate');
  });
});

describe('the manifest does not promise a permission it never declares', () => {
  it('every permission used by a query is declared', () => {
    const used = new Set(Object.values(manifest.queries).map((q) => q.permission));
    for (const perm of used) expect(manifest.permissions).toContain(perm);
  });

  it('every permission handed to a role is declared', () => {
    for (const [role, perms] of Object.entries(manifest.role_permissions)) {
      for (const perm of perms) {
        if (perm === '*') continue;
        expect(manifest.permissions, `role «${role}» is handed an undeclared ${perm}`).toContain(perm);
      }
    }
  });
});
