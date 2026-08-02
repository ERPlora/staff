-- Miembros del staff del hub (con filtros opcionales). Runtime inyecta :hub_id.
-- Portado de StaffService.list_staff. Los binds opcionales usan '' = sin filtro.
-- :is_bookable acepta -1 (= sin filtro) | 0 | 1. El filtro de búsqueda (:search) hace
-- match por nombre/apellido. Por defecto excluye terminados salvo que se pida explícito.
SELECT m.id, m.first_name, m.last_name,
       (m.first_name || ' ' || m.last_name) AS full_name,
       m.email, m.phone, m.role_id, m.user_id, r.name AS role_name,
       m.status, m.is_bookable, m.hire_date,
       m.hourly_rate, m.commission_rate, m.color, m."order"
FROM staff_member m
LEFT JOIN staff_role r ON r.id = m.role_id AND r.is_deleted = 0
WHERE m.hub_id = :hub_id AND m.is_deleted = 0
