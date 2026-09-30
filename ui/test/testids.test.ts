// A screen the QA robot cannot name is a screen nobody tests (staff#56, out of hub#1756).
//
// The hub's QA drives the screens with Playwright, and Playwright addresses by `data-testid`: it
// is the only hook that survives a copy change, the `en`↔`es` translation (ADR-0055/0199) and the
// Shadow DOM of a Web Component. When a control has none, the spec falls back to a selector by
// text or by `nth` — and both break on their own: the text changes with the language and the
// position changes the moment somebody adds a field. That is how the restaurant QA walk of
// 2026-09-09 left ten points of this module unverified.
//
// This is the guard of the PATTERN, not a patch over one screen. The hub's twin lives in
// `apps/web/src/form-testids.test.ts`; the convention both obey is written once, in
// `architecture/hub/apps/testids.md`: `<surface>-<field|action|state>`, kebab-case, and the rows
// of a list carry their identity at the end (`staff-schedules-day-start-${d.day}`), never
// their index.
//
// Two things are NOT copied from the hub's guard, because this repo is not Vue:
//
//   · The surfaces are Lit components (`html` tagged templates inside `.ts`), so there is no
//     `<template>` block to cut: the whole source is the template, and a computed hook is written
//     `data-testid=${...}`, not `:data-testid="..."`.
//   · The hub only reads LITERAL hooks, so renaming a COMPUTED one stays green there and breaks
//     the specs days later, in another repo (hub#1828). Here a computed hook is read too: its
//     static head must live under the surface's prefix and end in `-`, so renaming it breaks HERE.
//
// Five rules, because they stop five different things:
//
//   · COVERAGE — in a registered surface no control, no action and no state banner is left
//     without a hook. It is what makes the field somebody adds next month born addressable.
//   · CONTRACT — the names the QA writes in its specs are declared here, and the declared set is
//     EXACTLY the one in the file. Renaming a hook has to break THIS test first, here, where it
//     is seen.
//   · TABLE — every `<ok-data-table>` declares its `testid` namespace. The four screens of this
//     module ARE a table: without that one attribute the «+», the searchbar, every row, every
//     row action and the pager paint NO hook at all (outfitkit#143), and the CRUD stays undrivable
//     however well the side form is hooked up.
//   · ALERT — an `<ion-alert>` paints its buttons and inputs itself, from the `.buttons`/`.inputs`
//     objects: no template of ours ever writes them. Deactivating, terminating and deleting are
//     confirmed THERE, so without a hook on each entry the spec presses «Confirm» by its copy.
//   · RATCHET — every surface with something addressable is classified: covered, or pending with
//     its issue. A new component cannot slip in unclassified, and the pending list only shrinks.
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/** `ui/` — everything the module paints, `lib/` included: a new screen can land anywhere in here. */
const UI = join(import.meta.dirname, '..');

/**
 * Covered surface: `prefix` is the namespace that belongs to it, `contract` is the EXACT set of
 * literal `data-testid` the file declares today, `computed` the EXACT set of static heads, and
 * `tables` the EXACT set of `<ok-data-table testid="…">` namespaces, and `alert` the EXACT set of
 * hooks on the buttons and inputs of its `<ion-alert>` (see the ALERT rule).
 *
 * To get in here a screen needs every half: every control, action and state banner hooked
 * (coverage), and its names written down (contract). Adding a field to one of these screens forces
 * touching this list — on purpose: that is the moment somebody decides what that field is called
 * for the rest of the world.
 */
const COVERED: Record<
  string,
  { prefix: string; contract: string[]; computed?: string[]; tables?: string[]; alert?: string[] }
> = {
  // The staff directory (`/m/staff/members`): the table, the add/edit panel projected into its side
  // drawer (identity, operation, compensation, the services a person performs) and the
  // deactivate/terminate confirmation.
  'components/erp-staff-members/erp-staff-members.ts': {
    prefix: 'staff-members-',
    contract: [
      'staff-members-action-alert',
      'staff-members-bio',
      'staff-members-bookable',
      'staff-members-booking-buffer',
      'staff-members-color',
      'staff-members-commission-rate',
      'staff-members-email',
      'staff-members-employee-id',
      'staff-members-first-name',
      'staff-members-form',
      'staff-members-form-error',
      'staff-members-hire-date',
      'staff-members-hourly-rate',
      'staff-members-hub-user',
      'staff-members-hub-user-hint',
      'staff-members-last-name',
      'staff-members-load-error',
      'staff-members-page-error',
      'staff-members-phone',
      'staff-members-role',
      'staff-members-service-add',
      'staff-members-service-assign',
      'staff-members-service-duration',
      'staff-members-service-price',
      'staff-members-services-empty',
      'staff-members-services-error',
      'staff-members-services-no-catalog',
      'staff-members-specialties',
      'staff-members-status',
      'staff-members-submit',
    ],
    computed: [
      // An assigned service is addressed by the CATALOGUE service it is — the id the spec picked in
      // `staff-members-service-add` — never by its position: the list re-orders by primary.
      'staff-members-service-primary-',
      'staff-members-service-remove-',
    ],
    tables: ['staff-members-table'],
    alert: [
      'staff-members-action-cancel',
      'staff-members-action-confirm',
      'staff-members-terminate-date',
      'staff-members-terminate-reason',
    ],
  },
  // Roles (`/m/staff/roles`): the table and the add panel.
  'components/erp-staff-roles/erp-staff-roles.ts': {
    prefix: 'staff-roles-',
    contract: [
      'staff-roles-color',
      'staff-roles-description',
      'staff-roles-form',
      'staff-roles-form-error',
      'staff-roles-load-error',
      'staff-roles-name',
      'staff-roles-submit',
    ],
    tables: ['staff-roles-table'],
  },
  // Working schedules (`/m/staff/schedules`): the member scope, the table, the weekly panel and the
  // delete confirmation.
  'components/erp-staff-schedules/erp-staff-schedules.ts': {
    prefix: 'staff-schedules-',
    contract: [
      'staff-schedules-default',
      'staff-schedules-delete-alert',
      'staff-schedules-effective-from',
      'staff-schedules-effective-until',
      'staff-schedules-form',
      'staff-schedules-form-error',
      'staff-schedules-load-error',
      'staff-schedules-member',
      'staff-schedules-name',
      'staff-schedules-no-members',
      'staff-schedules-page-error',
      'staff-schedules-submit',
    ],
    computed: [
      // A row of the week is keyed by its `day_of_week` (0 = Monday … 6 = Sunday, as stored): the
      // day IS its identity, and it is what the spec means by «Tuesday».
      'staff-schedules-day-break-end-',
      'staff-schedules-day-break-start-',
      'staff-schedules-day-end-',
      'staff-schedules-day-start-',
      'staff-schedules-day-working-',
    ],
    tables: ['staff-schedules-table'],
    alert: ['staff-schedules-delete-cancel', 'staff-schedules-delete-submit'],
  },
  // Time off (`/m/staff/time-off`): the table and the add panel.
  'components/erp-staff-time-off/erp-staff-time-off.ts': {
    prefix: 'staff-time-off-',
    contract: [
      'staff-time-off-end-date',
      'staff-time-off-end-time',
      'staff-time-off-form',
      'staff-time-off-form-error',
      'staff-time-off-full-day',
      'staff-time-off-leave-type',
      'staff-time-off-load-error',
      'staff-time-off-member',
      'staff-time-off-page-error',
      'staff-time-off-reason',
      'staff-time-off-start-date',
      'staff-time-off-start-time',
      'staff-time-off-submit',
    ],
    tables: ['staff-time-off-table'],
  },
};

/**
 * Surfaces still without hooks, each with the issue that adds them. Empty today, and the ratchet
 * below is what keeps it that way.
 */
const NOT_YET_COVERED: Record<string, string> = {};

/**
 * How many surfaces are pending TODAY. This number ONLY GOES DOWN. Without it the pending list is
 * a list of excuses: a new component walks in with a decorative issue number and the guard stays
 * green. With the count nailed down, adding one forces raising it by hand, on a line whose comment
 * says it is not raised.
 */
const PENDING_TODAY = 0;

/**
 * What a person fills in. `ok-combo` is listed although no screen of this module uses one yet: it
 * IS a form control, and the day somebody swaps an `ion-select` for it the swap must not quietly
 * drop the control out of the coverage rule.
 */
const CONTROL_TAGS = [
  'ion-input',
  'ion-select',
  'ion-textarea',
  'ion-toggle',
  'ion-checkbox',
  'ion-searchbar',
  'ion-segment',
  'ion-radio-group',
  'ion-datetime',
  'ion-range',
  'ok-combo',
  'input',
  'select',
  'textarea',
] as const;

/**
 * What a person presses. Anything carrying `@click` counts too, whatever its tag.
 *
 * `summary` is in the list because a native `<details>` disclosure carries no `@click` of its
 * own — the browser opens it — and with it shut the fields behind it are not in the accessibility
 * tree at all: the first one this module grows must be born named.
 */
const ACTION_TAGS = [
  'ion-button',
  'button',
  'ion-fab-button',
  'ion-segment-button',
  'summary',
] as const;

/**
 * What a spec has to WAIT FOR. A hook on a banner is not decoration: it is the difference between
 * `await expect(page.getByTestId('staff-members-form-error')).toBeVisible()` and a spec that
 * asserts on the Spanish copy of an error — which passes in `es`, fails in `en`, and proves
 * nothing in either.
 *
 * `ok-empty-state` is listed for the same reason as `ok-combo`: the first empty state this module
 * grows is a RESULT a spec waits for, and it is born named. `ion-alert` is here because deactivating,
 * terminating and deleting are confirmed in one: it is a gate the journey crosses.
 */
const STATE_TAGS = ['ok-inline-feedback', 'ok-empty-state', 'ion-alert'] as const;

/** The table is its own rule: it carries `testid`, not `data-testid` (outfitkit#143). */
const TABLE_TAG = 'ok-data-table';

const ANY_TAG = /<([a-z][a-z0-9-]*)(?=[\s/>])/g;

/**
 * The `>` that closes the opening tag, skipping the ones that are not markup: those inside quotes
 * and those inside an interpolation.
 *
 * In a Lit template `${...}` is JavaScript, and this module's JavaScript is full of `>`: every
 * arrow of a handler (`@ionInput=${(e: any) => ...}`) and every generic (`CustomEvent<{ sort:
 * string; dir: 'asc' | 'desc' }>`). Stopping at the first one reads a quarter of the tag and drops
 * the rest of the attributes — including, silently, the `data-testid` written after a handler.
 */
function openTag(source: string, start: number): string {
  let quote: string | null = null;
  for (let i = start; i < source.length; i++) {
    const c = source[i];
    if (quote) {
      if (c === quote) quote = null;
      continue;
    }
    if (c === '$' && source[i + 1] === '{') {
      const body = braced(source, i);
      if (body !== undefined) {
        i += body.length + 2; // `${` + body + the `}` the loop's own step walks past
        continue;
      }
    }
    if (c === '"' || c === "'") quote = c;
    else if (c === '>') return source.slice(start, i + 1);
  }
  return source.slice(start);
}

/**
 * Prose out. The comments in these components talk ABOUT the markup — they name controls, quote
 * the `<ok-combo>` that replaced an `ion-select`, and explain why a country is chosen and not
 * typed. Read as markup, those sentences are controls with no hook, and the coverage rule reports
 * an element that does not exist.
 *
 * A block comment is only cut when its opener starts the line, which is how every comment in this
 * repo is written. Matching one mid-line would risk swallowing live template — and a swallowed
 * chunk is not a loud failure, it is a control nobody checks.
 */
function withoutComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, blanked)
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, blanked)
    .split('\n')
    .map((line) => (/^\s*\/\//.test(line) ? '' : line))
    .join('\n');
}

/**
 * A comment is blanked, not removed: its newlines stay. Deleting them slides every line below it
 * up, and the `<tag> line N` the coverage rule prints starts naming the wrong element — by as many
 * lines as the comments above it had. Nothing is hidden by that (the rule still fires), but an
 * author sent ten lines off checks an element that HAS its hook and concludes the guard is broken.
 */
const blanked = (match: string): string => match.replace(/[^\n]/g, ' ');

/** A hook as written: literal (`"staff-members-submit"`) or computed (`` ${`staff-members-service-remove-${id}`} ``). */
type Hook = { literal?: string; head?: string };

/**
 * Every `data-testid` of a source, in the three shapes Lit writes one: `="name"`, `=${`head-${x}`}`
 * and `="${x}"`. For a computed one what is kept is its STATIC HEAD — the part before the first
 * interpolation — which is what the prefix rule can hold on to.
 */
function hooks(source: string): Hook[] {
  const found: Hook[] = [];
  const re = /(?<![:\w-])data-testid\s*=\s*/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const at = m.index + m[0].length;
    const raw = source[at] === '"' || source[at] === "'" ? quoted(source, at) : braced(source, at);
    if (raw === undefined) continue;
    const cut = raw.indexOf('${');
    if (cut === -1 && !raw.startsWith('`')) found.push({ literal: raw });
    else found.push({ head: staticHead(raw) });
  }
  return found;
}

/** The body of `"…"`, without the quotes. */
function quoted(source: string, at: number): string | undefined {
  const end = source.indexOf(source[at], at + 1);
  return end === -1 ? undefined : source.slice(at + 1, end);
}

/** The body of `${…}`, with nested braces balanced so a `${}` inside a template literal survives. */
function braced(source: string, at: number): string | undefined {
  if (source[at] !== '$' || source[at + 1] !== '{') return undefined;
  let depth = 0;
  for (let i = at + 1; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) return source.slice(at + 2, i);
  }
  return undefined;
}

/** The static text a computed hook starts with: `` `staff-members-service-remove-${id}` `` → `staff-members-service-remove-`. */
function staticHead(raw: string): string {
  const body = raw.trim().startsWith('`') ? raw.trim().slice(1) : raw;
  const cut = body.search(/\$\{|`/);
  return cut === -1 ? '' : body.slice(0, cut);
}

/** Carries a hook, literal or computed. */
const hasHook = (open: string): boolean => /(?<![:\w-])data-testid\s*=/.test(open);

type Element = { tag: string; line: number; open: string };

function elements(source: string): Element[] {
  const clean = withoutComments(source);
  const found: Element[] = [];
  ANY_TAG.lastIndex = 0;
  for (let m = ANY_TAG.exec(clean); m; m = ANY_TAG.exec(clean)) {
    found.push({
      tag: m[1],
      line: clean.slice(0, m.index).split('\n').length,
      open: openTag(clean, m.index),
    });
  }
  return found;
}

const isControl = (el: Element): boolean => (CONTROL_TAGS as readonly string[]).includes(el.tag);

const isAction = (el: Element): boolean =>
  (ACTION_TAGS as readonly string[]).includes(el.tag) || /@click\s*=/.test(el.open);

const isState = (el: Element): boolean => (STATE_TAGS as readonly string[]).includes(el.tag);

/**
 * The `<form>` itself, which is neither filled nor pressed: it is what a spec submits and what it
 * waits to disappear. The hub names it the same way (`employee-form`).
 */
const isForm = (el: Element): boolean => el.tag === 'form';

/** Everything the QA has to name on a surface: what it fills, what it presses, what it waits for. */
const addressable = (source: string): Element[] =>
  elements(source).filter((el) => isControl(el) || isAction(el) || isState(el) || isForm(el));

const unhooked = (source: string): string[] =>
  addressable(source)
    .filter((el) => !hasHook(el.open))
    .map((el) => `<${el.tag}> line ${el.line}`);

/** Kebab-case: lowercase and digits separated by a single hyphen. */
const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

function uiFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) uiFiles(full, found);
    else if (entry.endsWith('.ts')) found.push(full);
  }
  return found;
}

/** Everything under `ui/` that is not a test: the surfaces the rules below read. */
const SURFACES: Array<{ name: string; source: string }> = uiFiles(UI)
  .filter((full) => !full.endsWith('.test.ts'))
  .map((full) => ({ name: relative(UI, full), source: readFileSync(full, 'utf8') }))
  .sort((a, b) => a.name.localeCompare(b.name));

/**
 * Everything under `ui/`, tests included, for the attribute rule. A spec that keeps reading
 * `[data-test="…"]` after the screen stopped writing it asserts `false` for ever, which is how a
 * rule that never fires disguises itself as a rule that passes. This file is the only exclusion,
 * and it has to be: a guard that forbids an attribute has to spell it out in order to forbid it.
 */
const ALL_UI: Array<{ name: string; source: string }> = uiFiles(UI)
  .filter((full) => !full.endsWith('test/testids.test.ts'))
  .map((full) => ({ name: relative(UI, full), source: readFileSync(full, 'utf8') }))
  .sort((a, b) => a.name.localeCompare(b.name));

const sourceOf = (name: string): string => SURFACES.find((s) => s.name === name)?.source ?? '';

const literalsOf = (name: string): string[] =>
  hooks(withoutComments(sourceOf(name)))
    .map((h) => h.literal)
    .filter((v): v is string => v !== undefined);

const headsOf = (name: string): string[] =>
  hooks(withoutComments(sourceOf(name)))
    .map((h) => h.head)
    .filter((v): v is string => v !== undefined);

/** The `testid` namespace each `<ok-data-table>` declares, or `null` when it declares none. */
const tablesOf = (source: string): Array<string | null> =>
  elements(source)
    .filter((el) => el.tag === TABLE_TAG)
    .map((el) => el.open.match(/(?<![:\w-])testid="([^"]*)"/)?.[1] ?? null);

/**
 * One entry of an `<ion-alert>`'s `.buttons` or `.inputs`, as written in the object literal: `kind`
 * says which list it came from, `hook` is its `'data-testid'` (or `null`), and `key` is the object
 * that carries it.
 *
 * The key is checked because Ionic spells it differently per list — `htmlAttributes` on a button,
 * `attributes` on an input — and the wrong one is silent: Ionic ignores the unknown key, paints no
 * attribute, and the hook looks right in the diff while `getByTestId` finds nothing.
 */
type AlertEntry = { kind: 'button' | 'input'; hook: string | null; key: string | null; text: string };

const ALERT_KEY = { button: 'htmlAttributes', input: 'attributes' } as const;

function alertEntriesOf(source: string): AlertEntry[] {
  const found: AlertEntry[] = [];
  for (const el of elements(source).filter((e) => e.tag === 'ion-alert')) {
    for (const [prop, kind] of [
      ['buttons', 'button'],
      ['inputs', 'input'],
    ] as const) {
      const at = el.open.search(new RegExp(`\\.${prop}\\s*=\\s*\\$\\{`));
      if (at === -1) continue;
      const body = braced(el.open, el.open.indexOf('${', at)) ?? '';
      const opener = kind === 'button' ? /\{\s*text\s*:/g : /\{\s*name\s*:/g;
      const starts: number[] = [];
      for (let m = opener.exec(body); m; m = opener.exec(body)) starts.push(m.index);
      starts.forEach((start, i) => {
        const text = body.slice(start, starts[i + 1] ?? body.length);
        const m = text.match(/(\w+)\s*:\s*\{\s*'data-testid'\s*:\s*'([^']*)'/);
        found.push({ kind, hook: m?.[2] ?? null, key: m?.[1] ?? null, text: text.trim() });
      });
    }
  }
  return found;
}

describe('data-testid — the module UI convention (staff#56)', () => {
  it('every literal data-testid is kebab-case', () => {
    const offenders: string[] = [];
    for (const { name } of SURFACES) {
      for (const value of literalsOf(name)) {
        if (!KEBAB.test(value)) offenders.push(`${name}: "${value}"`);
      }
    }
    expect(offenders, 'a name that is not kebab-case breaks what the QA can predict').toEqual([]);
  });

  it('no literal data-testid is repeated in two surfaces', () => {
    const owners = new Map<string, string[]>();
    for (const { name } of SURFACES) {
      for (const value of new Set(literalsOf(name))) {
        owners.set(value, [...(owners.get(value) ?? []), name]);
      }
    }
    const shared = [...owners]
      .filter(([, files]) => files.length > 1)
      .map(([value, files]) => `"${value}" in ${files.join(' + ')}`);
    expect(
      shared,
      'getByTestId would return two elements and the spec would pick at random',
    ).toEqual([]);
  });

  it('a covered surface leaves no control, action or state without a hook', () => {
    const offenders: string[] = [];
    for (const name of Object.keys(COVERED)) {
      expect(
        SURFACES.some((s) => s.name === name),
        `${name} is in COVERED but does not exist`,
      ).toBe(true);
      for (const el of unhooked(sourceOf(name))) offenders.push(`${name}: ${el}`);
    }
    expect(offenders, 'Playwright cannot fill in, press or await what has no data-testid').toEqual(
      [],
    );
  });

  it('the declared contract is EXACTLY the one in the surface', () => {
    const drift: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      const found = [...new Set(literalsOf(name))].sort();
      const declared = [...spec.contract].sort();
      for (const missing of declared.filter((v) => !found.includes(v))) {
        drift.push(`${name}: the contract declares "${missing}" and the surface no longer has it`);
      }
      for (const extra of found.filter((v) => !declared.includes(v))) {
        drift.push(`${name}: the surface has "${extra}" and the contract does not declare it`);
      }
    }
    expect(drift, 'renaming a data-testid breaks the QA suite: declare it here').toEqual([]);
  });

  it('every literal data-testid lives in its surface namespace', () => {
    const offenders: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      if (!spec.prefix) continue;
      for (const value of new Set(literalsOf(name))) {
        if (!value.startsWith(spec.prefix)) offenders.push(`${name}: "${value}" ≠ ${spec.prefix}*`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('a COMPUTED data-testid also lives in its namespace and keeps its identity at the end', () => {
    // This is the hole the hub's guard has (hub#1828): over there only the literals are read, so
    // renaming a computed hook stays green and the specs that use it break days later, in another
    // repo. A computed hook is a contract just the same.
    const offenders: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      for (const head of headsOf(name)) {
        if (head === '') {
          offenders.push(`${name}: a data-testid with no static head cannot be predicted by a spec`);
        } else if (spec.prefix && !head.startsWith(spec.prefix)) {
          offenders.push(`${name}: "${head}\${…}" ≠ ${spec.prefix}*`);
        } else if (!head.endsWith('-')) {
          offenders.push(`${name}: "${head}\${…}" glues the identity onto the name: end it with "-"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the declared computed contract is EXACTLY the one in the surface', () => {
    const drift: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      const found = [...new Set(headsOf(name))].sort();
      const declared = [...(spec.computed ?? [])].sort();
      for (const missing of declared.filter((v) => !found.includes(v))) {
        drift.push(`${name}: the contract declares "${missing}\${…}" and the surface has no such head`);
      }
      for (const extra of found.filter((v) => !declared.includes(v))) {
        drift.push(`${name}: the surface has "${extra}\${…}" and the contract does not declare it`);
      }
    }
    expect(drift, 'renaming a computed data-testid breaks the QA suite: declare it here').toEqual(
      [],
    );
  });

  it('every ok-data-table declares the testid namespace of its chrome', () => {
    // Without it `<ok-data-table>` paints NO hook at all (outfitkit#143): no «+», no searchbar, no
    // row, no row action, no pager. On the four table screens of this module that is the
    // whole CRUD — including the «edit» row action, the ONLY way a spec opens a record.
    const offenders: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      tablesOf(sourceOf(name)).forEach((testid, i) => {
        if (testid === null) {
          offenders.push(`${name}: <ok-data-table> #${i + 1} has no testid="…"`);
        } else if (!KEBAB.test(testid)) {
          offenders.push(`${name}: "${testid}" is not kebab-case`);
        } else if (spec.prefix && !testid.startsWith(spec.prefix)) {
          offenders.push(`${name}: "${testid}" ≠ ${spec.prefix}*`);
        }
      });
    }
    expect(offenders, 'a table with no testid is a CRUD no spec can drive').toEqual([]);
  });

  it('the declared table namespace is EXACTLY the one in the surface', () => {
    const drift: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      const found = tablesOf(sourceOf(name))
        .filter((v): v is string => v !== null)
        .sort();
      const declared = [...(spec.tables ?? [])].sort();
      expect(found, `${name}: the table namespaces drifted from the contract`).toEqual(declared);
      if (found.join() !== declared.join()) drift.push(name);
    }
    expect(drift).toEqual([]);
  });

  it('nothing in ui/ writes data-test: Playwright only resolves data-testid', () => {
    const offenders: string[] = [];
    const attr = /(?<![\w-])(data-test[\w-]*)\s*=/g;
    for (const { name, source } of ALL_UI) {
      attr.lastIndex = 0;
      for (let m = attr.exec(source); m; m = attr.exec(source)) {
        if (m[1] !== 'data-testid') offenders.push(`${name}: ${m[1]}=`);
      }
    }
    expect(
      offenders,
      'getByTestId does not resolve it: write data-testid, prefixed with its screen',
    ).toEqual([]);
  });

  it('nothing in ui/ writes :data-testid: Lit does not bind it, it renders the colon', () => {
    // The convention this module copies was written for the Vue shell, where `:data-testid="x"` is
    // the LEGAL way to spell a computed hook. Lit has no such binding: it renders an attribute
    // called literally `:data-testid`, which `getByTestId` never resolves. So the one spelling a
    // person is most likely to arrive with — copied from the hub, or from the convention doc — is
    // precisely the one that produces a hook that looks right in the diff and addresses nothing.
    // It has to be denied by NAME: with the colon simply ignored by the reader, a dead hook on a
    // decorative element is a hook no rule above is even looking at.
    const offenders: string[] = [];
    const bound = /(?<![\w-])((?::|v-bind:)data-testid)\s*=/g;
    for (const { name, source } of ALL_UI) {
      bound.lastIndex = 0;
      for (let m = bound.exec(source); m; m = bound.exec(source)) offenders.push(`${name}: ${m[1]}=`);
    }
    expect(
      offenders,
      'Lit renders the colon: write data-testid=${…} for a computed hook',
    ).toEqual([]);
  });

  it('a hook is spelled data-testid="…" or data-testid=${…}, and nothing else', () => {
    // The rules above read exactly two spellings. Any other way of writing the SAME attribute is a
    // hook Lit renders, the QA can address, and this file never sees — `data-testid='x'` in single
    // quotes being the easy one to type. A guard that reads one spelling has to forbid the rest,
    // or it fails open on the next person.
    const offenders: string[] = [];
    const spelling = /(?<![:\w-])data-testid\s*=\s*(.)/g;
    for (const { name, source } of SURFACES) {
      spelling.lastIndex = 0;
      for (let m = spelling.exec(source); m; m = spelling.exec(source)) {
        if (m[1] !== '"' && m[1] !== '$') offenders.push(`${name}: data-testid=${m[1]}`);
      }
    }
    expect(offenders, 'the rules above read one spelling: any other is a hook with no contract')
      .toEqual([]);
  });

  it('every button and input of an ion-alert carries its hook, under the key Ionic reads', () => {
    const offenders: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      for (const entry of alertEntriesOf(sourceOf(name))) {
        const where = `${name}: alert ${entry.kind} ${entry.text.slice(0, 40)}…`;
        if (entry.hook === null) offenders.push(`${where} has no 'data-testid'`);
        else if (entry.key !== ALERT_KEY[entry.kind])
          offenders.push(`${where} puts it under "${entry.key}": Ionic only reads "${ALERT_KEY[entry.kind]}"`);
        else if (!KEBAB.test(entry.hook) || !entry.hook.startsWith(spec.prefix))
          offenders.push(`${where}: "${entry.hook}" ≠ kebab-case ${spec.prefix}*`);
      }
    }
    expect(offenders, 'a confirmation the spec cannot name is pressed by its copy').toEqual([]);
  });

  it('the declared alert contract is EXACTLY the one in the surface', () => {
    const drift: string[] = [];
    for (const [name, spec] of Object.entries(COVERED)) {
      const found = alertEntriesOf(sourceOf(name))
        .map((e) => e.hook)
        .filter((v): v is string => v !== null)
        .sort();
      const declared = [...(spec.alert ?? [])].sort();
      if (found.join() !== declared.join()) drift.push(`${name}: ${found.join()} ≠ ${declared.join()}`);
    }
    expect(drift, 'renaming an alert hook breaks the QA suite: declare it here').toEqual([]);
  });

  it('every surface with something addressable is classified: covered, or with its issue', () => {
    const unclassified = SURFACES.filter(
      ({ name, source }) =>
        addressable(source).length > 0 && !(name in COVERED) && !(name in NOT_YET_COVERED),
    ).map(({ name }) => name);
    expect(
      unclassified,
      'a new component is born with data-testid — or enters NOT_YET_COVERED with its issue',
    ).toEqual([]);
  });

  it('a pending surface that is already complete does not stay in the pending list', () => {
    const stale = Object.keys(NOT_YET_COVERED).filter(
      (name) => SURFACES.some((s) => s.name === name) && unhooked(sourceOf(name)).length === 0,
    );
    expect(stale, 'it already has every hook: move it to COVERED with its contract').toEqual([]);
  });

  it('the pending list only shrinks: a new surface is born covered, not pending', () => {
    const pending = Object.keys(NOT_YET_COVERED).length;
    expect(
      pending,
      pending > PENDING_TODAY
        ? 'a new surface does not enter NOT_YET_COVERED: hook it up and move it to COVERED'
        : `a pending surface left the list: lower PENDING_TODAY to ${pending}`,
    ).toBe(PENDING_TODAY);
  });

  it('the pending list does not name surfaces that no longer exist', () => {
    const ghosts = Object.keys(NOT_YET_COVERED).filter(
      (name) => !SURFACES.some((s) => s.name === name),
    );
    expect(ghosts).toEqual([]);
  });

  it('every pending surface cites a real issue, not a placeholder', () => {
    // A pending surface with no issue is a pending surface nobody does: the register above reads
    // like a plan, and a `repo#PENDING-something` turns it into a list of good intentions that
    // never reaches the board. Exact shape `repo#N` so it can be opened from here.
    const placeholders = Object.entries(NOT_YET_COVERED)
      .filter(([, issue]) => !/^[a-z][a-z0-9_-]*#\d+$/.test(issue))
      .map(([name, issue]) => `${name}: "${issue}"`);
    expect(
      placeholders,
      'open the issue and put its number: the board does not pick up a hole',
    ).toEqual([]);
  });
});

describe('the guard reads a Lit open tag, not a JavaScript one (staff#56)', () => {
  // The rules above are only worth what the reader underneath them sees. In a Lit template an
  // attribute value is JavaScript — `@ionInput=${(e: any) => (this.newKey = e.target.value)}`,
  // `@sortChange=${(e: CustomEvent<{ sort: string }>) => …}` — and that JavaScript is FULL of `>`:
  // every arrow, every generic. A reader that closes the tag at the first `>` stops inside the
  // first handler and never sees the rest of the attributes.
  //
  // That cuts both ways, and one of the two is silent: an element whose hook comes after an
  // interpolated handler would be reported as unhooked (loud), but one whose `@click` comes after
  // one is not recognised as an action at all, so no hook is ever demanded for it — a button
  // nobody has to name, reported by nobody. These sources are synthetic on purpose: a guard that
  // only works on the shapes that exist today is a guard that breaks on the next component.

  it('sees an @click that comes after another interpolated handler', () => {
    const source =
      'html`<div @wheel=${(e: WheelEvent) => this.spin(e)} @click=${() => { this.open = false; }}></div>`';
    expect(
      addressable(source).map((el) => el.tag),
      'the arrow of the first handler is not the end of the tag: that div is a tap',
    ).toEqual(['div']);
  });

  it('sees an @click that comes after an attribute holding a generic', () => {
    const source =
      "html`<div @ionChange=${(e: CustomEvent<{ value?: string }>) => this.pick(e)} @click=${() => this.focus()}></div>`";
    expect(
      addressable(source).map((el) => el.tag),
      'the `>` closing a generic is not the `>` closing the tag',
    ).toEqual(['div']);
  });

  it('sees a data-testid that comes after the handler', () => {
    const source =
      'html`<ion-button @click=${() => this.save()} data-testid="staff-members-submit"></ion-button>`';
    expect(
      unhooked(source),
      'the hook is there: reporting it as missing sends the author to add a second one',
    ).toEqual([]);
  });

  it('still closes the tag at its own `>`, not at a later one', () => {
    const source =
      'html`<ion-input data-testid="staff-members-first-name"></ion-input><ion-button @click=${() => this.go()}></ion-button>`';
    expect(
      unhooked(source),
      'the input is hooked and the button is not: bleeding past the tag would hide one of the two',
    ).toEqual(['<ion-button> line 1']);
  });

  it('does not take :data-testid for a hook: that control is unhooked', () => {
    // If the reader accepts the colon, the coverage rule sees a hooked control and the contract
    // rule sees the declared name present — the surface goes green while the spec that calls
    // `getByTestId('staff-members-bookable')` finds nothing. Both loud rules have to fire, so the reader
    // has to not see it in the first place.
    const source = 'html`<ion-input :data-testid="staff-members-bookable"></ion-input>`';
    expect(
      unhooked(source),
      'a colon-bound attribute is not a hook: the control has to be reported as missing one',
    ).toEqual(['<ion-input> line 1']);
  });

  it('does not put a :data-testid into the contract', () => {
    const source = 'html`<ion-input :data-testid="staff-members-bookable"></ion-input>`';
    expect(
      hooks(source),
      'reading it as a literal would let a dead hook satisfy the declared contract',
    ).toEqual([]);
  });

  it('reports the line the control is really on, after a multi-line comment', () => {
    // Cutting a comment OUT takes its newlines with it, and every line below slides up by as many
    // as the comment had. The rule still fires — it is the line number in its message that lies,
    // and it lies by more the further down the file the control sits: measured on this module's
    // list in the services module, an unhooked `<ion-button>` on line 549 was reported as line 539. Ten lines away, in a
    // 600-line component, is the author checking an element that has its hook and concluding the
    // guard is wrong. A comment is BLANKED, never removed.
    const source = [
      'html`<div>',
      '  <!-- the side panel is projected ALWAYS, even while closed:',
      '       rendering it only when open would unfold an empty «+». -->',
      '  <ion-input></ion-input>',
      '</div>`',
    ].join('\n');
    expect(
      unhooked(source),
      'the hook is missing on line 4: any other number sends the author to the wrong element',
    ).toEqual(['<ion-input> line 4']);
  });

  it('reads the testid of a table declared after its interpolated properties', () => {
    const source =
      'html`<ok-data-table .rows=${this.rows} .columns=${this.cols} testid="staff-members-table"></ok-data-table>`';
    expect(
      tablesOf(source),
      'the namespace is there: missing it would demand a second one',
    ).toEqual(['staff-members-table']);
  });

  it('reads the hook of every alert button and input, and the key it sits under', () => {
    const source = [
      'html`<ion-alert .inputs=${this.on ? [',
      "    { name: 'date', type: 'date', attributes: { 'data-testid': 'staff-members-terminate-date' } },",
      "    { name: 'reason', type: 'text', htmlAttributes: { 'data-testid': 'staff-members-terminate-reason' } },",
      '  ] : []}',
      "  .buttons=${[{ text: t('ui.cancel'), role: 'cancel' }, { text: t('ui.ok'), role: 'confirm', htmlAttributes: { 'data-testid': 'staff-members-action-confirm' } }]}",
      '></ion-alert>`',
    ].join('\n');
    expect(
      alertEntriesOf(source).map((e) => [e.kind, e.key, e.hook]),
      'an unhooked button and an input under the wrong key both have to be visible to the rule',
    ).toEqual([
      ['button', null, null],
      ['button', 'htmlAttributes', 'staff-members-action-confirm'],
      ['input', 'attributes', 'staff-members-terminate-date'],
      ['input', 'htmlAttributes', 'staff-members-terminate-reason'],
    ]);
  });
});
