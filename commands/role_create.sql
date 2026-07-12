-- Alta de rol de staff. Runtime inyecta :new_id, :hub_id, :current_user_id, :now.
-- Portado de StaffService.create_role.
INSERT INTO staff_role
  (id, hub_id, name, description, color, "order", is_active,
   is_deleted, created_by, updated_by, created_at, updated_at)
-- GUARDARRAÍL QA (2026-06-25): el binder del runtime no aplica los defaults del JSON Schema
-- (gap sistémico P0); COALESCE espeja los defaults del schema para el alta mínima.
VALUES
  (:new_id, :hub_id, :name, COALESCE(:description, ''), COALESCE(:color, ''), COALESCE(:order, 0), 1,
   0, :current_user_id, :current_user_id, :now, :now);
