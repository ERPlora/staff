-- Only ONE primary service per member (staff#9). Runs before `service_assign` /
-- `service_update` in the same transaction: when the incoming row is primary, demote the
-- member's other primaries. Runtime injects :hub_id, :current_user_id, :now.
--
-- The demotion is gated on the SAME condition the write needs (the member exists in this hub, or
-- the row exists in this hub): otherwise this statement could affect a row while the write affects
-- none, and the sum would slip past `expect_rows` (the runtime gates on the total).
UPDATE staff_service
SET is_primary = 0,
    updated_by = :current_user_id,
    updated_at = :now
WHERE hub_id = :hub_id
  AND is_deleted = 0
  AND is_primary = 1
  AND COALESCE(:is_primary, 0) = 1
  AND staff_id = COALESCE(
        NULLIF(:staff_id, ''),
        (SELECT t.staff_id FROM staff_service t WHERE t.id = :id AND t.hub_id = :hub_id AND t.is_deleted = 0)
      )
  -- The incoming row itself is left alone (the write sets its flag). COALESCE gives PG the bind type.
  AND (COALESCE(:service_id, '') = '' OR service_id <> :service_id)
  AND (COALESCE(:id, '') = '' OR id <> :id)
  AND EXISTS (
        SELECT 1 FROM staff_member m
        WHERE m.id = staff_service.staff_id AND m.hub_id = :hub_id AND m.is_deleted = 0
      );
