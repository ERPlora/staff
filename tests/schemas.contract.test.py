#!/usr/bin/env python3
"""staff#11 — every public command validates its payload on the SERVER, with a closed contract.

Why this file exists. The component tests mock the SDK: they check that a form CALLS a command with
a given object, and nothing ever runs that object through the module's JSON Schema. So the browser
and the contract can drift apart and the suite stays green — which is exactly how a sibling module
shipped a form whose every submit was refused by `additionalProperties: false` (schedules#7). And
here the stakes are higher than a rejected form: `staff` moves MONEY (`hourly_rate` in cents,
`commission_rate` as a percentage — ADR-0123) and PERSONAL data (leave, reasons), so a payload the
schema lets through is a wrong figure persisted, not a red toast.

What this file proves, statically, against the module's own JSON Schemas (Draft 2020-12, the
dialect the runtime compiles — `crates/runtime/src/registry.rs`):

  1. EVERY public (non `_`) command declares a `schema`, the file exists, parses, and is CLOSED —
     an unknown key is a typo or an attack, never a no-op.
  2. The dead `validates` key is nowhere (hub#610: the runtime discards it, so it LOOKS like
     validation and validates nothing).
  3. THE EXACT PAYLOADS THE FORMS SEND are accepted. They are copied from the three Web Components
     (`erp-staff-members`, `erp-staff-schedules`, `erp-staff-roles`, `erp-staff-time-off`), so the
     day a form grows a field this test goes red instead of production.
  4. A matrix of violations is REFUSED: an unknown key, an empty name, a status outside the enum,
     a NEGATIVE hourly rate, a commission over 100 %, a flag that is not 0/1, an empty batch, a
     leave type outside the enum, a status transition target outside the enum, an empty id.
  5. What JSON Schema CANNOT judge stays out of it, NAMED: the member must exist, leave must not
     overlap, a schedule needs at least one working interval, `effective_until >= effective_from`,
     the role must belong to THIS hub. Those are the handler's and the SQL guards' — pinned by the
     Rust tests in `handler/src/lib.rs` and by `tests/*.postgres.test.py`. This file asserts the
     schema does NOT pretend to cover them, so nobody trusts the wrong layer.

Usage: uv run --with jsonschema tests/schemas.contract.test.py   (exit 0 = green)
       (`jsonschema` is the only dependency; without it the test FAILS loudly, it does not skip —
       a validation test that skips proves nothing.)
"""

import json
import pathlib
import sys

MODULE_DIR = pathlib.Path(__file__).resolve().parent.parent
MANIFEST = json.loads((MODULE_DIR / "module.json").read_text())

try:
    from jsonschema import Draft202012Validator
except (
    ModuleNotFoundError
):  # pragma: no cover - the dependency is the point of the test
    print(
        "✗ `jsonschema` is not importable. Run:\n"
        "    uv run --with jsonschema tests/schemas.contract.test.py\n"
        "  (skipping would turn a validation test into a green light for nothing)"
    )
    sys.exit(1)

failures: list[str] = []


def check(label: str, expected, actual) -> None:
    ok = expected == actual
    print(
        f"  {'ok' if ok else 'FAIL'}: {label} = {actual!r}"
        + ("" if ok else f" (expected {expected!r})")
    )
    if not ok:
        failures.append(f"{label}: expected {expected!r}, got {actual!r}")


def validator(command: str) -> Draft202012Validator:
    schema = json.loads(
        (MODULE_DIR / MANIFEST["commands"][command]["schema"]).read_text()
    )
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def accepts(command: str, payload: dict) -> bool:
    return not list(validator(command).iter_errors(payload))


def public_commands() -> list[str]:
    return [n for n in MANIFEST["commands"] if not n.split(".", 1)[1].startswith("_")]


# ── 1 & 2. Closed schemas, and no dead `validates` ────────────────────────────────────────


def test_every_public_command_declares_a_closed_schema() -> None:
    print("\n· every public command carries a closed schema")
    for name in public_commands():
        cmd = MANIFEST["commands"][name]
        rel = cmd.get("schema")
        if not rel:
            failures.append(f"{name}: no `schema` declared")
            print(f"  FAIL: {name} declares no schema")
            continue
        path = MODULE_DIR / rel
        if not path.exists():
            failures.append(f"{name}: schema file {rel} is missing")
            print(f"  FAIL: {name} → {rel} does not exist")
            continue
        schema = json.loads(path.read_text())
        Draft202012Validator.check_schema(schema)
        closed = schema.get("additionalProperties") is False
        print(f"  {'ok' if closed else 'FAIL'}: {name} → {rel} closed = {closed}")
        if not closed:
            failures.append(f"{name}: schema is not closed (additionalProperties)")


def test_the_dead_validates_key_is_nowhere() -> None:
    print("\n· the `validates` key the runtime discards (hub#610)")
    check(
        "commands declaring `validates`",
        [],
        [n for n, c in MANIFEST["commands"].items() if "validates" in c],
    )


# ── 3. The exact payloads the forms send ──────────────────────────────────────────────────

MEMBER_COMMON = {
    "first_name": "Ana",
    "last_name": "Ruiz",
    "email": "ana@example.com",
    "phone": "600000000",
    "employee_id": "E-1",
    "status": "active",
    "is_bookable": 1,
    "color": "#ff00ff",
    "hire_date": "2026-01-15",
    "bio": "",
    "specialties": "",
    "hourly_rate": 1550,
    "commission_rate": 12.5,
}

UI_PAYLOADS = {
    # `erp-staff-members.createMember` — alta y edición comparten panel (staff#4).
    "staff.members.create": [
        {**MEMBER_COMMON, "role_id": "r-1", "user_id": None, "notes": ""},
        # Minimal: only the two required names (the rest carries the schema's defaults).
        {"first_name": "Bo", "last_name": "Diaz"},
        # Without permission to read compensation the form does NOT send money (staff#4).
        {
            k: v
            for k, v in MEMBER_COMMON.items()
            if k not in ("hourly_rate", "commission_rate")
        },
    ],
    "staff.members.update": [
        {
            "staff_id": "m-1",
            **MEMBER_COMMON,
            "role_id": "",
            "user_id": "",
            "booking_buffer": 15,
        },
    ],
    "staff.members.deactivate": [{"staff_id": "m-1"}],
    "staff.members.delete": [
        {"staff_id": "m-1", "termination_date": "2026-08-31", "reason": "resignation"},
        {"staff_id": "m-1", "termination_date": None, "reason": None},
    ],
    # No form sends this one: it is the import / assistant door, and its item is a REDUCED surface
    # (no status, no commission, no notes) on purpose — an import creates people, it does not
    # administer them.
    "staff.members.bulk_create": [
        {
            "members": [
                {"first_name": "Ana", "last_name": "Ruiz"},
                {
                    "first_name": "Bo",
                    "last_name": "Diaz",
                    "email": "bo@example.com",
                    "role_id": None,
                    "hire_date": "2026-02-01",
                    "hourly_rate": 1200,
                    "is_bookable": 1,
                },
            ]
        },
    ],
    # `erp-staff-roles.createRole`.
    "staff.roles.create": [
        {"name": "Stylist", "description": "", "color": "#f0f", "order": 0}
    ],
    # `erp-staff-schedules` — create and update share the same body.
    "staff.schedules.create": [
        {
            "staff_id": "m-1",
            "name": "Default",
            "is_default": 1,
            "effective_from": None,
            "effective_until": None,
            "working_hours": [
                {
                    "day_of_week": 0,
                    "start_time": "09:00",
                    "end_time": "18:00",
                    "break_start": "13:00",
                    "break_end": "14:00",
                    "is_working": 1,
                }
            ],
        },
    ],
    "staff.schedules.update": [
        {
            "schedule_id": "s-1",
            "name": "Summer",
            "is_default": 0,
            "effective_from": "2026-06-01",
            "effective_until": "2026-09-30",
            "working_hours": [
                {
                    "day_of_week": 5,
                    "start_time": "10:00",
                    "end_time": "14:00",
                    "break_start": None,
                    "break_end": None,
                    "is_working": 1,
                }
            ],
        },
    ],
    "staff.schedules.set_active": [{"schedule_id": "s-1", "is_active": 0}],
    "staff.schedules.delete": [{"schedule_id": "s-1"}],
    # `erp-staff-members` services section.
    "staff.services.assign": [
        {
            "staff_id": "m-1",
            "service_id": "svc-1",
            "service_name": "Cut",
            "custom_duration": 30,
            "custom_price": 2500,
            "is_primary": 0,
        },
        {
            "staff_id": "m-1",
            "service_id": "svc-1",
            "service_name": "Cut",
            "custom_duration": None,
            "custom_price": None,
            "is_primary": 0,
        },
    ],
    "staff.services.update": [
        {
            "id": "ms-1",
            "custom_duration": None,
            "custom_price": None,
            "is_primary": 1,
            "is_active": 1,
        },
    ],
    "staff.services.remove": [{"id": "ms-1"}],
    # `erp-staff-time-off`.
    "staff.time_off.create": [
        {
            "staff_id": "m-1",
            "leave_type": "vacation",
            "start_date": "2026-08-01",
            "end_date": "2026-08-15",
            "is_full_day": 1,
            "start_time": None,
            "end_time": None,
            "reason": "Family",
            "notes": "",
        },
    ],
    "staff.time_off.set_status": [{"time_off_id": "t-1", "status": "approved"}],
    # The settings screen (ADR-0082) sends the full snapshot.
    "staff.settings.update": [
        {
            "default_work_start": "09:00",
            "default_work_end": "18:00",
            "default_break_duration": 60,
            "min_advance_booking": 1,
            "max_daily_hours": 12,
            "overtime_threshold": 40,
            "show_staff_photos": 1,
            "show_staff_bio": 1,
            "allow_staff_selection": 1,
            "notify_new_appointment": 1,
            "notify_cancellation": 1,
        },
    ],
}


def test_every_public_command_has_its_ui_payload_covered() -> None:
    print("\n· no public command is left without a payload in this matrix")
    check(
        "public commands with no payload here",
        [],
        sorted(set(public_commands()) - set(UI_PAYLOADS)),
    )


def test_the_payloads_the_forms_send_are_accepted() -> None:
    print("\n· the exact payloads of the forms")
    for command, payloads in UI_PAYLOADS.items():
        for i, payload in enumerate(payloads):
            check(f"{command} accepts UI payload #{i}", True, accepts(command, payload))


# ── 4. Violations the schema MUST refuse ──────────────────────────────────────────────────

REFUSED = [
    ("staff.members.create", "an unknown key", {**MEMBER_COMMON, "salary": 2000}),
    ("staff.members.create", "no name at all", {"last_name": "Ruiz"}),
    (
        "staff.members.create",
        "an empty first name",
        {"first_name": "", "last_name": "Ruiz"},
    ),
    (
        "staff.members.create",
        "a status outside the enum",
        {"first_name": "A", "last_name": "B", "status": "fired"},
    ),
    # ADR-0123: money is INTEGER cents. A negative wage, or euros as a float, is not a payload.
    (
        "staff.members.create",
        "a NEGATIVE hourly rate",
        {"first_name": "A", "last_name": "B", "hourly_rate": -100},
    ),
    (
        "staff.members.create",
        "an hourly rate in euros (float, not cents)",
        {"first_name": "A", "last_name": "B", "hourly_rate": 15.5},
    ),
    (
        "staff.members.create",
        "a commission over 100 %",
        {"first_name": "A", "last_name": "B", "commission_rate": 120},
    ),
    (
        "staff.members.create",
        "a commission below zero",
        {"first_name": "A", "last_name": "B", "commission_rate": -1},
    ),
    (
        "staff.members.create",
        "a flag that is not 0/1",
        {"first_name": "A", "last_name": "B", "is_bookable": 2},
    ),
    (
        "staff.members.create",
        "a boolean where the flag is an integer (staff#24)",
        {"first_name": "A", "last_name": "B", "is_bookable": True},
    ),
    ("staff.members.update", "no staff_id", {**MEMBER_COMMON}),
    # pm#521: money-input keeps the sign of a pasted «-1.250,50»; the form refuses it, and the
    # schema is the backstop on EVERY command that carries the amount, the edit included.
    (
        "staff.members.update",
        "a NEGATIVE hourly rate",
        {"staff_id": "m-1", **MEMBER_COMMON, "hourly_rate": -100},
    ),
    ("staff.members.deactivate", "an empty id", {"staff_id": ""}),
    ("staff.members.bulk_create", "an empty batch", {"members": []}),
    (
        "staff.members.bulk_create",
        "an item with an unknown key",
        {"members": [{"first_name": "A", "last_name": "B", "salary": 1}]},
    ),
    (
        "staff.members.bulk_create",
        "an item with no name",
        {"members": [{"last_name": "B"}]},
    ),
    (
        "staff.members.bulk_create",
        "an item carrying `status` (not part of the import surface)",
        {"members": [{"first_name": "A", "last_name": "B", "status": "active"}]},
    ),
    ("staff.roles.create", "no name", {"description": "x"}),
    ("staff.roles.create", "an empty name", {"name": ""}),
    ("staff.schedules.create", "no staff_id", {"name": "Default"}),
    (
        "staff.schedules.create",
        "a working hour with an unknown key",
        {
            "staff_id": "m-1",
            "working_hours": [
                {
                    "day_of_week": 0,
                    "start_time": "09:00",
                    "end_time": "18:00",
                    "colour": "red",
                }
            ],
        },
    ),
    (
        "staff.schedules.create",
        "a weekday out of range",
        {
            "staff_id": "m-1",
            "working_hours": [
                {"day_of_week": 7, "start_time": "09:00", "end_time": "18:00"}
            ],
        },
    ),
    (
        "staff.schedules.set_active",
        "an is_active that is not 0/1",
        {"schedule_id": "s-1", "is_active": 5},
    ),
    (
        "staff.services.assign",
        "a NEGATIVE custom price",
        {
            "staff_id": "m-1",
            "service_id": "s",
            "service_name": "Cut",
            "custom_price": -1,
        },
    ),
    (
        "staff.services.update",
        "a NEGATIVE custom price",
        {"id": "ms-1", "custom_duration": None, "custom_price": -1, "is_primary": 0, "is_active": 1},
    ),
    (
        "staff.services.assign",
        "a zero-minute duration",
        {
            "staff_id": "m-1",
            "service_id": "s",
            "service_name": "Cut",
            "custom_duration": 0,
        },
    ),
    (
        "staff.services.assign",
        "no service_name",
        {"staff_id": "m-1", "service_id": "s"},
    ),
    (
        "staff.time_off.create",
        "a leave type outside the enum",
        {
            "staff_id": "m-1",
            "leave_type": "sabbatical",
            "start_date": "2026-08-01",
            "end_date": "2026-08-02",
        },
    ),
    ("staff.time_off.create", "no dates", {"staff_id": "m-1"}),
    (
        "staff.time_off.set_status",
        "a status outside the enum",
        {"time_off_id": "t-1", "status": "maybe"},
    ),
    ("staff.time_off.set_status", "no id", {"status": "approved"}),
    (
        "staff.settings.update",
        "an unknown setting",
        {"default_work_start": "09:00", "coffee_breaks": 3},
    ),
    (
        "staff.settings.update",
        "a break longer than the cap",
        {"default_break_duration": 999},
    ),
    ("staff.settings.update", "more than 24 hours in a day", {"max_daily_hours": 25}),
    (
        "staff.settings.update",
        "a work start that is not HH:MM",
        {"default_work_start": "9am"},
    ),
]


def test_the_violations_are_refused() -> None:
    print("\n· the matrix of refused payloads")
    for command, label, payload in REFUSED:
        check(f"{command} refuses {label}", False, accepts(command, payload))


# ── 5. What the schema does NOT judge, said out loud ──────────────────────────────────────

NOT_THE_SCHEMAS_JOB = [
    (
        "staff.time_off.create",
        "leave that OVERLAPS another one — the SQL guard refuses it",
        {
            "staff_id": "m-1",
            "leave_type": "vacation",
            "start_date": "2026-08-01",
            "end_date": "2026-08-15",
        },
    ),
    (
        "staff.time_off.create",
        "an end date BEFORE the start — the handler refuses it",
        {
            "staff_id": "m-1",
            "leave_type": "vacation",
            "start_date": "2026-08-15",
            "end_date": "2026-08-01",
        },
    ),
    (
        "staff.time_off.create",
        "a member that does not exist — the read refuses it",
        {
            "staff_id": "nobody",
            "leave_type": "vacation",
            "start_date": "2026-08-01",
            "end_date": "2026-08-02",
        },
    ),
    (
        "staff.schedules.create",
        "a week with NO working interval — the handler refuses it",
        {"staff_id": "m-1", "name": "Empty", "working_hours": []},
    ),
    (
        "staff.schedules.create",
        "a validity range that ends before it starts — the handler refuses it",
        {
            "staff_id": "m-1",
            "effective_from": "2026-09-01",
            "effective_until": "2026-06-01",
        },
    ),
    (
        "staff.members.bulk_create",
        "a batch of 101 (the cap MAX_BULK = 100 lives in the handler, not here)",
        {"members": [{"first_name": "A", "last_name": "B"}] * 101},
    ),
    (
        "staff.members.create",
        "a role_id belonging to ANOTHER hub — the SQL resolves it per hub",
        {"first_name": "A", "last_name": "B", "role_id": "role-of-the-neighbour"},
    ),
]


def test_the_cross_field_rules_are_not_faked_by_the_schema() -> None:
    print(
        "\n· cross-field and cross-row rules belong to the handler and the SQL guards"
    )
    for command, label, payload in NOT_THE_SCHEMAS_JOB:
        check(
            f"{command}: schema lets through {label}", True, accepts(command, payload)
        )


def main() -> int:
    test_every_public_command_declares_a_closed_schema()
    test_the_dead_validates_key_is_nowhere()
    test_every_public_command_has_its_ui_payload_covered()
    test_the_payloads_the_forms_send_are_accepted()
    test_the_violations_are_refused()
    test_the_cross_field_rules_are_not_faked_by_the_schema()
    print()
    if failures:
        print(f"✗ {len(failures)} failure(s):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("✓ schemas.contract: all checks passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
