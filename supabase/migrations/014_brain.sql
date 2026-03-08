-- Migration 014: Brain learning layer
-- knowledge_base, learning_events, skill_weights + two RPCs

-- ── knowledge_base ──────────────────────────────────────────────────────────
-- PM book chunks and promoted patterns — admin only, no RLS
CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id             UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical       TEXT    NOT NULL,
  page_type      TEXT    NOT NULL,
  chunk          TEXT    NOT NULL,
  framework_type TEXT    NOT NULL,
  source         TEXT    NOT NULL,
  embedding      VECTOR(1024),
  confidence     FLOAT   DEFAULT 0.5,
  sample_size    INT     DEFAULT 1,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_embedding
  ON public.knowledge_base
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── learning_events ──────────────────────────────────────────────────────────
-- Private per-tenant signal store — RLS: users read their own rows
CREATE TABLE IF NOT EXISTS public.learning_events (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id            UUID    REFERENCES auth.users(id),
  agent_id          UUID    REFERENCES public.agents(id) ON DELETE CASCADE,
  vertical          TEXT    NOT NULL,
  page_type         TEXT    NOT NULL,
  outcome           TEXT    NOT NULL CHECK (outcome IN ('accepted', 'rejected', 'corrected')),
  hypothesis_title  TEXT    NOT NULL,
  suggested_change  TEXT    NOT NULL,
  correction        TEXT,
  pattern_extracted JSONB,
  is_promoted       BOOLEAN DEFAULT false,
  created_at        TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.learning_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own learning events"
  ON public.learning_events
  FOR SELECT
  USING (org_id = auth.uid());

-- ── skill_weights ────────────────────────────────────────────────────────────
-- Shared anonymized routing intelligence — admin only, no RLS
CREATE TABLE IF NOT EXISTS public.skill_weights (
  id          UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical    TEXT  NOT NULL,
  page_type   TEXT  NOT NULL,
  pattern     TEXT  NOT NULL,
  confidence  FLOAT DEFAULT 0.5,
  sample_size INT   DEFAULT 1,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (vertical, page_type, pattern)
);

-- ── RPC: match_brain ─────────────────────────────────────────────────────────
-- Cosine similarity search on knowledge_base
CREATE OR REPLACE FUNCTION match_brain(
  query_embedding VECTOR(1024),
  match_vertical  TEXT,
  match_count     INT DEFAULT 5
)
RETURNS TABLE (
  chunk          TEXT,
  framework_type TEXT,
  confidence     FLOAT,
  similarity     FLOAT
)
LANGUAGE SQL STABLE AS $$
  SELECT
    chunk,
    framework_type,
    confidence,
    1 - (embedding <=> query_embedding) AS similarity
  FROM public.knowledge_base
  WHERE vertical = match_vertical OR vertical = 'universal'
  ORDER BY embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ── RPC: upsert_skill_weight ─────────────────────────────────────────────────
-- Upserts into skill_weights, increments sample_size, clamps confidence 0.1–0.99
CREATE OR REPLACE FUNCTION upsert_skill_weight(
  p_vertical  TEXT,
  p_page_type TEXT,
  p_pattern   TEXT,
  p_delta     FLOAT
)
RETURNS void
LANGUAGE SQL AS $$
  INSERT INTO public.skill_weights (vertical, page_type, pattern, confidence, sample_size, updated_at)
  VALUES (
    p_vertical,
    p_page_type,
    p_pattern,
    LEAST(0.99, GREATEST(0.1, 0.5 + p_delta)),
    1,
    now()
  )
  ON CONFLICT (vertical, page_type, pattern) DO UPDATE
    SET
      confidence  = LEAST(0.99, GREATEST(0.1, public.skill_weights.confidence + p_delta)),
      sample_size = public.skill_weights.sample_size + 1,
      updated_at  = now();
$$;
