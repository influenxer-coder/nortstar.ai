-- Draft agent support: track which step was last saved
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS step INTEGER DEFAULT 0;
