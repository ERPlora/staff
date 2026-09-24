-- Staff member insert, behind `staff._insert_member` (staff#55): the public `staff.members.create`
-- and `staff.members.bulk_create` are WASM handlers that check the Hub user link first and then
-- emit this intention. `:member_id` is the id the handler took from the host's `context.new_ids`
-- (the only ids the runtime answers the caller with, hub#776); `:new_id` is only the fallback of a
-- direct run (test harness). The runtime injects :hub_id, :current_user_id, :now.
-- Ported from StaffService.create_staff_member. role_id/hire_date may come NULL.
-- `user_id` = el usuario del Hub (`hub_user`) del que cuelga esta ficha (ADR-0192). NULL o '' =
-- ficha sin acceso al Hub (un profesional que solo aparece en la agenda). Se normaliza a NULL
-- para que la ausencia sea UNA sola cosa en la BD.
--
-- El rol, si viene, tiene que ser de ESTE hub (staff#12). La FK apunta a un id GLOBAL, así que sin
-- esta comprobación un `role_id` del hub vecino se guardaba tal cual (y su nombre privado salía en
-- la lista hasta que #27 puso el hub en el JOIN). `role_id` es OPCIONAL: NULL o '' es legítimo
-- (miembro sin rol), de ahí las dos ramas de la condición. Se exige además vivo y activo: un rol
-- borrado o retirado no se asigna a nadie nuevo.
--
-- Si el rol no resuelve, la sentencia no afecta ninguna fila. Eso NO es un éxito silencioso: el
-- command declara `expect_rows: {op: min, n: 1}`, así que el runtime revierte la transacción entera
-- —ni fila ni evento— y devuelve `staff.role_not_found` (hub#139).
--
-- El COALESCE contra '' NO es adorno: le da a Postgres el tipo del bind. Con `:role_id IS NULL` a
-- secas un NULL revienta con 42P08 («could not determine data type of parameter»).
INSERT INTO staff_member
  (id, hub_id, first_name, last_name, email, phone, employee_id,
   role_id, user_id, hire_date, status, bio, specialties, is_bookable,
   color, hourly_rate, commission_rate, notes,
   is_deleted, created_by, updated_by, created_at, updated_at)
SELECT
   COALESCE(:member_id, :new_id), :hub_id, :first_name, :last_name, :email, :phone, :employee_id,
   NULLIF(:role_id, ''), NULLIF(:user_id, ''), :hire_date, :status, :bio, :specialties, :is_bookable,
   :color, :hourly_rate, :commission_rate, :notes,
   0, :current_user_id, :current_user_id, :now, :now
WHERE COALESCE(:role_id, '') = ''
   OR EXISTS (
        SELECT 1 FROM staff_role r
        WHERE r.id = :role_id AND r.hub_id = :hub_id AND r.is_deleted = 0 AND r.is_active = 1
      );
