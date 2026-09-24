-- staff#55 — one Hub user hangs from ONE live member of the business, guaranteed by the database.
--
-- `staff.members.create` / `staff.members.update` refuse a second link with
-- `staff.user_already_linked` (handler, over the read `staff.members.by_user`). This index is the
-- same rule for every other door and for the race between that read and the write: whoever gets
-- there second fails instead of splitting the counter's takings between two members (staff#46).
--
-- Partial: members without a user are many and legal, and a deleted member is history — its user
-- may be linked again. `005_member_user_link_dedupe.sql` runs first and leaves the hubs that
-- already had duplicates with a single holder, so the build cannot fail on them.
--
-- Additive (`expand`): the previous version of the module keeps working over it — its writes only
-- differ in that a duplicate link now fails instead of being stored. Undoing it is dropping the
-- index; no row depends on it.
CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_member_hub_user
    ON staff_member (hub_id, user_id)
 WHERE user_id IS NOT NULL AND user_id <> '' AND is_deleted = 0;
