-- Prospect jobs: PM jobs scraped per company (Rising Products)
-- Filled by /api/rising-products/jobs/sync; read by /api/rising-products/jobs
CREATE TABLE IF NOT EXISTS public.prospect_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT,
  description_raw TEXT,
  description_summary TEXT,
  skills TEXT[] DEFAULT '{}',
  posted_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospect_jobs_company ON public.prospect_jobs(company_name);
CREATE INDEX IF NOT EXISTS idx_prospect_jobs_posted_at ON public.prospect_jobs(posted_at DESC);

-- Allow public read for unauthenticated Rising Products page (optional; or use API with service role)
ALTER TABLE public.prospect_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read prospect_jobs" ON public.prospect_jobs FOR SELECT USING (true);
