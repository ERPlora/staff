#!/usr/bin/env python3
"""staff#46 — the commission sheet names the person by EVERY id their day can arrive under.

The per-professional day close (ADR-0077) crosses two modules that never JOIN: `sales.by_staff`
brings the gross per `staff_id`, `staff.commissions.summary` brings the rate per `staff_id`, and
the caller multiplies. That worked while `staff_id` meant one thing.

Since ERPlora/sales#179 it means two. A sale is never left unattributed any more: the server
resolves `payload.staff_id` (the appointment, the named professional) and falls back to
`context.current_user_id` (the user with the session). So `staff_id` is an OPAQUE reference to a
PERSON — a `staff_member.id` when somebody was named, and the **hub user** of the till in every
counter sale. One human being, two ids, and `architecture/modules/sales.md` says out loud that
normalising them is this module's job, not sales'.

The sheet used to publish only `staff_member.id`, so the counter half of a stylist's day matched no
rate and earned no commission — the day was split in two. The fix is a KEY, not a JOIN: the sheet
publishes, beside the `staff_id`, the `user_id` the record hangs from (ADR-0192). Both ids name the
same person, so the close folds the two rows into one without `staff` ever reading a sale.

What is checked:
  1. A record linked to a hub user is published under BOTH ids.
  2. A record with no hub user publishes no second id — nothing to fold, same behaviour as before.
  3. The fold: two grosses arriving under the two ids of ONE person are paid as one day. The
     grosses are this file's own numbers on purpose — the real crossing against a live `sales`
     is `commissions.hub.test.py`; what is proven HERE is the key the fold needs.
  4. The key is per hub: the same hub user in the hub next door is not on this hub's sheet.

Usage: tests/commissions_identity.postgres.test.py   (exit 0 = green; SKIPPED without the container)
"""

import sys

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
    db: ScratchDb, hub: str, first: str, user_id, commission: float
) -> str:
    """A member through the module's own door, and the id the command minted for them — which is
    the `staff_id` half of the seam's key."""
    db.run_command(
        "staff._insert_member",
        {
            "first_name": first,
            "last_name": "Pro",
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
            "hourly_rate": 0,
            "commission_rate": commission,
            "notes": "",
        },
        hub=hub,
    )
    return db.scalar(
        f"SELECT id FROM staff_member WHERE hub_id = '{hub}' AND first_name = '{first}'"
    )


def sheet(db: ScratchDb, hub: str = HUB) -> dict:
    """`staff.commissions.summary` as the day close reads it, keyed by `staff_id`."""
    return {r["staff_id"]: r for r in db.run_query("staff.commissions.summary", {}, hub=hub)}


def person_of(sheet_rows: dict) -> dict:
    """The day close's own index, built from NOTHING but the sheet: every id a person can be
    attributed under → that person's row. This is the whole point of publishing `user_id`; before
    staff#46 the second key did not exist and the counter half of a day fell through it."""
    index = {}
    for staff_id, row in sheet_rows.items():
        index[staff_id] = row
        if row.get("user_id"):
            index[row["user_id"]] = row
    return index


def main() -> int:
    if not container_available():
        print("SKIPPED: Postgres test container not available")
        return 0
    db = ScratchDb("staff_commid_t")
    db.create()
    try:
        print("1. a record that hangs from a hub user is published under BOTH of its ids")
        ana = seed_member(db, HUB, "Ana", "user-till-ana", 15.0)
        bruno = seed_member(db, HUB, "Bruno", None, 10.0)
        rows = sheet(db)
        check("Ana is on the sheet under her staff id", True, ana in rows)
        check(
            "…and the sheet says which hub user she is",
            "user-till-ana",
            rows.get(ana, {}).get("user_id"),
        )
        check("her rate travels as before", 15.0, rows.get(ana, {}).get("commission_rate"))
        check("and so does her name", "Ana Pro", rows.get(ana, {}).get("full_name"))

        print("\n2. a record with no hub user publishes no second id")
        check("Bruno is on the sheet", True, bruno in rows)
        check("with nothing to fold him into", None, rows.get(bruno, {}).get("user_id"))

        print("\n3. the fold: one person's day is added up ONCE, not split in two")
        # The two ways the same stylist's work arrives, and what each is worth. Decided here and
        # never read back from anything under test: this battery proves the KEY, not the gross.
        gross_by_staff_id = {
            ana: 2000,             # an appointment named her: `staff_member.id`
            "user-till-ana": 3000,  # she charged at the counter: the hub user of the session
        }
        index = person_of(rows)
        day: dict = {}
        for attributed_to, gross in gross_by_staff_id.items():
            row = index.get(attributed_to)
            if row is None:
                continue
            day[row["staff_id"]] = day.get(row["staff_id"], 0) + gross
        check("both halves land on the same professional", {ana: 5000}, day)
        # 15 % of 50,00 € = 7,50 €. The amounts divide exactly on purpose: how a fraction of a cent
        # is rounded is the seam's arithmetic and lives with it, in `commissions.hub.test.py`.
        check(
            "so her commission is the whole day's, not half of it",
            750,
            day.get(ana, 0) * int(rows[ana]["commission_rate"]) // 100,
        )

        print("\n4. the key does not cross the hub next door")
        seed_member(db, OTHER_HUB, "Nora", "user-till-ana", 99.0)
        check(
            "the neighbour's record is not on this hub's sheet",
            ["Ana Pro", "Bruno Pro"],
            sorted(r["full_name"] for r in sheet(db).values()),
        )
        check(
            "and this hub's user id resolves to THIS hub's professional",
            ana,
            person_of(sheet(db)).get("user-till-ana", {}).get("staff_id"),
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
