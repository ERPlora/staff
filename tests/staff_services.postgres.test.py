#!/usr/bin/env python3
"""staff#9 — competencies per service: `staff.services.*` against a REAL Postgres, neighbour ALIVE.

`staff_service` existed with no door: only the blueprint seed wrote it. This file pins the public
contract that lets a salon maintain «who performs what» after the seed, and the cross-tenant seam
the issue asks to close from day one (`staff_service` joins two GLOBAL ids — the same hole
services#7 had to fix later, pm#89): every write resolves the member against `staff_member` of the
injected `:hub_id`, and every read carries `hub_id`.

Acceptance points:
  1. Assign a service to a member of THIS hub → one row, `service_name` snapshot, `is_active = 1`.
  2. Assign to the NEIGHBOUR's member (or a missing/soft-deleted one) → rejected with the declared
     code (`expect_rows`), NO row written.
  3. Assigning the same service twice is an UPSERT (no duplicate, no unique-index crash) — and it
     revives a removed row (soft-delete → active again) with the new overrides.
  4. `is_primary = 1` is exclusive per member: assigning a new primary demotes the previous one.
  5. `staff.services.list_for_member` returns only the member's live rows of THIS hub.
  6. `staff.services.update` edits overrides/primary/active by row id, hub-scoped; a foreign id is
     rejected and untouched.
  7. `staff.services.remove` soft-deletes (row disappears from the list; neighbour untouched).
  8. `staff.services.eligible_for_service` (the read Appointments consumes via `reads`, ADR-0069):
     A performs «cut», B does not → only A; a member that is inactive, not bookable, soft-deleted,
     or whose competency is inactive is NOT eligible; the neighbour's members never are.

Usage: tests/staff_services.postgres.test.py   (exit 0 = green; SKIPPED without the container)
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


def seed_member(db: ScratchDb, hub: str, first: str, **over) -> str:
    payload = {
        "first_name": first,
        "last_name": "Test",
        "email": "",
        "phone": "",
        "employee_id": "",
        "role_id": None,
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
    }
    payload.update(over)
    db.run_command("staff.members.create", payload, hub=hub)
    return db.scalar(
        f"SELECT id FROM staff_member WHERE hub_id = '{hub}' AND first_name = '{first}'"
    )


def try_cmd(db: ScratchDb, name: str, payload: dict, hub: str = HUB) -> str | None:
    try:
        db.run_command(name, payload, hub=hub)
        return None
    except DomainError as e:
        return e.code


def assign(db: ScratchDb, staff_id: str, service_id: str, hub: str = HUB, **over):
    payload = {
        "staff_id": staff_id,
        "service_id": service_id,
        "service_name": f"Service {service_id}",
        "custom_duration": None,
        "custom_price": None,
        "is_primary": 0,
    }
    payload.update(over)
    return try_cmd(db, "staff.services.assign", payload, hub=hub)


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_services_t")
    db.create()
    try:
        ana = seed_member(db, HUB, "Ana")
        bea = seed_member(db, HUB, "Bea")
        neighbour = seed_member(db, OTHER_HUB, "Nora")

        print("1. assign to a member of this hub")
        check("assign ana/cut", None, assign(db, ana, "svc-cut", service_name="Cut"))
        check(
            "row stored with snapshot",
            "Cut|1|0",
            db.scalar(
                f"SELECT service_name || '|' || is_active || '|' || is_primary FROM staff_service "
                f"WHERE hub_id = '{HUB}' AND staff_id = '{ana}' AND service_id = 'svc-cut'"
            ),
        )

        print(
            "2. assign to the neighbour's member / a missing member → rejected, no row"
        )
        code = assign(db, neighbour, "svc-cut")
        check("neighbour's member rejected", "staff.service_assign_rejected", code)
        check(
            "missing member rejected",
            "staff.service_assign_rejected",
            assign(db, "nope", "svc-cut"),
        )
        check(
            "no row for either",
            "0",
            db.scalar(
                f"SELECT count(*) FROM staff_service WHERE staff_id IN ('{neighbour}', 'nope')"
            ),
        )

        print("3. assigning twice is an upsert; it revives a removed row")
        check("assign again", None, assign(db, ana, "svc-cut", custom_duration=45))
        check(
            "still one row, override applied",
            "1|45",
            db.scalar(
                f"SELECT count(*) || '|' || max(custom_duration) FROM staff_service "
                f"WHERE staff_id = '{ana}' AND service_id = 'svc-cut'"
            ),
        )
        row_id = db.scalar(
            f"SELECT id FROM staff_service WHERE staff_id = '{ana}' AND service_id = 'svc-cut'"
        )
        check("remove", None, try_cmd(db, "staff.services.remove", {"id": row_id}))
        check(
            "removed = soft-deleted",
            "1",
            db.scalar(f"SELECT is_deleted FROM staff_service WHERE id = '{row_id}'"),
        )
        check(
            "assign after remove revives",
            None,
            assign(db, ana, "svc-cut", service_name="Cut v2"),
        )
        check(
            "revived row: same id, live, new snapshot",
            f"{row_id}|0|Cut v2",
            db.scalar(
                f"SELECT id || '|' || is_deleted || '|' || service_name FROM staff_service "
                f"WHERE staff_id = '{ana}' AND service_id = 'svc-cut'"
            ),
        )

        print("4. one primary per member")
        check(
            "assign color as primary", None, assign(db, ana, "svc-color", is_primary=1)
        )
        check(
            "assign beard as primary", None, assign(db, ana, "svc-beard", is_primary=1)
        )
        check(
            "only beard is primary",
            "svc-beard",
            db.scalar(
                f"SELECT string_agg(service_id, ',') FROM staff_service "
                f"WHERE staff_id = '{ana}' AND is_primary = 1 AND is_deleted = 0"
            ),
        )

        print("5. list_for_member is hub-scoped and live-only")
        assign(db, neighbour, "svc-cut", hub=OTHER_HUB)
        rows = db.run_query("staff.services.list_for_member", {"staff_id": ana})
        check(
            "ana's services",
            ["svc-beard", "svc-color", "svc-cut"],
            sorted(r["service_id"] for r in rows),
        )
        check(
            "neighbour's member from hub A = nothing",
            [],
            db.run_query("staff.services.list_for_member", {"staff_id": neighbour}),
        )

        print("6. update by id, hub-scoped")
        color_id = db.scalar(
            f"SELECT id FROM staff_service WHERE staff_id = '{ana}' AND service_id = 'svc-color'"
        )
        check(
            "update color",
            None,
            try_cmd(
                db,
                "staff.services.update",
                {
                    "id": color_id,
                    "custom_duration": 90,
                    "custom_price": 4500,
                    "is_primary": 1,
                    "is_active": 1,
                },
            ),
        )
        check(
            "color updated and now the only primary",
            "90|4500|svc-color",
            db.scalar(
                f"SELECT s.custom_duration || '|' || s.custom_price || '|' || "
                f"(SELECT string_agg(service_id, ',') FROM staff_service WHERE staff_id = '{ana}' AND is_primary = 1 AND is_deleted = 0) "
                f"FROM staff_service s WHERE s.id = '{color_id}'"
            ),
        )
        n_id = db.scalar(f"SELECT id FROM staff_service WHERE staff_id = '{neighbour}'")
        check(
            "foreign row rejected",
            "staff.service_not_found",
            try_cmd(
                db,
                "staff.services.update",
                {
                    "id": n_id,
                    "custom_duration": 1,
                    "custom_price": 1,
                    "is_primary": 0,
                    "is_active": 0,
                },
            ),
        )
        check(
            "foreign row untouched",
            "1",
            db.scalar(f"SELECT is_active FROM staff_service WHERE id = '{n_id}'"),
        )
        check(
            "remove foreign row rejected",
            "staff.service_not_found",
            try_cmd(db, "staff.services.remove", {"id": n_id}),
        )

        print("7. eligible_for_service — the read appointments consumes")
        elig = lambda svc, hub=HUB: sorted(  # noqa: E731
            r["staff_id"]
            for r in db.run_query(
                "staff.services.eligible_for_service", {"service_id": svc}, hub=hub
            )
        )
        check("cut: only ana (bea has no competency)", [ana], elig("svc-cut"))
        assign(db, bea, "svc-cut")
        check("cut after assigning bea: both", sorted([ana, bea]), elig("svc-cut"))
        cols = db.run_query(
            "staff.services.eligible_for_service", {"service_id": "svc-color"}
        )
        check(
            "row carries overrides",
            (ana, 90, 4500, 1),
            (
                cols[0]["staff_id"],
                cols[0]["custom_duration"],
                cols[0]["custom_price"],
                cols[0]["is_primary"],
            ),
        )
        # inactive competency
        bea_cut = db.scalar(
            f"SELECT id FROM staff_service WHERE staff_id = '{bea}' AND service_id = 'svc-cut'"
        )
        try_cmd(
            db,
            "staff.services.update",
            {
                "id": bea_cut,
                "custom_duration": None,
                "custom_price": None,
                "is_primary": 0,
                "is_active": 0,
            },
        )
        check("inactive competency drops bea", [ana], elig("svc-cut"))
        # not bookable / inactive member
        db.scalar(
            f"UPDATE staff_member SET is_bookable = 0 WHERE id = '{ana}' RETURNING id"
        )
        check("not bookable member is not eligible", [], elig("svc-cut"))
        db.scalar(
            f"UPDATE staff_member SET is_bookable = 1, status = 'inactive' WHERE id = '{ana}' RETURNING id"
        )
        check("inactive member is not eligible", [], elig("svc-cut"))
        db.scalar(
            f"UPDATE staff_member SET status = 'active' WHERE id = '{ana}' RETURNING id"
        )
        check("neighbour never leaks into hub A", [ana], elig("svc-cut"))
        check("hub B sees only its own", [neighbour], elig("svc-cut", hub=OTHER_HUB))
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
