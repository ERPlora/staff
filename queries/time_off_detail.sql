-- DETALLE de una ausencia: el motivo y las notas. Runtime inyecta :hub_id.
--
-- `reason`/`notes` son la razón por la que alguien falta —una baja médica lo es— y salían en
-- `staff.time_off.list`, que abre `staff.view_time_off` y que `employee` tiene por defecto: la
-- plantilla entera leía el motivo de la ausencia de cualquiera (staff#10). Aquí van detrás de
-- `staff.view_time_off_detail`, que solo tienen admin y manager.
--
-- :time_off_id = '' → todas; con valor → una sola solicitud.
SELECT t.id, t.staff_id,
       (m.first_name || ' ' || m.last_name) AS staff_name,
       t.leave_type, t.start_date, t.end_date, t.is_full_day,
       t.start_time, t.end_time, t.status, t.approved_by, t.approved_at,
       t.reason, t.notes
FROM staff_time_off t
JOIN staff_member m ON m.id = t.staff_id AND m.is_deleted = 0 AND m.hub_id = :hub_id
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
  AND (:time_off_id = '' OR t.id = :time_off_id)
ORDER BY t.start_date DESC;
