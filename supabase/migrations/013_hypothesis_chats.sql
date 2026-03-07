-- Migration 013: hypothesis_chats table
-- Persists chat history for hypothesis refinement conversations.

CREATE TABLE IF NOT EXISTS public.hypothesis_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_id UUID NOT NULL REFERENCES public.agent_hypotheses(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  tool_called TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX hypothesis_chats_hypothesis_id_idx ON public.hypothesis_chats(hypothesis_id);
CREATE INDEX hypothesis_chats_created_at_idx ON public.hypothesis_chats(hypothesis_id, created_at);

ALTER TABLE public.hypothesis_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own hypothesis chats" ON public.hypothesis_chats
  USING (agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid()));
