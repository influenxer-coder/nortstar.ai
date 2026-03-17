-- Persist metrics agent result for onboarding Step 2.
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS metrics_json jsonb;
