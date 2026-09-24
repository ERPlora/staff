#!/usr/bin/env python3
"""staff#55 — one Hub user, one live staff member: the refusal, through the REAL kernel.

`staff.members.create` / `staff.members.update` are WASM handlers since staff#55: the runtime
pre-loads `staff.members.by_user` (ADR-0069), the handler refuses a second holder with
`staff.user_already_linked`, and otherwise emits `staff._insert_member` / `staff._update_member`,
whose SQL keeps the role gate (`expect_rows`, applied to handler operations since hub#1025). The
handler's decisions are unit-tested in `handler/src/lib.rs` and the SQL in
`user_link_unique.postgres.test.py`; what only a running kernel proves is the WIRING between them:
the read reaches the handler with the payload's user, the intention runs with its gate, the
refusal travels as the declared code, and the create still answers the id of the record it made.

  1. A create answers the new member's id (the batch id the handler consumed, hub#776), and that
     id names the record.
  2. A second create for the same user is refused with `staff.user_already_linked`, naming the
     holder, and writes nothing.
  3. An edit that moves another member onto that user is refused the same way; the holder may be
     edited and keep its own user.
  4. Unlinking (`user_id: ''`) frees the user for another member; a deleted holder frees it too.
  5. The role gate survived the move to the handler: a role that is not this hub's is still
     refused with `staff.role_not_found` / `staff.member_update_rejected`.

Usage: erplora test <dir> --against-hub   (without a hub this FAILS, it never skips)
"""

import sys
import uuid

from hub_harness import Hub

hub = Hub("user_link.hub", needs=("staff",))
TAG = uuid.uuid4().hex[:6]


def payload(first: str, user_id=None, role_id=None) -> dict:
    # The form's full snapshot: the command's SQL binds every column (no schema defaults).
    return {
        "user_id": user_id,
        "first_name": f"{first}-{TAG}",
        "last_name": "Link",
        "email": "",
        "phone": "",
        "employee_id": "",
        "role_id": role_id,
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


def refusal(status: int, body) -> tuple:
    """(code, message) of a refused command, or ('accepted', status) when it went through."""
    if status == 200 and (body or {}).get("ok"):
        return ("accepted", status)
    err = (body or {}).get("error") or body or {}
    if isinstance(err, str):
        return (body.get("code"), err)
    return (err.get("code"), err.get("message", ""))


def members_named(first: str) -> list:
    return [
        r
        for r in hub.query("staff.members.list", {"limit": 500})
        if r.get("first_name") == f"{first}-{TAG}"
    ]


user = f"hub-user-{TAG}"

print("\n· 1. the create answers the id of the record it made")
ana = hub.run("staff.members.create", payload("Ana", user))
ana_id = (ana.get("new_ids") or [None])[0]
hub.check_true("the create answers one new id", bool(ana_id), f"answer: {ana}")
rows = hub.query("staff.members.get", {"staff_id": ana_id}) if ana_id else []
hub.check(
    "that id names Ana, linked to the user",
    [(r["first_name"], r["user_id"]) for r in rows],
    [(f"Ana-{TAG}", user)],
)

print("\n· 2. a second member for the same user is refused, naming the holder")
code, message = refusal(*hub.command("staff.members.create", payload("Bea", user)))
hub.check("second create", code, "staff.user_already_linked")
hub.check_true(
    "the refusal names the holder",
    f"Ana-{TAG}" in str(message),
    f"message: {message!r}",
)
hub.check("the refused create wrote nothing", members_named("Bea"), [])

print("\n· 3. editing another member onto that user is refused; the holder keeps it")
cris_id = hub.run("staff.members.create", payload("Cris"))["new_ids"][0]
code, _ = refusal(
    *hub.command("staff.members.update", {"staff_id": cris_id, "user_id": user})
)
hub.check("moving Cris onto Ana's user", code, "staff.user_already_linked")
hub.check(
    "Cris is still without a user",
    hub.query("staff.members.get", {"staff_id": cris_id})[0]["user_id"],
    None,
)
code, _ = refusal(
    *hub.command(
        "staff.members.update", {"staff_id": ana_id, "user_id": user, "phone": "600"}
    )
)
hub.check("editing Ana while she keeps her own user", code, "accepted")

print("\n· 4. unlinking or deleting the holder frees the user")
hub.run("staff.members.update", {"staff_id": ana_id, "user_id": ""})
code, _ = refusal(
    *hub.command("staff.members.update", {"staff_id": cris_id, "user_id": user})
)
hub.check("after Ana unlinks, Cris can take the user", code, "accepted")
hub.run(
    "staff.members.delete",
    {"staff_id": cris_id, "termination_date": "", "reason": "left"},
)
code, _ = refusal(*hub.command("staff.members.create", payload("Dani", user)))
hub.check("after Cris is deleted, a new member can take the user", code, "accepted")

print("\n· 5. the role gate survived the move to the handler")
foreign_role = f"role-of-another-hub-{TAG}"
code, _ = refusal(
    *hub.command("staff.members.create", payload("Eva", None, foreign_role))
)
hub.check("create with a role that is not this hub's", code, "staff.role_not_found")
code, _ = refusal(
    *hub.command("staff.members.update", {"staff_id": ana_id, "role_id": foreign_role})
)
hub.check(
    "update with a role that is not this hub's", code, "staff.member_update_rejected"
)

sys.exit(hub.finish("one Hub user hangs from one live member, through the real kernel"))
