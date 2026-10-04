#!/usr/bin/env python3
"""staff#63 — two people link the same Hub user to two records AT ONCE, through a REAL kernel.

`user_link.hub.test.py` proves the refusal when the links arrive one after the other: the handler
reads `staff.members.by_user`, sees the holder and answers `staff.user_already_linked`. When they
arrive at the same time, BOTH reads see nobody, both writes go out, and `uq_staff_member_hub_user`
(migration 006) stops the second one with a unique violation. Nothing is duplicated — but before
`on_unique` (hub#2081) the loser was told `db`, «the request could not be completed», instead of
the reason the person who did not race reads. This battery is that race, made deterministic:

  * the FIRST link is the insert of `staff._insert_member`, run by hand in the hub's database and
    left UNCOMMITTED — the other person in the middle of their save;
  * the SECOND link is `staff.members.create` (or `.update`) through `/api/command`, from a thread:
    its read cannot see the uncommitted holder, the handler lets it through, and its insert WAITS
    on the index behind the first one;
  * the first one commits, the second is refused by the index, and the battery reads what the
    caller was told and what the database kept.

The hub's database is the psql session the runner hands over in `ERPLORA_HUB_PSQL`
(`erplora test --against-hub`, module-toolkit#405; the hub's CI `run-module-hub-batteries.sh`,
hub#2367) — the same door `services/tests/grant_race.hub.test.py` uses. Without it, or without a
runtime, the battery FAILS: it never skips.

Usage: erplora test <dir> --against-hub [dev|stable|sha256:…]
"""

import os
import shlex
import subprocess
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from typing import NamedTuple

from hub_harness import Hub
from pg_harness import MODULE_DIR, bind

# The most the battery waits for a side of the race to park. Polled: a quiet machine does not pay it.
SETTLE_TIMEOUT = 30
TAG = uuid.uuid4().hex[:6]
CODE = "staff.user_already_linked"


class HubDatabase(NamedTuple):
    """A psql session on the database THIS run's hub writes to, as the runner hands it over."""

    words: tuple[str, ...]

    @classmethod
    def from_env(cls, env=os.environ) -> "HubDatabase":
        words = tuple(shlex.split(env.get("ERPLORA_HUB_PSQL", "")))
        if not words:
            print(
                "user_link_race.hub: hub_psql_missing — ERPLORA_HUB_PSQL is empty. The runner that "
                "starts the hub (`erplora test --against-hub`, or the hub's "
                "`run-module-hub-batteries.sh`) hands over a psql session on its database; "
                "without it this is NOT a skip, it is a failure."
            )
            sys.exit(1)
        return cls(words)

    def psql(self, *args: str) -> list[str]:
        return [*self.words, *args]

    def scalar(self, sql: str) -> str:
        return subprocess.run(
            self.psql("-tAc", sql), capture_output=True, text=True, check=True
        ).stdout.strip()


class OpenLink:
    """The other person's save: `staff._insert_member`'s own SQL inside a transaction left open.

    `ON_ERROR_STOP=0` wins over the handed-over `=1` (psql applies `-v` in order): a failing insert
    must still reach its COMMIT so the battery reads the error instead of a broken pipe."""

    def __init__(self, db: HubDatabase, hub_id: str, user_id: str, first_name: str):
        self.member_id = str(uuid.uuid4())
        sql = bind(
            (MODULE_DIR / "commands" / "member_create.sql").read_text(),
            {
                **payload(first_name, user_id),
                "member_id": self.member_id,
                "hub_id": hub_id,
                "current_user_id": "u-race",
                "now": datetime.now(timezone.utc).isoformat(timespec="milliseconds"),
            },
        )
        self.proc = subprocess.Popen(
            db.psql("-v", "ON_ERROR_STOP=0"),
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        self.proc.stdin.write("BEGIN;\n" + sql + "\n")
        self.proc.stdin.flush()

    def commit(self) -> str:
        self.proc.stdin.write("COMMIT;\n")
        self.proc.stdin.flush()
        self.proc.stdin.close()
        self.proc.wait(timeout=30)
        err = (self.proc.stderr.read() or "").strip()
        return err if "ERROR" in err else ""

    def kill(self) -> None:
        if self.proc.poll() is None:
            self.proc.kill()


def payload(first: str, user_id=None) -> dict:
    # The form's full snapshot: the command's SQL binds every column (no schema defaults).
    return {
        "user_id": user_id,
        "first_name": f"{first}-{TAG}",
        "last_name": "Race",
        "email": "",
        "phone": "",
        "employee_id": "",
        "role_id": None,
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


def parked(db: HubDatabase, condition: str) -> int:
    return int(
        db.scalar(
            "SELECT count(*) FROM pg_stat_activity "
            f"WHERE datname = current_database() AND pid <> pg_backend_pid() AND {condition}"
        )
    )


def settle(db: HubDatabase, condition: str, done=lambda: False) -> None:
    """Poll until a backend of the hub's database meets `condition`, or `done()` says the other side
    already finished. Not a fixed sleep: on a loaded machine `docker exec` can take longer than any
    sleep to start psql, and the command would then insert FIRST — the opposite race."""
    deadline = time.monotonic() + SETTLE_TIMEOUT
    while time.monotonic() < deadline:
        if done() or parked(db, condition) > 0:
            return
        time.sleep(0.1)
    raise TimeoutError(f"the hub's database never reached: {condition}")


def race(hub: Hub, db: HubDatabase, user_id: str, command: tuple[str, dict]) -> dict:
    """The other person's link runs first and stays uncommitted; the command arrives; it commits."""
    other = OpenLink(db, hub.hub_id, user_id, "First")
    answer: dict = {"first_id": other.member_id}
    try:
        settle(db, "state LIKE 'idle in transaction%'")

        def call():
            answer["status"], answer["body"] = hub.command(*command)

        worker = threading.Thread(target=call, daemon=True)
        worker.start()
        # The command's insert/update queues on the index behind the open link — or, unqueued,
        # has already answered (and the battery reads a race that did not happen: `waited` False).
        settle(db, "wait_event_type = 'Lock'", done=lambda: not worker.is_alive())
        answer["waited"] = worker.is_alive()
        answer["first_error"] = other.commit()
        worker.join(timeout=60)
        if worker.is_alive():
            raise AssertionError(
                f"{command[0]} never answered after the first link committed"
            )
        return answer
    finally:
        other.kill()


def code_of(answer: dict):
    body = answer.get("body")
    if not isinstance(body, dict):
        return None
    err = body.get("error") or {}
    return body.get("code") if isinstance(err, str) else err.get("code")


def live_holders(db: HubDatabase, hub_id: str, user_id: str) -> list[str]:
    out = db.scalar(
        "SELECT string_agg(first_name, ',' ORDER BY first_name COLLATE \"C\") FROM staff_member "
        f"WHERE hub_id = '{hub_id}' AND user_id = '{user_id}' AND is_deleted = 0"
    )
    return out.split(",") if out else []


def prove_hub_database(hub: Hub, db: HubDatabase) -> None:
    """The handed-over database holds the member THIS run just created through `/api/command`,
    under this hub's id. Racing on any other database would prove nothing."""
    probe = hub.run("staff.members.create", payload("Probe"))["new_ids"][0]
    found = db.scalar(
        f"SELECT count(*) FROM staff_member WHERE id = '{probe}' AND hub_id = '{hub.hub_id}'"
    )
    if found != "1":
        raise AssertionError(
            f"ERPLORA_HUB_PSQL does not open this hub's database: member {probe} → {found!r}"
        )


def test_1_two_creates_at_once(hub: Hub, db: HubDatabase) -> None:
    print(
        "\n1 · two new records for the same user at once → the second is told why, not `db`"
    )
    user = f"hub-user-c-{TAG}"
    answer = race(hub, db, user, ("staff.members.create", payload("Second", user)))
    hub.check("the first link committed", answer["first_error"], "")
    hub.check(
        "the second create WAITED on the index (the race happened)",
        answer["waited"],
        True,
    )
    hub.check(
        "the second create is refused by name, not with `db`",
        [answer["status"] != 200, code_of(answer)],
        [True, CODE],
    )
    hub.check(
        "only the first record holds the user",
        live_holders(db, hub.hub_id, user),
        [f"First-{TAG}"],
    )


def test_2_an_edit_and_a_create_at_once(hub: Hub, db: HubDatabase) -> None:
    print(
        "\n2 · editing a record onto a user while another record takes it → told why, not `db`"
    )
    user = f"hub-user-u-{TAG}"
    cris = hub.run("staff.members.create", payload("Cris"))["new_ids"][0]
    answer = race(
        hub, db, user, ("staff.members.update", {"staff_id": cris, "user_id": user})
    )
    hub.check("the first link committed", answer["first_error"], "")
    hub.check(
        "the edit WAITED on the index (the race happened)", answer["waited"], True
    )
    hub.check(
        "the edit is refused by name, not with `db`",
        [answer["status"] != 200, code_of(answer)],
        [True, CODE],
    )
    hub.check(
        "only the first record holds the user",
        live_holders(db, hub.hub_id, user),
        [f"First-{TAG}"],
    )
    hub.check(
        "Cris is still without a user",
        hub.query("staff.members.get", {"staff_id": cris})[0]["user_id"],
        None,
    )


def main() -> int:
    # Before the hub: a battery without the database has nothing to race on.
    db = HubDatabase.from_env()
    hub = Hub("user_link_race.hub", needs=("staff",))
    prove_hub_database(hub, db)
    for test in (test_1_two_creates_at_once, test_2_an_edit_and_a_create_at_once):
        try:
            test(hub, db)
        except (AssertionError, TimeoutError) as exc:
            hub.failures.append(f"{test.__name__}: {exc}")
            print(f"  FAIL: {exc}")
    return hub.finish("two links of one Hub user at once: the loser is told why")


if __name__ == "__main__":
    sys.exit(main())
