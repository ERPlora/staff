#!/usr/bin/env python3
"""staff#55 — a Hub user hangs from ONE live staff member of the business, and the DATABASE says so.

The day close indexes the commission sheet by `user_id` (staff#46): with two members of the same
hub pointing at one Hub user, what that user charges at the counter goes to one of the two at
random. The handler refuses the second link with `staff.user_already_linked` (proven in
`handler/src/lib.rs`); this battery pins the two halves that live in SQL, against a real Postgres
built from this module's migrations:

  1. THE INDEX. Two live members of one hub cannot share a `user_id` — neither through the create
     (`staff._insert_member`) nor through the edit (`staff._update_member`), whatever door a future
     writer uses. What stays legal: many members WITHOUT a user, the same user in ANOTHER hub, and
     re-linking a user whose previous member was deleted (`staff.members.delete` soft-deletes).
  2. THE READ the handler decides on: `staff.members.by_user` returns the live holder of that user
     in THIS hub — not the neighbour's, not a deleted one, and nothing for an empty user.
  3. THE HUBS THAT ALREADY HAVE DUPLICATES. The index cannot be built over them, so the migration
     would fail and the hub's update with it. The migration before it keeps ONE link per user and
     hub — the active member first, then the oldest — and unlinks the rest (their records stay,
     only without Hub access, which the owner can re-point from the form). Rows of another hub,
     deleted rows and members without a user are left untouched.

Usage: tests/user_link_unique.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import sys

from pg_harness import (
    HUB,
    MODULE_DIR,
    OTHER_HUB,
    ScratchDb,
    container_available,
    migration_paths,
)

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def member_payload(first: str, user_id) -> dict:
    # The runtime binder does not apply schema defaults: the form sends the full snapshot.
    return {
        "first_name": first,
        "last_name": "Test",
        "email": "",
        "phone": "",
        "employee_id": "",
        "role_id": None,
        "user_id": user_id,
        "hire_date": None,
        "status": "active",
        "bio": "",
        "specialties": "",
        "is_bookable": 1,
        "color": "",
        "hourly_rate": 0,
        "commission_rate": 0,
        "notes": "",
    }


def insert(db: ScratchDb, first: str, user_id, hub: str = HUB) -> str:
    """Creates through the command the handler emits; returns 'ok' or 'unique_violation'."""
    try:
        db.run_command("staff._insert_member", member_payload(first, user_id), hub=hub)
        return "ok"
    except RuntimeError as exc:
        return (
            "unique_violation" if "uq_staff_member_hub_user" in str(exc) else str(exc)
        )


def member_id(db: ScratchDb, first: str, hub: str = HUB) -> str:
    return db.scalar(
        f"SELECT id FROM staff_member WHERE hub_id = '{hub}' AND first_name = '{first}'"
    )


def test_the_index_allows_one_live_member_per_user_and_hub(db: ScratchDb) -> None:
    print("\n· one live member per Hub user and hub")
    check("first member linked to u1", "ok", insert(db, "Ana", "u1"))
    check(
        "second member linked to u1 is refused",
        "unique_violation",
        insert(db, "Bea", "u1"),
    )
    check(
        "the refused create wrote nothing",
        "0",
        db.scalar(
            f"SELECT count(*) FROM staff_member WHERE hub_id = '{HUB}' AND first_name = 'Bea'"
        ),
    )
    check(
        "same user in ANOTHER hub is allowed",
        "ok",
        insert(db, "Ana", "u1", hub=OTHER_HUB),
    )
    check("a member without a user", "ok", insert(db, "Cris", None))
    check("another member without a user", "ok", insert(db, "Dani", None))

    check("a member linked to u2", "ok", insert(db, "Eva", "u2"))
    eva = member_id(db, "Eva")
    try:
        db.run_command(
            "staff._update_member",
            {"staff_id": member_id(db, "Cris"), "user_id": "u2", "role_id": None},
        )
        edit = "ok"
    except RuntimeError as exc:
        edit = (
            "unique_violation" if "uq_staff_member_hub_user" in str(exc) else str(exc)
        )
    check("editing another member onto u2 is refused", "unique_violation", edit)

    db.run_command(
        "staff.members.delete",
        {"staff_id": eva, "termination_date": "", "reason": "left", "timezone": "UTC"},
    )
    check(
        "after deleting its holder, u2 can be linked again",
        "ok",
        insert(db, "Flor", "u2"),
    )


def test_the_holder_read(db: ScratchDb) -> None:
    print("\n· staff.members.by_user — the read the handler decides on")
    rows = db.run_query("staff.members.by_user", {"user_id": "u1"})
    check("u1 has one holder in this hub", ["Ana"], [r["first_name"] for r in rows])
    check(
        "the holder carries its id",
        member_id(db, "Ana"),
        rows[0]["id"] if rows else None,
    )
    other = db.run_query("staff.members.by_user", {"user_id": "u1"}, hub=OTHER_HUB)
    check(
        "the neighbour's holder is the neighbour's",
        [member_id(db, "Ana", hub=OTHER_HUB)],
        [r["id"] for r in other],
    )
    rows = db.run_query("staff.members.by_user", {"user_id": "u2"})
    check(
        "a deleted member does not hold the user",
        ["Flor"],
        [r["first_name"] for r in rows],
    )
    check(
        "an empty user has no holder",
        [],
        db.run_query("staff.members.by_user", {"user_id": ""}),
    )
    check(
        "a NULL user has no holder",
        [],
        db.run_query("staff.members.by_user", {"user_id": None}),
    )


def test_existing_duplicates_are_resolved_before_the_index() -> None:
    print("\n· a hub that already has duplicates updates cleanly")
    paths = migration_paths()
    first_new = next(i for i, p in enumerate(paths) if "user_link" in p)
    db = ScratchDb("staff_user_link_dupes")
    db.psql(["-c", f'DROP DATABASE IF EXISTS "{db.name}"'])
    db.psql(["-c", f'CREATE DATABASE "{db.name}"'])
    try:
        for rel in paths[:first_new]:
            db.psql([], db=db.name, stdin=(MODULE_DIR / rel).read_text())
        rows = [
            # (id, hub, first_name, user_id, status, is_deleted, created_at)
            ("d1", HUB, "OldInactive", "u1", "inactive", 0, "2026-01-01T00:00:00Z"),
            ("d2", HUB, "Active", "u1", "active", 0, "2026-02-01T00:00:00Z"),
            ("d3", HUB, "NewActive", "u1", "active", 0, "2026-03-01T00:00:00Z"),
            ("d4", HUB, "Deleted", "u1", "active", 1, "2025-01-01T00:00:00Z"),
            ("d5", OTHER_HUB, "Neighbour", "u1", "active", 0, "2026-01-01T00:00:00Z"),
            ("d6", HUB, "OldLeave", "u2", "on_leave", 0, "2026-01-01T00:00:00Z"),
            ("d7", HUB, "NewLeave", "u2", "on_leave", 0, "2026-02-01T00:00:00Z"),
            ("d8", HUB, "Alone", "u3", "active", 0, "2026-01-01T00:00:00Z"),
            ("d9", HUB, "NoUser", None, "active", 0, "2026-01-01T00:00:00Z"),
            ("d10", HUB, "EmptyA", "", "active", 0, "2026-01-01T00:00:00Z"),
            ("d11", HUB, "EmptyB", "", "active", 0, "2026-02-01T00:00:00Z"),
        ]
        values = ",\n".join(
            f"('{i}', '{h}', '{f}', 'Test', "
            + ("NULL" if u is None else f"'{u}'")
            + f", '{s}', {d}, '{c}', '{c}')"
            for i, h, f, u, s, d, c in rows
        )
        db.psql(
            [],
            db=db.name,
            stdin="INSERT INTO staff_member (id, hub_id, first_name, last_name, user_id, status,"
            f" is_deleted, created_at, updated_at) VALUES\n{values};",
        )
        for rel in paths[first_new:]:
            db.psql([], db=db.name, stdin=(MODULE_DIR / rel).read_text())
        links = dict(
            line.split("|")
            for line in db.scalar(
                "SELECT string_agg(id || '|' || COALESCE(user_id, '-'), E'\\n' ORDER BY id)"
                " FROM staff_member"
            ).splitlines()
        )
        check(
            "the ACTIVE member keeps u1, the oldest active wins over the newer",
            {"d1": "-", "d2": "u1", "d3": "-"},
            {k: links[k] for k in ("d1", "d2", "d3")},
        )
        check("a deleted row keeps its historical link", "u1", links["d4"])
        check("the neighbour hub is untouched", "u1", links["d5"])
        check(
            "with no active member, the oldest keeps u2",
            {"d6": "u2", "d7": "-"},
            {k: links[k] for k in ("d6", "d7")},
        )
        check("a user with a single member is untouched", "u3", links["d8"])
        check("a member without a user stays without", "-", links["d9"])
        check(
            "a legacy '' is the same absence as NULL (never an index collision)",
            {"d10": "-", "d11": "-"},
            {k: links[k] for k in ("d10", "d11")},
        )
        check(
            "the unique index exists after the update",
            "1",
            db.scalar(
                "SELECT count(*) FROM pg_indexes WHERE indexname = 'uq_staff_member_hub_user'"
            ),
        )
        for rel in paths[first_new:]:
            db.psql([], db=db.name, stdin=(MODULE_DIR / rel).read_text())
        check(
            "re-running the migrations changes nothing (idempotent)",
            "d2",
            db.scalar(
                f"SELECT string_agg(id, ',') FROM staff_member WHERE hub_id = '{HUB}'"
                " AND user_id = 'u1' AND is_deleted = 0"
            ),
        )
    finally:
        db.drop()


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_user_link")
    db.create()
    try:
        test_the_index_allows_one_live_member_per_user_and_hub(db)
        test_the_holder_read(db)
    finally:
        db.drop()
    test_existing_duplicates_are_resolved_before_the_index()
    if failures:
        print(f"\n{len(failures)} FAILED")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nall green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
