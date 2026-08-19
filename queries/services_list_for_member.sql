-- Competencies (services performed) of ONE staff member (staff#9). Runtime injects :hub_id.
-- Live rows only; the member is resolved in THIS hub (the member id of a neighbour returns nothing).
SELECT s.id, s.staff_id, s.service_id, s.service_name, s.custom_duration, s.custom_price,
       s.is_primary, s.is_active
FROM staff_service s
JOIN staff_member m ON m.id = s.staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
WHERE s.hub_id = :hub_id AND s.is_deleted = 0 AND s.staff_id = :staff_id
ORDER BY s.is_primary DESC, s.service_name ASC;
