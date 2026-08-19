-- staff#4 — why a member left. Terminate is the ONLY road to `terminated` (never create/update);
-- it stamps the date and, from now on, the reason (Odoo departure wizard / Business Central
-- termination reason: date + reason on the record). Idempotent, additive.
ALTER TABLE staff_member ADD COLUMN IF NOT EXISTS termination_reason TEXT NOT NULL DEFAULT '';
