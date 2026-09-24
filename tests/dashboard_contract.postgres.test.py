#!/usr/bin/env python3
"""staff#11 — the dashboard tiles and the settings screen against the fields the queries REALLY return.

A widget (ADR-0054) is a declaration: `query` + `map` («this widget prop comes from that column»).
The shell resolves the map at RUNTIME, over the row the runtime answers with. So a `map` naming a
column the query does not select does not fail anything anywhere — the tile simply renders that
prop empty, forever, on every hub. Same for the settings screen (ADR-0082): the shell paints the
form from the schema and fills it from `settings.get`; a field the query does not return is a
control that opens blank and silently saves a default over whatever was there.

Neither can be answered by reading text: `staff.members.stats` builds `on_leave_today` in a
subquery, `staff.time_off.today` aliases `first_name || ' ' || last_name` into `staff_name`, and
`staff.roles.list` computes `member_count`. The only honest way to know which fields come back is
to run them, with rows, against a real Postgres — which is what this file does.

What is checked:
  1. Every widget's `map` names fields its query really RETURNS, with rows in the database (an
     empty result would prove nothing, so every query is seeded first).
  2. Every property of the settings schema is a field `staff.settings.get` returns, and vice versa
     — the form and the read are two halves of one screen.
  3. `staff.settings.update` really persists what the form sends (upsert, one row per hub).

Usage: tests/dashboard_contract.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import json
import pathlib
import sys
import uuid

from pg_harness import HUB, MANIFEST, MODULE_DIR, NOW, ScratchDb, container_available

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def seed(db: ScratchDb) -> None:
    """Real rows for every widget query: a role, an active member holding it, and an APPROVED
    leave covering `NOW` — the three tiles read exactly those."""
    db.run_command(
        "staff.roles.create",
        {"name": "Stylist", "description": "", "color": "#f0f", "order": 1},
    )
    role_id = db.scalar(
        f"SELECT id FROM staff_role WHERE hub_id = '{HUB}' AND name = 'Stylist'"
    )
    db.run_command(
        "staff._insert_member",
        {
            "first_name": "Ana",
            "last_name": "Ruiz",
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
    )
    staff_id = db.scalar(
        f"SELECT id FROM staff_member WHERE hub_id = '{HUB}' AND first_name = 'Ana'"
    )
    tid = str(uuid.uuid4())
    db.run_command(
        "staff._insert_time_off",
        {
            "time_off_id": tid,
            "staff_id": staff_id,
            "leave_type": "vacation",
            "start_date": NOW[:10],
            "end_date": NOW[:10],
            "is_full_day": 1,
            "start_time": None,
            "end_time": None,
            "reason": "Family",
            "notes": "",
        },
    )
    db.scalar(
        f"UPDATE staff_time_off SET status = 'approved' WHERE id = '{tid}' RETURNING id"
    )


def test_every_widget_map_names_a_field_its_query_returns(db: ScratchDb) -> None:
    print("\n· widgets: every mapped prop must exist in the query's answer")
    for wid, w in MANIFEST["widgets"].items():
        rows = db.run_query(w["query"], {"now": NOW})
        if not rows:
            check(f"{wid}: {w['query']} returned rows to check against", True, False)
            continue
        available = set(rows[0])
        missing = {prop: col for prop, col in w["map"].items() if col not in available}
        check(f"{wid}: mapped columns {w['query']} does not return", {}, missing)


def test_the_settings_screen_and_its_read_are_the_same_screen(db: ScratchDb) -> None:
    print("\n· settings (ADR-0082): the form's fields and the read's fields must match")
    block = MANIFEST["settings"]
    schema = json.loads((MODULE_DIR / block["schema"]).read_text())
    declared = set(schema["properties"])

    # Nothing saved yet: the screen must still resolve. Then save the full snapshot the form sends.
    payload = {
        "default_work_start": "08:30",
        "default_work_end": "17:30",
        "default_break_duration": 45,
        "min_advance_booking": 2,
        "max_daily_hours": 10,
        "overtime_threshold": 38,
        "show_staff_photos": 0,
        "show_staff_bio": 1,
        "allow_staff_selection": 0,
        "notify_new_appointment": 1,
        "notify_cancellation": 0,
    }
    check("the form sends exactly the schema's fields", declared, set(payload))
    db.run_command(block["set"], payload)

    rows = db.run_query(block["get"], {})
    check("settings.get answers one row", 1, len(rows))
    returned = set(rows[0]) - {"id"}
    check(
        "fields the form offers but the read never returns", set(), declared - returned
    )
    check(
        "fields the read returns but the form cannot edit", set(), returned - declared
    )
    check(
        "and the values are the ones that were saved",
        True,
        all(rows[0][k] == v for k, v in payload.items()),
    )

    # Saving twice keeps ONE row (upsert), which is what «singleton per hub» means.
    db.run_command(block["set"], {**payload, "max_daily_hours": 11})
    check(
        "still one settings row after a second save",
        1,
        int(
            db.scalar(
                f"SELECT count(*) FROM staff_settings WHERE hub_id = '{HUB}' AND is_deleted = 0"
            )
        ),
    )
    check(
        "and it holds the new value",
        11,
        db.run_query(block["get"], {})[0]["max_daily_hours"],
    )


def main() -> int:
    if not container_available():
        print(
            "SKIPPED: the test Postgres container is not running "
            "(docker start erplora-test-pg-5433)"
        )
        return 0

    db = ScratchDb("staff_dashboard_contract")
    try:
        db.create()
        seed(db)
        test_every_widget_map_names_a_field_its_query_returns(db)
        test_the_settings_screen_and_its_read_are_the_same_screen(db)
    finally:
        db.drop()

    print()
    if failures:
        print(f"✗ {len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("✓ dashboard_contract.postgres: all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
