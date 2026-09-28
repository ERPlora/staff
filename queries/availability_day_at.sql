-- The professional's DAY at an instant (appointments#98): the material a booking door needs to
-- decide «does this person work then?», keyed by what a command payload actually carries —
-- `:staff_id` and an instant `:at` — because `reads.params` binds literal `payload.<field>` values
-- only and cannot derive `staff.availability.for_member`'s `:date_from`/`:date_to`.
--
-- The day is the BUSINESS day of `:at`: read on `:timezone` (the hub's IANA zone, injected by the
-- runtime in every query, hub#1022; '' → UTC, the runtime's own fallback). Same idiom as
-- `time_off_active_for_member.sql`. Runtime injects :hub_id.
--
-- It answers with the material, not a verdict — the caller owns the booking's end:
--   kind = 'day'   always exactly one row: the day + the GOVERNING template (NULL = no template
--                  governs that day → nothing configured, the caller must not refuse on shifts);
--   kind = 'shift' one per working piece of that template that day, split around the break;
--   kind = 'off'   one per APPROVED absence covering the day (`is_full_day`, else its times).
--
-- «Governing» is `availability_for_member.sql`'s rule verbatim (live + active, validity covering the
-- day, specific beats default, newest `effective_from`, newest row) and the two are pinned to agree
-- by tests/availability_day_at.postgres.test.py. Times are HH:MM:SS TEXT.
WITH d AS (
  SELECT CAST(CAST(CAST(:at AS TEXT) AS timestamptz)
              AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date) AS day
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
ORDER BY kind ASC, start_time ASC;
