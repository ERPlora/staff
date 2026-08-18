-- Retire a competency (soft-delete) by id, hub-scoped (staff#9). A row of another hub, or one
-- already removed, affects 0 rows → `expect_rows` → `staff.service_not_found`.
-- Runtime injects :hub_id, :current_user_id, :now.
UPDATE staff_service
SET is_deleted = 1,
    deleted_at = :now,
    is_active  = 0,
    is_primary = 0,
    updated_by = :current_user_id,
    updated_at = :now
WHERE id = :id AND hub_id = :hub_id AND is_deleted = 0;
