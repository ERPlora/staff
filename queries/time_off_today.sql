-- Ausencias APROBADAS cuyo rango cubre HOY (quién no está disponible hoy). Una fila por ausencia.
-- Runtime inyecta :hub_id, :now y :timezone. Alimenta el widget timeline "Ausencias de hoy".
-- TODAY is the business day: `:now` read in `:timezone` (hub#1022), never its UTC date part
-- (staff#58). start_date/end_date are local calendar days; the COALESCE degrades to UTC.
-- erp_date normaliza el texto ISO a la parte fecha de forma portable (SQLite/Postgres, ADR-0007 §4a).
-- Sin mocks: sale de staff_time_off (status='approved') unido a staff_member.
-- Sin `reason`: el widget dice QUIÉN no está, nunca por qué (staff#10).
SELECT t.id,
       (m.first_name || ' ' || m.last_name) AS staff_name,
       t.leave_type,
       t.start_date,
       t.end_date,
       t.is_full_day,
       t.start_time,
       t.end_time,
       t.status
FROM staff_time_off t
JOIN staff_member m ON m.id = t.staff_id AND m.is_deleted = 0 AND m.hub_id = :hub_id
WHERE t.hub_id = :hub_id AND t.is_deleted = 0
  AND t.status = 'approved'
  AND erp_date(t.start_date) <= CAST(CAST(CAST(:now AS TEXT) AS timestamptz) AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date)
  AND erp_date(t.end_date)   >= CAST(CAST(CAST(:now AS TEXT) AS timestamptz) AT TIME ZONE COALESCE(NULLIF(TRIM(CAST(:timezone AS TEXT)), ''), 'UTC') AS date)
ORDER BY t.is_full_day DESC, m.first_name ASC;
