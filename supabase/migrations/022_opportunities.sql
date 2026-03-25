-- Opportunities: market-derived ideas generated per project/goal.
CREATE TABLE IF NOT EXISTS public.opportunities (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  goal            TEXT,
  effort          TEXT,
  evidence        TEXT,
  winning_pattern TEXT,
  -- Impact scoring fields
  expected_lift_low   INT,
  expected_lift_high  INT,
  confidence          TEXT,
  confidence_reason   TEXT,
  impact_score        NUMERIC,
  decision_badge      TEXT,
  human_number        TEXT,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_project ON public.opportunities(project_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_user    ON public.opportunities(user_id);

ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own opportunities"   ON public.opportunities;
DROP POLICY IF EXISTS "Users can create own opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Users can delete own opportunities" ON public.opportunities;
CREATE POLICY "Users can view own opportunities"   ON public.opportunities FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own opportunities" ON public.opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own opportunities" ON public.opportunities FOR DELETE USING (auth.uid() = user_id);
