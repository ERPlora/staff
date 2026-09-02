#!/usr/bin/env python3
"""staff#11 — the manifest holds together: nothing points at something that is not there.

`Manifest::load` is the FIRST thing `installer::install` does, so a wrong value here does not
degrade a feature: it CLOSES THE DOOR — the published module cannot be installed on any hub. And
the halves the runtime resolves LATER are worse, because they fail silently: a widget whose `query`
does not exist is a dead tile on the dashboard, a `settings.get` pointing nowhere is an empty
settings screen, a `handler.function` that no longer exists in the crate is a command that dies at
call time with the manifest looking perfectly fine.

`erplora validate` does not cover this: it re-implements a subset of the JSON Schema by hand and it
does not follow a widget to its query nor a handler to its crate.

What is checked, all statically, no services needed:

  1. TYPE CONTRACT. The blocks the runtime deserializes (`crates/runtime/src/manifest.rs`) carry the
     JSON type the runtime expects.
  2. DECLARED FILES EXIST. Migrations in order, query and command SQL, JSON Schemas, the WASM
     handler, the UI bundle, the i18n catalogues.
  3. PERMISSIONS ARE REAL. Every permission a query, command or widget names is one the module
     declares, and every declared permission is granted to some role.
  4. TIER 2. Every `handler.function` is exported by `handler/src/lib.rs` and every export is wired
     to a command; every intention the handler emits resolves to a command of THIS module that
     declares its `sql[]`; every `reads` names a declared query.
  5. EVENTS. Everything the handler emits is declared in `events.emits`; every `events.listen` key
     maps to a command that exists.
  6. THE SETTINGS BLOCK (ADR-0082). `get`/`set` are this module's declared query/command and the
     block's `schema` is the very schema the `set` command validates against.
  7. THE WIDGETS (ADR-0054). Every widget's `query` and `permission` are declared, and every
     `staff.*` event in `refresh_on` is one this module emits — a refresh trigger nobody fires is a
     tile frozen on its first value.
  8. THE WASM BUILD IS REPRODUCIBLE. `dist/handler.build.json` matches the binary on disk, and
     `cargo metadata --locked --offline` succeeds — the lockfile is committed and in sync, so the
     build is not resolving fresh dependencies on each machine. That last check needs the hub
     checkout (`erplora-guest-sdk` is a path dependency); unreachable is reported SKIPPED, never as
     a pass.

The half a static file CANNOT answer — whether the widget's `map` names fields the query really
RETURNS — is `tests/dashboard_contract.postgres.test.py`, against real rows.

Usage: tests/manifest.contract.test.py   (exit 0 = green)
"""

import hashlib
import json
import pathlib
import re
import subprocess
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

failures: list[str] = []
skipped: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


# ── 1. Type contract ──────────────────────────────────────────────────────────────────────

# Mirrors the serde model of `hub/crates/runtime/src/manifest.rs`. A boolean where a string enum
# belongs is what made `tables` uninstallable (tables#28) — the trap costs nothing to cover.
TYPES = {
    "id": str,
    "name": str,
    "version": str,
    "description": str,
    "depends_on": list,
    "permissions": list,
    "role_permissions": dict,
    "navigation": list,
    "migrations": dict,
    "queries": dict,
    "commands": dict,
    "events": dict,
    "widgets": dict,
    "settings": dict,
    "ui": dict,
    "agent": dict,
}


def test_the_blocks_carry_the_type_the_runtime_deserializes() -> None:
    print("\n· type contract of the manifest blocks")
    wrong = {
        key: type(MANIFEST[key]).__name__
        for key, expected in TYPES.items()
        if key in MANIFEST and not isinstance(MANIFEST[key], expected)
    }
    check("blocks with the wrong JSON type", {}, wrong)
    check(
        "id is namespaced", True, bool(re.fullmatch(r"[a-z][a-z0-9_]*", MANIFEST["id"]))
    )
    check(
        "version is SemVer",
        True,
        bool(re.fullmatch(r"\d+\.\d+\.\d+", MANIFEST["version"])),
    )
    check(
        "every migration dialect is a list of paths",
        ["postgres"],
        list(MANIFEST["migrations"]),
    )


# ── 2. Declared files ─────────────────────────────────────────────────────────────────────


def declared_paths() -> list[str]:
    # A migration is a bare path, or `{"file": …, "kind": …}` when the module declares what it
    # does (`crates/runtime/src/manifest.rs`, `MigrationEntry`). Both are the manifest's own
    # shapes, and reading only the first blew this check up the day one declared a `kind`.
    paths = [e["file"] if isinstance(e, dict) else e for e in MANIFEST["migrations"]["postgres"]]
    paths += [q["sql"] for q in MANIFEST["queries"].values()]
    for c in MANIFEST["commands"].values():
        paths += list(c.get("sql", []))
        if c.get("schema"):
            paths.append(c["schema"])
        if c.get("handler"):
            paths.append(c["handler"]["file"])
    paths.append(MANIFEST["ui"]["entry"])
    if MANIFEST.get("settings", {}).get("schema"):
        paths.append(MANIFEST["settings"]["schema"])
    return paths


def test_every_declared_file_is_in_the_package() -> None:
    print("\n· every path the manifest names exists")
    check(
        "missing files",
        [],
        sorted({p for p in declared_paths() if not (MODULE_DIR / p).exists()}),
    )
    for locale in ("en", "es"):
        check(
            f"locales/{locale}.json",
            True,
            (MODULE_DIR / "locales" / f"{locale}.json").exists(),
        )


# ── 3. Permissions ────────────────────────────────────────────────────────────────────────


def test_permissions_are_declared_used_and_granted() -> None:
    print("\n· permissions: declared, used and granted")
    declared = set(MANIFEST["permissions"])
    used = {
        d["permission"] for d in MANIFEST["queries"].values() if d.get("permission")
    }
    used |= {
        d["permission"] for d in MANIFEST["commands"].values() if d.get("permission")
    }
    used |= {
        w["permission"] for w in MANIFEST["widgets"].values() if w.get("permission")
    }
    check("permissions used but not declared", set(), used - declared)
    check(
        "queries or commands with no permission",
        0,
        sum(
            1
            for d in list(MANIFEST["queries"].values())
            + list(MANIFEST["commands"].values())
            if not d.get("permission")
        ),
    )
    granted: set[str] = set()
    for perms in MANIFEST["role_permissions"].values():
        granted |= declared if perms == ["*"] else set(perms)
    check("permissions nobody is granted", set(), declared - granted)
    check("permissions granted but not declared", set(), granted - declared)


# ── 4. Tier 2 ─────────────────────────────────────────────────────────────────────────────

HANDLER_SRC = (MODULE_DIR / "handler" / "src" / "lib.rs").read_text()
EXPORTED = set(re.findall(r"#\[plugin_fn\]\s*\npub fn (\w+)", HANDLER_SRC))


def test_the_manifest_and_the_crate_name_the_same_functions() -> None:
    print("\n· Tier 2: manifest ↔ crate, both directions")
    wired = {
        c["handler"]["function"]
        for c in MANIFEST["commands"].values()
        if c.get("handler")
    }
    check("declared but not exported by the crate", set(), wired - EXPORTED)
    check("exported but wired to no command", set(), EXPORTED - wired)
    for name, cmd in MANIFEST["commands"].items():
        if cmd.get("handler"):
            check(
                f"{name} points at the built wasm",
                "dist/handler.wasm",
                cmd["handler"]["file"],
            )


def test_the_intentions_the_handlers_emit_resolve() -> None:
    print("\n· the intentions the handler returns resolve to this module's commands")
    emitted = set(re.findall(r'Operation::sql\(\s*"([^"]+)"', HANDLER_SRC))
    check("no intention found (the regex went stale)", True, len(emitted) > 0)
    for name in sorted(emitted):
        cmd = MANIFEST["commands"].get(name)
        if cmd is None:
            check(f"{name} is declared", True, False)
            continue
        check(f"{name} declares its sql[]", True, bool(cmd.get("sql")))


def test_the_reads_name_queries_of_this_module() -> None:
    print("\n· `reads` (ADR-0069) point at declared queries")
    for name, cmd in MANIFEST["commands"].items():
        for read in cmd.get("reads", []):
            query = read if isinstance(read, str) else read["query"]
            check(f"{name} reads {query}", True, query in MANIFEST["queries"])


def test_every_event_the_handler_emits_is_declared() -> None:
    print("\n· events: a handler emitting an undeclared event FAILS the command")
    emitted = set(re.findall(r'Event::new\(\s*\n?\s*"([^"]+)"', HANDLER_SRC))
    declared = set(MANIFEST["events"]["emits"])
    # This module's guest returns `events: vec![]` ON PURPOSE: the host persists the command's
    # declared `emit`, and a guard that REJECTS must emit nothing at all (staff#1). So the check is
    # not «the handler emits something», it is «whatever it emits is declared» — plus, from the
    # other side, that every declared event has an emitter and every emitter names a declared event.
    check("events emitted by the handler but not declared", set(), emitted - declared)
    from_sql = {e for c in MANIFEST["commands"].values() for e in c.get("emit", [])}
    check("events declared but emitted by nobody", set(), declared - emitted - from_sql)
    check("commands emitting an undeclared event", set(), from_sql - declared)
    for event, spec in MANIFEST["events"].get("listen", {}).items():
        check(
            f"listener of {event} names an existing command",
            True,
            spec["command"] in MANIFEST["commands"],
        )


# ── 6. The settings block (ADR-0082) ──────────────────────────────────────────────────────


def test_the_settings_block_points_at_this_modules_own_door() -> None:
    print(
        "\n· settings block (ADR-0082): the shell's generic screen needs all three to resolve"
    )
    block = MANIFEST.get("settings")
    check("the module declares a settings block", True, isinstance(block, dict))
    if not isinstance(block, dict):
        return
    check("`get` is a declared query", True, block["get"] in MANIFEST["queries"])
    check("`set` is a declared command", True, block["set"] in MANIFEST["commands"])
    # The screen validates with the block's schema; the command validates with its own. Two
    # different files here means the form accepts what the server refuses.
    check(
        "the block's schema IS the command's schema",
        MANIFEST["commands"][block["set"]]["schema"],
        block["schema"],
    )
    check(
        "it has a title and an icon for the settings list",
        True,
        bool(block.get("title")) and bool(block.get("icon")),
    )


# ── 7. Widgets (ADR-0054) ─────────────────────────────────────────────────────────────────

# The enums are NOT re-implemented here: they are read from the canonical
# `hub/schemas/module.schema.json` when the checkout is at hand, so this test cannot drift from the
# contract. Without it, the values of the day it was written are used, and that is reported.
WIDGET_KINDS = ("kpi", "stat", "sparkline", "bar-list", "timeline", "chart")
WIDGET_SIZES = ("sm", "md", "lg")


def _canonical_widget_enums() -> None:
    global WIDGET_KINDS, WIDGET_SIZES
    schema_path = (MODULE_DIR / ".." / ".." / ".." / "hub" / "schemas" / "module.schema.json").resolve()
    if not schema_path.exists():
        skipped.append(f"widget enums read from the frozen copy: no hub schema at {schema_path}")
        return
    schema = json.loads(schema_path.read_text())
    node = schema
    for part in schema["properties"]["widgets"]["additionalProperties"]["$ref"].lstrip("#/").split("/"):
        node = node[part]
    WIDGET_KINDS = tuple(node["properties"]["kind"]["enum"])
    WIDGET_SIZES = tuple(node["properties"]["size"]["enum"])


def test_every_widget_resolves_to_a_query_a_permission_and_live_events() -> None:
    print("\n· widgets (ADR-0054): a tile that resolves to nothing is a dead tile")
    _canonical_widget_enums()
    emits = set(MANIFEST["events"]["emits"])
    for wid, w in MANIFEST["widgets"].items():
        check(f"{wid}: query is declared", True, w["query"] in MANIFEST["queries"])
        check(
            f"{wid}: permission is declared",
            True,
            w["permission"] in MANIFEST["permissions"],
        )
        check(f"{wid}: kind is known", True, w["kind"] in WIDGET_KINDS)
        check(f"{wid}: size is known", True, w["size"] in WIDGET_SIZES)
        check(
            f"{wid}: map is a flat object of strings",
            True,
            isinstance(w.get("map"), dict)
            and all(isinstance(v, str) for v in w["map"].values()),
        )
        # A `staff.*` refresh trigger this module never emits leaves the tile frozen on its first
        # value. Events of OTHER modules are legitimate and out of our reach, so only ours count.
        mine = {e for e in w.get("refresh_on", []) if e.startswith("staff.")}
        check(f"{wid}: refresh_on events this module never emits", set(), mine - emits)


# ── 8. The WASM build ─────────────────────────────────────────────────────────────────────


def test_the_wasm_build_is_reproducible() -> None:
    print("\n· the WASM build: fresh, and pinned by a lockfile")
    build = json.loads((MODULE_DIR / "dist" / "handler.build.json").read_text())
    wasm = (MODULE_DIR / "dist" / "handler.wasm").read_bytes()
    check(
        "dist/handler.wasm is the binary build.json describes",
        build["wasm_sha256"],
        hashlib.sha256(wasm).hexdigest(),
    )
    check("built for wasm32", "wasm32-unknown-unknown", build["target"])
    check("with the guest feature", ["guest"], build["features"])
    check(
        "Cargo.lock is committed",
        True,
        (MODULE_DIR / "handler" / "Cargo.lock").exists(),
    )

    sdk = (MODULE_DIR / ".." / ".." / ".." / "hub" / "crates" / "guest-sdk").resolve()
    if not sdk.exists():
        skipped.append(f"cargo metadata --locked: no guest-sdk checkout at {sdk}")
        print(f"  SKIPPED: cargo metadata --locked (no guest-sdk checkout at {sdk})")
        return
    res = subprocess.run(
        ["cargo", "metadata", "--locked", "--offline", "--format-version", "1"],
        cwd=MODULE_DIR / "handler",
        capture_output=True,
        text=True,
    )
    ok = res.returncode == 0
    print(f"  {'ok' if ok else 'FAIL'}: cargo metadata --locked --offline")
    if not ok:
        detail = (res.stderr or res.stdout).strip().splitlines()[:3]
        failures.append(
            "cargo metadata --locked --offline failed: " + " / ".join(detail)
        )
        for line in detail:
            print(f"      {line}")


def main() -> int:
    test_the_blocks_carry_the_type_the_runtime_deserializes()
    test_every_declared_file_is_in_the_package()
    test_permissions_are_declared_used_and_granted()
    test_the_manifest_and_the_crate_name_the_same_functions()
    test_the_intentions_the_handlers_emit_resolve()
    test_the_reads_name_queries_of_this_module()
    test_every_event_the_handler_emits_is_declared()
    test_the_settings_block_points_at_this_modules_own_door()
    test_every_widget_resolves_to_a_query_a_permission_and_live_events()
    test_the_wasm_build_is_reproducible()
    print()
    for s in skipped:
        print(f"  SKIPPED: {s}")
    if failures:
        print(f"✗ {len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("✓ manifest.contract: all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
