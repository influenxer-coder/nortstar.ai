-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Organizations (IT Admin creates)
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE NOT NULL,
  slack_webhook_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users (PMs)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  sso_provider TEXT CHECK (sso_provider IN ('okta', 'azure_ad', 'google', NULL)),
  role TEXT DEFAULT 'pm' CHECK (role IN ('admin', 'pm', 'viewer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data Sources (per org)
CREATE TABLE IF NOT EXISTS data_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN ('zendesk', 'gong', 'intercom')),
  api_key_encrypted TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  items_synced INT DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback Items (synced from sources)
CREATE TABLE IF NOT EXISTS feedback_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  source_id UUID REFERENCES data_sources(id) ON DELETE SET NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('zendesk', 'gong', 'intercom')),
  source_item_id TEXT NOT NULL,
  content TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  customer_company TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(org_id, source_type, source_item_id)
);

-- Insights (AI-generated)
CREATE TABLE IF NOT EXISTS insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL CHECK (insight_type IN ('pain_point', 'feature_request', 'churn_risk', 'positive')),
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'positive')),
  mention_count INT DEFAULT 0,
  revenue_impact TEXT,
  evidence JSONB DEFAULT '[]',
  is_demo BOOLEAN DEFAULT FALSE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PRDs (AI-generated)
CREATE TABLE IF NOT EXISTS prds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  insight_id UUID REFERENCES insights(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'shipped')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_demo BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_org ON feedback_items(org_id);
CREATE INDEX IF NOT EXISTS idx_feedback_source_type ON feedback_items(source_type);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback_items(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_insights_org ON insights(org_id);
CREATE INDEX IF NOT EXISTS idx_insights_severity ON insights(severity);
CREATE INDEX IF NOT EXISTS idx_insights_generated ON insights(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_prds_org ON prds(org_id);
CREATE INDEX IF NOT EXISTS idx_prds_insight ON prds(insight_id);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_feedback_embedding ON feedback_items
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Row Level Security
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE prds ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their org's data
-- (For demo, we use service role key that bypasses RLS)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_insights_updated_at
  BEFORE UPDATE ON insights
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prds_updated_at
  BEFORE UPDATE ON prds
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
