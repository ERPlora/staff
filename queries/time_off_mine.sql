-- SELF-SERVICE (staff#19): the absences of the CALLER, with reason and notes — what they wrote
-- themselves. Runtime injects :hub_id and :current_user_id; the member is resolved through
-- `staff_member.user_id` (ADR-0192) in THIS hub, so `staff.view_time_off` (every employee has it)
-- is enough: no other row can come out.
SELECT t.id, t.staff_id, t.leave_type, t.start_date, t.end_date, t.is_full_day,
       t.start_time, t.end_time, t.status, t.approved_by, t.approved_at, t.reason, t.notes,
       t.created_at
FROM staff_time_off t
JOIN staff_member m ON m.id = t.staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
  AND m.user_id = :current_user_id
ORDER BY t.start_date DESC, t.created_at DESC;
