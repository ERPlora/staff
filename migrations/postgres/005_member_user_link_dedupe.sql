-- staff#55 — leave ONE live member per Hub user and hub, so `006` can build its unique index.
--
-- Until staff#55 nothing stopped two members of the same business from being linked to the same
-- Hub user, and since staff#46 the day close indexes the commission sheet by `user_id`: with two
-- holders, what that user charged at the counter went to one of them at random. `006` makes the
-- rule a unique index, and a unique index cannot be built over rows that already break it — the
-- migration would fail and the hub's update with it. This is the plan for those hubs:
--
--   * per (hub, user), the link stays on ONE live member: the ACTIVE one first (the person who
--     works today is the one the counter's takings belong to), then the OLDEST (the record the
--     user was linked to first), then the id so the choice is deterministic;
--   * the other members keep their record, schedules, services and history — only `user_id`
--     becomes NULL (no Hub access), the same state as «Hub user: none» in the form, from where
--     the owner can re-point them;
--   * deleted rows are left as they are (the index ignores them: they are history), and so are
--     other hubs' rows and members without a user.
--
-- A legacy `''` is the SAME absence as NULL (`member_create.sql` normalises it since ADR-0192):
-- it becomes NULL, so two «no user» rows can never collide in the index.
--
-- Declared `backfill` in module.json: DML only, no DDL. Idempotent: once each (hub, user) has a
-- single live holder, a second run matches nothing.
UPDATE staff_member
   SET user_id = NULL
 WHERE user_id = '';

UPDATE staff_member
   SET user_id = NULL
 WHERE id IN (
         SELECT id
           FROM (
                  SELECT id,
                         ROW_NUMBER() OVER (
                           PARTITION BY hub_id, user_id
                           ORDER BY CASE WHEN status = 'active' THEN 0 ELSE 1 END,
                                    created_at, id
                         ) AS holder_rank
                    FROM staff_member
                   WHERE user_id IS NOT NULL
                     AND is_deleted = 0
                ) ranked
          WHERE holder_rank > 1
       );
