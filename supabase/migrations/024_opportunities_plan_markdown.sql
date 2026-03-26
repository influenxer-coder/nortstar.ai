ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS plan_markdown text;
