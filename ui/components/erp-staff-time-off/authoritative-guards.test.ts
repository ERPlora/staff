// The WASM guards are AUTHORITATIVE, and the manifest is what makes them so (staff#1).
//
// A handler cannot read the database: what it knows about a member, a leave or a role is what the
// runtime pre-loads into `context.reads` from the module's own queries (ADR-0069). If a command
// forgets to declare a read, or declares it graceful instead of `required`, the handler either
// refuses everything (a missing member read looks like "no such member") or falls back to the old
// behaviour — a 0-row SQL no-op that still reports success and emits the event. So the contract
// this file pins is the WIRING: which command reads what, that every read is `required`, that
// the queries it names exist and take the payload fields they need, and that every code the
// handler can answer with is translated (en source + es).
//
// The decisions themselves (state machine, overlap, already-inactive) are unit-tested in the
// handler (`handler/src/lib.rs`); the SQL the reads run is tested against a real Postgres in
// `tests/time_off_guards.postgres.test.py`.
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(__dirname, '../../..');
type Read = string | { query: string; params?: Record<string, string>; required?: boolean };
const manifest = JSON.parse(readFileSync(join(ROOT, 'module.json'), 'utf8')) as {
  queries: Record<string, { sql: string }>;
  commands: Record<
    string,
    { sql?: string[]; handler?: { function: string }; reads?: Read[]; emit?: string[]; schema?: string }
  >;
};
const en = JSON.parse(readFileSync(join(ROOT, 'locales/en.json'), 'utf8')) as { errors?: Record<string, string> };
const es = JSON.parse(readFileSync(join(ROOT, 'locales/es.json'), 'utf8')) as { errors?: Record<string, string> };

const sqlOf = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

/** `{ query → params }` of the REQUIRED reads of a command. */
function requiredReads(name: string): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const r of manifest.commands[name]?.reads ?? []) {
    if (typeof r === 'string') continue;
    if (r.required) out[r.query] = r.params ?? {};
  }
  return out;
}

const WIRING: Record<string, Record<string, Record<string, string>>> = {
  'staff.time_off.create': {
    'staff.members.get': { staff_id: 'payload.staff_id' },
    'staff.time_off.overlapping': {
      staff_id: 'payload.staff_id',
      start_date: 'payload.start_date',
      end_date: 'payload.end_date',
    },
  },
  'staff.members.deactivate': {
    'staff.members.get': { staff_id: 'payload.staff_id' },
    'staff.time_off.active_for_member': { staff_id: 'payload.staff_id' },
  },
  'staff.schedules.create': {
    'staff.members.get': { staff_id: 'payload.staff_id' },
  },
  'staff.time_off.set_status': {
    'staff.time_off.detail': { time_off_id: 'payload.time_off_id' },
    'staff.time_off.conflicts_for': { time_off_id: 'payload.time_off_id' },
  },
};

describe('every guarded command reads what its handler decides on — and the read is required', () => {
  it.each(Object.keys(WIRING))('%s', (command) => {
    const cmd = manifest.commands[command];
    expect(cmd?.handler, `${command} must be a WASM command (the guard lives in the handler)`).toBeDefined();
    expect(requiredReads(command)).toEqual(WIRING[command]);
  });

  it('every read names a query of this module whose SQL takes those params', () => {
    for (const reads of Object.values(WIRING)) {
      for (const [query, params] of Object.entries(reads)) {
        const q = manifest.queries[query];
        expect(q, `${query} is not declared`).toBeDefined();
        expect(existsSync(join(ROOT, q.sql)), `${q.sql} missing`).toBe(true);
        const sql = sqlOf(q.sql);
        for (const param of Object.keys(params)) {
          expect(sql, `${query} does not use :${param}`).toMatch(new RegExp(`:${param}\\b`));
        }
        expect(sql, `${query} must be scoped by hub`).toMatch(/:hub_id/);
      }
    }
  });

  it('set_status writes through its own internal intention, and the SQL keeps a state guard', () => {
    const cmd = manifest.commands['staff.time_off.set_status'];
    expect(cmd.handler?.function).toBe('set_time_off_status');
    expect(cmd.sql, 'a WASM command carries no direct sql').toBeUndefined();
    const inner = manifest.commands['staff._set_time_off_status'];
    expect(inner?.sql?.length).toBe(1);
    // Defence in depth: even if the handler were bypassed, a terminal row never moves.
    expect(sqlOf(inner!.sql![0])).toMatch(/status\s+IN\s*\(\s*'pending'\s*,\s*'approved'\s*\)/i);
  });

  it('bulk_create sees the roles of this hub, so a foreign role is skipped and reported', () => {
    const reads = (manifest.commands['staff.members.bulk_create'].reads ?? []).map((r) =>
      typeof r === 'string' ? r : r.query,
    );
    expect(reads).toContain('staff.roles.list');
  });
});

describe('every code the handler can answer is a public, translated ABI', () => {
  const CODES = [
    'staff.member_not_found',
    'staff.already_inactive',
    'staff.active_time_off',
    'staff.overlapping_time_off',
    'staff.time_off_not_found',
    'staff.invalid_transition',
  ];
  it.each(CODES)('%s is in the handler, en and es', (code) => {
    expect(readFileSync(join(ROOT, 'handler/src/lib.rs'), 'utf8')).toContain(`"${code}"`);
    expect(en.errors?.[code], 'en (source)').toBeTruthy();
    expect(es.errors?.[code], 'es').toBeTruthy();
  });
});
