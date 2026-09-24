-- staff#55 — the live member of THIS hub that holds a Hub user, if any.
--
-- Read that `staff.members.create` / `staff.members.update` pre-load (ADR-0069) to refuse a
-- second link with `staff.user_already_linked`: one Hub user hangs from ONE live member of the
-- business, because the day close indexes the commission sheet by `user_id` (staff#46).
-- An empty or NULL `:user_id` matches nothing (NULLIF), so the read is harmless when the form
-- links nobody. The COALESCE gives Postgres the type of the bind (42P08 otherwise).
-- `uq_staff_member_hub_user` guarantees at most one row; the ORDER BY only makes it deterministic.
SELECT m.id, m.first_name, m.last_name, m.status
FROM staff_member m
WHERE m.hub_id = :hub_id
  AND m.is_deleted = 0
  AND m.user_id = NULLIF(COALESCE(:user_id, ''), '')
ORDER BY m.created_at, m.id
