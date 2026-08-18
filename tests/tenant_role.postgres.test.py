#!/usr/bin/env python3
"""staff#12 — a member's role must be a role of THIS hub. Two hubs, the neighbour ALIVE.

The FK `staff_member.role_id → staff_role.id` points at a GLOBAL id, so it does not know about
hubs: hub A could persist a member pointing at hub B's private role. PR #27 closed the READ half
(every JOIN carries `hub_id`, so B's role name no longer comes out in A's lists) — this file pins
the WRITE half: `staff.members.create` / `staff.members.update` resolve the role against
`staff_role` of the injected `:hub_id`, and when it does not resolve they FAIL (`expect_rows`,
hub#139) instead of writing nothing and reporting success.

Acceptance points, run against a real Postgres built from this module's migrations:
  1. Create with the neighbour's role → rejected with the declared domain code, NO row written.
  2. Create with a role that does not exist / is soft-deleted / is inactive → rejected, no row.
  3. Create WITHOUT a role (NULL, and also '' from a <select>) → allowed, `role_id` stored as NULL.
  4. Create with a role of this hub → allowed, `role_id` stored.
  5. Update to the neighbour's role → rejected; the member keeps its previous role.
  6. Update with `role_id` NULL → allowed, role untouched (partial update).
  7. Update to a role of this hub → allowed.
  8. Update of a member that does not exist in this hub → rejected (the same gate).
  9. Nothing of the neighbour's role (name/colour/description) is visible through the module's
     own list/get queries of hub A after the attempts.

Usage: tests/tenant_role.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import sys

from pg_harness import HUB, OTHER_HUB, DomainError, ScratchDb, container_available

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def seed_role(
    db: ScratchDb, hub: str, name: str, active: int = 1, deleted: int = 0
) -> str:
    db.run_command(
        "staff.roles.create",
        {"name": name, "description": f"{name} desc", "color": "#123456"},
        hub=hub,
    )
    role_id = db.scalar(
        f"SELECT id FROM staff_role WHERE hub_id = '{hub}' AND name = '{name}'"
    )
    if not active or deleted:
        db.scalar(
            f"UPDATE staff_role SET is_active = {active}, is_deleted = {deleted} WHERE id = '{role_id}' RETURNING id"
        )
    return role_id


def try_create(db: ScratchDb, hub: str, first: str, role_id) -> str | None:
    """Returns the domain code when rejected, None when it commits."""
    try:
        db.run_command(
            "staff.members.create",
            {
                # The runtime binder does not apply schema defaults: the UI sends the full snapshot.
                "first_name": first,
                "last_name": "Test",
                "email": "",
                "phone": "",
                "employee_id": "",
                "role_id": role_id,
                "user_id": None,
                "hire_date": None,
                "status": "active",
                "bio": "",
                "specialties": "",
                "is_bookable": 1,
                "color": "",
                "hourly_rate": 0,
                "commission_rate": 0,
                "notes": "",
            },
            hub=hub,
        )
        return None
    except DomainError as exc:
        return exc.code


def try_update(db: ScratchDb, hub: str, staff_id: str, role_id) -> str | None:
    try:
        db.run_command(
            "staff.members.update", {"staff_id": staff_id, "role_id": role_id}, hub=hub
        )
        return None
    except DomainError as exc:
        return exc.code


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0

    db = ScratchDb("staff_tenant_role_test")
    db.create()
    try:
        own_role = seed_role(db, HUB, "Stylist")
        neighbour_role = seed_role(db, OTHER_HUB, "Neighbour Secret Role")
        deleted_role = seed_role(db, HUB, "Old role", deleted=1)
        inactive_role = seed_role(db, HUB, "Retired role", active=0)

        members = f"SELECT count(*) FROM staff_member WHERE hub_id = '{HUB}'"

        # 1. neighbour's role
        code = try_create(db, HUB, "Mallory", neighbour_role)
        check("create with neighbour role is rejected", "staff.role_not_found", code)
        check("create with neighbour role writes no row", "0", db.scalar(members))

        # 2. missing / deleted / inactive
        check(
            "create with unknown role is rejected",
            "staff.role_not_found",
            try_create(db, HUB, "Ghost", "no-such-role"),
        )
        check(
            "create with deleted role is rejected",
            "staff.role_not_found",
            try_create(db, HUB, "Ghost", deleted_role),
        )
        check(
            "create with inactive role is rejected",
            "staff.role_not_found",
            try_create(db, HUB, "Ghost", inactive_role),
        )
        check("none of them wrote a row", "0", db.scalar(members))

        # 3. no role at all
        check(
            "create with NULL role is allowed", None, try_create(db, HUB, "Alice", None)
        )
        check("create with '' role is allowed", None, try_create(db, HUB, "Bob", ""))
        check(
            "both rows carry role_id NULL",
            "2",
            db.scalar(
                f"SELECT count(*) FROM staff_member WHERE hub_id = '{HUB}' AND role_id IS NULL"
            ),
        )

        # 4. own role
        check(
            "create with own role is allowed",
            None,
            try_create(db, HUB, "Carol", own_role),
        )
        carol = db.scalar(
            f"SELECT id FROM staff_member WHERE hub_id = '{HUB}' AND first_name = 'Carol'"
        )
        check(
            "own role is stored",
            own_role,
            db.scalar(f"SELECT role_id FROM staff_member WHERE id = '{carol}'"),
        )

        # 5. update to neighbour's role
        check(
            "update to neighbour role is rejected",
            "staff.member_update_rejected",
            try_update(db, HUB, carol, neighbour_role),
        )
        check(
            "member keeps its role",
            own_role,
            db.scalar(f"SELECT role_id FROM staff_member WHERE id = '{carol}'"),
        )

        # 6. update with NULL role: partial update, role untouched
        alice = db.scalar(
            f"SELECT id FROM staff_member WHERE hub_id = '{HUB}' AND first_name = 'Alice'"
        )
        check(
            "update with NULL role is allowed", None, try_update(db, HUB, alice, None)
        )
        check(
            "NULL leaves the role untouched",
            "",
            db.scalar(
                f"SELECT COALESCE(role_id, '') FROM staff_member WHERE id = '{alice}'"
            ),
        )

        # 7. update to own role
        check(
            "update to own role is allowed", None, try_update(db, HUB, alice, own_role)
        )
        check(
            "own role is now stored",
            own_role,
            db.scalar(f"SELECT role_id FROM staff_member WHERE id = '{alice}'"),
        )

        # 8. update of a member of the OTHER hub / non-existent
        check(
            "update of a foreign member is rejected",
            "staff.member_update_rejected",
            try_update(db, HUB, "nope", own_role),
        )
        check(
            "update of a foreign member with no role is rejected too",
            "staff.member_update_rejected",
            try_update(db, HUB, "nope", None),
        )

        # 9. nothing of the neighbour leaks through A's reads
        rows = db.run_query("staff.members.list", {}, hub=HUB)
        leaked = [r for r in rows if r.get("role_name") == "Neighbour Secret Role"]
        check("A's list never shows the neighbour's role name", [], leaked)
        check("A's list has its three members", 3, len(rows))
    finally:
        db.drop()

    if failures:
        print(f"\n{len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nall green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
