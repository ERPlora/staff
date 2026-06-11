-- Alta de horas por día dentro de un horario — intención del handler WASM
-- `create_schedule` (WASM-TODO §3, una op por día). INSERT...SELECT con guardia:
-- solo inserta si el horario padre existe (insertado en esta misma transacción).
-- (schedule_id, day_of_week) único lo refuerza el índice uq_staff_working_hours_schedule_day.
-- Runtime inyecta :hub_id, :current_user_id, :now; el resto los aporta el handler.
INSERT INTO staff_working_hours
  (id, hub_id, schedule_id, day_of_week, start_time, end_time, break_start, break_end,
   is_working, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
  :wh_id, :hub_id, s.id, :day_of_week, :start_time, :end_time, :break_start, :break_end,
  :is_working, 0, :current_user_id, :current_user_id, :now, :now
FROM staff_schedule s
WHERE s.id = :schedule_id AND s.hub_id = :hub_id AND s.is_deleted = 0;
