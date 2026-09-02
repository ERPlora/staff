#!/usr/bin/env python3
"""The Ajustes screen says (HH:MM) and the hub shows `09:00:00` (ERPlora/staff#51).

Two values decide what a business sees in the working-day fields, and they were not the same one:

  * the `default` of `schemas/settings_update.json` — what the shell's generic form puts in the
    control while the hub has no settings row (`ModuleSettingsForm.vue`, `boot()`: row value >
    schema `default` > empty) — said `09:00`;
  * the `DEFAULT` of the column of `staff_settings` — what the row is BORN with, because
    `commands/_settings_ensure.sql` deliberately does not list the settings columns so the table is
    their single source — said `09:00:00`.

It is not a 422: the `pattern` accepts both shapes on purpose. It is the screen contradicting
itself. Any write that does not name these two columns (the assistant updating one limit, any
partial API call) creates the singleton with the column's value, so the field labelled `(HH:MM)`
comes back holding `HH:MM:SS`, and it keeps coming back after every reload.

The canonical shape is **HH:MM**, and that is decided by who CONSUMES the value: nobody parses it.
The only consumer is this settings form, where the shell renders it as a plain text input (a `string`
with no `enum` → `text`, `hub/apps/web/src/lib/module-settings.ts`), and the label promises hour and
minute. The rest of the product agrees — `cash_register.auto_close_time` and
`schedules_business_hours.open_time`/`close_time` store `HH:MM` — so `staff_settings` was the
outlier, not the rule.

What this battery pins, and why every layer is load-bearing:

  A. the schema `default` and the column `DEFAULT` are THE SAME VALUE, for every property of the
     settings schema, asked to Postgres itself (`information_schema.columns`) instead of parsed out
     of the migrations: an `ALTER COLUMN … SET DEFAULT` in a later migration moves the answer, and a
     parser that only reads `001_init` would report a value no hub has. This is the guard ERPlora/staff#50
     could not carry, and it is the one that makes ERPlora/cash_register#69 (same class of bug, same day) not
     come back here. It fails if it compared nothing.
  B. the SYMPTOM: a partial update on a fresh hub creates the singleton and `staff.settings.get`
     returns `HH:MM`, the shape the label promises.
  C. the MIGRATION on the rows that already exist: a hub carrying `09:00:00` (the old column
     default) and one carrying `09:30:00` (the `beauty` blueprint seed) are normalized when the new
     migration runs, and running it twice changes nothing. Its negative control builds the same
     database WITHOUT the new migration and requires the rows to still be broken there — a
     migration test that passes on both sides is testing nothing.
  D. a value that still arrives with seconds — an older client, the assistant, a hand-made API
     call, all of which the `pattern` still accepts on purpose — is STORED canonically, and a row
     that holds seconds anyway (a blueprint seed writes them directly, and those seeds live in other
     repositories) is SHOWN without them.

Usage: tests/settings_defaults.postgres.test.py   (exit 0 = green)
  It NEVER skips itself. A battery that goes green because it could not reach Postgres is worse
  than no battery at all, and this one exists precisely to catch a value that "looks right".
"""

import json
import pathlib
import re
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))

from pg_harness import (  # noqa: E402
    HUB,
    MANIFEST,
    MODULE_DIR,
    NOW,
    USER,
    ScratchDb,
    bind,
    container_available,
)

SCHEMA = json.loads(
    (MODULE_DIR / MANIFEST["settings"]["schema"]).read_text(encoding="utf-8")
)
PROPERTIES: dict = SCHEMA["properties"]
TABLE = "staff_settings"

#: The migrations this battery is about, in order. Named, not "the last two": the day another
#: migration lands on top, layer C must still build the database as it was the instant BEFORE these
#: ran. They are two files because the guard splits them — `SET DEFAULT` is DDL and belongs to an
#: `expand`, the UPDATE of the live rows is DML and belongs to a `backfill`
#: (`crates/runtime/src/migration_guard.rs`).
NORMALIZERS = (
    "migrations/postgres/003_worktime_hhmm.sql",
    "migrations/postgres/004_worktime_hhmm_backfill.sql",
)


#: What `migrations.postgres` may hold: a bare path, or `{file, kind}` when the module declares
#: what the migration does. Both forms are the manifest's, so the battery reads both.
def migration_path(entry) -> str:
    return entry["file"] if isinstance(entry, dict) else entry


def declared_kind(entry) -> str:
    return entry.get("kind", "expand") if isinstance(entry, dict) else "expand"


#: The two fields the label promises in `HH:MM`.
TIMES = ("default_work_start", "default_work_end")

#: What a real hub has in the table TODAY, and where it came from. Layer C migrates exactly this.
LIVE_ROWS = {
    "hub-born-from-the-column-default": ("09:00:00", "18:00:00"),
    "hub-seeded-by-the-beauty-blueprint": ("09:30:00", "20:00:00"),
}

CAST = re.compile(r"::[a-z ]+$", re.IGNORECASE)

failures: list[str] = []


def fail(message: str) -> None:
    failures.append(message)
    print(f"  x {message}")


def ok(message: str) -> None:
    print(f"  . {message}")


def check(label: str, got: object, want: object) -> None:
    if got != want:
        fail(f"{label}: got {got!r}, want {want!r}")
    else:
        ok(label)


def sql_default(raw: str) -> object:
    """`'09:00'::text` → `'09:00'`; `60` → `60`. What the column actually hands a new row."""
    value = CAST.sub("", (raw or "").strip())
    if value.startswith("'") and value.endswith("'"):
        return value[1:-1].replace("''", "'")
    try:
        return int(value)
    except ValueError:
        return value


def column_defaults(db: ScratchDb) -> dict:
    raw = db.psql(
        [
            "-tA",
            "-F",
            "\x1f",
            "-c",
            "SELECT column_name, COALESCE(column_default, '') FROM information_schema.columns "
            f"WHERE table_name = '{TABLE}' ORDER BY column_name",
        ],
        db=db.name,
    )
    out = {}
    for line in raw.splitlines():
        if not line.strip():
            continue
        name, default = line.split("\x1f", 1)
        out[name] = default
    return out


def migrations_up_to(exclusive: str) -> list[str]:
    """The migrations a hub had applied the instant BEFORE `exclusive` ran."""
    rels = [migration_path(e) for e in MANIFEST["migrations"]["postgres"]]
    if exclusive not in rels:
        fail(
            f"`{exclusive}` is not declared in module.json → migrations.postgres, so no hub will "
            "ever run it; the normalization would exist only in the repository"
        )
        return rels
    return rels[: rels.index(exclusive)]


def check_kinds_declared() -> None:
    """The `kind` is the guard's whole contract: it refuses DDL in a `backfill` and DML is not what
    an `expand` is for. Declaring it wrong does not fail here — it fails at INSTALL, on a hub."""
    by_path = {
        migration_path(e): declared_kind(e) for e in MANIFEST["migrations"]["postgres"]
    }
    for rel, want in zip(NORMALIZERS, ("expand", "backfill")):
        check(
            f"`{rel.rsplit('/', 1)[-1]}` is declared `{want}`", by_path.get(rel), want
        )


def build(db: ScratchDb, rels: list[str]) -> None:
    db.psql(["-c", f'DROP DATABASE IF EXISTS "{db.name}" WITH (FORCE)'])
    db.psql(["-c", f'CREATE DATABASE "{db.name}"'])
    for rel in rels:
        db.psql([], db=db.name, stdin=(MODULE_DIR / rel).read_text(encoding="utf-8"))


def seed_row(db: ScratchDb, hub: str, start: str, end: str) -> None:
    db.psql(
        [],
        db=db.name,
        stdin=(
            f"INSERT INTO {TABLE} (id, hub_id, default_work_start, default_work_end, "
            f"is_deleted, created_at) VALUES ('set-{hub}', '{hub}', '{start}', '{end}', 0, '{NOW}')"
        ),
    )


def stored_times(db: ScratchDb, hub: str) -> tuple:
    raw = db.psql(
        [
            "-tA",
            "-F",
            "\x1f",
            "-c",
            f"SELECT default_work_start, default_work_end FROM {TABLE} WHERE hub_id = '{hub}'",
        ],
        db=db.name,
    ).strip()
    return tuple(raw.split("\x1f")) if raw else ()


# ── A · the promise and the column are the same value ──────────────────────────────────────────


def check_defaults_agree() -> None:
    print("A. the `default` the screen shows and the `DEFAULT` the row is born with")
    db = ScratchDb("staff_settings_defaults")
    try:
        db.create()
        defaults = column_defaults(db)
        compared = 0
        for key, prop in PROPERTIES.items():
            if "default" not in prop:
                fail(
                    f"`{key}` declares no `default`: on a hub with no settings row the form starts "
                    "it empty and the screen stops agreeing with the table"
                )
                continue
            if key not in defaults:
                fail(f"`{key}` is a settings property with no column in `{TABLE}`")
                continue
            if not defaults[key]:
                fail(
                    f"`{key}` has NO column DEFAULT, so a row created by "
                    "`commands/_settings_ensure.sql` is born NULL where the screen showed "
                    f"{prop['default']!r}"
                )
                continue
            compared += 1
            check(
                f"`{key}`: schema default == column DEFAULT",
                sql_default(defaults[key]),
                prop["default"],
            )

        # The positive control. A run that compared nothing passes every assertion above.
        if compared == 0:
            fail(
                "this layer compared ZERO columns — its green would mean the query broke, not that "
                "the defaults agree"
            )
        elif compared != len(PROPERTIES):
            fail(
                f"only {compared} of {len(PROPERTIES)} settings properties were compared; the rest "
                "would drift unwatched"
            )
        else:
            ok(f"all {compared} settings properties compared against their column")

        # And the column's own value has to be something the screen would accept back.
        for key in TIMES:
            pattern = PROPERTIES[key].get("pattern")
            value = sql_default(defaults.get(key, ""))
            if not pattern:
                fail(f"`{key}` lost its `pattern`: any text would be «a time»")
            elif not isinstance(value, str) or not re.fullmatch(pattern, value):
                fail(
                    f"the column DEFAULT of `{key}` ({value!r}) does not match its own pattern"
                )
            else:
                ok(f"the column DEFAULT of `{key}` is a value the form would accept")
    finally:
        db.drop()


# ── B · the row a hub is actually born with ────────────────────────────────────────────────────


def check_the_born_row() -> None:
    print("B. a partial save on a fresh hub — the row `_settings_ensure` creates")
    db = ScratchDb("staff_settings_born")
    try:
        db.create()
        # The assistant changing one limit, or any partial API call: the columns it does not name
        # keep the column DEFAULT, and that is what the screen reads back.
        db.run_command("staff.settings.update", {"max_daily_hours": 10})
        row = db.run_query("staff.settings.get", {})
        if not row:
            fail("`staff.settings.get` returned no row after the first save")
            return
        for key in TIMES:
            check(
                f"`{key}` comes back in the shape its label promises",
                row[0][key],
                PROPERTIES[key]["default"],
            )
    finally:
        db.drop()


# ── C · the rows that already exist ────────────────────────────────────────────────────────────


def check_the_migration() -> None:
    print("C. the migration, on the rows a hub in production has today")
    missing = [rel for rel in NORMALIZERS if not (MODULE_DIR / rel).exists()]
    if missing:
        fail(
            f"{missing} do(es) not exist: the hubs that already hold `09:00:00` are never "
            "normalized, so the screen keeps showing seconds no matter what the schema says"
        )
        return
    check_kinds_declared()
    before = migrations_up_to(NORMALIZERS[0])

    # The negative control FIRST: without the new migration the rows have to be broken, or layer C
    # would go green against a database that never had the bug.
    control = ScratchDb("staff_settings_premigration")
    try:
        build(control, before)
        for hub, (start, end) in LIVE_ROWS.items():
            seed_row(control, hub, start, end)
        still_broken = [
            h for h, v in LIVE_ROWS.items() if stored_times(control, h) == v
        ]
        if len(still_broken) != len(LIVE_ROWS):
            fail(
                "without the new migration the rows are ALREADY normalized — this layer cannot "
                "show what the migration does, so its green means nothing"
            )
        else:
            ok(f"without it, {len(still_broken)} row(s) still hold HH:MM:SS (control)")
    finally:
        control.drop()

    db = ScratchDb("staff_settings_migrated")
    try:
        build(db, before)
        for hub, (start, end) in LIVE_ROWS.items():
            seed_row(db, hub, start, end)
        normalizers = [
            (MODULE_DIR / rel).read_text(encoding="utf-8") for rel in NORMALIZERS
        ]
        for sql in normalizers:
            db.psql([], db=db.name, stdin=sql)
        for hub, (start, end) in LIVE_ROWS.items():
            check(f"`{hub}` normalized", stored_times(db, hub), (start[:5], end[:5]))

        # Applied twice: a hub that died half-way through an upgrade retries them, and a migration
        # that is not idempotent turns that retry into a broken hub.
        for sql in normalizers:
            db.psql([], db=db.name, stdin=sql)
        for hub, (start, end) in LIVE_ROWS.items():
            check(
                f"`{hub}` unchanged by a second run",
                stored_times(db, hub),
                (start[:5], end[:5]),
            )

        # And what the old rows carried still works: the screen reads them, and a save on top of
        # them goes through the real command.
        rows = db.run_query(
            "staff.settings.get", {}, hub="hub-born-from-the-column-default"
        )
        check(
            "a hub migrated from `09:00:00` reads back `09:00`",
            (rows[0]["default_work_start"], rows[0]["default_work_end"])
            if rows
            else (),
            ("09:00", "18:00"),
        )
        db.run_command(
            "staff.settings.update",
            {"default_work_start": "08:00", "default_work_end": "16:30"},
            hub="hub-born-from-the-column-default",
        )
        check(
            "and it can still be saved after the migration",
            stored_times(db, "hub-born-from-the-column-default"),
            ("08:00", "16:30"),
        )
    finally:
        db.drop()


# ── D · seconds that arrive anyway ─────────────────────────────────────────────────────────────


def check_seconds_are_absorbed() -> None:
    print("D. a value that still arrives — or sits — with seconds")
    for key in TIMES:
        pattern = PROPERTIES[key].get("pattern") or ""
        if not re.fullmatch(pattern, "09:00:00"):
            fail(
                f"`{key}`: the pattern stopped accepting `HH:MM:SS`, so every hub still holding one "
                "is refused instead of normalized (staff#51 asked for one version of tolerance)"
            )
        else:
            ok(
                f"`{key}` still accepts an incoming `HH:MM:SS` (no 422 for older callers)"
            )

    db = ScratchDb("staff_settings_seconds")
    try:
        db.create()
        db.run_command(
            "staff.settings.update",
            {"default_work_start": "07:30:00", "default_work_end": "21:15:00"},
        )
        check(
            "a payload with seconds is STORED canonically",
            stored_times(db, HUB),
            ("07:30", "21:15"),
        )

        # A row written straight into the table — what the `beauty` blueprint seed does, from a
        # repository this module cannot fix — is still SHOWN the way the label promises.
        seed_row(db, "hub-seeded-later", "09:30:00", "20:00:00")
        rows = db.run_query("staff.settings.get", {}, hub="hub-seeded-later")
        check(
            "a row seeded with seconds is shown as HH:MM",
            (rows[0]["default_work_start"], rows[0]["default_work_end"])
            if rows
            else (),
            ("09:30", "20:00"),
        )
    finally:
        db.drop()


def main() -> int:
    if not container_available():
        print(
            "FAILED — the test Postgres container is not reachable. Start it "
            "(`erplora-test-pg-5433`, or set STAFF_TEST_PG_CONTAINER); this battery does not skip: "
            "the bug it guards is a value that looks right."
        )
        return 1
    _ = (
        USER,
        bind,
    )  # imported for the harness contract; the layers above use ScratchDb.
    check_defaults_agree()
    print()
    check_the_born_row()
    print()
    check_the_migration()
    print()
    check_seconds_are_absorbed()
    print()
    if failures:
        print(
            f"FAILED — {len(failures)} problem(s): the settings screen and the table disagree"
        )
        for f in failures:
            print(f"  - {f}")
        return 1
    print(
        "PASS — the working-day fields hold what their label promises (HH:MM), the schema default "
        "and the column DEFAULT are the same value, and the hubs that already carried seconds were "
        "migrated without losing the ability to save."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
