-- Edit the name of a template / validity / default flag (staff#2) — intention of the WASM handler
-- `update_schedule`, which validated the payload and resolved the row through the `reads`.
-- Hub-scoped. Runtime injects :hub_id, :current_user_id, :now.
UPDATE staff_schedule
SET name            = :name,
    is_default      = :is_default,
    effective_from  = :effective_from,
    effective_until = :effective_until,
    updated_by      = :current_user_id,
    updated_at      = :now
WHERE id = :schedule_id AND hub_id = :hub_id AND is_deleted = 0;
