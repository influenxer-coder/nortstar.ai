-- Create Agent flow: url, GitHub, PostHog, target element, status
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS url TEXT,
  ADD COLUMN IF NOT EXISTS github_repo TEXT,
  ADD COLUMN IF NOT EXISTS posthog_api_key TEXT,
  ADD COLUMN IF NOT EXISTS posthog_project_id TEXT,
  ADD COLUMN IF NOT EXISTS target_element JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Analyzing';

-- Backfill status for existing rows
UPDATE public.agents SET status = 'Analyzing' WHERE status IS NULL;
