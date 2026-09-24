-- Métricas de plantilla del hub (una fila) para el dashboard. Runtime inyecta :hub_id, :now y
-- :timezone (the hub's resolved IANA zone, hub#1022).
-- Alimenta los widgets KPI/stat "Plantilla activa", "Ausentes hoy" y "Ausencias pendientes".
-- Sin mocks: todo sale de staff_member y staff_time_off reales.
-- - total_members / active_members / on_leave_members: por status del miembro (no borrado).
-- - on_leave_today: members with an APPROVED leave covering TODAY on the business clock —
--   `:now` read in `:timezone`, never its UTC date part, which between local midnight and 02:00
--   still answered yesterday (staff#58; same idiom as sales#323/invoice#78). start_date/end_date
--   are local calendar days, so only `:now` moves. The COALESCE degrades to UTC like the runtime.
-- - pending_time_off: solicitudes de ausencia en estado 'pending' (no borradas).
-- erp_date normaliza el texto ISO a la parte fecha de forma portable (SQLite/Postgres, ADR-0007 §4a).
SELECT
    COALESCE(SUM(CASE WHEN m.status <> 'terminated' THEN 1 ELSE 0 END), 0) AS total_members,
    COALESCE(SUM(CASE WHEN m.status = 'active'      THEN 1 ELSE 0 END), 0) AS active_members,
    COALESCE(SUM(CASE WHEN m.status = 'on_leave'    THEN 1 ELSE 0 END), 0) AS on_leave_members,
    (SELECT COUNT(DISTINCT t.staff_id)
       FROM staff_time_off t
       JOIN staff_member tm ON tm.id = t.staff_id AND tm.is_deleted = 0 AND tm.hub_id = :hub_id
      WHERE t.hub_id = :hub_id AND t.is_deleted = 0 AND t.status = 'approved'
        AND erp_date(t.start_date) <= CAST(CAST(CAST(:now AS TEXT) AS timestamptz) AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date)
        AND erp_date(t.end_date)   >= CAST(CAST(CAST(:now AS TEXT) AS timestamptz) AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date)) AS on_leave_today,
    (SELECT COUNT(*)
       FROM staff_time_off p
      WHERE p.hub_id = :hub_id AND p.is_deleted = 0 AND p.status = 'pending') AS pending_time_off
FROM staff_member m
WHERE m.hub_id = :hub_id AND m.is_deleted = 0;
