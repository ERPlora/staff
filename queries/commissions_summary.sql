-- Lado de la COMISIÓN para el cierre del día por profesional: por cada miembro activo del staff,
-- su id, nombre y tasa de comisión (`commission_rate`, % 0..100). Runtime inyecta :hub_id.
--
-- Es DATOS DE STAFF SOLAMENTE: NO conoce las ventas (viven en el módulo sales; prohibido el JOIN
-- cross-módulo, ADR-0007/contrato de módulos). El importe de comisión =
-- gross_total × (commission_rate/100) lo compone el llamador (cierre del día) cruzando ESTAS filas
-- con `sales.by_staff` por `staff_id` (= staff_member.id). Seam documentado en architecture/modules/
-- staff.md y sales.md. Se excluyen miembros terminados/inactivos (no atribuyen comisión hoy) y los
-- de comisión 0 NO se filtran (aparecen con rate 0 para que el cierre los liste igual).
SELECT
    m.id                                       AS staff_id,
    (m.first_name || ' ' || m.last_name)       AS full_name,
    m.role_id,
    r.name                                     AS role_name,
    m.commission_rate                          AS commission_rate
FROM staff_member m
LEFT JOIN staff_role r ON r.id = m.role_id AND r.is_deleted = 0 AND r.hub_id = :hub_id
WHERE m.hub_id = :hub_id
  AND m.is_deleted = 0
  AND m.status NOT IN ('terminated', 'inactive')
ORDER BY full_name ASC;
