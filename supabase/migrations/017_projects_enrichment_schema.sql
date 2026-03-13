-- Replace projects table with enrichment-enabled schema.
-- Enable Realtime on this table in Supabase Dashboard: Database → Replication → projects.

DROP POLICY IF EXISTS "Users can manage own projects" ON projects;
DROP TABLE IF EXISTS projects;

CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  url text,
  doc_url text,
  has_doc boolean DEFAULT false,
  enrichment_status text DEFAULT 'pending',
  enrichment jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own projects"
ON projects FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_projects_updated_at();
