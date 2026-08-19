-- Terminate a member (staff#4): the ONLY road to `terminated` — create/update refuse that status in
-- their schema. Logical: NO hard delete (payroll, schedules, absences reference the row; the audit
-- trail must survive). Runtime injects :hub_id, :current_user_id, :now.
--
-- `termination_date`: the payload date if given, else TODAY derived from `:now` (the runtime injects
-- no `:today`, so the previous `COALESCE(termination_date, :today)` stamped nothing). `reason` is
-- kept in `termination_reason` (migration 002). Un-books the member.
--
-- Hub-scoped and live-only: a foreign or already terminated member affects 0 rows and
-- `expect_rows` answers `staff.member_not_found` instead of a silent «done».
UPDATE staff_member
SET status             = 'terminated',
    is_bookable        = 0,
    termination_date   = COALESCE(NULLIF(:termination_date, ''), SUBSTR(CAST(:now AS TEXT), 1, 10)),
    termination_reason = COALESCE(:reason, ''),
    is_deleted         = 1,
    deleted_at         = :now,
    updated_by         = :current_user_id,
    updated_at         = :now
WHERE id = :staff_id AND hub_id = :hub_id AND is_deleted = 0;
