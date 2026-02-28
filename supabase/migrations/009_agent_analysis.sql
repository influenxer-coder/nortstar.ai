-- Migration 009: Agent context analysis + live log streaming

-- Context summary built by the analysis pipeline (GitHub commits + CRO research)
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS context_summary TEXT;

-- Per-agent analysis log entries, streamed to the UI in real time
CREATE TABLE IF NOT EXISTS public.agent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('running', 'done', 'error')),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent logs"
  ON public.agent_logs
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );
