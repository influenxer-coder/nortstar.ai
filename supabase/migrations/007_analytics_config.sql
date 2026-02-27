-- Store connected analytics tool credentials (Mixpanel, GA4, Amplitude, etc.)
ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS analytics_config JSONB;
