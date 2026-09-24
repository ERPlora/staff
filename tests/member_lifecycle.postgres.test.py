#!/usr/bin/env python3
"""staff#4 — the record and its lifecycle, against a REAL Postgres with the neighbour ALIVE.

  1. `staff.members.update` edits every operable field (employee_id, color, booking_buffer, …) and
     CLEARS a nullable one explicitly: `role_id: ''` unlinks (the same sentinel as `user_id`), while
     `null` keeps it (partial update). Before staff#4, `''` and `null` both meant «keep»: a record
     could never lose its role from the screen.
  2. `staff.members.delete` (terminate) is the ONLY way to `terminated`: it stamps
     `termination_date` (payload, else TODAY from `:now` — the runtime injects no `:today`, so the
     old COALESCE stamped nothing), stores the reason, soft-deletes and un-books; a foreign or
     already terminated member is REFUSED (`expect_rows`) instead of silently «done».
  3. A terminated member is gone from the directory and the detail.

Usage: tests/member_lifecycle.postgres.test.py   (exit 0 = green; SKIPPED without the container)
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


def seed_role(db: ScratchDb, hub: str, name: str) -> str:
    db.run_command("staff.roles.create", {"name": name, "description": "", "color": "#123456"}, hub=hub)
    return db.scalar(f"SELECT id FROM staff_role WHERE hub_id = '{hub}' AND name = '{name}'")


def seed_member(db: ScratchDb, hub: str, first: str, role_id=None) -> str:
    db.run_command(
        "staff._insert_member",
        {
            "first_name": first, "last_name": "Test", "email": "", "phone": "", "employee_id": "",
            "role_id": role_id, "user_id": None, "hire_date": None, "status": "active", "bio": "",
            "specialties": "", "is_bookable": 1, "color": "", "hourly_rate": 0,
            "commission_rate": 0, "notes": "",
        },
        hub=hub,
    )
    return db.scalar(f"SELECT id FROM staff_member WHERE hub_id = '{hub}' AND first_name = '{first}'")


def try_cmd(db: ScratchDb, name: str, payload: dict, hub: str = HUB) -> str | None:
    try:
        db.run_command(name, payload, hub=hub)
        return None
    except DomainError as e:
        return e.code


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_life_t")
    db.create()
    try:
        role = seed_role(db, HUB, "Stylist")
        ana = seed_member(db, HUB, "Ana", role)
        nora = seed_member(db, OTHER_HUB, "Nora")

        print("1. update: every operable field, explicit clearing")
        check("update fields", None, try_cmd(db, "staff._update_member", {
            "staff_id": ana, "employee_id": "E-7", "color": "#ff0000", "booking_buffer": 15,
            "phone": "600", "hire_date": "2026-01-15", "role_id": None,
        }))
        row = db.run_query("staff.members.get", {"staff_id": ana})[0]
        check("fields stored", ("E-7", "#ff0000", 15, "600", "2026-01-15"), (row["employee_id"], row["color"], row["booking_buffer"], row["phone"], row["hire_date"]))
        check("null keeps the role", role, row["role_id"])
        check("'' clears the role", None, try_cmd(db, "staff._update_member", {"staff_id": ana, "role_id": ""}))
        check("role is NULL now", None, db.run_query("staff.members.get", {"staff_id": ana})[0]["role_id"])
        check("status is an explicit control (inactive/active)", None, try_cmd(db, "staff._update_member", {"staff_id": ana, "status": "inactive", "is_bookable": 0}))
        check("stored", ("inactive", 0), tuple(db.run_query("staff.members.get", {"staff_id": ana})[0][k] for k in ("status", "is_bookable")))

        print("2. terminate: date + reason, refused for foreign / repeated")
        check("terminate ana with date + reason", None, try_cmd(db, "staff.members.delete", {
            "staff_id": ana, "termination_date": "2026-08-31", "reason": "moved abroad",
        }))
        check("stamped", ("terminated", "2026-08-31", "moved abroad", "1", "0"), tuple(db.scalar(
            f"SELECT status || '|' || termination_date || '|' || termination_reason || '|' || is_deleted || '|' || is_bookable FROM staff_member WHERE id = '{ana}'"
        ).split("|")))
        bea = seed_member(db, HUB, "Bea")
        check("terminate without date → today from :now", None, try_cmd(db, "staff.members.delete", {"staff_id": bea}))
        check("today stamped", "2026-08-18", db.scalar(f"SELECT termination_date FROM staff_member WHERE id = '{bea}'"))
        check("terminate again is refused", "staff.member_not_found", try_cmd(db, "staff.members.delete", {"staff_id": bea}))
        check("terminate the neighbour is refused", "staff.member_not_found", try_cmd(db, "staff.members.delete", {"staff_id": nora}))
        check("neighbour untouched", "active|0", db.scalar(f"SELECT status || '|' || is_deleted FROM staff_member WHERE id = '{nora}'"))

        print("3. terminated = gone from directory and detail")
        check("directory", [], [r["first_name"] for r in db.run_query("staff.members.list", {}) if r["first_name"] in ("Ana", "Bea")])
        check("detail", [], db.run_query("staff.members.get", {"staff_id": ana}))
    finally:
        db.drop()

    if failures:
        print(f"\n{len(failures)} FAILED")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nall green")
    return 0


if __name__ == "__main__":
    sys.exit(main())
