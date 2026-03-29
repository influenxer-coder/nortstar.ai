-- Add type and goal to agents so page optimizations live under goals
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'agent',
  ADD COLUMN IF NOT EXISTS goal TEXT,
  ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL;

-- type: 'agent' (legacy screen optimization) | 'page_optimization' (new, under a goal)
-- goal: matches the goal string from the product (e.g. 'increase_signups')
-- project_id: links to the project (different from product_id which links to products table)

CREATE INDEX IF NOT EXISTS idx_agents_project ON public.agents(project_id);
CREATE INDEX IF NOT EXISTS idx_agents_type ON public.agents(type);
