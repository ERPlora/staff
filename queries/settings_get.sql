-- Configuración singleton de staff del hub. Runtime inyecta :hub_id.
--
-- staff#51: las dos horas salen en HH:MM, la forma que promete el rótulo del campo. La migración
-- 004 normaliza las filas vivas y `settings_update` normaliza lo que se guarda, pero un seed de
-- blueprint sectorial escribe sus horas DIRECTAMENTE en la tabla (`09:30:00`) desde otro repo, así
-- que el recorte se hace también aquí: la pantalla enseña HH:MM venga la fila de donde venga.
SELECT id,
       substr(default_work_start, 1, 5) AS default_work_start,
       substr(default_work_end, 1, 5)   AS default_work_end,
       default_break_duration,
       min_advance_booking, max_daily_hours, overtime_threshold,
       show_staff_photos, show_staff_bio, allow_staff_selection,
       notify_new_appointment, notify_cancellation
FROM staff_settings
WHERE hub_id = :hub_id AND is_deleted = 0
LIMIT 1;
