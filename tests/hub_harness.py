"""Plumbing shared by the `*.hub.test.py` batteries — the ones that talk to a REAL kernel.

`erplora test <dir> --against-hub` (module-toolkit#110) starts the published hub image with its own
Postgres, installs the module through `POST /api/modules/install` and hands the url over in
`ERPLORA_HUB_BASE_URL`. Everything below is the thin layer between a battery and that runtime: the
two doors (`/api/query`, `/api/command`), and the one piece of bookkeeping every battery needs — a
`check()` that RECORDS a failure instead of dying on it, so a red run names EVERY broken assertion
and not just the first.

Why HTTP and not a scratch Postgres: these batteries replace the hub's own `staff_commissions_e2e.rs`
(ERPlora/hub#1264, contract «El Hub se CIERRA como KERNEL» §5). What they assert is the SEAM between
two modules — `sales.by_staff` (gross per professional) crossed with `staff.commissions.summary`
(rate per professional) by `staff_id` — and a seam has no meaning without both modules installed in
one runtime, minting the ids and running the commands. The `*.postgres.test.py` batteries next door
keep proving this module's SQL in isolation; these prove it against the kernel that runs it, next to
the module it has to agree with.

⚠️ `staff` declares NO `depends_on` (the seam is a shared KEY, not a dependency: `sales` never reads
`staff_member` and `staff` never reads `sales_sale` — no cross-module JOIN, ADR-0007). So
`--against-hub` mounts `staff` alone and `taxes`+`sales` have to be installed BY HAND alongside it
through the same door. Same gap `customers` hit in ERPlora/hub#1264 slice 7; module-toolkit#135 does
not cover it, because it resolves the manifest's own `depends_on` and there is nothing to resolve
here. Until there is a way to declare «this module must be installed for my test, though I do not
depend on it in production», the `hub` family runs by hand (module-toolkit#112: the gate does not
run it either — it reports it as NOT RUN, never as a false green).

Two facts of the runtime a battery has to know, both resolved here so no battery hard-codes them:

  * THE TENANT. Module seeds (the payment-method catalogue, the tax rules) land under the RUNTIME's
    own `hub_id`, not under whatever `X-Hub-Id` a request carries (that is how hub#594 was found).
    `GET /api/hub/context` says which id that is, and every request goes out under it — a battery
    sending `local` would see a hub with no payment methods and `complete_sale` would refuse every
    sale with `sales.payment_method_required`.
  * THE SESSION USER. Dev auth trusts `X-User-Id`. Each run mints its own, because batteries share
    one hub for the length of the run and `sales.by_staff` attributes an UNNAMED sale to the session
    user (sales#196): a fixed id would count another battery's sales as this one's.

It refuses to skip. Without a runtime a battery FAILS: a check that excuses itself is the green that
proves nothing this whole toolkit exists to remove (module-toolkit#50).
"""

import json
import os
import sys
import urllib.error
import urllib.request
import uuid
from decimal import ROUND_HALF_UP, Decimal

BASE = (
    os.environ.get("STAFF_HUB_BASE_URL") or os.environ.get("ERPLORA_HUB_BASE_URL") or ""
).rstrip("/")

# Quantities travel in 10^6 fixed point (ADR-0147); money in integer cents (ADR-0007/0123).
ONE = 1_000_000


def cents(value) -> int:
    """A money aggregate the way Postgres hands it back: `SUM(bigint)` is NUMERIC, so a total may
    arrive as a JSON string (`"5000"`) instead of a number. Either form is the same cents."""
    if isinstance(value, bool):
        raise AssertionError(f"not a money amount: {value!r}")
    if isinstance(value, (int, float)):
        return int(round(value))
    if isinstance(value, str):
        return int(round(float(value)))
    raise AssertionError(f"not a money amount: {value!r}")


def commission_cents(gross_cents: int, commission_rate) -> int:
    """The seam's arithmetic, in ONE place: commission = gross x rate / 100, rounded HALF_UP to the
    cent (ADR-0123 — money never carries a fraction of a cent, and the rounding is stated, not left
    to whatever the platform's float does at the .5 boundary). `commission_rate` is a percentage
    0..100 as `staff.commissions.summary` reports it; `gross_cents` is `gross_total` as
    `sales.by_staff` reports it."""
    gross = Decimal(int(gross_cents))
    rate = Decimal(str(commission_rate))
    return int((gross * rate / Decimal(100)).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


class Hub:
    """One battery's view of the live runtime."""

    def __init__(self, battery: str, needs: tuple[str, ...] = ("taxes", "sales", "staff")):
        self.battery = battery
        self.failures: list[str] = []
        if not BASE:
            print(f"{battery}: no runtime at the other end (ERPLORA_HUB_BASE_URL is empty).")
            print(
                "Run it with `erplora test <dir> --against-hub`; without a hub this is NOT a skip, "
                "it is a failure."
            )
            sys.exit(1)
        self.user = f"u-{uuid.uuid4().hex[:8]}"
        self.hub_id = self._runtime_hub_id()
        self._require_installed(needs)

    # ── transport ────────────────────────────────────────────────────────────────────────

    def _request(self, method: str, path: str, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(
            f"{BASE}{path}",
            data=data,
            headers={
                "content-type": "application/json",
                "x-hub-id": self.hub_id,
                "x-user-id": self.user,
            },
            method=method,
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as res:
                return res.status, json.loads(res.read().decode() or "null")
        except urllib.error.HTTPError as err:
            raw = err.read().decode()
            try:
                return err.code, json.loads(raw or "null")
            except json.JSONDecodeError:
                return err.code, {"raw": raw}

    def _runtime_hub_id(self) -> str:
        req = urllib.request.Request(f"{BASE}/api/hub/context", method="GET")
        with urllib.request.urlopen(req, timeout=60) as res:
            body = json.loads(res.read().decode())
        hub_id = body.get("hub_id")
        if not hub_id:
            print(f"{self.battery}: GET /api/hub/context did not say the hub_id: {body}")
            sys.exit(1)
        return hub_id

    def _require_installed(self, needs: tuple[str, ...]) -> None:
        status, body = self._request("GET", "/api/modules")
        installed = {m["id"] for m in (body or {}).get("data", [])} if status == 200 else set()
        missing = [m for m in needs if m not in installed]
        if missing:
            print(
                f"{self.battery}: the runtime at {BASE} does not have {missing} installed "
                f"(installed: {sorted(installed)}). `staff` declares no `depends_on`, so the "
                "modules on the OTHER side of the seam have to be installed by hand through the "
                "same door before it. Not a skip: nothing below can be trusted without them."
            )
            sys.exit(1)

    # ── the two doors ────────────────────────────────────────────────────────────────────

    def query(self, name: str, params: dict | None = None) -> list:
        """Rows of a query. A query with a `list` block answers `{rows,total,…}`; the rest answer the
        bare array. Both come back as the list of rows."""
        status, body = self._request("POST", "/api/query", {"name": name, "params": params or {}})
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"query {name} answered {status}: {body}")
        data = body["data"]
        if isinstance(data, dict) and "rows" in data:
            return data["rows"]
        return data

    def command(self, name: str, payload: dict):
        """`(status, body)` of a command, whatever the runtime answered."""
        return self._request("POST", "/api/command", {"name": name, "payload": payload})

    def run(self, name: str, payload: dict) -> dict:
        """A command that MUST succeed. Its `data` (`operations`, `new_ids`, …)."""
        status, body = self.command(name, payload)
        if status != 200 or not (body or {}).get("ok"):
            raise AssertionError(f"command {name} answered {status}: {body}")
        return body["data"]

    # ── bookkeeping ──────────────────────────────────────────────────────────────────────

    def check(self, label: str, got, want) -> None:
        if got != want:
            self.failures.append(f"{label} — expected [{want!r}], got [{got!r}]")
            print(f"  FAIL: {label} — expected [{want!r}], got [{got!r}]")
        else:
            print(f"  ok: {label} = {got!r}")

    def check_true(self, label: str, condition: bool, detail="") -> None:
        if not condition:
            self.failures.append(f"{label} — {detail}" if detail else label)
            print(f"  FAIL: {label} {detail}")
        else:
            print(f"  ok: {label}")

    def finish(self, verdict: str) -> int:
        print()
        if self.failures:
            print(f"✗ {self.battery}: {len(self.failures)} failure(s):")
            for f in self.failures:
                print(f"  - {f}")
            return 1
        print(f"✓ {self.battery}: {verdict}")
        return 0


def cash_method_id(hub: Hub) -> str:
    """Id of the CASH method from the hub's seeded catalogue, through the public query — never
    composed by hand, so the battery is not tied to how `sales` builds its ids (sales#20: «the client
    proposes, the server disposes» — `complete_sale` demands a `payment_method_id` that IS in the
    catalogue). `sales` must be installed."""
    rows = hub.query("sales.payment_methods")
    cash = next((r for r in rows if r.get("type") == "cash"), None)
    if cash is None:
        raise AssertionError(f"the hub's catalogue must carry the `cash` method: {rows}")
    return cash["id"]


def key(tag: str) -> str:
    """A charge-attempt key unique to THIS run (sales#20's `idempotency_key`, min. 8 chars)."""
    return f"staff-battery-{tag}-{uuid.uuid4().hex[:8]}"


def create_member(
    hub: Hub, first: str, last: str, commission_rate: float, status="active", user_id=None
) -> str:
    """A staff member through the module's own door, and the id the RUNTIME minted for them — which
    is the `staff_id` the whole seam is keyed on. The payload is complete on purpose: the command's
    SQL binds every column, so a field left out binds NULL (see the module's `member_create.sql`).

    `user_id` is the hub user the record hangs from (ADR-0192, optional). It is the SECOND id the
    same person's day can arrive under: since sales#179 a counter sale is attributed to the user of
    the session, not to a staff record (staff#46)."""
    out = hub.run(
        "staff.members.create",
        {
            "user_id": user_id,
            "first_name": first,
            "last_name": last,
            "email": "",
            "phone": "",
            "employee_id": "",
            "role_id": None,
            "hire_date": None,
            "status": status,
            "bio": "",
            "specialties": "",
            "is_bookable": 1,
            "color": "",
            "hourly_rate": 0,
            "commission_rate": commission_rate,
            "notes": "",
        },
    )
    return out["new_ids"][0]


def terminate_member(hub: Hub, staff_id: str, reason: str) -> None:
    """Off the payroll through the door that does it for real (`staff.members.delete`: date, reason,
    soft-delete and event). `status = 'terminated'` is unreachable from create/update by schema."""
    hub.run(
        "staff.members.delete",
        {"staff_id": staff_id, "termination_date": "2026-08-19", "reason": reason},
    )


def service_sale(hub: Hub, cash: str, staff_id: str | None, price_cents: int, tag: str) -> str:
    """One completed service sale of `price_cents` (tax included), attributed to `staff_id` when
    given. Returns the sale id. This is the only way `sales.by_staff` gets a row: the gross a
    professional brought in is the total of the sales the RUNTIME wrote for them."""
    payload = {
        "idempotency_key": key(tag),
        "payment_method_id": cash,
        "tax_included": True,
        "amount_tendered": 0,
        "items": [
            {
                "product_name": "Servicio",
                "price": price_cents,
                "quantity": ONE,
                "tax_rate": 21.0,
                "is_service": True,
            }
        ],
    }
    if staff_id is not None:
        payload["staff_id"] = staff_id
    return hub.run("sales.complete_sale", payload)["new_ids"][0]


def by_staff(hub: Hub) -> dict:
    """`sales.by_staff` over a range wide enough to hold this run, keyed by `staff_id`."""
    rows = hub.query("sales.by_staff", {"date_from": "2020-01-01", "date_to": "2099-12-31"})
    return {r["staff_id"]: r for r in rows}


def commissions(hub: Hub) -> list:
    """`staff.commissions.summary` as the day close reads it: every ACTIVE member, in its order."""
    return hub.query("staff.commissions.summary")


def person_index(sheet: list) -> dict:
    """The day close's own index (staff#46), built from NOTHING but the commission sheet: EVERY id a
    person can be attributed under → their row. A member's `staff_id` is one; the `user_id` their
    record hangs from is the other, and it is the one a counter sale arrives under since sales#179.
    Folding on this index is what stops a professional's day being paid in halves."""
    index = {}
    for row in sheet:
        index[row["staff_id"]] = row
        if row.get("user_id"):
            index[row["user_id"]] = row
    return index


def day_gross_by_person(sheet: list, gross_rows: dict) -> dict:
    """`sales.by_staff` folded onto people: `{staff_id: gross_cents}` where every id that names the
    same person has been added together. Ids the sheet does not know (a hub user with no staff
    record, a member who has left) are left out — there is no rate to pay them against, which is
    exactly what happened before sales#179 too."""
    index = person_index(sheet)
    day: dict = {}
    for attributed_to, row in gross_rows.items():
        person = index.get(attributed_to)
        if person is None:
            continue
        day[person["staff_id"]] = day.get(person["staff_id"], 0) + cents(row["gross_total"])
    return day
