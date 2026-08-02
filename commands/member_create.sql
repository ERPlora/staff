-- Alta de miembro del staff. Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
-- Portado de StaffService.create_staff_member. role_id/hire_date pueden venir NULL.
-- `user_id` = el usuario del Hub (`hub_user`) del que cuelga esta ficha (ADR-0192). NULL o '' =
-- ficha sin acceso al Hub (un profesional que solo aparece en la agenda). Se normaliza a NULL
-- para que la ausencia sea UNA sola cosa en la BD.
INSERT INTO staff_member
  (id, hub_id, first_name, last_name, email, phone, employee_id,
   role_id, user_id, hire_date, status, bio, specialties, is_bookable,
   color, hourly_rate, commission_rate, notes,
   is_deleted, created_by, updated_by, created_at, updated_at)
VALUES
  (:new_id, :hub_id, :first_name, :last_name, :email, :phone, :employee_id,
   :role_id, NULLIF(:user_id, ''), :hire_date, :status, :bio, :specialties, :is_bookable,
   :color, :hourly_rate, :commission_rate, :notes,
   0, :current_user_id, :current_user_id, :now, :now);
