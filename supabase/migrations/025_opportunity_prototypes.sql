CREATE TABLE IF NOT EXISTS public.opportunity_prototypes (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  screens        JSONB NOT NULL DEFAULT '[]',
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_prototypes_opp ON public.opportunity_prototypes(opportunity_id);

ALTER TABLE public.opportunity_prototypes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own opportunity_prototypes" ON public.opportunity_prototypes;
CREATE POLICY "Users can manage own opportunity_prototypes"
  ON public.opportunity_prototypes
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
