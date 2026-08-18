-- Ausencias `pending|approved` de UN miembro cuyo rango [start_date, end_date] se solapa con el
-- rango pedido (solapan si NO (existing_end < :start_date OR existing_start > :end_date) — regla
-- legacy `conflicts_with`). Runtime inyecta :hub_id.
--
-- Es la lectura AUTORITATIVA del handler `create_time_off` (staff#1, ADR-0069): el runtime la
-- precarga en `context.reads` filtrada por el payload y el handler rechaza con
-- `staff.overlapping_time_off` si devuelve filas. El NOT EXISTS de `_insert_time_off.sql` repite
-- la misma condición solo como defensa en profundidad (carrera entre la lectura y la escritura).
SELECT t.id, t.status, t.start_date, t.end_date
FROM staff_time_off t
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
  AND t.staff_id = :staff_id
  AND t.status IN ('pending', 'approved')
  AND NOT (t.end_date < :start_date OR t.start_date > :end_date)
ORDER BY t.start_date ASC;
