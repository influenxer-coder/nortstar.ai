-- Agents: user-created agents with Google Drive roadmap link and main KPI
CREATE TABLE IF NOT EXISTS public.agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT,
  google_drive_roadmap_url TEXT,
  main_kpi TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user ON public.agents(user_id);

ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can create own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can update own agents" ON public.agents;
DROP POLICY IF EXISTS "Users can delete own agents" ON public.agents;
CREATE POLICY "Users can view own agents" ON public.agents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own agents" ON public.agents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own agents" ON public.agents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own agents" ON public.agents FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_agents_updated_at ON public.agents;
CREATE TRIGGER update_agents_updated_at
  BEFORE UPDATE ON public.agents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
