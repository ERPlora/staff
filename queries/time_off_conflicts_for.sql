-- OTRAS ausencias `pending|approved` del MISMO miembro que se solapan con la ausencia :time_off_id
-- (la fila propia se excluye). Runtime inyecta :hub_id.
--
-- Lectura AUTORITATIVA del handler `set_time_off_status` (staff#1): al APROBAR se revalida el
-- solapamiento contra las aprobadas — dos personas no pueden ocupar el mismo hueco dos veces, y
-- entre que se pidió y se aprueba pudo aprobarse otra. El handler ignora las `pending` (la otra
-- la rechazará el responsable) y no mira esta lectura para rechazar/cancelar.
SELECT o.id, o.status, o.start_date, o.end_date
FROM staff_time_off t
JOIN staff_time_off o
  ON o.hub_id = t.hub_id AND o.staff_id = t.staff_id AND o.id <> t.id AND o.is_deleted = 0
 AND o.status IN ('pending', 'approved')
 AND NOT (o.end_date < t.start_date OR o.start_date > t.end_date)
WHERE t.hub_id = :hub_id AND t.is_deleted = 0 AND t.id = :time_off_id
ORDER BY o.start_date ASC;
