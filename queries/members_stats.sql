-- Métricas de plantilla del hub (una fila) para el dashboard. Runtime inyecta :hub_id y :now.
-- Alimenta los widgets KPI/stat "Plantilla activa", "Ausentes hoy" y "Ausencias pendientes".
-- Sin mocks: todo sale de staff_member y staff_time_off reales.
-- - total_members / active_members / on_leave_members: por status del miembro (no borrado).
-- - on_leave_today: miembros activos con una ausencia APROBADA cuyo rango cubre HOY (erp_date(:now)).
-- - pending_time_off: solicitudes de ausencia en estado 'pending' (no borradas).
-- erp_date normaliza el texto ISO a la parte fecha de forma portable (SQLite/Postgres, ADR-0007 §4a).
SELECT
    COALESCE(SUM(CASE WHEN m.status <> 'terminated' THEN 1 ELSE 0 END), 0) AS total_members,
    COALESCE(SUM(CASE WHEN m.status = 'active'      THEN 1 ELSE 0 END), 0) AS active_members,
    COALESCE(SUM(CASE WHEN m.status = 'on_leave'    THEN 1 ELSE 0 END), 0) AS on_leave_members,
    (SELECT COUNT(DISTINCT t.staff_id)
       FROM staff_time_off t
       JOIN staff_member tm ON tm.id = t.staff_id AND tm.is_deleted = 0
      WHERE t.hub_id = :hub_id AND t.is_deleted = 0 AND t.status = 'approved'
        AND erp_date(t.start_date) <= erp_date(:now)
        AND erp_date(t.end_date)   >= erp_date(:now)) AS on_leave_today,
    (SELECT COUNT(*)
       FROM staff_time_off p
      WHERE p.hub_id = :hub_id AND p.is_deleted = 0 AND p.status = 'pending') AS pending_time_off
FROM staff_member m
WHERE m.hub_id = :hub_id AND m.is_deleted = 0;
