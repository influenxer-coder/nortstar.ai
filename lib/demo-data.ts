import type { Insight, PRD } from './types'

export const DEMO_ORG_ID = 'demo-org-acme'

export const DEMO_INSIGHTS: Omit<Insight, 'id'>[] = [
  {
    org_id: DEMO_ORG_ID,
    insight_type: 'pain_point',
    title: 'Team collaboration blocked — invite button broken',
    summary: '"Invite button grayed out" prevents customers from adding team members, causing friction and churn risk across enterprise accounts.',
    severity: 'critical',
    mention_count: 23,
    revenue_impact: undefined,
    evidence: [
      {
        source_id: 'zendesk-1',
        source_type: 'zendesk',
        quote: 'The invite button is completely grayed out. We cannot onboard our team at all.',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'Acme Corp',
        ticket_id: 'ZD-10823',
      },
      {
        source_id: 'zendesk-2',
        source_type: 'zendesk',
        quote: 'Our team of 20 is stuck because nobody can get access. This is blocking our entire rollout.',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'BuildFast Inc',
        ticket_id: 'ZD-10891',
      },
      {
        source_id: 'intercom-1',
        source_type: 'intercom',
        quote: 'Can\'t add team members — the button does nothing when clicked. Is this a known issue?',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'StartupCo',
      },
      {
        source_id: 'intercom-2',
        source_type: 'intercom',
        quote: 'If this doesn\'t get fixed today, we\'re canceling our subscription.',
        date: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        customer: 'TechVenture LLC',
      },
    ],
    generated_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    org_id: DEMO_ORG_ID,
    insight_type: 'feature_request',
    title: 'Enterprise SSO (Okta/Azure AD) blocking $250K+ in deals',
    summary: 'Enterprise prospects require SSO for security compliance. Currently blocking 5 active deals worth over $250K ARR. Decision-makers cite it as a dealbreaker.',
    severity: 'high',
    mention_count: 18,
    revenue_impact: '$250K+ ARR at risk',
    evidence: [
      {
        source_id: 'gong-1',
        source_type: 'gong',
        quote: 'We can\'t onboard 500 employees without SSO. That\'s a dealbreaker for our security team.',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'GlobalCorp',
        recording_url: 'https://app.gong.io/call?id=demo-call-1',
        timestamp: '14:23',
      },
      {
        source_id: 'gong-2',
        source_type: 'gong',
        quote: 'Our security team won\'t approve any SaaS tool without Okta integration. We love the product but can\'t move forward.',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'EnterpriseX',
        recording_url: 'https://app.gong.io/call?id=demo-call-2',
        timestamp: '08:45',
      },
      {
        source_id: 'zendesk-3',
        source_type: 'zendesk',
        quote: 'Do you have Okta SSO on the roadmap? This is the only thing preventing us from upgrading to Enterprise.',
        date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'ScaleUp Co',
        ticket_id: 'ZD-10756',
      },
    ],
    generated_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  {
    org_id: DEMO_ORG_ID,
    insight_type: 'churn_risk',
    title: 'Churn risk: 3 enterprise customers threatening to cancel',
    summary: 'Three enterprise customers ($60K ARR combined) have explicitly mentioned cancellation in support tickets in the past 24 hours, all related to the invite bug.',
    severity: 'critical',
    mention_count: 8,
    revenue_impact: '$60K ARR at risk',
    evidence: [
      {
        source_id: 'zendesk-4',
        source_type: 'zendesk',
        quote: 'We\'ve been waiting 3 days for a fix. If this isn\'t resolved by end of week, we\'ll have to cancel.',
        date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        customer: 'Acme Corp ($50K ARR)',
        ticket_id: 'ZD-10912',
      },
      {
        source_id: 'intercom-3',
        source_type: 'intercom',
        quote: 'We are considering canceling our subscription due to unresolved onboarding issues.',
        date: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        customer: 'StartupCo ($5K ARR)',
      },
      {
        source_id: 'intercom-4',
        source_type: 'intercom',
        quote: 'Our entire team rollout is blocked. This is unacceptable for a paid product.',
        date: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        customer: 'BuildFast Inc ($5K ARR)',
      },
    ],
    generated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    org_id: DEMO_ORG_ID,
    insight_type: 'feature_request',
    title: 'API access for power users — 14 requests in 30 days',
    summary: 'Technical users want REST API and webhooks to integrate with their existing workflows. High-value segment with strong willingness to pay for API tier.',
    severity: 'medium',
    mention_count: 14,
    revenue_impact: undefined,
    evidence: [
      {
        source_id: 'intercom-5',
        source_type: 'intercom',
        quote: 'Is there an API? We\'d love to pull this data into our own dashboards.',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'DevCo',
      },
      {
        source_id: 'gong-3',
        source_type: 'gong',
        quote: 'We\'d pay extra for API access. Our engineering team wants to automate the feedback loop.',
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'TechStartup',
        recording_url: 'https://app.gong.io/call?id=demo-call-3',
        timestamp: '22:15',
      },
    ],
    generated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    org_id: DEMO_ORG_ID,
    insight_type: 'positive',
    title: 'Onboarding improvements working — confusion down 71%',
    summary: 'The new onboarding flow has dramatically reduced setup confusion. "Confused about setup" mentions dropped from 34 last week to 10 this week.',
    severity: 'positive',
    mention_count: 10,
    revenue_impact: undefined,
    evidence: [
      {
        source_id: 'intercom-6',
        source_type: 'intercom',
        quote: 'The new setup wizard is amazing! Got our whole team onboarded in 10 minutes.',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'HappyCo',
      },
      {
        source_id: 'zendesk-5',
        source_type: 'zendesk',
        quote: 'The setup is much clearer now. Love the step-by-step guide.',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        customer: 'GrowthStartup',
        ticket_id: 'ZD-10834',
      },
    ],
    generated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
]

export const DEMO_PRD_CONTENT = `# PRD: Single Sign-On (SSO) Integration

**Priority**: High | **Effort**: 8 weeks | **Revenue Impact**: $250K+ ARR
**Status**: Draft | **Created**: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

---

## Executive Summary

Enterprise customers require Single Sign-On (SSO) via Okta and Azure AD for security compliance. This feature is currently blocking 5 active sales opportunities representing $250K+ ARR, and has been the #1 requested feature in enterprise sales calls over the past 30 days.

---

## Problem Statement

Enterprise security teams require all SaaS tools to integrate with their Identity Provider (IdP) for centralized access management. Without SSO, enterprise customers cannot:

1. Provision/deprovision users automatically
2. Enforce MFA and security policies
3. Pass security reviews for vendor approval

**Customer Evidence**:

> "We can't onboard 500 employees without SSO. That's a dealbreaker for our security team."
> — GlobalCorp, Sales Call (${new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) [Listen to recording]

> "Our security team won't approve any SaaS tool without Okta integration. We love the product but can't move forward."
> — EnterpriseX, Sales Call (${new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}) [Listen to recording]

> "Do you have Okta SSO on the roadmap? This is the only thing preventing us from upgrading to Enterprise."
> — ScaleUp Co, Support Ticket ZD-10756

---

## User Personas

**Primary**: Enterprise IT Admin
- Manages user access for 100-10,000+ employees
- Responsible for security compliance and vendor approval
- Needs SCIM provisioning for automated user management

**Secondary**: Enterprise PM (End User)
- Wants seamless login without separate credentials
- Benefits from MFA enforcement without managing it themselves

---

## Success Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| Blocked deals converted | 5/5 | Within 30 days of launch |
| New ARR unlocked | $250K+ | Q2 2026 |
| Time to provision user | < 5 min | At launch |
| SSO setup completion rate | > 90% | 30 days post-launch |

---

## User Stories

### Must Have (MVP)

**Story 1: Okta SSO Login**
> As an enterprise employee, I want to log into the product using my Okta credentials, so I don't need to manage a separate password.

**Acceptance Criteria**:
- [ ] User clicks "Sign in with Okta" on the login page
- [ ] Redirected to Okta, authenticates with corporate credentials
- [ ] Returned to product as authenticated user
- [ ] Session persists for configurable duration (default: 8 hours)

**Story 2: Azure AD SSO Login**
> As an enterprise employee, I want to log in using my Microsoft/Azure AD credentials.

**Acceptance Criteria**:
- [ ] "Sign in with Microsoft" button on login page
- [ ] Standard OAuth 2.0 / OIDC flow
- [ ] Azure tenant configuration in admin settings

**Story 3: IT Admin SSO Configuration**
> As an IT admin, I want to configure SSO for my organization in the admin portal.

**Acceptance Criteria**:
- [ ] Admin settings page with SSO configuration
- [ ] Supports SAML 2.0 and OIDC
- [ ] Test SSO configuration before enforcing
- [ ] Enforce SSO for all org members

### Should Have

**Story 4: SCIM User Provisioning**
> As an IT admin, I want users to be automatically provisioned/deprovisioned when added/removed in my IdP.

**Story 5: Just-in-Time Provisioning**
> As an IT admin, I want new employees to get access automatically on first SSO login.

---

## Technical Considerations

- **Auth Provider**: Extend Supabase Auth with custom SAML/OIDC flow
- **Supported Protocols**: SAML 2.0, OIDC (covers Okta, Azure AD, Google Workspace, OneLogin)
- **Session Management**: JWT tokens with configurable expiry
- **SCIM**: REST API following SCIM 2.0 spec for provisioning

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| SAML implementation complexity | Medium | High | Use battle-tested library (node-saml) |
| IdP configuration errors by admins | High | Medium | Step-by-step setup wizard with validation |
| Breaking existing auth flow | Low | High | Feature flag, gradual rollout |
| Security vulnerabilities in SAML | Low | Critical | Third-party security audit before GA |

---

*Generated by NorthStar on ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} based on 18 customer conversations.*
`

export const DEMO_STATS = {
  ticketsAnalyzed: 127,
  callsAnalyzed: 23,
  chatsAnalyzed: 89,
  totalDataPoints: 239,
  criticalInsights: 2,
  highInsights: 1,
  mediumInsights: 1,
  positiveSignals: 1,
}
