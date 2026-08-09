-- Asegura que este hub TIENE su fila de ajustes antes de actualizarla (staff#13).
-- Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
--
-- Un hub instalado SIN blueprint no tiene fila en `staff_settings`. El `UPDATE` de
-- `settings_update.sql` tocaba entonces 0 filas, el runtime daba el command por bueno, salía
-- `staff.settings.updated` y la query de ajustes seguía vacía. La pantalla pintaba los defaults del
-- schema —que se parecen exactamente a unos valores guardados—, así que el negocio creía haber
-- configurado algo que nunca se escribió, y lo seguía creyendo tras cada recarga.
--
-- No se listan las columnas de ajuste a propósito: así toman el DEFAULT de la tabla, que es la
-- única fuente de esos valores. Repetirlos aquí los tendría en dos sitios y acabarían divergiendo.
--
-- `ON CONFLICT (hub_id) DO NOTHING` se apoya en el índice único `uq_staff_settings_hub`, y hace la
-- operación idempotente y a prueba de carrera: si dos guardados entran a la vez, uno crea y el otro
-- sigue su camino. El UPDATE que va después es el que aplica lo que pidió el llamante.
INSERT INTO staff_settings
  (id, hub_id, is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, 0, :current_user_id, :current_user_id, :now, :now)
ON CONFLICT (hub_id) DO NOTHING;
