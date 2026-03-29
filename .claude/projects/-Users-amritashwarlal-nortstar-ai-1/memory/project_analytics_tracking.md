---
name: Analytics tracking for experiments
description: Implement analytics event firing on experiment CTAs so targeted vs general user behavior can be measured across platforms (GA, PostHog, Mixpanel)
type: project
---

Next step after the launch/PR feature: add analytics measurement for experiments.

**Why:** The PR + feature flag gates who sees the experiment, but there's no way to measure how targeted users behave differently from control users. Without this, the experiment is blind.

**What to build:**
1. Analytics detection during product onboarding — detect what analytics the user has (GA, PostHog, Mixpanel) by scraping their site or asking
2. Store analytics config per product (type + credentials/project ID)
3. On experiment CTAs, allow adding event-firing scripts that send to the user's analytics platform
4. Dashboard view comparing metrics between flag ON (experiment) vs flag OFF (control) users
5. Auto-inject tracking code into the experiment PR alongside the feature flag

**How to apply:** Build this as the next feature after the current launch flow is stable. It completes the experiment loop: hypothesis → prototype → launch → measure → decide.

**Dependencies:**
- Feature flag endpoint (done: GET /api/flags/{key})
- Launch system (done: opportunity_launches table)
- Analytics detection (not built yet)
- Per-product analytics config storage (not built yet)
