-- Alta de horario — intención del handler WASM `create_schedule` (WASM-TODO §3).
-- INSERT...SELECT con guardia: solo inserta si el miembro existe en este hub (el
-- guest no puede leer la BD); si no, no-op y las working_hours posteriores tampoco
-- casan su guardia. :schedule_id lo reparte el handler desde context.new_ids.
-- Runtime inyecta :hub_id, :current_user_id, :now.
INSERT INTO staff_schedule
  (id, hub_id, staff_id, name, is_default, effective_from, effective_until, is_active,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
  :schedule_id, :hub_id, m.id, :name, :is_default, :effective_from, :effective_until, 1,
  0, :current_user_id, :current_user_id, :now, :now
FROM staff_member m
WHERE m.id = :staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0;
