-- Add product onboarding fields to projects table
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS north_star_metric    text,
  ADD COLUMN IF NOT EXISTS north_star_current   text,
  ADD COLUMN IF NOT EXISTS north_star_target    text,
  ADD COLUMN IF NOT EXISTS icp                  jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS sub_metrics          jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS analytics_config     jsonb DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS onboarding_step      int   DEFAULT 1,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean DEFAULT false;
