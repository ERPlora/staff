-- The whole TEAM's day at an instant (appointments#229): what a door that moves an appointment
-- needs to decide «does its professional work then?», keyed by the instant `:at` ALONE. Moving an
-- appointment never changes who attends, so its payload names the appointment and the new start,
-- not the professional — and `reads.params` binds literal `payload.<field>` values only, so
-- `availability_day_at.sql` (keyed by `:staff_id`) cannot be asked about the appointment's own
-- professional. The door picks the rows of its professional by `staff_id`.
--
-- It is `availability_day_at.sql` for EVERY member row of the hub (deleted members too: `day_at`
-- answers any id it is asked about, and their appointments still exist), row for row and rule for
-- rule, each row carrying its `staff_id` — per member one `day` row (the GOVERNING template, NULL =
-- nothing configured), one `shift` per working piece split around the break, one `off` per
-- APPROVED absence covering the day. The two are pinned to agree member by member by
-- tests/availability_team_day_at.postgres.test.py: change one, change both.
-- The day is the BUSINESS day of `:at` on `:timezone` (hub#1022; '' → UTC); a bare `YYYY-MM-DD`
-- is that day as given. Runtime injects :hub_id. Times are HH:MM:SS TEXT.
WITH d AS (
  SELECT CASE WHEN LENGTH(TRIM(CAST(:at AS TEXT))) = 10
              THEN CAST(TRIM(CAST(:at AS TEXT)) AS date)
              ELSE CAST(CAST(CAST(:at AS TEXT) AS timestamptz)
                        AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date)
         END AS day
),
gov AS (
  SELECT t.id AS staff_id, d.day,
         (SELECT s.id
            FROM staff_schedule s
            JOIN staff_member m ON m.id = s.staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
           WHERE s.hub_id = :hub_id AND s.is_deleted = 0 AND s.is_active = 1
             AND s.staff_id = t.id
             AND (COALESCE(s.effective_from, '') = ''  OR erp_date(s.effective_from)  <= d.day)
             AND (COALESCE(s.effective_until, '') = '' OR erp_date(s.effective_until) >= d.day)
           ORDER BY s.is_default ASC, COALESCE(s.effective_from, '') DESC, s.created_at DESC
           LIMIT 1) AS schedule_id
  FROM staff_member t CROSS JOIN d
  WHERE t.hub_id = :hub_id
)
SELECT 'day' AS kind, CAST(g.staff_id AS TEXT) AS staff_id, CAST(g.day AS TEXT) AS day,
       CAST(g.schedule_id AS TEXT) AS schedule_id,
       CAST(NULL AS TEXT) AS start_time, CAST(NULL AS TEXT) AS end_time, 0 AS is_full_day
FROM gov g
UNION ALL
SELECT 'shift', CAST(g.staff_id AS TEXT), CAST(g.day AS TEXT), CAST(g.schedule_id AS TEXT),
       w.start_time, COALESCE(w.break_start, w.end_time), 0
FROM gov g
JOIN staff_working_hours w ON w.schedule_id = g.schedule_id AND w.hub_id = :hub_id
     AND w.is_deleted = 0 AND w.is_working = 1 AND w.day_of_week = erp_dow_mon0(g.day)
UNION ALL
SELECT 'shift', CAST(g.staff_id AS TEXT), CAST(g.day AS TEXT), CAST(g.schedule_id AS TEXT),
       w.break_end, w.end_time, 0
FROM gov g
JOIN staff_working_hours w ON w.schedule_id = g.schedule_id AND w.hub_id = :hub_id
     AND w.is_deleted = 0 AND w.is_working = 1 AND w.day_of_week = erp_dow_mon0(g.day)
     AND w.break_start IS NOT NULL AND w.break_end IS NOT NULL
UNION ALL
SELECT 'off', CAST(g.staff_id AS TEXT), CAST(g.day AS TEXT), CAST(NULL AS TEXT),
       CASE WHEN o.is_full_day = 1 THEN NULL ELSE o.start_time END,
       CASE WHEN o.is_full_day = 1 THEN NULL ELSE o.end_time END,
       o.is_full_day
FROM gov g
JOIN staff_time_off o ON o.hub_id = :hub_id AND o.is_deleted = 0 AND o.staff_id = g.staff_id
     AND o.status = 'approved'
     AND g.day BETWEEN erp_date(o.start_date) AND erp_date(o.end_date)
ORDER BY staff_id ASC, kind ASC, start_time ASC;
