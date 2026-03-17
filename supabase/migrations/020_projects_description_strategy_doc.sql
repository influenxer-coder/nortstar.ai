-- Persist free-text description and extracted strategy_doc for onboarding Step 1.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS description  text,
  ADD COLUMN IF NOT EXISTS strategy_doc text;

