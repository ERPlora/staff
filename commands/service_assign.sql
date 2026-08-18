-- Assign a service (competency) to a staff member (staff#9). Runtime injects :new_id, :hub_id,
-- :current_user_id, :now.
--
-- `service_id` is an OPAQUE reference to `services.*` (no cross-module FK/JOIN, ADR-0069 style):
-- the UI resolves the catalogue through `services.services.list` and sends id + name snapshot.
--
-- Cross-tenant seam closed here (pm#89): `staff_service` joins two GLOBAL ids, so the INSERT is an
-- INSERT … SELECT that only writes when the member belongs to THIS hub and is alive. Otherwise it
-- affects 0 rows and `expect_rows` reverts the transaction with `staff.service_assign_rejected`.
--
-- Idempotent: the unique index (staff_id, service_id) turns a repeat into an UPSERT that revives a
-- removed row (soft-delete → live) and applies the new snapshot/overrides. Without this, «remove,
-- then assign again» — the most common correction at the desk — would crash on the index.
INSERT INTO staff_service
  (id, hub_id, staff_id, service_id, service_name, custom_duration, custom_price,
   is_primary, is_active, is_deleted, deleted_at, created_by, updated_by, created_at, updated_at)
SELECT
  :new_id, :hub_id, m.id, :service_id, :service_name, :custom_duration, :custom_price,
  COALESCE(:is_primary, 0), 1, 0, NULL, :current_user_id, :current_user_id, :now, :now
FROM staff_member m
WHERE m.id = :staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
ON CONFLICT (staff_id, service_id) DO UPDATE
SET service_name    = EXCLUDED.service_name,
    custom_duration = EXCLUDED.custom_duration,
    custom_price    = EXCLUDED.custom_price,
    is_primary      = EXCLUDED.is_primary,
    is_active       = 1,
    is_deleted      = 0,
    deleted_at      = NULL,
    updated_by      = EXCLUDED.updated_by,
    updated_at      = EXCLUDED.updated_at
WHERE staff_service.hub_id = EXCLUDED.hub_id;
