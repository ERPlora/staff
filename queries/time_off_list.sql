-- Ausencias del hub, vista OPERATIVA: quién no está y cuándo (con filtros opcionales).
-- Runtime inyecta :hub_id.
--
-- SIN `reason` ni `notes`: son el motivo de la ausencia —bajas médicas incluidas— y esta query la
-- abre `staff.view_time_off`, que `employee` tiene por defecto (staff#10). El detalle vive en
-- `staff.time_off.detail`, detrás de `staff.view_time_off_detail`.
-- :staff_id = '' sin filtro; :status = '' sin filtro.
SELECT t.id, t.staff_id,
       (m.first_name || ' ' || m.last_name) AS staff_name,
       t.leave_type, t.start_date, t.end_date, t.is_full_day,
       t.start_time, t.end_time, t.status, t.approved_by, t.approved_at
FROM staff_time_off t
JOIN staff_member m ON m.id = t.staff_id AND m.is_deleted = 0
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
