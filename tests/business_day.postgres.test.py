#!/usr/bin/env python3
"""staff#58 — «today» for time off is the BUSINESS day, not the UTC day.

`start_date`/`end_date` are local calendar days (a person types them). `:now` is a UTC instant.
Reading `:now` as its UTC date part files everything between local midnight and 02:00 (summer in
Spain) under the previous day: whoever starts their holidays today is not «away today», and
whoever finished yesterday still is. The runtime binds `:timezone` (the hub's resolved IANA zone,
hub#1022) in every declarative SQL — handler intentions included — so «today» is `:now` read on
that clock, the same idiom as sales#323 and invoice#78.

What is checked, with `:now` = 2026-08-18T22:30Z (= 2026-08-19 00:30 in Madrid):
  1. `staff.members.stats.on_leave_today` counts the leave starting on the 19th, not the one that
     ended on the 18th.
  2. `staff.time_off.today` lists the same person.
  3. `staff.time_off.active_for_member` no longer returns leave that ended on the 18th.
  4. `staff._deactivate_member` (the SQL defence behind the handler) lets through a member whose
     leave ended on the 18th — it must agree with the read the handler decides on.
  5. `staff.members.delete` without a date stamps the business day as `termination_date`.
  6. Control: with no zone (the runtime degrades to UTC) the day is still the 18th.

Usage: tests/business_day.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import sys
import uuid

from pg_harness import HUB, ScratchDb, container_available

failures: list[str] = []

LATE_NIGHT_UTC = "2026-08-18T22:30:00Z"  # 00:30 on the 19th in Madrid (CEST, UTC+2)
MADRID = "Europe/Madrid"


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def seed_member(db: ScratchDb, first: str) -> str:
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
    )
    return db.scalar(
        f"SELECT id FROM staff_member WHERE hub_id = '{HUB}' AND first_name = '{first}'"
    )


def seed_approved_leave(db: ScratchDb, staff_id: str, start: str, end: str) -> str:
    tid = str(uuid.uuid4())
    affected = db.run_command(
        "staff._insert_time_off",
        {
            "time_off_id": tid,
            "staff_id": staff_id,
            "leave_type": "vacation",
            "start_date": start,
            "end_date": end,
            "is_full_day": 1,
            "start_time": None,
            "end_time": None,
            "reason": "",
            "notes": "",
        },
    )
    if affected != 1:
        raise RuntimeError(f"seed leave wrote {affected} rows for {start}..{end}")
    db.scalar(
        f"UPDATE staff_time_off SET status = 'approved' WHERE id = '{tid}' RETURNING id"
    )
    return tid


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0

    db = ScratchDb("staff_business_day_test")
    db.create()
    try:
        # Ana and Cai start their leave on the 19th; Bea's ended on the 18th. Two against one, so
        # the headcount tells the two days apart (1 vs 1 would pass by the wrong person).
        ana = seed_member(db, "Ana")
        bea = seed_member(db, "Bea")
        cai = seed_member(db, "Cai")
        ana_leave = seed_approved_leave(db, ana, "2026-08-19", "2026-08-25")
        bea_leave = seed_approved_leave(db, bea, "2026-08-11", "2026-08-18")
        cai_leave = seed_approved_leave(db, cai, "2026-08-19", "2026-08-19")

        def on_leave_today(tz):
            rows = db.run_query(
                "staff.members.stats", {"now": LATE_NIGHT_UTC, "timezone": tz}
            )
            return rows[0]["on_leave_today"]

        def today_ids(tz):
            rows = db.run_query(
                "staff.time_off.today", {"now": LATE_NIGHT_UTC, "timezone": tz}
            )
            return sorted(r["id"] for r in rows)

        def active_ids(staff_id, tz):
            rows = db.run_query(
                "staff.time_off.active_for_member",
                {"staff_id": staff_id, "now": LATE_NIGHT_UTC, "timezone": tz},
            )
            return sorted(r["id"] for r in rows)

        print("\n· 00:30 in Madrid: «today» is the 19th")
        check("stats.on_leave_today counts Ana and Cai, not Bea", 2, on_leave_today(MADRID))
        check(
            "time_off.today lists Ana's and Cai's leave only",
            sorted([ana_leave, cai_leave]),
            today_ids(MADRID),
        )
        check(
            "active_for_member: Bea's leave already ended",
            [],
            active_ids(bea, MADRID),
        )
        check(
            "active_for_member: Ana's leave is live",
            [ana_leave],
            active_ids(ana, MADRID),
        )

        print("\n· control: no zone degrades to UTC, where it is still the 18th")
        for tz in (None, ""):
            check(f"stats.on_leave_today with timezone={tz!r}", 1, on_leave_today(tz))
            check(f"time_off.today with timezone={tz!r}", [bea_leave], today_ids(tz))
            check(
                f"active_for_member(Bea) with timezone={tz!r}",
                [bea_leave],
                active_ids(bea, tz),
            )
        check("time_off.today with timezone='UTC'", [bea_leave], today_ids("UTC"))

        print("\n· _deactivate_member agrees with the read the handler decides on")
        check(
            "deactivating Bea at 00:30 in Madrid writes the row",
            1,
            db.run_command(
                "staff._deactivate_member",
                {"staff_id": bea, "now": LATE_NIGHT_UTC, "timezone": MADRID},
            ),
        )
        check(
            "deactivating Ana at 00:30 in Madrid is still refused in SQL",
            0,
            db.run_command(
                "staff._deactivate_member",
                {"staff_id": ana, "now": LATE_NIGHT_UTC, "timezone": MADRID},
            ),
        )

        print("\n· terminating without a date stamps the business day")
        db.run_command(
            "staff.members.delete",
            {"staff_id": cai, "now": LATE_NIGHT_UTC, "timezone": MADRID},
        )
        check(
            "termination_date at 00:30 in Madrid",
            "2026-08-19",
            db.scalar(f"SELECT termination_date FROM staff_member WHERE id = '{cai}'"),
        )
    finally:
        db.drop()

    if failures:
        print(f"\nFAILED ({len(failures)}):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("\nOK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
