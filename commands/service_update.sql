-- Edit a competency row (overrides, primary flag, active flag) by id (staff#9). Full snapshot:
-- the UI sends every field, so NULL in `custom_duration`/`custom_price` CLEARS the override (no
-- COALESCE sentinel needed here). Hub-scoped: a row of another hub affects 0 rows and
-- `expect_rows` answers `staff.service_not_found`. Runtime injects :hub_id, :current_user_id, :now.
UPDATE staff_service
SET custom_duration = :custom_duration,
    custom_price    = :custom_price,
    is_primary      = COALESCE(:is_primary, is_primary),
    is_active       = COALESCE(:is_active, is_active),
    updated_by      = :current_user_id,
    updated_at      = :now
WHERE id = :id AND hub_id = :hub_id AND is_deleted = 0;
