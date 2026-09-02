-- staff#51 — the rows that already carry `09:00:00` become `09:00`.
--
-- `003_worktime_hhmm.sql` fixed what a NEW row is born with; this fixes the hubs that already
-- exist, which are the ones showing the seconds today:
--
--   * a hub whose singleton was created by `commands/_settings_ensure.sql` before that migration
--     took the old column DEFAULT, `09:00:00` / `18:00:00`;
--   * a hub seeded by a sector blueprint, which writes its own times STRAIGHT into the table
--     (`09:30:00` / `20:00:00` in the `beauty` seed) and never passes through the command.
--
-- Declared `backfill` in module.json, which is where DML has its place: a `backfill` may not carry
-- DDL and an `expand` is meant to be additive (`crates/runtime/src/migration_guard.rs`).
--
-- Idempotent: only rows still shaped `HH:MM:SS` match, so a second run changes nothing. What it
-- drops is a `:SS` that the UI cannot type (the shell renders these as plain text inputs labelled
-- `(HH:MM)`) and that no code has ever read — grepped across the hub, the modules and the
-- blueprints before writing this.
UPDATE staff_settings
   SET default_work_start = substr(default_work_start, 1, 5)
 WHERE default_work_start ~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$';

UPDATE staff_settings
   SET default_work_end = substr(default_work_end, 1, 5)
 WHERE default_work_end ~ '^[0-2][0-9]:[0-5][0-9]:[0-5][0-9]$';
