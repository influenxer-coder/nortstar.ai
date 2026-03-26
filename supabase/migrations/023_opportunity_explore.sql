-- Persisted variations generated per opportunity
CREATE TABLE IF NOT EXISTS public.opportunity_variations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  variations     JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_variations_opp ON public.opportunity_variations(opportunity_id);

ALTER TABLE public.opportunity_variations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own opportunity_variations" ON public.opportunity_variations;
CREATE POLICY "Users can manage own opportunity_variations"
  ON public.opportunity_variations
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Persisted flow diagrams generated per opportunity
CREATE TABLE IF NOT EXISTS public.opportunity_flows (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  flows          JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_flows_opp ON public.opportunity_flows(opportunity_id);

ALTER TABLE public.opportunity_flows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own opportunity_flows" ON public.opportunity_flows;
CREATE POLICY "Users can manage own opportunity_flows"
  ON public.opportunity_flows
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Exploration state: which variation the user last selected
CREATE TABLE IF NOT EXISTS public.opportunity_explore_state (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id           UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selected_variation_index INT,
  updated_at               TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_explore_state_opp ON public.opportunity_explore_state(opportunity_id);

ALTER TABLE public.opportunity_explore_state ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own opportunity_explore_state" ON public.opportunity_explore_state;
CREATE POLICY "Users can manage own opportunity_explore_state"
  ON public.opportunity_explore_state
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
