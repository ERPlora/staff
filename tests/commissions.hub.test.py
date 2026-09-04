#!/usr/bin/env python3
"""The commission side of the per-professional day close, against the REAL kernel — ported from the
hub's `crates/runtime/tests/staff_commissions_e2e.rs` (ERPlora/hub#1264, contract «El Hub se CIERRA
como KERNEL» §5: the module proves its own behaviour; the hub keeps only the conformance of its
fixture). Closes ERPlora/staff#48.

`staff.commissions.summary` is the RATE side: for every member who can earn one today, their
`staff_id`, `full_name` and `commission_rate` (a percentage, 0..100). The GROSS side lives in
another module — `sales.by_staff` — and the two never JOIN: `staff` does not read `sales_sale` and
`sales` does not read `staff_member` (no cross-module JOIN, ADR-0007). They meet on ONE shared key,
`staff_id` = `staff_member.id`, and the day close is the caller that crosses them:

    commission = sales.by_staff.gross_total x staff.commissions.summary.commission_rate / 100

That seam is what this battery exists for, and it is why the tests live here and not in a scratch
Postgres: the key is minted by the RUNTIME when `staff.members.create` runs, and it only becomes a
join key when the SAME id comes back out of a sale that `sales.complete_sale` wrote. A harness that
binds `:hub_id` itself and inserts its own rows can assert the arithmetic, but never the identity —
which is exactly the hole ERPlora/staff#48 reported: the hub e2e stated the crossing with

    let by_staff_gross_cents: i64 = 10000;
    assert_eq!(by_staff_gross_cents, by_staff_gross_cents);  // gross corresponde a ese staff_id

a line that compares a variable with ITSELF, never touches `sales`, and passes whatever the code
does. Here the gross is READ from `sales.by_staff` after charging real sales, the rate is READ from
`staff.commissions.summary`, and the commission they produce is compared against an amount worked
out independently from the prices this battery charged.

  1. The rate side: every ACTIVE member is in the summary with their own rate — a zero rate
     included (the day close lists them all) — and whoever cannot earn a commission today
     (terminated, inactive) is NOT, in `full_name` order. Ports
     `commissions_summary_returns_rate_per_active_member`.
  2. The seam: two sales attributed to a real member give `sales.by_staff` a gross of 50,00 € under
     that member's own id, and 15 % of it is 7,50 € — the value ERPlora/staff#48 asked for.
     Replaces `commission_amount_combines_with_sales_by_staff`.
  3. The key discriminates: each professional's gross is HERS (not the pair's), a member who sold
     nothing has no gross at all, and a member who has left keeps their sales on the `sales` side
     while dropping off the commission side — so the close pays them nothing more.

`install_registers_commissions_query` (the third test of the e2e) is not ported as a case of its
own: that installing a manifest registers every surface it declares is a KERNEL guarantee, and the
hub proves it for ANY module in `kernel_conformance_install::installing_registers_every_declared_surface_hub1238`.
Here it is proven functionally instead — every query below is reached through `POST /api/query`,
which cannot answer at all unless installing `staff` registered it.

Usage: `erplora test <dir> --against-hub [dev|stable|sha256:…]` (module-toolkit#110), with `taxes`
and `sales` installed alongside by hand — see `hub_harness.py`. Never on its own: without a runtime
it fails, it does not skip.
"""

import sys
import uuid

import hub_harness
from hub_harness import (
    Hub,
    by_staff,
    cash_method_id,
    cents,
    commission_cents,
    commissions,
    create_member,
    day_gross_by_person,
    person_index,
    service_sale,
    terminate_member,
)


def test_1_the_rate_side_is_every_member_who_can_earn_one(hub: Hub) -> None:
    print("\n1 · the summary carries every ACTIVE member's rate, and nobody else's")
    tag = uuid.uuid4().hex[:6]
    # Same suffix on every name, so the leading letter is what decides `ORDER BY full_name`.
    ana = create_member(hub, f"Ana-{tag}", "Pro", 15.0)
    beto = create_member(hub, f"Beto-{tag}", "Pro", 10.0)
    # Caro is born ACTIVE and is then let go: `terminated` is unreachable from the create schema,
    # the termination is its own door with a date and a reason. So the test walks the real road.
    caro = create_member(hub, f"Caro-{tag}", "Pro", 20.0)
    terminate_member(hub, caro, "battery: off the payroll")
    dani = create_member(hub, f"Dani-{tag}", "Pro", 0.0, status="inactive")
    # A rate of ZERO is not a reason to hide anybody: the close lists them with 0 % so the sheet
    # shows every professional of the day, earning or not (`commissions_summary.sql` says so).
    eva = create_member(hub, f"Eva-{tag}", "Pro", 0.0)

    rows = {r["staff_id"]: r for r in commissions(hub)}
    hub.check("Ana is on the sheet with her 15 %", (rows.get(ana) or {}).get("commission_rate"), 15.0)
    hub.check("Beto is on the sheet with his 10 %", (rows.get(beto) or {}).get("commission_rate"), 10.0)
    hub.check("Eva earns 0 % and is on the sheet all the same", (rows.get(eva) or {}).get("commission_rate"), 0.0)
    hub.check("Ana's name comes out composed", (rows.get(ana) or {}).get("full_name"), f"Ana-{tag} Pro")
    hub.check_true("a terminated member is off the sheet", caro not in rows, f"{caro} is still there")
    hub.check_true("an inactive member is off the sheet", dani not in rows, f"{dani} is still there")

    # `ORDER BY full_name ASC`: the run's own members, in the order the sheet returned them.
    mine = [r["full_name"] for r in commissions(hub) if r["full_name"].endswith(f"-{tag} Pro")]
    hub.check("the sheet is sorted by name", mine, sorted(mine))
    hub.check("and it holds exactly the three who can earn today", len(mine), 3)


def test_2_the_close_crosses_gross_with_rate(hub: Hub, cash: str) -> None:
    print("\n2 · gross from `sales`, rate from `staff`, crossed on the staff_id (staff#48)")
    tag = uuid.uuid4().hex[:6]
    nora = create_member(hub, f"Nora-{tag}", "Pro", 15.0)

    # What the day is worth, decided HERE and never read back from anything under test.
    price_cut, price_colour = 2000, 3000
    expected_gross = price_cut + price_colour            # 20,00 € + 30,00 € = 50,00 €
    expected_commission = 750                            # 15 % of 50,00 € = 7,50 €, worked out by hand
    service_sale(hub, cash, nora, price_cut, "nora-cut")
    service_sale(hub, cash, nora, price_colour, "nora-colour")

    gross_side = by_staff(hub).get(nora)
    hub.check_true(
        "the sales side knows Nora by the id the runtime minted for her",
        gross_side is not None,
        f"{nora} is not in sales.by_staff",
    )
    if gross_side is None:
        return
    hub.check("both her sales are counted", gross_side.get("sales_count"), 2)
    hub.check("her gross is what she charged", cents(gross_side.get("gross_total")), expected_gross)

    rate_side = next((r for r in commissions(hub) if r["staff_id"] == nora), None)
    hub.check_true(
        "the staff side knows her by the SAME id — the two sides meet on it",
        rate_side is not None,
        f"{nora} is not in staff.commissions.summary",
    )
    if rate_side is None:
        return
    hub.check("her rate is the one she was hired at", rate_side.get("commission_rate"), 15.0)

    # The one number the day close computes, from the two live queries and nothing else.
    hub.check(
        "her commission for the day is 7,50 €",
        commission_cents(cents(gross_side["gross_total"]), rate_side["commission_rate"]),
        expected_commission,
    )


def test_3_the_key_discriminates(hub: Hub, cash: str) -> None:
    print("\n3 · the gross is HERS: one professional's day is not another's, and a leaver earns no more")
    tag = uuid.uuid4().hex[:6]
    sells = create_member(hub, f"Sara-{tag}", "Pro", 10.0)
    idle = create_member(hub, f"Tere-{tag}", "Pro", 40.0)
    leaver = create_member(hub, f"Ursu-{tag}", "Pro", 50.0)

    service_sale(hub, cash, sells, 1000, "sara")
    service_sale(hub, cash, leaver, 4000, "ursu")
    terminate_member(hub, leaver, "battery: left mid-month")

    gross = by_staff(hub)
    rates = {r["staff_id"]: r for r in commissions(hub)}

    hub.check("Sara's gross is her own sale, not the pair's", cents((gross.get(sells) or {}).get("gross_total", 0)), 1000)
    hub.check(
        "and her commission is 10 % of it",
        commission_cents(cents(gross[sells]["gross_total"]), rates[sells]["commission_rate"]),
        100,
    )
    # Tere never sold: `sales.by_staff` GROUPs over sales, so a professional with none has no row —
    # the close reads no gross for her and computes no commission, however high her rate.
    hub.check_true("a professional who sold nothing has no gross", idle not in gross, str(gross.get(idle)))
    hub.check("but she is still on the sheet, at her rate", (rates.get(idle) or {}).get("commission_rate"), 40.0)
    # Ursu left. Her sales are a fact of `sales` and stay put; what goes is her side of the seam, so
    # the close finds a gross with no rate to pay it against.
    hub.check("what a leaver sold stays on the sales side", cents((gross.get(leaver) or {}).get("gross_total", 0)), 4000)
    hub.check_true("but she is off the commission sheet", leaver not in rates, f"{leaver} is still there")


def test_4_one_person_is_not_two(hub: Hub, cash: str) -> None:
    """staff#46 — the same human being reaches `sales.by_staff` under TWO ids and gets paid ONE day.

    Since sales#179 no sale is left unattributed: the server puts `payload.staff_id` on the sale
    when somebody was named (a cita, a chosen professional) and `context.current_user_id` — the
    HUB USER of the till — on every counter sale. A stylist who takes an appointment in the morning
    and charges at the counter in the afternoon therefore shows up twice, under her `staff_member.id`
    and under her `hub_user.id`, and the day close crossing on `staff_id` alone paid her only the
    half that carried a staff record. Her record already says which user she is (`user_id`,
    ADR-0192); the sheet just did not publish it.
    """
    print("\n4 · one person, two ids: the counter half of the day is hers too (staff#46)")
    tag = uuid.uuid4().hex[:6]
    # Vera IS the user this run is logged in as: her record hangs from that hub user, which is what
    # every counter sale of this session will be attributed to.
    vera = create_member(hub, f"Vera-{tag}", "Pro", 15.0, user_id=hub.user)

    price_appointment, price_counter = 2000, 3000
    expected_gross = price_appointment + price_counter   # 20,00 € + 30,00 € = 50,00 €
    expected_commission = 750                            # 15 % of 50,00 €, worked out by hand
    service_sale(hub, cash, vera, price_appointment, "vera-appointment")
    # No `staff_id` in the payload: this is the counter, and the runtime attributes it to the user
    # with the session. Nothing here names Vera — that is the whole point.
    service_sale(hub, cash, None, price_counter, "vera-counter")

    gross = by_staff(hub)
    hub.check(
        "the appointment landed under her staff id",
        cents((gross.get(vera) or {}).get("gross_total", 0)),
        price_appointment,
    )
    hub.check(
        "and the counter sale landed under the hub user, not under her record",
        cents((gross.get(hub.user) or {}).get("gross_total", 0)),
        price_counter,
    )

    sheet = commissions(hub)
    rate_side = next((r for r in sheet if r["staff_id"] == vera), None)
    hub.check_true(
        "the sheet carries her record",
        rate_side is not None,
        f"{vera} is not in staff.commissions.summary",
    )
    if rate_side is None:
        return
    # The fix: the sheet publishes the second id, so the close can recognise the till as her.
    hub.check("the sheet says which hub user she is", rate_side.get("user_id"), hub.user)
    hub.check_true(
        "so both of her ids resolve to the same professional",
        person_index(sheet).get(hub.user, {}).get("staff_id") == vera,
        f"the till id {hub.user} does not resolve to {vera}",
    )

    day = day_gross_by_person(sheet, gross)
    hub.check("her day is added up once, whole", day.get(vera), expected_gross)
    hub.check(
        "and her commission is the whole day's, not the half with a staff record",
        commission_cents(day[vera], rate_side["commission_rate"]),
        expected_commission,
    )
    hub.check_true(
        "the till stops being a professional of its own on the sheet",
        hub.user not in {r["staff_id"] for r in sheet},
        "the hub user is listed as if it were a staff record",
    )


def test_5_a_till_with_no_record_earns_nothing_still(hub: Hub, cash: str) -> None:
    """The other half of staff#46: a hub user with NO staff record is not folded into anybody.

    This is not a regression to fix, it is the behaviour to keep: before sales#179 that sale did not
    even appear in the report (the query filtered `staff_id IS NULL`). Now it appears, and it must
    stay unpaid — folding it into someone would invent a commission.
    """
    print("\n5 · a till nobody claimed is folded into nobody")
    sheet = commissions(hub)
    # A brand-new session id: no staff record in this hub hangs from it.
    orphan_till = f"u-{uuid.uuid4().hex[:8]}"
    gross_rows = {orphan_till: {"gross_total": 9900}}
    hub.check("an unclaimed till adds to no professional", day_gross_by_person(sheet, gross_rows), {})
    hub.check_true(
        "and it is not on the commission sheet either",
        orphan_till not in {r["staff_id"] for r in sheet},
        f"{orphan_till} appeared as a professional",
    )


def main() -> int:
    hub = Hub("commissions.hub")
    print(
        f"Hub battery · commissions (hub#1264 <- staff_commissions_e2e.rs, staff#48) · "
        f"{hub_harness.BASE} · hub {hub.hub_id} · user {hub.user}"
    )
    cash = cash_method_id(hub)
    test_1_the_rate_side_is_every_member_who_can_earn_one(hub)
    test_2_the_close_crosses_gross_with_rate(hub, cash)
    test_3_the_key_discriminates(hub, cash)
    test_4_one_person_is_not_two(hub, cash)
    test_5_a_till_with_no_record_earns_nothing_still(hub, cash)
    return hub.finish(
        "the day close crosses a real gross with a real rate on the staff_id, against the real "
        "kernel — and a professional who sells both ways is paid one day, not two halves"
    )


if __name__ == "__main__":
    sys.exit(main())
