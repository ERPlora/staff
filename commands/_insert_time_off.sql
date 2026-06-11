-- Alta de ausencia `pending` — intención del handler WASM `create_time_off`
-- (WASM-TODO §4). El invariante de solapamiento (regla legacy conflicts_with) va
-- aquí en SQL condicional (el guest no puede leer la BD): solo inserta si el
-- miembro existe Y NO hay otra ausencia pending|approved del miembro cuyo rango
-- [start_date, end_date] se solape con el nuevo (solapan si NO
-- (new_end < existing_start OR new_start > existing_end)). Si solapa → no-op.
-- Runtime inyecta :hub_id, :current_user_id, :now; el resto los aporta el handler.
INSERT INTO staff_time_off
  (id, hub_id, staff_id, leave_type, start_date, end_date, is_full_day, start_time,
   end_time, status, reason, notes, is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
  :time_off_id, :hub_id, m.id, :leave_type, :start_date, :end_date, :is_full_day, :start_time,
  :end_time, 'pending', :reason, :notes, 0, :current_user_id, :current_user_id, :now, :now
FROM staff_member m
WHERE m.id = :staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
  AND NOT EXISTS (
        SELECT 1 FROM staff_time_off t
        WHERE t.hub_id = :hub_id AND t.staff_id = :staff_id AND t.is_deleted = 0
          AND t.status IN ('pending', 'approved')
          AND NOT (t.end_date < :start_date OR t.start_date > :end_date)
      );
