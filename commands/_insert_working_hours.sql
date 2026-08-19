-- Working hours of ONE weekday inside a template — intention of the WASM handlers
-- `create_schedule` / `update_schedule` (one op per day). INSERT … SELECT with guard: only when
-- the parent template exists in THIS hub (inserted in this same transaction, or being edited).
-- UPSERT on (schedule_id, day_of_week) (staff#2): «replace the week» retires every row first
-- (`_retire_working_hours`) and this revives the day with its new times — the unique index makes
-- a plain re-INSERT impossible. Runtime injects :hub_id, :current_user_id, :now.
INSERT INTO staff_working_hours
  (id, hub_id, schedule_id, day_of_week, start_time, end_time, break_start, break_end,
   is_working, is_deleted, deleted_at, created_by, updated_by, created_at, updated_at)
SELECT
  :wh_id, :hub_id, s.id, :day_of_week, :start_time, :end_time, :break_start, :break_end,
  :is_working, 0, NULL, :current_user_id, :current_user_id, :now, :now
FROM staff_schedule s
WHERE s.id = :schedule_id AND s.hub_id = :hub_id AND s.is_deleted = 0
ON CONFLICT (schedule_id, day_of_week) DO UPDATE
SET start_time  = EXCLUDED.start_time,
    end_time    = EXCLUDED.end_time,
    break_start = EXCLUDED.break_start,
    break_end   = EXCLUDED.break_end,
    is_working  = EXCLUDED.is_working,
    is_deleted  = 0,
    deleted_at  = NULL,
    updated_by  = EXCLUDED.updated_by,
    updated_at  = EXCLUDED.updated_at
WHERE staff_working_hours.hub_id = EXCLUDED.hub_id;
