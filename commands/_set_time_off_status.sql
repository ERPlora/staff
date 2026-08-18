-- Cambio de estado de una solicitud de ausencia — intención del handler WASM `set_time_off_status`
-- (staff#1). La máquina de estados (pending → approved|rejected|cancelled, approved → cancelled,
-- rejected/cancelled terminales) y la revalidación de solapamiento al aprobar las decide el
-- HANDLER sobre `context.reads` (`staff.time_off.detail`, `staff.time_off.conflicts_for`) y las
-- rechaza con un error de dominio: aquí solo llega una transición ya permitida.
-- `status IN ('pending','approved')` es defensa en profundidad: aunque se saltaran el handler, una
-- fila terminal nunca se mueve.
-- Runtime inyecta :hub_id, :current_user_id, :now. Si :status = 'approved' sella el aprobador.
UPDATE staff_time_off
SET status      = :status,
    approved_by = CASE WHEN :status = 'approved' THEN :current_user_id ELSE approved_by END,
    approved_at = CASE WHEN :status = 'approved' THEN :now ELSE approved_at END,
    updated_by  = :current_user_id,
    updated_at  = :now
WHERE id = :time_off_id AND hub_id = :hub_id AND is_deleted = 0
  AND status IN ('pending', 'approved');
