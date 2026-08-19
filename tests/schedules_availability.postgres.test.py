#!/usr/bin/env python3
"""staff#2 — a professional's availability is OPERABLE and AUTHORITATIVE. Real Postgres, neighbour ALIVE.

The Schedules screen (June) could only CREATE a weekly template; nothing read the intervals back,
nothing edited or retired a template, and nothing computed «when can this person actually work».
This file pins the SQL half of the contract (the WASM handler is covered by `handler/` unit tests):

  1. `staff.schedules.hours_for_member` — the intervals of every live template of a member, ordered.
  2. `staff.schedules.get` — one template by id, hub-scoped (the read `update` relies on).
  3. `staff.schedules.set_active` / `.delete` — toggle / retire, hub-scoped, `expect_rows`.
  4. `_retire_working_hours` + `_insert_working_hours` as UPSERT — the «replace the week» path of
     `update` cannot trip over the unique index (schedule_id, day_of_week).
  5. `_update_schedule` — name / validity / default, hub-scoped.
  6. `staff.availability.for_member` — for a date range: the governing template's intervals, split
     around the break, MINUS approved absences (full-day drops the day; partial cuts the interval);
     pending absences do not count; a specific template (effective range, not default) beats the
     default; inactive/retired templates never count; the neighbour sees nothing.

Usage: tests/schedules_availability.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import sys
import uuid

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


def seed_member(db: ScratchDb, hub: str, first: str) -> str:
    db.run_command(
        "staff.members.create",
        {
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
        },
        hub=hub,
    )
    return db.scalar(
        f"SELECT id FROM staff_member WHERE hub_id = '{hub}' AND first_name = '{first}'"
    )


def seed_schedule(
    db: ScratchDb,
    hub: str,
    staff_id: str,
    name: str,
    is_default: int = 1,
    effective_from=None,
    effective_until=None,
    hours=None,
) -> str:
    """What the WASM `create_schedule` handler emits as intentions, replayed by hand."""
    schedule_id = str(uuid.uuid4())
    if is_default:
        db.run_command(
            "staff._unset_default_schedules", {"staff_id": staff_id}, hub=hub
        )
    db.run_command(
        "staff._insert_schedule",
        {
            "schedule_id": schedule_id,
            "staff_id": staff_id,
            "name": name,
            "is_default": is_default,
            "effective_from": effective_from,
            "effective_until": effective_until,
        },
        hub=hub,
    )
    for h in hours or []:
        db.run_command(
            "staff._insert_working_hours",
            {
                "wh_id": str(uuid.uuid4()),
                "schedule_id": schedule_id,
                "day_of_week": h[0],
                "start_time": h[1],
                "end_time": h[2],
                "break_start": h[3] if len(h) > 3 else None,
                "break_end": h[4] if len(h) > 4 else None,
                "is_working": 1,
            },
            hub=hub,
        )
    return schedule_id


def seed_time_off(
    db: ScratchDb,
    hub: str,
    staff_id: str,
    start: str,
    end: str,
    status: str,
    full_day: int = 1,
    st=None,
    et=None,
) -> None:
    db.run_command(
        "staff._insert_time_off",
        {
            "time_off_id": str(uuid.uuid4()),
            "staff_id": staff_id,
            "leave_type": "vacation",
            "start_date": start,
            "end_date": end,
            "is_full_day": full_day,
            "start_time": st,
            "end_time": et,
            "reason": "",
            "notes": "",
        },
        hub=hub,
    )
    if status != "pending":
        db.scalar(
            f"UPDATE staff_time_off SET status = '{status}' WHERE staff_id = '{staff_id}' "
            f"AND start_date = '{start}' RETURNING id"
        )


def try_cmd(db: ScratchDb, name: str, payload: dict, hub: str = HUB) -> str | None:
    try:
        db.run_command(name, payload, hub=hub)
        return None
    except DomainError as e:
        return e.code


def slots(db: ScratchDb, staff_id: str, d0: str, d1: str, hub: str = HUB) -> list[str]:
    rows = db.run_query(
        "staff.availability.for_member",
        {"staff_id": staff_id, "date_from": d0, "date_to": d1},
        hub=hub,
    )
    return [f"{r['day']} {r['start_time'][:5]}-{r['end_time'][:5]}" for r in rows]


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_sched_t")
    db.create()
    try:
        ana = seed_member(db, HUB, "Ana")
        nora = seed_member(db, OTHER_HUB, "Nora")
        # Week of 2026-08-17 (Mon) .. 2026-08-23 (Sun)
        week = [(d, "09:00:00", "18:00:00", "13:00:00", "14:00:00") for d in range(5)]
        default_id = seed_schedule(db, HUB, ana, "Regular", 1, hours=week)
        seed_schedule(db, OTHER_HUB, nora, "Nora regular", 1, hours=week)

        print("1. hours_for_member returns the intervals, ordered, hub-scoped")
        rows = db.run_query("staff.schedules.hours_for_member", {"staff_id": ana})
        check("5 rows for ana", 5, len(rows))
        check("ordered by day", [0, 1, 2, 3, 4], [r["day_of_week"] for r in rows])
        check(
            "carries schedule_id + times",
            (default_id, "09:00:00", "13:00:00"),
            (rows[0]["schedule_id"], rows[0]["start_time"], rows[0]["break_start"]),
        )
        check(
            "neighbour's member from hub A = nothing",
            [],
            db.run_query("staff.schedules.hours_for_member", {"staff_id": nora}),
        )

        print("2. schedules.get is hub-scoped")
        got = db.run_query("staff.schedules.get", {"schedule_id": default_id})
        check("get own", ("Regular", ana), (got[0]["name"], got[0]["staff_id"]))
        nora_sched = db.scalar(
            f"SELECT id FROM staff_schedule WHERE staff_id = '{nora}'"
        )
        check(
            "get foreign = nothing",
            [],
            db.run_query("staff.schedules.get", {"schedule_id": nora_sched}),
        )

        print("3. set_active / delete")
        check(
            "deactivate own",
            None,
            try_cmd(
                db,
                "staff.schedules.set_active",
                {"schedule_id": default_id, "is_active": 0},
            ),
        )
        check(
            "row inactive",
            "0",
            db.scalar(
                f"SELECT is_active FROM staff_schedule WHERE id = '{default_id}'"
            ),
        )
        check(
            "reactivate own",
            None,
            try_cmd(
                db,
                "staff.schedules.set_active",
                {"schedule_id": default_id, "is_active": 1},
            ),
        )
        check(
            "foreign rejected",
            "staff.schedule_not_found",
            try_cmd(
                db,
                "staff.schedules.set_active",
                {"schedule_id": nora_sched, "is_active": 0},
            ),
        )
        check(
            "foreign untouched",
            "1",
            db.scalar(
                f"SELECT is_active FROM staff_schedule WHERE id = '{nora_sched}'"
            ),
        )
        tmp = seed_schedule(
            db, HUB, ana, "Temp", 0, hours=[(5, "10:00:00", "14:00:00")]
        )
        check(
            "delete own",
            None,
            try_cmd(db, "staff.schedules.delete", {"schedule_id": tmp}),
        )
        check(
            "schedule + hours soft-deleted",
            "1|1",
            db.scalar(
                f"SELECT s.is_deleted || '|' || (SELECT min(is_deleted) FROM staff_working_hours WHERE schedule_id = s.id) FROM staff_schedule s WHERE s.id = '{tmp}'"
            ),
        )
        check(
            "delete twice rejected",
            "staff.schedule_not_found",
            try_cmd(db, "staff.schedules.delete", {"schedule_id": tmp}),
        )
        check(
            "delete foreign rejected",
            "staff.schedule_not_found",
            try_cmd(db, "staff.schedules.delete", {"schedule_id": nora_sched}),
        )

        print("4. replace the week: retire + upsert survives the unique index")
        db.run_command("staff._retire_working_hours", {"schedule_id": default_id})
        check(
            "all retired",
            "0",
            db.scalar(
                f"SELECT count(*) FROM staff_working_hours WHERE schedule_id = '{default_id}' AND is_deleted = 0"
            ),
        )
        db.run_command(
            "staff._insert_working_hours",
            {
                "wh_id": str(uuid.uuid4()),
                "schedule_id": default_id,
                "day_of_week": 0,
                "start_time": "10:00:00",
                "end_time": "16:00:00",
                "break_start": None,
                "break_end": None,
                "is_working": 1,
            },
        )
        check(
            "monday revived with new times, still one row",
            "1|10:00:00",
            db.scalar(
                f"SELECT count(*) || '|' || min(start_time) FROM staff_working_hours WHERE schedule_id = '{default_id}' AND day_of_week = 0"
            ),
        )
        check(
            "live rows = 1",
            1,
            len(db.run_query("staff.schedules.hours_for_member", {"staff_id": ana})),
        )
        # restore the full week for the availability checks
        db.run_command("staff._retire_working_hours", {"schedule_id": default_id})
        for h in week:
            db.run_command(
                "staff._insert_working_hours",
                {
                    "wh_id": str(uuid.uuid4()),
                    "schedule_id": default_id,
                    "day_of_week": h[0],
                    "start_time": h[1],
                    "end_time": h[2],
                    "break_start": h[3],
                    "break_end": h[4],
                    "is_working": 1,
                },
            )

        print("5. _update_schedule edits name/validity/default, hub-scoped")
        db.run_command(
            "staff._update_schedule",
            {
                "schedule_id": default_id,
                "name": "Regular v2",
                "is_default": 1,
                "effective_from": None,
                "effective_until": None,
            },
        )
        check(
            "renamed",
            "Regular v2",
            db.scalar(f"SELECT name FROM staff_schedule WHERE id = '{default_id}'"),
        )
        db.run_command(
            "staff._update_schedule",
            {
                "schedule_id": nora_sched,
                "name": "HACKED",
                "is_default": 1,
                "effective_from": None,
                "effective_until": None,
            },
        )
        check(
            "foreign untouched",
            "Nora regular",
            db.scalar(f"SELECT name FROM staff_schedule WHERE id = '{nora_sched}'"),
        )

        print("6. availability = governing template − approved absences")
        check(
            "plain week: mon split around the break, weekend empty",
            ["2026-08-17 09:00-13:00", "2026-08-17 14:00-18:00"],
            slots(db, ana, "2026-08-17", "2026-08-17"),
        )
        check("saturday: nothing", [], slots(db, ana, "2026-08-22", "2026-08-23"))
        seed_time_off(
            db, HUB, ana, "2026-08-18", "2026-08-18", "approved"
        )  # Tue full day
        seed_time_off(
            db,
            HUB,
            ana,
            "2026-08-19",
            "2026-08-19",
            "approved",
            0,
            "10:00:00",
            "11:00:00",
        )  # Wed partial
        seed_time_off(
            db, HUB, ana, "2026-08-20", "2026-08-20", "pending"
        )  # Thu pending → ignored
        check(
            "tue dropped, wed cut, thu intact",
            [
                "2026-08-19 09:00-10:00",
                "2026-08-19 11:00-13:00",
                "2026-08-19 14:00-18:00",
                "2026-08-20 09:00-13:00",
                "2026-08-20 14:00-18:00",
            ],
            slots(db, ana, "2026-08-18", "2026-08-20"),
        )
        # a specific template for Friday 21 only beats the default
        seed_schedule(
            db,
            HUB,
            ana,
            "Short friday",
            0,
            "2026-08-21",
            "2026-08-21",
            hours=[(4, "10:00:00", "12:00:00")],
        )
        check(
            "specific template wins on its day",
            ["2026-08-21 10:00-12:00"],
            slots(db, ana, "2026-08-21", "2026-08-21"),
        )
        check(
            "default still governs the next friday",
            ["2026-08-28 09:00-13:00", "2026-08-28 14:00-18:00"],
            slots(db, ana, "2026-08-28", "2026-08-28"),
        )
        # an absence spanning the partial-day boundaries: covers whole piece
        seed_time_off(
            db,
            HUB,
            ana,
            "2026-08-24",
            "2026-08-24",
            "approved",
            0,
            "08:00:00",
            "13:30:00",
        )
        check(
            "partial absence swallowing the morning",
            ["2026-08-24 14:00-18:00"],
            slots(db, ana, "2026-08-24", "2026-08-24"),
        )
        # inactive template → no availability at all
        try_cmd(
            db,
            "staff.schedules.set_active",
            {"schedule_id": default_id, "is_active": 0},
        )
        check(
            "inactive default: monday empty",
            [],
            slots(db, ana, "2026-08-17", "2026-08-17"),
        )
        try_cmd(
            db,
            "staff.schedules.set_active",
            {"schedule_id": default_id, "is_active": 1},
        )
        check(
            "neighbour from hub A: nothing",
            [],
            slots(db, nora, "2026-08-17", "2026-08-17"),
        )
        check(
            "hub B sees its own",
            ["2026-08-17 09:00-13:00", "2026-08-17 14:00-18:00"],
            slots(db, nora, "2026-08-17", "2026-08-17", hub=OTHER_HUB),
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
