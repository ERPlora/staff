#!/usr/bin/env python3
"""appointments#229 — the whole team's day at an instant, keyed by the instant alone.

Moving an appointment (`appointments.appointments.reschedule`) has to judge the professional's
hours like `create` does, but its payload names the appointment and the new start — not the
professional: the move never changes who attends, and every caller that already moves
appointments (the agenda's drag, the edit panel, the WhatsApp recipes already activated on hubs)
sends exactly that. A command's `reads.params` can only bind a top-level `payload.<field>`, so
`staff.availability.day_at` (keyed by `:staff_id`) cannot be asked about the appointment's own
professional. `staff.availability.team_day_at` takes `:at` only and answers `day_at` for EVERY
member of the hub, each row carrying its `staff_id`; the booking door picks the rows of the
appointment's professional and judges them with the very function `create` uses.

What is checked:
  1. One `day` row per member of the hub — deleted members included, exactly as `day_at` answers
     any id it is asked about — and each carries its `staff_id`; the business day of `:at`
     (an instant on `:timezone`, or a bare `YYYY-MM-DD` as the day itself).
  2. Parity with `day_at` for EVERY member: specific template beating the default, approved
     absences (full, partial) and a pending one ignored, a member with no template, an inactive
     template, a deleted member.
  3. Tenancy: hub B's members are not in hub A's answer; hand-planted cross-hub rows (a template,
     a working piece, an absence) do not leak into hub A's days; hub B sees its own.
  4. Deleted and non-working rows (`day_at` §7): parity again.

Usage: tests/availability_team_day_at.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import importlib.util
import pathlib
import sys

from pg_harness import HUB, OTHER_HUB, ScratchDb, container_available


def _load(name: str, file: str):
    spec = importlib.util.spec_from_file_location(
        name, pathlib.Path(__file__).with_name(file)
    )
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_seeds = _load("schedules_availability", "schedules_availability.postgres.test.py")
_ahead = _load("availability_days_ahead", "availability_days_ahead.postgres.test.py")
seed_member, seed_schedule, seed_time_off = (
    _seeds.seed_member,
    _seeds.seed_schedule,
    _seeds.seed_time_off,
)
plant, summary, day_at = _ahead.plant, _ahead.summary, _ahead.day_at

MADRID = "Europe/Madrid"
WEEK = [(d, "09:00:00", "18:00:00", "13:00:00", "14:00:00") for d in range(5)]
# Wednesday 19 Aug 2026, 11:00 in Madrid.
AT = "2026-08-19T09:00:00Z"

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def team(db: ScratchDb, at: str = AT, tz=MADRID, hub: str = HUB) -> list[dict]:
    params = {"at": at}
    if tz is not None:
        params["timezone"] = tz
    return db.run_query("staff.availability.team_day_at", params, hub=hub)


def of(rows: list[dict], staff_id: str) -> list[dict]:
    return [r for r in rows if r["staff_id"] == staff_id]


def members(db: ScratchDb, hub: str) -> list[str]:
    ids = db.scalar(
        f"SELECT string_agg(id, ',' ORDER BY id COLLATE \"C\") FROM staff_member WHERE hub_id = '{hub}'"
    )
    return sorted((ids or "").split(",")) if ids else []


def check_parity(db: ScratchDb, label: str, at: str = AT, hub: str = HUB) -> None:
    """Every member's rows of the team read must be exactly what `day_at` answers about them."""
    rows = team(db, at, hub=hub)
    listed = sorted({r["staff_id"] for r in rows})
    check(f"{label}: every member of the hub, and only them", members(db, hub), listed)
    mismatched = []
    for staff_id in listed:
        ours = summary(of(rows, staff_id))
        theirs = summary(day_at(db, staff_id, at, hub=hub))
        if ours != theirs:
            mismatched.append((staff_id, ours, theirs))
    check(f"{label}: {len(listed)} members, each equal to day_at", [], mismatched)


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_teamday_t")
    db.create()
    try:
        ana = seed_member(db, HUB, "Ana")
        leo = seed_member(db, HUB, "Leo")  # never given a template
        nora = seed_member(db, OTHER_HUB, "Nora")
        seed_schedule(db, HUB, ana, "Regular", 1, hours=WEEK)
        seed_schedule(db, OTHER_HUB, nora, "Nora regular", 1, hours=WEEK)

        print("1. one day per member, on the business day of :at")
        rows = team(db)
        check(
            "one `day` row per member, each naming its professional",
            sorted([ana, leo]),
            sorted(r["staff_id"] for r in rows if r["kind"] == "day"),
        )
        check(
            "ana on wednesday: her template, split around the break",
            {
                "shifts": ["09:00-13:00", "14:00-18:00"],
                "off": [],
                "day": ["2026-08-19"],
            },
            {k: v for k, v in summary(of(rows, ana)).items() if k != "schedule"},
        )
        check(
            "leo has no template: a day nothing governs",
            {"day": ["2026-08-19"], "schedule": [None], "shifts": [], "off": []},
            summary(of(rows, leo)),
        )
        check(
            "22:30Z on the 19th is thursday the 20th in Madrid",
            ["2026-08-20"],
            sorted({r["day"] for r in team(db, "2026-08-19T22:30:00Z")}),
        )
        check(
            "no zone → the runtime's UTC fallback: still the 19th",
            ["2026-08-19"],
            sorted({r["day"] for r in team(db, "2026-08-19T22:30:00Z", tz=None)}),
        )
        check(
            "a bare date is that business day",
            ["2026-08-19"],
            sorted({r["day"] for r in team(db, "2026-08-19")}),
        )

        print("2. parity with day_at, member by member")
        seed_schedule(
            db,
            HUB,
            ana,
            "Short wednesday",
            0,
            "2026-08-19",
            "2026-08-19",
            hours=[(2, "10:00:00", "12:00:00")],
        )
        seed_time_off(
            db,
            HUB,
            ana,
            "2026-08-19",
            "2026-08-19",
            "approved",
            0,
            "10:30:00",
            "11:00:00",
        )
        seed_time_off(db, HUB, leo, "2026-08-18", "2026-08-20", "approved")
        rows = team(db)
        check(
            "ana: the specific template wins and her approved part-day absence is there",
            {"shifts": ["10:00-12:00"], "off": ["10:30-11:00"]},
            {k: v for k, v in summary(of(rows, ana)).items() if k in ("shifts", "off")},
        )
        check(
            "leo: the multi-day absence covers the day",
            ["full"],
            summary(of(rows, leo))["off"],
        )
        ivy = seed_member(db, HUB, "Ivy")
        ivy_tpl = seed_schedule(db, HUB, ivy, "Ivy regular", 1, hours=WEEK)
        db.run_command(
            "staff.schedules.set_active", {"schedule_id": ivy_tpl, "is_active": 0}
        )
        check(
            "an inactive template governs nothing",
            [None],
            summary(of(team(db), ivy))["schedule"],
        )
        max_ = seed_member(db, HUB, "Max")
        seed_schedule(db, HUB, max_, "From thursday", 0, "2026-08-20", "2026-08-31", hours=WEEK)
        seed_time_off(db, HUB, max_, "2026-08-19", "2026-08-19", "pending")
        check(
            "max: a template starting tomorrow does not govern today; a pending absence is no absence",
            {"schedule": [None], "off": []},
            {k: v for k, v in summary(of(team(db), max_)).items() if k in ("schedule", "off")},
        )
        check(
            "a bare date is that business day even west of UTC",
            ["2026-08-19"],
            sorted({r["day"] for r in team(db, "2026-08-19", tz="America/New_York")}),
        )
        check_parity(db, "wednesday")
        check_parity(db, "a bare date", at="2026-08-19")
        check_parity(db, "across the DST end (25 Oct 2026)", at="2026-10-25T09:00:00Z")

        print("3. tenancy")
        check("hub B's member is not in hub A's team", [], of(team(db), nora))
        seed_time_off(db, OTHER_HUB, nora, "2026-08-19", "2026-08-19", "approved")
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
        plant(
            db,
            "staff_time_off",
            OTHER_HUB,
            staff_id=ana,
            start_date="2026-08-19",
            end_date="2026-08-19",
            status="approved",
            is_full_day=1,
        )
        eva = seed_member(db, HUB, "Eva")
        eva_tpl = seed_schedule(db, HUB, eva, "Eva, no hours", 1)
        plant(
            db,
            "staff_working_hours",
            OTHER_HUB,
            schedule_id=eva_tpl,
            day_of_week=2,
            start_time="07:00:00",
            end_time="08:00:00",
            break_start="07:30:00",
            break_end="07:45:00",
            is_working=1,
        )
        rows = team(db)
        check(
            "hub B's template on hub A's member does not govern hub A's day",
            [None],
            summary(of(rows, leo))["schedule"],
        )
        check(
            "hub B's absence on hub A's member is not hub A's",
            ["10:30-11:00"],
            summary(of(rows, ana))["off"],
        )
        check(
            "hub B's piece on hub A's template is not hub A's shift",
            [],
            summary(of(rows, eva))["shifts"],
        )
        check(
            "hub B sees its own member, only",
            ([nora], {"shifts": ["09:00-13:00", "14:00-18:00"], "off": ["full"]}),
            (
                sorted({r["staff_id"] for r in team(db, hub=OTHER_HUB)}),
                {
                    k: v
                    for k, v in summary(of(team(db, hub=OTHER_HUB), nora)).items()
                    if k in ("shifts", "off")
                },
            ),
        )
        check_parity(db, "hub A with foreign rows planted")
        check_parity(db, "hub B", hub=OTHER_HUB)

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
            day_of_week=2,
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
            day_of_week=3,
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
            "2026-08-19",
            "2026-08-19",
            hours=[(2, "07:00:00", "08:00:00")],
        )
        db.scalar(
            f"UPDATE staff_schedule SET is_deleted = 1 WHERE id = '{deleted_specific}' RETURNING id"
        )
        seed_time_off(db, HUB, zoe, "2026-08-19", "2026-08-19", "approved")
        db.scalar(
            f"UPDATE staff_time_off SET is_deleted = 1 WHERE staff_id = '{zoe}' "
            "AND start_date = '2026-08-19' RETURNING id"
        )
        check(
            "zoe: monday's live piece; wednesday's deleted one and thursday's non-working one are no shift",
            [["09:00-12:00"], [], []],
            [
                summary(of(team(db, at), zoe))["shifts"]
                for at in ("2026-08-17", "2026-08-19", "2026-08-20")
            ],
        )
        check("zoe: the deleted absence is gone", [], summary(of(team(db), zoe))["off"])
        check_parity(db, "zoe's thursday", at="2026-08-20")
        uma = seed_member(db, HUB, "Uma")
        seed_schedule(db, HUB, uma, "Uma regular", 1, hours=WEEK)
        db.scalar(
            f"UPDATE staff_member SET is_deleted = 1 WHERE id = '{uma}' RETURNING id"
        )
        check(
            "a deleted member is still answered (her appointments exist), her template governs nothing",
            [None],
            summary(of(team(db), uma))["schedule"],
        )
        check_parity(db, "with zoe and a deleted member")
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
