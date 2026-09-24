-- Ausencias `pending|approved` de UN miembro que aún no han terminado (end_date >= hoy).
-- Runtime inyecta :hub_id, :now y :timezone; «today» is `:now` on the business clock (staff#58,
-- hub#1022), the same expression `_deactivate_member.sql` uses so the read and the write agree.
--
-- Lectura AUTORITATIVA del handler `deactivate_staff_member` (staff#1): con filas, el handler
-- rechaza con `staff.active_time_off` — desactivar a alguien con una ausencia viva la dejaría
-- huérfana. `_deactivate_member.sql` repite la condición como defensa en profundidad.
SELECT t.id, t.status, t.start_date, t.end_date
FROM staff_time_off t
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
  AND t.staff_id = :staff_id
  AND t.status IN ('pending', 'approved')
  AND erp_date(t.end_date) >= CAST(CAST(CAST(:now AS TEXT) AS timestamptz) AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date)
ORDER BY t.start_date ASC;
