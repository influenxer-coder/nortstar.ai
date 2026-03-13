CREATE TABLE projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  north_star_metric text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own projects" ON projects
FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
