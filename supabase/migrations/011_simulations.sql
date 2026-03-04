CREATE TABLE IF NOT EXISTS public.agent_simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  persona_results JSONB NOT NULL DEFAULT '[]',
  hypotheses JSONB NOT NULL DEFAULT '[]',
  overall_conversion_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  converting_personas INTEGER NOT NULL DEFAULT 0,
  recommended_first_test TEXT,
  reasoning TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent simulations" ON public.agent_simulations
  FOR ALL
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()))
  WITH CHECK (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
