-- Make agent name required (shown in Slack and meetings)
UPDATE public.agents SET name = 'Agent' WHERE name IS NULL OR name = '';
ALTER TABLE public.agents ALTER COLUMN name SET NOT NULL;
