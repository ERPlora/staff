-- Desactivación (≠ terminación) de un miembro — intención del handler WASM
-- `deactivate_staff_member` (WASM-TODO §1). El guest no toca la BD, así que las
-- guardas con estado van aquí (patrón payment_gateways/kitchen): si el miembro no
-- existe, ya está inactive/terminated, o tiene ausencias pending|approved con
-- end_date >= hoy, el UPDATE es un no-op de 0 filas.
-- Runtime inyecta :hub_id, :current_user_id, :now; el handler aporta :staff_id y :today.
UPDATE staff_member
SET status      = 'inactive',
    is_bookable = 0,
    updated_by  = :current_user_id,
    updated_at  = :now
WHERE id = :staff_id AND hub_id = :hub_id AND is_deleted = 0
  AND status NOT IN ('inactive', 'terminated')
  AND NOT EXISTS (
        SELECT 1 FROM staff_time_off t
        WHERE t.hub_id = :hub_id AND t.staff_id = :staff_id AND t.is_deleted = 0
          AND t.status IN ('pending', 'approved')
          AND t.end_date >= :today
      );
