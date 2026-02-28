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

// Chat / PM agent (profiles, conversations, messages, artifacts)
export interface Profile {
  id: string
  email: string
  full_name: string | null
  company: string | null
  role: string | null
  onboarding_completed: boolean
  company_size: string | null
  product_stage: string | null
  current_tools: string[] | null
  main_pain_points: string[] | null
  product_name: string | null
  product_description: string | null
  target_users: string | null
  north_star_metric: string | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  agent_used: string | null
  processing_time_ms: number | null
  created_at: string
}

export interface Artifact {
  id: string
  user_id: string
  conversation_id: string | null
  message_id: string | null
  type: 'prd' | 'insight' | 'roadmap' | 'analytics' | 'user_story'
  title: string
  content: Record<string, unknown>
  quality_score: number | null
  human_edited: boolean
  created_at: string
  updated_at: string
}

export interface UserContextRow {
  id: string
  user_id: string
  context_type: string
  key: string
  value: string
  created_at: string
  updated_at: string
}

export interface Agent {
  id: string
  user_id: string
  name: string
  url: string | null
  github_repo: string | null
  posthog_api_key: string | null
  posthog_project_id: string | null
  target_element: { type?: string; text?: string; position?: Record<string, number> } | null
  status: string | null
  step?: number
  created_at: string
  updated_at: string
  google_drive_roadmap_url?: string | null
  main_kpi?: string
  // Slack integration
  slack_bot_token?: string | null
  slack_team_id?: string | null
  slack_user_id?: string | null
  slack_channel_id?: string | null
  // RAG context
  system_instructions?: string | null
  // Analysis pipeline output
  context_summary?: string | null
}

export interface AgentDocument {
  id: string
  agent_id: string
  file_name: string
  chunk_index: number
  content: string
  created_at: string
}

export interface SlackMessage {
  id: string
  agent_id: string
  role: 'user' | 'assistant'
  content: string
  slack_ts: string | null
  created_at: string
}
