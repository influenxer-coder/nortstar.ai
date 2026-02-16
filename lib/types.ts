export interface Organization {
  id: string
  name: string
  domain: string
  created_at: string
}

export interface User {
  id: string
  org_id: string
  email: string
  full_name: string | null
  sso_provider: 'okta' | 'azure_ad' | null
  created_at: string
}

export interface DataSource {
  id: string
  org_id: string
  source_type: 'zendesk' | 'gong' | 'intercom'
  api_key_encrypted: string
  last_synced_at: string | null
  status: 'active' | 'inactive' | 'error'
}

export interface FeedbackItem {
  id: string
  org_id: string
  source_id: string
  source_type: 'zendesk' | 'gong' | 'intercom'
  source_item_id: string
  content: string
  sentiment: 'positive' | 'neutral' | 'negative'
  created_at: string
  synced_at: string
}

export interface EvidenceItem {
  source_id: string
  source_type: 'zendesk' | 'gong' | 'intercom'
  quote: string
  date: string
  customer?: string
  ticket_id?: string
  recording_url?: string
  timestamp?: string
}

export interface Insight {
  id: string
  org_id: string
  insight_type: 'pain_point' | 'feature_request' | 'churn_risk' | 'positive'
  title: string
  summary: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'positive'
  mention_count: number
  evidence: EvidenceItem[]
  revenue_impact?: string
  generated_at: string
}

export interface PRD {
  id: string
  org_id: string
  insight_id: string | null
  title: string
  content: string
  status: 'draft' | 'reviewed' | 'shipped'
  created_by: string | null
  created_at: string
}

export interface SlackAlert {
  type: 'churn_risk' | 'critical_insight' | 'weekly_report'
  title: string
  message: string
  insights: Insight[]
  posted_at: string
}

export type InsightSeverity = 'critical' | 'high' | 'medium' | 'low' | 'positive'
export type InsightType = 'pain_point' | 'feature_request' | 'churn_risk' | 'positive'
