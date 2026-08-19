-- EFFECTIVE availability of a professional (staff#2): for each day in [:date_from, :date_to]
-- (ISO dates, inclusive) the intervals they can actually work = intervals of the GOVERNING
-- template that day (split around the break) MINUS approved absences. Runtime injects :hub_id.
--
-- This is the PUBLIC contract Appointments / Online Booking read via `reads` (ADR-0069, staff is
-- in their depends_on) to refuse a booking outside the day of the professional or during their leave.
-- It knows nothing about the business timezone (hub#1022) nor about existing appointments: it
-- answers «when could this person work», the caller intersects with the rest.
--
-- Governing template of a day: live + active, `effective_from/until` covering the day (NULL/''
-- = open), preferring a SPECIFIC template (is_default = 0) over the default, then the most
-- recent `effective_from`, then the newest row — deterministic, no «ambiguous defaults».
--
-- Subtraction: boundary points = piece start/end + partial-absence start/end falling inside the
-- piece; consecutive points form segments; a segment survives if no approved absence covers it.
-- Times are HH:MM:SS TEXT (lexicographic order is chronological). Postgres-only module (no
-- sqlite migrations), so generate_series / window functions are fair game.
WITH days AS (
  SELECT CAST(d AS date) AS day
  FROM generate_series(erp_date(:date_from), erp_date(:date_to), interval '1 day') AS d
),
governing AS (
  SELECT days.day,
         (SELECT s.id
            FROM staff_schedule s
           WHERE s.hub_id = :hub_id AND s.is_deleted = 0 AND s.is_active = 1
             AND s.staff_id = :staff_id
             AND (COALESCE(s.effective_from, '') = ''  OR erp_date(s.effective_from)  <= days.day)
             AND (COALESCE(s.effective_until, '') = '' OR erp_date(s.effective_until) >= days.day)
           ORDER BY s.is_default ASC, COALESCE(s.effective_from, '') DESC, s.created_at DESC
           LIMIT 1) AS schedule_id
  FROM days
  JOIN staff_member m ON m.id = :staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
),
pieces AS (
  SELECT g.day, g.schedule_id, w.start_time AS s, COALESCE(w.break_start, w.end_time) AS e
  FROM governing g
  JOIN staff_working_hours w ON w.schedule_id = g.schedule_id AND w.hub_id = :hub_id
       AND w.is_deleted = 0 AND w.is_working = 1 AND w.day_of_week = erp_dow_mon0(g.day)
  UNION ALL
  SELECT g.day, g.schedule_id, w.break_end, w.end_time
  FROM governing g
  JOIN staff_working_hours w ON w.schedule_id = g.schedule_id AND w.hub_id = :hub_id
       AND w.is_deleted = 0 AND w.is_working = 1 AND w.day_of_week = erp_dow_mon0(g.day)
       AND w.break_start IS NOT NULL AND w.break_end IS NOT NULL
),
off AS (
  SELECT o.hub_id, erp_date(o.start_date) AS d0, erp_date(o.end_date) AS d1, o.is_full_day,
         o.start_time AS ts, o.end_time AS te
  FROM staff_time_off o
  WHERE o.hub_id = :hub_id AND o.is_deleted = 0 AND o.staff_id = :staff_id
    AND o.status = 'approved'
    AND erp_date(o.end_date) >= erp_date(:date_from) AND erp_date(o.start_date) <= erp_date(:date_to)
),
bounds AS (
  SELECT p.day, p.schedule_id, p.s, p.e, p.s AS pt FROM pieces p
  UNION
  SELECT p.day, p.schedule_id, p.s, p.e, p.e FROM pieces p
  UNION
  SELECT p.day, p.schedule_id, p.s, p.e, o.ts
  FROM pieces p JOIN off o ON o.hub_id = :hub_id AND p.day BETWEEN o.d0 AND o.d1 AND o.is_full_day = 0
   AND o.ts > p.s AND o.ts < p.e
  UNION
  SELECT p.day, p.schedule_id, p.s, p.e, o.te
  FROM pieces p JOIN off o ON o.hub_id = :hub_id AND p.day BETWEEN o.d0 AND o.d1 AND o.is_full_day = 0
   AND o.te > p.s AND o.te < p.e
),
segments AS (
  SELECT day, schedule_id, s, e, pt AS seg_start,
         LEAD(pt) OVER (PARTITION BY day, schedule_id, s, e ORDER BY pt) AS seg_end
  FROM bounds
)
SELECT CAST(g.day AS TEXT) AS day, g.schedule_id, g.seg_start AS start_time, g.seg_end AS end_time
FROM segments g
WHERE g.seg_end IS NOT NULL
  AND NOT EXISTS (
        SELECT 1 FROM off o
        WHERE g.day BETWEEN o.d0 AND o.d1
          AND (o.is_full_day = 1 OR (o.ts < g.seg_end AND o.te > g.seg_start))
      )
ORDER BY day ASC, start_time ASC;
