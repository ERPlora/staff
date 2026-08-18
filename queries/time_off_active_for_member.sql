-- Ausencias `pending|approved` de UN miembro que aún no han terminado (end_date >= hoy).
-- Runtime inyecta :hub_id y :now; erp_date normaliza a la parte fecha (ADR-0007 §4a).
--
-- Lectura AUTORITATIVA del handler `deactivate_staff_member` (staff#1): con filas, el handler
-- rechaza con `staff.active_time_off` — desactivar a alguien con una ausencia viva la dejaría
-- huérfana. `_deactivate_member.sql` repite la condición como defensa en profundidad.
SELECT t.id, t.status, t.start_date, t.end_date
FROM staff_time_off t
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
  AND t.staff_id = :staff_id
  AND t.status IN ('pending', 'approved')
  AND erp_date(t.end_date) >= erp_date(:now)
ORDER BY t.start_date ASC;
