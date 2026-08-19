-- Retire a schedule template (soft-delete), hub-scoped (staff#2). Its hours were retired by the
-- preceding `_retire_working_hours` in the same transaction. 0 rows (foreign / already retired) →
-- `expect_rows` → `staff.schedule_not_found`. Runtime injects :hub_id, :current_user_id, :now.
UPDATE staff_schedule
SET is_deleted = 1,
    deleted_at = :now,
    is_active  = 0,
    is_default = 0,
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :schedule_id AND hub_id = :hub_id AND is_deleted = 0;
