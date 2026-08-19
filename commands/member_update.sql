-- Edición de miembro del staff. Runtime inyecta :hub_id, :current_user_id, :now.
-- Portado de StaffService.update_staff_member. Patrón COALESCE: un bind NULL deja el valor
-- actual sin tocar (parcial), salvo los campos siempre presentes que el SDK normaliza.
--
-- El rol, si viene, tiene que ser de ESTE hub (staff#12): mismo criterio que el alta — vivo,
-- activo y del `:hub_id` inyectado. Dos centinelas, como `user_id` (staff#4): NULL = «no lo
-- toques» (parcial); '' = QUITAR el rol (sin él la ficha no podía perder nunca su rol desde la
-- pantalla). `status` nunca puede ser `terminated` por aquí: lo prohíbe el schema — la baja es
-- solo `staff.members.delete`.
--
-- Si el miembro no es de este hub, o el rol no resuelve, la sentencia no afecta ninguna fila y el
-- `expect_rows` del command revierte —ni fila ni evento— con `staff.member_update_rejected`
-- (hub#139). El código nombra las DOS causas a propósito: uno que solo hablara del rol mentiría
-- cuando lo que falla es el miembro.
UPDATE staff_member
SET first_name      = COALESCE(:first_name, first_name),
    last_name       = COALESCE(:last_name, last_name),
    email           = COALESCE(:email, email),
    phone           = COALESCE(:phone, phone),
    role_id         = CASE WHEN COALESCE(:role_id, '__keep__') = '__keep__' THEN role_id
                           WHEN :role_id = ''                               THEN NULL
                           ELSE :role_id END,
    employee_id     = COALESCE(:employee_id, employee_id),
    color           = COALESCE(:color, color),
    booking_buffer  = COALESCE(:booking_buffer, booking_buffer),
    -- Vínculo con el usuario del Hub (ADR-0192). NULL = «no lo toques» (parcial); '' = DESVINCULAR.
    -- Hacen falta dos centinelas porque COALESCE ya usa NULL para «sin cambio».
    -- El COALESCE contra un literal de texto NO es adorno: le da a Postgres el tipo del bind. Con
    -- `:user_id IS NULL` a secas, PG no lo infiere y un NULL revienta con 42P08 («could not
    -- determine data type of parameter») — el mismo 42P08 que ya nos mordió en las migraciones.
    user_id         = CASE WHEN COALESCE(:user_id, '__keep__') = '__keep__' THEN user_id
                           WHEN :user_id = ''                               THEN NULL
                           ELSE :user_id END,
    status          = COALESCE(:status, status),
    hire_date       = COALESCE(:hire_date, hire_date),
    hourly_rate     = COALESCE(:hourly_rate, hourly_rate),
    commission_rate = COALESCE(:commission_rate, commission_rate),
    is_bookable     = COALESCE(:is_bookable, is_bookable),
    bio             = COALESCE(:bio, bio),
    specialties     = COALESCE(:specialties, specialties),
    notes           = COALESCE(:notes, notes),
    updated_by      = :current_user_id,
    updated_at      = :now
WHERE id = :staff_id AND hub_id = :hub_id AND is_deleted = 0
  AND (COALESCE(:role_id, '') = ''
       OR EXISTS (
            SELECT 1 FROM staff_role r
            WHERE r.id = :role_id AND r.hub_id = :hub_id AND r.is_deleted = 0 AND r.is_active = 1
          ));
