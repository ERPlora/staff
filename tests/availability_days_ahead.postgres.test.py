#!/usr/bin/env python3
"""appointments#229 — the professional's days from TODAY onwards, as ONE read with literal binds.

`staff.availability.day_at` answers ONE business day, which is all a single booking needs. A batch
(five sessions of a pass) and a series (every Tuesday for three months) book across many days,
and a command's `reads.params` can only bind a top-level `payload.<field>`: neither can name the
N days it is about to book. `staff.availability.days_ahead` takes `:staff_id` and a literal
`:days`, and answers the business days from the business day of `:now` (both `:now` and
`:timezone` injected by the runtime in every query, hub#1022) onwards.

It is `day_at`, repeated: per day, the SAME rows — one `day` row (the GOVERNING template, NULL =
nothing configured), one `shift` per working piece around the break, one `off` per APPROVED
absence. The booking doors judge each date with the very function they already use for `create`
(appointments#98), so the two reads must never disagree about the same day — and that is what
this battery pins, day by day, instead of re-listing the rules.

What is checked:
  1. The range: starts on the BUSINESS day of `:now` (22:30Z on the 17th is the 18th in Madrid),
     one `day` row per day, consecutive, exactly `:days` of them; with no zone the runtime's UTC
     fallback applies; out-of-range `:days` is clamped, never an empty or unbounded answer.
  2. Parity with `day_at` on EVERY day of the range: specific template beating the default,
     approved absences (full, partial, multi-day) and a pending one ignored, a member with no
     template, a DST change day.
  3. Tenancy: the same hand-planted cross-hub rows as `day_at` §6 — parity, and the neighbour
     sees only its own.
  4. Deleted and non-working rows (`day_at` §7) — parity again.

Usage: tests/availability_days_ahead.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import importlib.util
import pathlib
import sys
import uuid

from pg_harness import HUB, OTHER_HUB, ScratchDb, container_available

_spec = importlib.util.spec_from_file_location(
    "schedules_availability",
    pathlib.Path(__file__).with_name("schedules_availability.postgres.test.py"),
)
_seeds = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_seeds)
seed_member, seed_schedule, seed_time_off = (
    _seeds.seed_member,
    _seeds.seed_schedule,
    _seeds.seed_time_off,
)

MADRID = "Europe/Madrid"
WEEK = [(d, "09:00:00", "18:00:00", "13:00:00", "14:00:00") for d in range(5)]
# Monday 17 Aug 2026, 09:30 in Madrid.
NOW = "2026-08-17T07:30:00Z"

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def days_ahead(
    db: ScratchDb, staff_id: str, days, now: str = NOW, tz=MADRID, hub: str = HUB
) -> list[dict]:
    params = {"staff_id": staff_id, "days": days, "now": now}
    if tz is not None:
        params["timezone"] = tz
    return db.run_query("staff.availability.days_ahead", params, hub=hub)


def day_at(
    db: ScratchDb, staff_id: str, day: str, tz=MADRID, hub: str = HUB
) -> list[dict]:
    return db.run_query(
        "staff.availability.day_at",
        {"staff_id": staff_id, "at": day, "timezone": tz},
        hub=hub,
    )


def plant(db: ScratchDb, table: str, hub: str, **cols) -> None:
    """Insert a row straight into `table`, bypassing the commands and their hub guards."""
    row = {
        "id": str(uuid.uuid4()),
        "hub_id": hub,
        "is_deleted": 0,
        "created_at": "2026-01-01T00:00:00Z",
        **cols,
    }
    lit = lambda v: (
        "NULL" if v is None else (str(v) if isinstance(v, int) else f"'{v}'")
    )
    db.scalar(
        f"INSERT INTO {table} ({', '.join(row)}) VALUES ({', '.join(lit(v) for v in row.values())})"
    )


def summary(rows: list[dict]) -> dict:
    """ONE day of either read, flattened to what a test can compare at a glance."""
    days = [r for r in rows if r["kind"] == "day"]
    return {
        "day": [r["day"] for r in days],
        "schedule": [r["schedule_id"] for r in days],
        "shifts": sorted(
            f"{r['start_time'][:5]}-{r['end_time'][:5]}"
            for r in rows
            if r["kind"] == "shift"
        ),
        "off": sorted(
            "full"
            if r["is_full_day"]
            else f"{(r['start_time'] or '')[:5]}-{(r['end_time'] or '')[:5]}"
            for r in rows
            if r["kind"] == "off"
        ),
    }


def day_list(rows: list[dict]) -> list[str]:
    return [r["day"] for r in rows if r["kind"] == "day"]


def check_parity(
    db: ScratchDb, label: str, staff_id: str, days: int, hub: str = HUB, now: str = NOW
) -> None:
    """Every day of `days_ahead` must be exactly what `day_at` answers about that day."""
    rows = days_ahead(db, staff_id, days, now=now, hub=hub)
    listed = day_list(rows)
    mismatched = []
    for day in listed:
        ours = summary([r for r in rows if r["day"] == day])
        theirs = summary(day_at(db, staff_id, day, hub=hub))
        if ours != theirs:
            mismatched.append((day, ours, theirs))
    check(f"{label}: {len(listed)} days, every one equal to day_at", [], mismatched)


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_daysahead_t")
    db.create()
    try:
        ana = seed_member(db, HUB, "Ana")
        leo = seed_member(db, HUB, "Leo")  # never given a template
        nora = seed_member(db, OTHER_HUB, "Nora")
        seed_schedule(db, HUB, ana, "Regular", 1, hours=WEEK)
        seed_schedule(db, OTHER_HUB, nora, "Nora regular", 1, hours=WEEK)

        print("1. the range starts on the BUSINESS day of :now")
        check(
            "monday 09:30 Madrid, 3 days",
            ["2026-08-17", "2026-08-18", "2026-08-19"],
            day_list(days_ahead(db, ana, "3")),
        )
        check(
            "22:30Z on the 17th is tuesday the 18th in Madrid",
            ["2026-08-18", "2026-08-19"],
            day_list(days_ahead(db, ana, "2", now="2026-08-17T22:30:00Z")),
        )
        check(
            "no zone → the runtime's UTC fallback: still the 17th",
            ["2026-08-17"],
            day_list(days_ahead(db, ana, "1", now="2026-08-17T22:30:00Z", tz=None)),
        )
        check(
            "an integer bind counts the same as the manifest's literal text",
            3,
            len(day_list(days_ahead(db, ana, 3))),
        )
        long = day_list(days_ahead(db, ana, "400"))
        check(
            "400 days: one row each, consecutive, first today and last 399 days later",
            (400, 400, "2026-08-17", "2027-09-20"),
            (len(long), len(set(long)), long[0], long[-1]),
        )
        check(
            "0 days is clamped to today alone, never an empty answer",
            ["2026-08-17"],
            day_list(days_ahead(db, ana, "0")),
        )
        check(
            "a runaway :days is clamped to two years",
            731,
            len(day_list(days_ahead(db, ana, "100000"))),
        )
        check(
            "the monday itself: the template, split around the break",
            {
                "day": ["2026-08-17"],
                "schedule": [summary(day_at(db, ana, "2026-08-17"))["schedule"][0]],
                "shifts": ["09:00-13:00", "14:00-18:00"],
                "off": [],
            },
            summary([r for r in days_ahead(db, ana, "1")]),
        )

        print("2. parity with day_at, day by day")
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
        seed_time_off(db, HUB, ana, "2026-08-18", "2026-08-18", "approved")
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
        )
        seed_time_off(db, HUB, ana, "2026-08-20", "2026-08-20", "pending")
        seed_time_off(db, HUB, ana, "2026-08-24", "2026-08-26", "approved")
        seed_time_off(db, HUB, leo, "2026-08-18", "2026-08-18", "approved")
        rows = days_ahead(db, ana, "14")
        check(
            "the specific friday template is in the range",
            ["10:00-12:00"],
            summary([r for r in rows if r["day"] == "2026-08-21"])["shifts"],
        )
        check(
            "a multi-day absence covers each of its days",
            [["full"], ["full"], ["full"]],
            [
                summary([r for r in rows if r["day"] == d])["off"]
                for d in ("2026-08-24", "2026-08-25", "2026-08-26")
            ],
        )
        check(
            "a pending absence is not in the range",
            [],
            summary([r for r in rows if r["day"] == "2026-08-20"])["off"],
        )
        check_parity(db, "ana, two weeks", ana, 14)
        check_parity(db, "leo, no template, one absence", leo, 14)
        ivy = seed_member(db, HUB, "Ivy")
        ivy_tpl = seed_schedule(db, HUB, ivy, "Ivy regular", 1, hours=WEEK)
        db.run_command("staff.schedules.set_active", {"schedule_id": ivy_tpl, "is_active": 0})
        check(
            "an inactive template governs nothing",
            [None],
            summary(days_ahead(db, ivy, "1"))["schedule"],
        )
        check_parity(db, "ivy, inactive template", ivy, 7)
        check_parity(
            db,
            "ana across the DST end (25 Oct 2026)",
            ana,
            4,
            now="2026-10-23T08:00:00Z",
        )

        print("3. tenancy")
        seed_time_off(db, OTHER_HUB, nora, "2026-08-17", "2026-08-17", "approved")
        plant(
            db,
            "staff_schedule",
            HUB,
            staff_id=nora,
            name="Foreign member",
            is_default=1,
            effective_from=None,
            effective_until=None,
            is_active=1,
        )
        check(
            "hub A asking about hub B's member: nothing governs, no absence",
            {"day": ["2026-08-17"], "schedule": [None], "shifts": [], "off": []},
            summary(days_ahead(db, nora, "1")),
        )
        plant(
            db,
            "staff_schedule",
            OTHER_HUB,
            staff_id=leo,
            name="Foreign template",
            is_default=1,
            effective_from=None,
            effective_until=None,
            is_active=1,
        )
        check(
            "hub B's template pointing at hub A's member does not govern hub A's day",
            {"day": ["2026-08-17"], "schedule": [None], "shifts": [], "off": []},
            summary(days_ahead(db, leo, "1")),
        )
        eva = seed_member(db, HUB, "Eva")
        eva_tpl = seed_schedule(db, HUB, eva, "Eva, no hours", 1)
        plant(
            db,
            "staff_working_hours",
            OTHER_HUB,
            schedule_id=eva_tpl,
            day_of_week=0,
            start_time="07:00:00",
            end_time="08:00:00",
            break_start="07:30:00",
            break_end="07:45:00",
            is_working=1,
        )
        check(
            "hub B's working piece on hub A's template is not hub A's shift",
            [],
            summary(days_ahead(db, eva, "1"))["shifts"],
        )
        check(
            "hub B sees its own",
            {"shifts": ["09:00-13:00", "14:00-18:00"], "off": ["full"]},
            {
                k: v
                for k, v in summary(days_ahead(db, nora, "1", hub=OTHER_HUB)).items()
                if k in ("shifts", "off")
            },
        )
        check_parity(db, "nora from hub A", nora, 7)
        check_parity(db, "leo with a foreign template", leo, 7)
        check_parity(db, "eva with a foreign piece", eva, 7)
        check_parity(db, "nora from hub B", nora, 7, hub=OTHER_HUB)

        print("4. deleted rows and non-working pieces do not count")
        zoe = seed_member(db, HUB, "Zoe")
        zoe_tpl = seed_schedule(
            db, HUB, zoe, "Zoe regular", 1, hours=[(0, "09:00:00", "12:00:00")]
        )
        plant(
            db,
            "staff_working_hours",
            HUB,
            schedule_id=zoe_tpl,
            day_of_week=1,
            start_time="15:00:00",
            end_time="17:00:00",
            break_start="15:30:00",
            break_end="16:00:00",
            is_working=1,
            is_deleted=1,
        )
        plant(
            db,
            "staff_working_hours",
            HUB,
            schedule_id=zoe_tpl,
            day_of_week=2,
            start_time="18:00:00",
            end_time="20:00:00",
            break_start="18:30:00",
            break_end="19:00:00",
            is_working=0,
        )
        deleted_specific = seed_schedule(
            db,
            HUB,
            zoe,
            "Deleted specific",
            0,
            "2026-08-17",
            "2026-08-17",
            hours=[(0, "07:00:00", "08:00:00")],
        )
        db.scalar(
            f"UPDATE staff_schedule SET is_deleted = 1 WHERE id = '{deleted_specific}' RETURNING id"
        )
        seed_time_off(db, HUB, zoe, "2026-08-17", "2026-08-17", "approved")
        db.scalar(
            f"UPDATE staff_time_off SET is_deleted = 1 WHERE staff_id = '{zoe}' "
            "AND start_date = '2026-08-17' RETURNING id"
        )
        rows = days_ahead(db, zoe, "3")
        check(
            "zoe: live template, live working piece, no deleted absence; nothing on tue/wed",
            [["09:00-12:00"], [], []],
            [
                summary([r for r in rows if r["day"] == d])["shifts"]
                for d in ("2026-08-17", "2026-08-18", "2026-08-19")
            ],
        )
        check(
            "zoe: the deleted absence is gone",
            [],
            summary([r for r in rows if r["day"] == "2026-08-17"])["off"],
        )
        check_parity(db, "zoe", zoe, 7)
        uma = seed_member(db, HUB, "Uma")
        seed_schedule(db, HUB, uma, "Uma regular", 1, hours=WEEK)
        db.scalar(
            f"UPDATE staff_member SET is_deleted = 1 WHERE id = '{uma}' RETURNING id"
        )
        check(
            "a deleted member's template governs nothing",
            [None],
            summary(days_ahead(db, uma, "1"))["schedule"],
        )
        check_parity(db, "uma, deleted", uma, 7)
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
