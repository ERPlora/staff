-- Desmarca los horarios default existentes de un miembro (solo un default por
-- miembro, WASM-TODO §3). Intención previa a `_insert_schedule` cuando el nuevo
-- horario llega con is_default = 1; corre en la misma transacción.
-- Runtime inyecta :hub_id, :current_user_id, :now; el handler aporta :staff_id.
UPDATE staff_schedule
SET is_default = 0,
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id AND staff_id = :staff_id AND is_deleted = 0 AND is_default = 1;
