-- Store strategy agent output on projects for reuse as context.

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS strategy_json     jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS strategy_markdown text;

