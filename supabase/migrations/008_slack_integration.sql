-- Migration 008: Slack integration + RAG context layer

-- Enable pgvector for semantic document search
CREATE EXTENSION IF NOT EXISTS vector;

-- Slack bot credentials per agent
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS slack_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS slack_team_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_user_id TEXT,
  ADD COLUMN IF NOT EXISTS slack_channel_id TEXT;

-- User-written instructions that shape how the agent responds
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS system_instructions TEXT;

-- Document chunks with embeddings (knowledge base per agent)
CREATE TABLE IF NOT EXISTS public.agent_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS agent_documents_embedding_idx
  ON public.agent_documents USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

ALTER TABLE public.agent_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own agent documents"
  ON public.agent_documents
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

-- Vector similarity search function (used by Slack events handler)
CREATE OR REPLACE FUNCTION match_agent_documents(
  agent_id_param UUID,
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 3
)
RETURNS TABLE(id UUID, content TEXT, similarity FLOAT)
LANGUAGE SQL STABLE
AS $$
  SELECT id, content, 1 - (embedding <=> query_embedding) AS similarity
  FROM public.agent_documents
  WHERE agent_id = agent_id_param
    AND embedding IS NOT NULL
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- Slack DM conversation history per agent
CREATE TABLE IF NOT EXISTS public.slack_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  slack_ts TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.slack_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own slack messages"
  ON public.slack_messages
  USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );
