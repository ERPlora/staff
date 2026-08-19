#!/usr/bin/env python3
"""staff#19 — self-service: an employee reads THEIR OWN record and THEIR OWN absences, nobody else's.

`staff.members.compensation` and `staff.time_off.detail` sit behind permissions an `employee` does
not have (and rightly: they open the WHOLE payroll / every reason). The door for «mine» is not a
wider permission but a query SCOPED TO THE CALLER: the runtime injects `:current_user_id` in every
query (ARQUITECTURA §2.5) and, since ADR-0192, the record hangs from the hub user
(`staff_member.user_id`). So `staff.members.mine` / `staff.time_off.mine` carry
`WHERE m.hub_id = :hub_id AND m.user_id = :current_user_id`, under the permission every employee
already has.

The test goes through the enforcing door with the NEIGHBOUR ALIVE in the same table: two members
of two users, plus a third one without a user, plus the same user id in ANOTHER hub. Each session
sees exactly one row — its own — and its own absences with reason and notes.

Usage: tests/self_service.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import sys
import uuid

from pg_harness import HUB, OTHER_HUB, ScratchDb, container_available

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def seed_member(
    db: ScratchDb, hub: str, first: str, user_id, rate: int, commission: float
) -> str:
    db.run_command(
        "staff.members.create",
        {
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
            "hourly_rate": rate,
            "commission_rate": commission,
            "notes": f"HR notes about {first}",
        },
        hub=hub,
    )
    return db.scalar(
        f"SELECT id FROM staff_member WHERE hub_id = '{hub}' AND first_name = '{first}'"
    )


def seed_time_off(
    db: ScratchDb, hub: str, staff_id: str, start: str, reason: str
) -> None:
    db.run_command(
        "staff._insert_time_off",
        {
            "time_off_id": str(uuid.uuid4()),
            "staff_id": staff_id,
            "leave_type": "sick",
            "start_date": start,
            "end_date": start,
            "is_full_day": 1,
            "start_time": None,
            "end_time": None,
            "reason": reason,
            "notes": f"notes {reason}",
        },
        hub=hub,
    )


def mine(db: ScratchDb, query: str, user: str, hub: str = HUB) -> list[dict]:
    return db.run_query(query, {"current_user_id": user}, hub=hub)


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_self_t")
    db.create()
    try:
        ana = seed_member(db, HUB, "Ana", "user-ana", 1500, 10.5)
        bea = seed_member(db, HUB, "Bea", "user-bea", 1800, 12.0)
        seed_member(db, HUB, "Cid", None, 1000, 0)  # record without a hub user
        seed_member(
            db, OTHER_HUB, "Nora", "user-ana", 9999, 99
        )  # same user id, other hub
        seed_time_off(db, HUB, ana, "2026-09-01", "ana flu")
        seed_time_off(db, HUB, bea, "2026-09-02", "bea surgery")

        print("1. staff.members.mine — exactly my row, with my compensation")
        rows = mine(db, "staff.members.mine", "user-ana")
        check("ana sees one row", 1, len(rows))
        check(
            "and it is hers, with rate/commission",
            ("Ana", 1500, 10.5),
            (rows[0]["first_name"], rows[0]["hourly_rate"], rows[0]["commission_rate"]),
        )
        check("HR notes are NOT part of self-service", False, "notes" in rows[0])
        rows = mine(db, "staff.members.mine", "user-bea")
        check("bea sees only bea", ["Bea"], [r["first_name"] for r in rows])
        check(
            "a session without a record sees nothing",
            [],
            mine(db, "staff.members.mine", "user-nobody"),
        )
        check(
            "same user id in the other hub does not leak into hub A",
            ["Ana"],
            [r["first_name"] for r in mine(db, "staff.members.mine", "user-ana")],
        )
        check(
            "…and in hub B it sees its hub-B record",
            ["Nora"],
            [
                r["first_name"]
                for r in mine(db, "staff.members.mine", "user-ana", hub=OTHER_HUB)
            ],
        )

        print(
            "2. staff.time_off.mine — my absences with reason and notes, nobody else's"
        )
        rows = mine(db, "staff.time_off.mine", "user-ana")
        check(
            "ana: one absence, with reason",
            [("2026-09-01", "ana flu", "notes ana flu")],
            [(r["start_date"], r["reason"], r["notes"]) for r in rows],
        )
        rows = mine(db, "staff.time_off.mine", "user-bea")
        check("bea: hers only", ["bea surgery"], [r["reason"] for r in rows])
        check("nobody: nothing", [], mine(db, "staff.time_off.mine", "user-nobody"))
        check(
            "hub B session with ana's user id: nothing (nora has no absences)",
            [],
            mine(db, "staff.time_off.mine", "user-ana", hub=OTHER_HUB),
        )
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
