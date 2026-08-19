-- Working-hour intervals of EVERY live template of a staff member (staff#2). Runtime injects
-- :hub_id. One row per (schedule, weekday); the UI groups by `schedule_id`. Hub-scoped through
-- the template AND the member (two GLOBAL ids, so both carry the hub).
SELECT w.id, w.schedule_id, w.day_of_week, w.start_time, w.end_time, w.break_start, w.break_end,
       w.is_working
FROM staff_working_hours w
JOIN staff_schedule s ON s.id = w.schedule_id AND s.hub_id = :hub_id AND s.is_deleted = 0
JOIN staff_member  m ON m.id = s.staff_id     AND m.hub_id = :hub_id AND m.is_deleted = 0
WHERE w.hub_id = :hub_id AND w.is_deleted = 0 AND s.staff_id = :staff_id
ORDER BY s.is_default DESC, s.name ASC, w.day_of_week ASC, w.start_time ASC;
