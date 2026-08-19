-- Soft-delete every working-hour row of a template (staff#2): the first step of «replace the
-- week» in `staff.schedules.update` (WASM intention) and of `staff.schedules.delete`. Hub-scoped
-- through the template. The unique index (schedule_id, day_of_week) keeps the rows: the following
-- `_insert_working_hours` REVIVES them by upsert. Runtime injects :hub_id, :current_user_id, :now.
UPDATE staff_working_hours w
SET is_deleted = 1,
    deleted_at = :now,
    updated_by = :current_user_id,
    updated_at = :now
WHERE w.hub_id = :hub_id AND w.is_deleted = 0
  AND EXISTS (
        SELECT 1 FROM staff_schedule s
        WHERE s.id = w.schedule_id AND s.id = :schedule_id AND s.hub_id = :hub_id AND s.is_deleted = 0
      );
