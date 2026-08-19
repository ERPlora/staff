-- One schedule template by id, hub-scoped (staff#2). Guard read of `staff.schedules.update`
-- (ADR-0069, required): no row → `staff.schedule_not_found`. Runtime injects :hub_id.
SELECT s.id, s.staff_id, s.name, s.is_default, s.effective_from, s.effective_until, s.is_active
FROM staff_schedule s
JOIN staff_member m ON m.id = s.staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
WHERE s.hub_id = :hub_id AND s.is_deleted = 0 AND s.id = :schedule_id;
