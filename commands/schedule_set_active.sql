-- Activate / deactivate a schedule template, hub-scoped (staff#2). Runtime injects :hub_id,
-- :current_user_id, :now. A template of another hub (or a retired one) affects 0 rows →
-- `expect_rows` → `staff.schedule_not_found`. An inactive template never governs availability.
UPDATE staff_schedule
SET is_active  = :is_active,
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :schedule_id AND hub_id = :hub_id AND is_deleted = 0;
