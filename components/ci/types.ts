export type Segment = {
  segment_name?: string
  primary_kpi?: string
  primary_competitor?: string
  confidence?: number
  activation_journey_summary?: string
}

export type PlayerScore = { name?: string; score?: number; justification?: string }

export type UseCaseRow = {
  use_case_name?: string
  segment_name?: string
  platform_score?: number
  leader_name?: string
  leader_score?: number
  second_best_name?: string
  second_best_score?: number
  player_scores?: PlayerScore[]
  primary_kpi?: string
  test_methodology?: string
}

export type Gap = {
  gap_rank?: number
  use_case?: string
  platform_score?: number
  leader_name?: string
  leader_score?: number
  score_gap?: number
  hypothesis?: string
  root_causes?: string[]
  ways_to_close?: Array<{ title?: string; description?: string; kpi_it_moves?: string; impact_level?: string }>
}

export type Okr = {
  objective?: string
  use_case?: string
  impact_score?: number
  feasibility_score?: number
  okr_quality_score?: number
  key_risk?: string
  gap_description?: string
  differentiation_mechanism?: string
  key_results?: Array<{
    kr_text?: string
    kr_type?: string
    metric_name?: string
    logging_event?: string
    logging_event_trigger?: string
    causal_chain?: string
  }>
}

export type Design = {
  gap_rank?: number
  easy_tier?: TierDetail
  medium_tier?: TierDetail
  full_tier?: TierDetail
  reference_implementations?: Array<{ company?: string; what_built?: string; quantified_result?: string }>
}

export type TierDetail = {
  hypothesis?: string
  screen_flow?: string[]
  backend?: string
  risk?: string
}

export type Goal = {
  goal_text?: string
  evidence_source?: string
  inferred?: boolean
  flywheel_effect?: string
}

export type CompetitorDirect = {
  name?: string
  one_line?: string
  feature_platform_lacks?: string
}

export type CiData = {
  ci_enriched: boolean
  product_name: string
  segments: Segment[]
  use_case_rows: UseCaseRow[]
  gaps: Gap[]
  goals: Goal[]
  okrs: Okr[]
  designs: Design[]
  competitors_direct: CompetitorDirect[]
}

export const C = {
  bg: '#f6f6f6', surface: '#ffffff', text: '#1f2328', muted: '#535963',
  border: '#d4d7dc', blue: '#367eed', cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
  green: '#2e7d32', greenBg: '#e8f5e9', greenBorder: '#a5d6a7',
  amber: '#92600a', amberBg: '#fffbeb', amberBorder: '#f0b429',
  red: '#be123c', redBg: '#fff1f2', redBorder: '#fda4af',
}

export function scoreColor(score: number) {
  if (score >= 4.0) return { color: C.green, bg: C.greenBg, icon: '✓' }
  if (score >= 3.0) return { color: C.amber, bg: C.amberBg, icon: '⚠' }
  return { color: C.red, bg: C.redBg, icon: '✗' }
}
