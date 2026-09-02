-- Actualiza la configuración singleton de staff del hub. Runtime inyecta :hub_id,
-- :current_user_id, :now. Patrón COALESCE para actualización parcial.
-- El alta inicial del singleton (cuando aún no existe fila) la hace el runtime/seed.
--
-- staff#51: las dos horas se guardan SIEMPRE en HH:MM — la forma que promete su rótulo y la que usa
-- el resto del producto. El `pattern` del schema sigue aceptando HH:MM:SS a propósito (un cliente
-- viejo, el asistente o una llamada a mano no se llevan un 422), así que el recorte va aquí: entre
-- rechazar y normalizar, se normaliza. `substr(x, 1, 5)` es portable (SQLite y Postgres) y es un
-- no-op sobre un valor que ya viene en HH:MM. Se aplica también cuando el parámetro llega NULL, así
-- que un guardado parcial converge la fila vieja en vez de dejarla a medias.
UPDATE staff_settings
SET default_work_start     = substr(COALESCE(:default_work_start, default_work_start), 1, 5),
    default_work_end       = substr(COALESCE(:default_work_end, default_work_end), 1, 5),
    default_break_duration = COALESCE(:default_break_duration, default_break_duration),
    min_advance_booking    = COALESCE(:min_advance_booking, min_advance_booking),
    max_daily_hours        = COALESCE(:max_daily_hours, max_daily_hours),
    overtime_threshold     = COALESCE(:overtime_threshold, overtime_threshold),
    show_staff_photos      = COALESCE(:show_staff_photos, show_staff_photos),
    show_staff_bio         = COALESCE(:show_staff_bio, show_staff_bio),
    allow_staff_selection  = COALESCE(:allow_staff_selection, allow_staff_selection),
    notify_new_appointment = COALESCE(:notify_new_appointment, notify_new_appointment),
    notify_cancellation    = COALESCE(:notify_cancellation, notify_cancellation),
    updated_by             = :current_user_id,
    updated_at             = :now
WHERE hub_id = :hub_id AND is_deleted = 0;
