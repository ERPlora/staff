-- The COMMISSION side of the per-professional day close: for every active staff member, their
-- id, name and commission rate (`commission_rate`, % 0..100). The runtime injects :hub_id.
--
-- STAFF DATA ONLY: it knows NOTHING about sales (they live in the sales module; the cross-module
-- JOIN is forbidden, ADR-0007 / module contract). The commission amount =
-- gross_total × (commission_rate/100) is composed by the caller (the day close) crossing THESE rows
-- with `sales.by_staff` by `staff_id`. Seam documented in architecture/modules/staff.md and sales.md.
-- Terminated/inactive members are excluded (they earn no commission today) and members with a 0
-- rate are NOT filtered out (they show up with rate 0 so the close lists them all the same).
--
-- THE SAME PERSON ARRIVES UNDER TWO IDS (staff#46). Since sales#179 no sale is left unattributed:
-- `sales_sale.staff_id` is the `staff_member` the appointment names, or the **hub user** of the
-- session in every counter sale. It is an OPAQUE reference to a person, not to a record. That is
-- why the sheet publishes, beside the `staff_id`, the `user_id` the record hangs from (the ADR-0192
-- seam, optional): they are the TWO ids a professional's day can arrive under, and with both of
-- them the close adds it up as one without `staff` reading a sale or `sales` knowing what a record
-- is. Without that second id the counter half matched no rate and the day was paid in halves.
-- `user_id` NULL = a record with no Hub user: nothing to unify (the behaviour there always was).
SELECT
    m.id                                       AS staff_id,
    m.user_id                                  AS user_id,
    (m.first_name || ' ' || m.last_name)       AS full_name,
    m.role_id,
    r.name                                     AS role_name,
    m.commission_rate                          AS commission_rate
FROM staff_member m
LEFT JOIN staff_role r ON r.id = m.role_id AND r.is_deleted = 0 AND r.hub_id = :hub_id
WHERE m.hub_id = :hub_id
  AND m.is_deleted = 0
  AND m.status NOT IN ('terminated', 'inactive')
ORDER BY full_name ASC;
