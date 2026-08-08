-- COMPENSACIÓN por miembro del staff: tarifa hora y % de comisión. Runtime inyecta :hub_id.
--
-- Existe para que el directorio (`staff.members.list`) NO la lleve: aquel lo abre
-- `staff.view_staff_member`, que `employee` tiene por defecto, así que la nómina de toda la
-- plantilla se leía con el permiso de «ver el equipo» (staff#10). Esta va detrás de
-- `staff.view_compensation`, que solo tienen admin y manager.
--
-- :staff_id = '' → toda la plantilla (la pantalla de compensación); con valor → un solo miembro.
SELECT m.id,
       (m.first_name || ' ' || m.last_name) AS full_name,
       m.hourly_rate,
       m.commission_rate
FROM staff_member m
WHERE m.hub_id = :hub_id AND m.is_deleted = 0
  AND (:staff_id = '' OR m.id = :staff_id)
ORDER BY full_name ASC;
