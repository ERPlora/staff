-- Desactivación (≠ terminación) de un miembro — intención del handler WASM
-- `deactivate_staff_member` (WASM-TODO §1). El guest no toca la BD, así que las
-- guardas con estado van aquí (patrón payment_gateways/kitchen): si el miembro no
-- existe, ya está inactive/terminated, o tiene ausencias pending|approved con
-- end_date >= hoy, el UPDATE es un no-op de 0 filas.
-- The runtime injects :hub_id, :current_user_id, :now and :timezone; the handler brings :staff_id.
-- «Today» is `:now` on the business clock (staff#58, hub#1022) — the same expression as the read
-- `staff.time_off.active_for_member` the handler decides on, so guard and defence cannot disagree
-- between local midnight and 02:00.
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
          AND erp_date(t.end_date) >= CAST(CAST(CAST(:now AS TEXT) AS timestamptz) AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date)
      );
