-- SELF-SERVICE (staff#19): the record of the CALLER, with their own compensation. Runtime injects
-- :hub_id and :current_user_id (ARQUITECTURA §2.5, non-spoofable) — the scope is closed by the
-- WHERE, not by a wider permission: `staff.view_staff_member` (every employee has it) is enough
-- because the only row that can come out is the one hanging from the session user (ADR-0192).
-- HR `notes` stay out: they are the employer side of the record, not the employee side.
SELECT m.id, m.first_name, m.last_name,
       (m.first_name || ' ' || m.last_name) AS full_name,
       m.email, m.phone, m.photo, m.employee_id,
       m.role_id, r.name AS role_name, m.user_id,
       m.hire_date, m.termination_date, m.status,
       m.bio, m.specialties, m.is_bookable, m.color, m.booking_buffer,
       m.hourly_rate, m.commission_rate
FROM staff_member m
LEFT JOIN staff_role r ON r.id = m.role_id AND r.is_deleted = 0 AND r.hub_id = :hub_id
WHERE m.hub_id = :hub_id AND m.is_deleted = 0
  AND m.user_id = :current_user_id;
