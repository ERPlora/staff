#!/usr/bin/env python3
"""appointments#98 — «does this professional work at this instant?» as ONE read with literal binds.

`staff.availability.for_member` is the authoritative answer to «when can this person work», but it
needs `:date_from`/`:date_to`, and a command's `reads.params` can only bind a literal
`payload.<field>`: a booking door has an INSTANT (`start_datetime`), never the business day it
falls on. `staff.availability.day_at` takes `:staff_id` + `:at` and derives the day in SQL, on the
business clock (`:timezone`, injected by the runtime in every query — hub#1022).

It answers with the material, not a verdict — the caller owns the booking's end:
  * one `day` row, always: the business day and the GOVERNING template (`schedule_id` NULL = no
    template governs that day, i.e. nothing configured → the caller must not refuse on shifts);
  * one `shift` row per working piece of that template that day, split around the break;
  * one `off` row per APPROVED absence covering the day (`is_full_day`, or its partial times).

What is checked:
  1. The day is the BUSINESS day: 22:30Z on the 17th is the 18th in Madrid; also on a DST change
     day; with no zone the runtime's UTC fallback applies.
  2. Shifts = the governing template split around the break; a specific template beats the default;
     an inactive template does not govern.
  3. Approved absences only (pending ignored), full day and partial.
  4. A member with no template: the `day` row with NULL schedule and no shifts.
  5. Parity with `staff.availability.for_member`: same governing template, and on a day without
     absences the same intervals — the two reads must never disagree about the same day.
  6. Tenancy: the neighbour's member, template and absences are invisible.

Usage: tests/availability_day_at.postgres.test.py   (exit 0 = green; SKIPPED without the container)
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

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def day_at(
    db: ScratchDb, staff_id: str, at: str, tz=MADRID, hub: str = HUB
) -> list[dict]:
    params = {"staff_id": staff_id, "at": at}
    if tz is not None:
        params["timezone"] = tz
    return db.run_query("staff.availability.day_at", params, hub=hub)


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
    """The read, flattened to what a test can compare at a glance."""
    days = [r for r in rows if r["kind"] == "day"]
    return {
        "day": [r["day"] for r in days],
        "governed": [r["schedule_id"] is not None for r in days],
        "shifts": [
            f"{r['start_time'][:5]}-{r['end_time'][:5]}"
            for r in rows
            if r["kind"] == "shift"
        ],
        "off": [
            "full"
            if r["is_full_day"]
            else f"{(r['start_time'] or '')[:5]}-{(r['end_time'] or '')[:5]}"
            for r in rows
            if r["kind"] == "off"
        ],
    }


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_dayat_t")
    db.create()
    try:
        ana = seed_member(db, HUB, "Ana")
        leo = seed_member(db, HUB, "Leo")  # never given a template
        nora = seed_member(db, OTHER_HUB, "Nora")
        ana_default = seed_schedule(db, HUB, ana, "Regular", 1, hours=WEEK)
        seed_schedule(db, OTHER_HUB, nora, "Nora regular", 1, hours=WEEK)

        print("1. the day is the BUSINESS day")
        check(
            "monday 09:30 Madrid",
            {
                "day": ["2026-08-17"],
                "governed": [True],
                "shifts": ["09:00-13:00", "14:00-18:00"],
                "off": [],
            },
            summary(day_at(db, ana, "2026-08-17T07:30:00Z")),
        )
        check(
            "22:30Z on the 17th is tuesday the 18th in Madrid",
            ["2026-08-18"],
            summary(day_at(db, ana, "2026-08-17T22:30:00Z"))["day"],
        )
        check(
            "no zone → the runtime's UTC fallback: still the 17th",
            ["2026-08-17"],
            summary(day_at(db, ana, "2026-08-17T22:30:00Z", tz=None))["day"],
        )
        check(
            "DST end (25 Oct 2026, +2 until 01:00Z): 22:30Z on the 24th is the 25th",
            ["2026-10-25"],
            summary(day_at(db, ana, "2026-10-24T22:30:00Z"))["day"],
        )
        check(
            "the day after the change (+1): 23:30Z on the 25th is the 26th",
            ["2026-10-26"],
            summary(day_at(db, ana, "2026-10-25T23:30:00Z"))["day"],
        )

        print("2. shifts of the governing template")
        check(
            "saturday: governed, no shift",
            {"day": ["2026-08-22"], "governed": [True], "shifts": [], "off": []},
            summary(day_at(db, ana, "2026-08-22T09:00:00Z")),
        )
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
            ["10:00-12:00"],
            summary(day_at(db, ana, "2026-08-21T09:00:00Z"))["shifts"],
        )
        check(
            "default governs the next friday",
            ["09:00-13:00", "14:00-18:00"],
            summary(day_at(db, ana, "2026-08-28T09:00:00Z"))["shifts"],
        )

        print("3. approved absences only")
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
        check(
            "tuesday: full day off",
            ["full"],
            summary(day_at(db, ana, "2026-08-18T09:00:00Z"))["off"],
        )
        check(
            "wednesday: partial",
            ["10:00-11:00"],
            summary(day_at(db, ana, "2026-08-19T09:00:00Z"))["off"],
        )
        check(
            "thursday: pending ignored",
            [],
            summary(day_at(db, ana, "2026-08-20T09:00:00Z"))["off"],
        )
        check(
            "inside a multi-day absence",
            ["full"],
            summary(day_at(db, ana, "2026-08-25T09:00:00Z"))["off"],
        )
        seed_time_off(db, HUB, leo, "2026-08-18", "2026-08-18", "approved")
        check(
            "an absence reaches a member with no template too",
            {"day": ["2026-08-18"], "governed": [False], "shifts": [], "off": ["full"]},
            summary(day_at(db, leo, "2026-08-18T09:00:00Z")),
        )

        print("4. no template → nothing governs")
        check(
            "leo on monday",
            {"day": ["2026-08-17"], "governed": [False], "shifts": [], "off": []},
            summary(day_at(db, leo, "2026-08-17T09:00:00Z")),
        )
        db.run_command(
            "staff.schedules.set_active", {"schedule_id": ana_default, "is_active": 0}
        )
        check(
            "inactive default does not govern",
            {"day": ["2026-08-17"], "governed": [False], "shifts": [], "off": []},
            summary(day_at(db, ana, "2026-08-17T09:00:00Z")),
        )
        db.run_command(
            "staff.schedules.set_active", {"schedule_id": ana_default, "is_active": 1}
        )

        print("5. parity with staff.availability.for_member")
        for day in ["2026-08-17", "2026-08-21", "2026-08-28", "2026-08-19"]:
            ours = day_at(db, ana, f"{day}T09:00:00Z")
            theirs = db.run_query(
                "staff.availability.for_member",
                {"staff_id": ana, "date_from": day, "date_to": day},
            )
            gov = [r["schedule_id"] for r in ours if r["kind"] == "day"]
            check(
                f"{day}: same governing template",
                {gov[0]},
                {r["schedule_id"] for r in theirs},
            )
        for day in ["2026-08-17", "2026-08-21", "2026-08-28"]:
            theirs = db.run_query(
                "staff.availability.for_member",
                {"staff_id": ana, "date_from": day, "date_to": day},
            )
            check(
                f"{day}: same intervals when nobody is away",
                [f"{r['start_time'][:5]}-{r['end_time'][:5]}" for r in theirs],
                summary(day_at(db, ana, f"{day}T09:00:00Z"))["shifts"],
            )

        print("6. tenancy")
        seed_time_off(db, OTHER_HUB, nora, "2026-08-17", "2026-08-17", "approved")
        # Rows no command can write (every `_insert_*` guards its hub), planted by hand the way a
        # bad import or a restore would: each JOIN must hold its own hub_id, not trust the writer.
        #   · a hub A template carrying hub B's member id (Nora) — only the member join's hub_id
        #     keeps it from governing hub A's answer about Nora;
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
            {"day": ["2026-08-17"], "governed": [False], "shifts": [], "off": []},
            summary(day_at(db, nora, "2026-08-17T09:00:00Z")),
        )
        #   · a hub B template carrying hub A's member id (Leo, who has none in A) — only the
        #     template's own hub_id keeps it out;
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
            {"day": ["2026-08-17"], "governed": [False], "shifts": [], "off": []},
            summary(day_at(db, leo, "2026-08-17T09:00:00Z")),
        )
        #   · a hub B working piece hung on hub A's template (Eva's, empty on mondays) — only the
        #     piece's own hub_id keeps it off Eva's day.
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
            {"day": ["2026-08-17"], "governed": [True], "shifts": [], "off": []},
            summary(day_at(db, eva, "2026-08-17T09:00:00Z")),
        )
        check(
            "hub B sees its own",
            {
                "day": ["2026-08-17"],
                "governed": [True],
                "shifts": ["09:00-13:00", "14:00-18:00"],
                "off": ["full"],
            },
            summary(day_at(db, nora, "2026-08-17T09:00:00Z", hub=OTHER_HUB)),
        )

        print("7. deleted rows and non-working pieces do not count")
        # A soft-deleted absence that still refused bookings, or a deleted template that still
        # governed, is a booking door answering from rows the business already removed.
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
        check(
            "zoe on monday: her live template, its live working piece, no deleted absence",
            {
                "day": ["2026-08-17"],
                "governed": [True],
                "shifts": ["09:00-12:00"],
                "off": [],
            },
            summary(day_at(db, zoe, "2026-08-17T09:00:00Z")),
        )
        check(
            "zoe on tuesday: a deleted working piece is no shift",
            {"day": ["2026-08-18"], "governed": [True], "shifts": [], "off": []},
            summary(day_at(db, zoe, "2026-08-18T09:00:00Z")),
        )
        check(
            "zoe on wednesday: a non-working piece is no shift",
            {"day": ["2026-08-19"], "governed": [True], "shifts": [], "off": []},
            summary(day_at(db, zoe, "2026-08-19T09:00:00Z")),
        )
        uma = seed_member(db, HUB, "Uma")
        seed_schedule(db, HUB, uma, "Uma regular", 1, hours=WEEK)
        db.scalar(
            f"UPDATE staff_member SET is_deleted = 1 WHERE id = '{uma}' RETURNING id"
        )
        check(
            "a deleted member's template governs nothing",
            {"day": ["2026-08-17"], "governed": [False], "shifts": [], "off": []},
            summary(day_at(db, uma, "2026-08-17T09:00:00Z")),
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
