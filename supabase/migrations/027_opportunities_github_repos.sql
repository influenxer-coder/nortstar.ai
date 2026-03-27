ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS github_repos JSONB DEFAULT '[]';
-- Stores array of repo strings: ["owner/frontend-repo", "owner/backend-repo"]
