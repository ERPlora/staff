-- PUBLIC contract for booking (staff#9): the professionals ELIGIBLE to perform :service_id in
-- this hub. Appointments / Online Booking consume it via `reads` (ADR-0069, staff is in their
-- `depends_on`) to filter the staff picker and to refuse an invalid service↔professional pair
-- authoritatively. Runtime injects :hub_id.
--
-- Eligible = live, `active`, bookable member with a live, active competency for the service.
-- Carries the per-professional overrides so the caller can compute the slot length/price.
SELECT m.id AS staff_id,
       (m.first_name || ' ' || m.last_name) AS full_name,
       m.color, m.booking_buffer,
       s.custom_duration, s.custom_price, s.is_primary
FROM staff_service s
JOIN staff_member m ON m.id = s.staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
WHERE s.hub_id = :hub_id AND s.is_deleted = 0 AND s.is_active = 1
  AND s.service_id = :service_id
  AND m.status = 'active' AND m.is_bookable = 1
ORDER BY s.is_primary DESC, m."order" ASC, full_name ASC;
