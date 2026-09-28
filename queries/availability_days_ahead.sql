-- The professional's DAYS from today onwards (appointments#229): what a booking door that books
-- across several days — a batch, a series — needs to decide «does this person work then?» for
-- each date, keyed by what its payload carries: `:staff_id` only. `reads.params` binds literal
-- `payload.<field>` values and neither door has a field naming its N days, so the range is anchored
-- on the BUSINESS day of `:now` on `:timezone` (both injected by the runtime in every query,
-- hub#1022; '' → UTC, the runtime's own fallback) and runs for `:days` days — a literal of the
-- manifest, clamped to [1, 731] so the answer is never empty and never unbounded.
-- Runtime injects :hub_id.
--
-- It is `availability_day_at.sql` repeated over the range, row for row and rule for rule — per
-- day one `day` row (the GOVERNING template, NULL = nothing configured), one `shift` per working
-- piece split around the break, one `off` per APPROVED absence covering the day — so the doors
-- judge every date with the SAME function `create` uses for one. The two are pinned to agree day
-- by day by tests/availability_days_ahead.postgres.test.py: change one, change both.
-- Times are HH:MM:SS TEXT.
WITH today AS (
  SELECT CAST(CAST(CAST(:now AS TEXT) AS timestamptz)
              AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date) AS day
),
d AS (
  SELECT CAST(gs AS date) AS day
  FROM today t,
       generate_series(t.day,
                       t.day + (LEAST(GREATEST(CAST(CAST(:days AS TEXT) AS integer), 1), 731) - 1),
                       interval '1 day') AS gs
),
gov AS (
  SELECT d.day,
         (SELECT s.id
            FROM staff_schedule s
            JOIN staff_member m ON m.id = s.staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
           WHERE s.hub_id = :hub_id AND s.is_deleted = 0 AND s.is_active = 1
             AND s.staff_id = :staff_id
             AND (COALESCE(s.effective_from, '') = ''  OR erp_date(s.effective_from)  <= d.day)
             AND (COALESCE(s.effective_until, '') = '' OR erp_date(s.effective_until) >= d.day)
           ORDER BY s.is_default ASC, COALESCE(s.effective_from, '') DESC, s.created_at DESC
           LIMIT 1) AS schedule_id
  FROM d
)
SELECT 'day' AS kind, CAST(g.day AS TEXT) AS day, CAST(g.schedule_id AS TEXT) AS schedule_id,
       CAST(NULL AS TEXT) AS start_time, CAST(NULL AS TEXT) AS end_time, 0 AS is_full_day
FROM gov g
UNION ALL
SELECT 'shift', CAST(g.day AS TEXT), CAST(g.schedule_id AS TEXT), w.start_time,
       COALESCE(w.break_start, w.end_time), 0
FROM gov g
JOIN staff_working_hours w ON w.schedule_id = g.schedule_id AND w.hub_id = :hub_id
     AND w.is_deleted = 0 AND w.is_working = 1 AND w.day_of_week = erp_dow_mon0(g.day)
UNION ALL
SELECT 'shift', CAST(g.day AS TEXT), CAST(g.schedule_id AS TEXT), w.break_end, w.end_time, 0
FROM gov g
JOIN staff_working_hours w ON w.schedule_id = g.schedule_id AND w.hub_id = :hub_id
     AND w.is_deleted = 0 AND w.is_working = 1 AND w.day_of_week = erp_dow_mon0(g.day)
     AND w.break_start IS NOT NULL AND w.break_end IS NOT NULL
UNION ALL
SELECT 'off', CAST(g.day AS TEXT), CAST(NULL AS TEXT),
       CASE WHEN o.is_full_day = 1 THEN NULL ELSE o.start_time END,
       CASE WHEN o.is_full_day = 1 THEN NULL ELSE o.end_time END,
       o.is_full_day
FROM gov g
JOIN staff_time_off o ON o.hub_id = :hub_id AND o.is_deleted = 0 AND o.staff_id = :staff_id
     AND o.status = 'approved'
     AND g.day BETWEEN erp_date(o.start_date) AND erp_date(o.end_date)
ORDER BY day ASC, kind ASC, start_time ASC;
