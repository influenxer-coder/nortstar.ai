-- Tracks experiment launches: targeting, git, status, rollback
CREATE TABLE IF NOT EXISTS public.opportunity_launches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id   UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Targeting rules
  targeting_type   TEXT NOT NULL,          -- 'emails' | 'percentage' | 'category'
  targeting_value  JSONB NOT NULL DEFAULT '{}',
  -- emails:     { "emails": ["a@b.com", "c@d.com"] }
  -- percentage: { "percentage": 10 }
  -- category:   { "category": "new_users" | "power_users" }

  -- Git integration
  github_repo      TEXT,
  branch_name      TEXT,
  pr_url           TEXT,
  pr_number        INT,

  -- Feature flag
  flag_key         TEXT NOT NULL,          -- 'northstar-exp-{slug}'
  flag_enabled     BOOLEAN DEFAULT TRUE,   -- quick kill switch

  -- Frozen context at launch time
  plan_markdown    TEXT,
  prototype_screens JSONB DEFAULT '[]',
  screen_comments  JSONB DEFAULT '[]',
  variation        JSONB DEFAULT '{}',

  -- Status lifecycle: preparing → under_testing → deployed_to_all | rolled_back
  status           TEXT NOT NULL DEFAULT 'preparing',

  rolled_back_at   TIMESTAMPTZ,
  deployed_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_opp_launches_opp ON public.opportunity_launches(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opp_launches_flag ON public.opportunity_launches(flag_key);

ALTER TABLE public.opportunity_launches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own opportunity_launches" ON public.opportunity_launches;
CREATE POLICY "Users can manage own opportunity_launches"
  ON public.opportunity_launches
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Public read for flag checks (no auth needed — the flag endpoint is hit by end-user apps)
DROP POLICY IF EXISTS "Anyone can read active flags" ON public.opportunity_launches;
CREATE POLICY "Anyone can read active flags"
  ON public.opportunity_launches
  FOR SELECT
  USING (true);
