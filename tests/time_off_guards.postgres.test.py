#!/usr/bin/env python3
"""staff#1 — the queries the WASM guards READ, and the SQL they WRITE, against a real Postgres.

The handler decides over `context.reads` (ADR-0069). A read that answers the wrong rows makes the
guard blind: it would refuse a legitimate request, or let an overlapping one through. So the reads
are tested with real rows, and the intentions' SQL is tested to keep its defence-in-depth guard.

Acceptance points:
  1. `staff.time_off.overlapping(staff_id, start, end)` returns the pending|approved leave of THAT
     member overlapping the range — touching edges count; rejected/cancelled do not; another
     member's leave does not; another HUB's leave does not.
  2. `staff.time_off.active_for_member(staff_id)` returns the pending|approved leave whose end is
     today or later; finished leave does not count.
  3. `staff.time_off.conflicts_for(time_off_id)` returns the OTHER pending|approved leave of the
     same member overlapping that request — never the request itself.
  4. `staff.time_off.detail(time_off_id)` returns exactly one row with its `status`.
  5. `staff._set_time_off_status` never moves a rejected/cancelled row (0 rows), and does move a
     pending one; approving stamps `approved_by`.
  6. `_insert_time_off` / `_deactivate_member` keep their SQL guards (defence in depth): overlap
     and live leave still yield 0 rows.

Usage: tests/time_off_guards.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import sys
import uuid

from pg_harness import HUB, NOW, OTHER_HUB, ScratchDb, container_available

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
        "staff._insert_member",
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


def seed_leave(
    db: ScratchDb,
    hub: str,
    staff_id: str,
    start: str,
    end: str,
    status: str = "pending",
) -> str:
    """Through the module's own intention SQL, then the status set by hand (the intention only
    creates `pending`)."""
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
        hub=hub,
    )
    if affected != 1:
        raise RuntimeError(f"seed_leave wrote {affected} rows for {start}..{end}")
    if status != "pending":
        db.scalar(
            f"UPDATE staff_time_off SET status = '{status}' WHERE id = '{tid}' RETURNING id"
        )
    return tid


def ids(rows: list[dict]) -> list[str]:
    return sorted(r["id"] for r in rows)


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0

    db = ScratchDb("staff_time_off_guards_test")
    db.create()
    try:
        ana = seed_member(db, HUB, "Ana")
        bob = seed_member(db, HUB, "Bob")
        zoe = seed_member(db, OTHER_HUB, "Zoe")

        # NOW = 2026-08-18. Ana: a pending week in September, an approved past week, a rejected one.
        sep = seed_leave(db, HUB, ana, "2026-09-01", "2026-09-05")
        past = seed_leave(db, HUB, ana, "2026-08-01", "2026-08-07", "approved")
        rejected = seed_leave(db, HUB, ana, "2026-09-10", "2026-09-12", "rejected")
        # Bob overlaps Ana's September week; Zoe (other hub) too, same dates.
        bob_sep = seed_leave(db, HUB, bob, "2026-09-03", "2026-09-04")
        seed_leave(db, OTHER_HUB, zoe, "2026-09-01", "2026-09-05")

        # 1. overlapping
        q = lambda s, e: ids(
            db.run_query(
                "staff.time_off.overlapping",
                {"staff_id": ana, "start_date": s, "end_date": e},
            )
        )
        check("overlap inside the week", [sep], q("2026-09-03", "2026-09-03"))
        check("overlap touching the last day", [sep], q("2026-09-05", "2026-09-20"))
        check("overlap touching the first day", [sep], q("2026-08-25", "2026-09-01"))
        check("no overlap the day after", [], q("2026-09-06", "2026-09-06"))
        check("a rejected request never conflicts", [], q("2026-09-10", "2026-09-12"))
        check(
            "Bob's leave is not Ana's conflict",
            [bob_sep],
            ids(
                db.run_query(
                    "staff.time_off.overlapping",
                    {
                        "staff_id": bob,
                        "start_date": "2026-09-01",
                        "end_date": "2026-09-05",
                    },
                )
            ),
        )
        check(
            "the neighbour hub sees nothing of Ana",
            [],
            ids(
                db.run_query(
                    "staff.time_off.overlapping",
                    {
                        "staff_id": ana,
                        "start_date": "2026-09-01",
                        "end_date": "2026-09-05",
                    },
                    hub=OTHER_HUB,
                )
            ),
        )

        # 2. active_for_member (today = NOW)
        active = lambda sid: ids(
            db.run_query(
                "staff.time_off.active_for_member", {"staff_id": sid, "now": NOW}
            )
        )
        check("Ana's live leave is the pending September week only", [sep], active(ana))
        db.scalar(
            f"UPDATE staff_time_off SET status = 'approved' WHERE id = '{sep}' RETURNING id"
        )
        check("still live once approved", [sep], active(ana))
        db.scalar(
            f"UPDATE staff_time_off SET status = 'cancelled' WHERE id = '{sep}' RETURNING id"
        )
        check("cancelled is not live", [], active(ana))
        db.scalar(
            f"UPDATE staff_time_off SET status = 'pending' WHERE id = '{sep}' RETURNING id"
        )
        _ = past

        # 3. conflicts_for
        # The intention SQL refuses an overlap (point 6), so the overlapping row is planted by hand:
        # it stands for the leave that got approved between the request and its approval.
        overlap_pending = str(uuid.uuid4())
        db.scalar(
            "INSERT INTO staff_time_off (id, hub_id, staff_id, leave_type, start_date, end_date, "
            "is_full_day, status, reason, notes, is_deleted, created_at) VALUES "
            f"('{overlap_pending}', '{HUB}', '{ana}', 'vacation', '2026-09-04', '2026-09-08', 1, "
            f"'pending', '', '', 0, '{NOW}') RETURNING id"
        )
        conflicts = lambda tid: ids(
            db.run_query("staff.time_off.conflicts_for", {"time_off_id": tid})
        )
        check(
            "the other overlapping request is a conflict, the row itself is not",
            [overlap_pending],
            conflicts(sep),
        )
        check("symmetric", [sep], conflicts(overlap_pending))
        check("a rejected request has no conflicts", [], conflicts(rejected))
        check("unknown id → no rows", [], conflicts("nope"))

        # 4. detail
        rows = db.run_query("staff.time_off.detail", {"time_off_id": sep})
        check("detail returns one row", 1, len(rows))
        check("detail carries the status", "pending", rows[0]["status"])
        check(
            "detail of an unknown id is empty",
            [],
            db.run_query("staff.time_off.detail", {"time_off_id": "nope"}),
        )

        # 5. _set_time_off_status
        set_status = lambda tid, st: db.run_command(
            "staff._set_time_off_status", {"time_off_id": tid, "status": st}
        )
        check("a rejected row does not move", 0, set_status(rejected, "approved"))
        check("a pending row moves to approved", 1, set_status(sep, "approved"))
        check(
            "approving stamps the approver",
            "u-owner",
            db.scalar(f"SELECT approved_by FROM staff_time_off WHERE id = '{sep}'"),
        )
        check("approved moves to cancelled", 1, set_status(sep, "cancelled"))
        check("cancelled does not move again", 0, set_status(sep, "approved"))
        check("an unknown id moves nothing", 0, set_status("nope", "approved"))

        # 6. defence in depth in the intentions
        overlap_attempt = db.run_command(
            "staff._insert_time_off",
            {
                "time_off_id": str(uuid.uuid4()),
                "staff_id": ana,
                "leave_type": "vacation",
                "start_date": "2026-09-05",
                "end_date": "2026-09-06",
                "is_full_day": 1,
                "start_time": None,
                "end_time": None,
                "reason": "",
                "notes": "",
            },
        )
        check("_insert_time_off still refuses an overlap in SQL", 0, overlap_attempt)
        check(
            "_deactivate_member still refuses with live leave in SQL",
            0,
            db.run_command(
                "staff._deactivate_member", {"staff_id": ana, "today": "2026-08-18"}
            ),
        )
        check(
            "_deactivate_member deactivates Bob after his leave is cancelled",
            1,
            (
                db.scalar(
                    f"UPDATE staff_time_off SET status = 'cancelled' WHERE id = '{bob_sep}' RETURNING id"
                )
                and db.run_command(
                    "staff._deactivate_member", {"staff_id": bob, "today": "2026-08-18"}
                )
            ),
        )
        check(
            "Bob is inactive",
            "inactive",
            db.scalar(f"SELECT status FROM staff_member WHERE id = '{bob}'"),
        )
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
