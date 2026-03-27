# NorthStar Experiment Spec

## Opportunity
**Launch a 'Zero-Expertise' AI Onboarding Flow Targeting Solo Founders and Pre-Seed Teams**
Every major competitor — Chisel, Canny, Amplitude, ProdPad — explicitly loses with solo founders and pre-seed teams due to pricing complexity and required PM expertise. The synthesis whitespace data flags this segment as 'high urgency' with no incumbent fully serving it.

## Goal
beat_competitor

## Variation
**Guided AI Setup in Under 5 Minutes**
Rising competitor ships zero-friction onboarding to capture the segment incumbents ignore

## Targeting
- Type: percentage
- Value: {"percentage":10}

## Feature Flag
- Key: `northstar-exp-launch-a-zero-expertise-ai-onboarding-fl-f5015z`
- Check endpoint: `https://www.agent-northstar.com/api/flags/northstar-exp-launch-a-zero-expertise-ai-onboarding-fl-f5015z?email={user_email}`

## Plan
# Investigation Plan

---

## The Hypothesis

Agent NorthStar's current homepage and onboarding targets VP/Head of Product at Series B–D SaaS companies — but every named competitor (Chisel, Canny, Amplitude, ProdPad) explicitly fails to serve solo founders and pre-seed teams due to pricing complexity and required PM expertise. The synthesis whitespace data flags this segment as **high urgency with no incumbent fully serving it**.

PostHog — the closest analog to a zero-friction, developer-friendly product tool — has validated that removing setup friction drives activation, and was explicitly cited as a validation source for this variation. Chisel wins with Series B/C PMs but requires structured PM workflows that pre-seed teams don't have. The pattern is clear: **the rising competitor that ships zero-friction onboarding captures the segment incumbents ignore.**

A conversational AI onboarding wizard that produces a usable artifact (starter roadmap + feedback board + first prioritization view) in under 5 minutes — with no PM jargon, no blank-slate setup, no required integrations — directly exploits this whitespace. Expected lift: **+18–34%** on activation.

---

## What We're Building

A conversational AI onboarding wizard accessed immediately after sign-up (or from a new `/onboarding` route), replacing any blank-slate or form-based setup. The wizard asks **3–5 plain-language questions** in a chat-style UI, then auto-generates a usable starter workspace in under 5 minutes.

**Screens affected:**
- Post-login redirect (currently lands on dashboard or blank state) → redirects new users to `/onboarding`
- New `/onboarding` wizard screen (net new)
- Dashboard first-load state (receives the auto-configured artifact)

**Copy changes:**
- Replace any PM-jargon labels ("OKRs", "prioritization framework", "roadmap template") in the onboarding flow with plain-language equivalents
- CTA on homepage changes from `"Run NorthStar on my product →"` to `"Get your first experiment in 5 minutes →"` for the segment-specific variant

---

## The New Screens

### Screen 1: `/onboarding` — Conversational Wizard

**What changes:** Net new screen. A full-viewport chat-style interface (think linear onboarding meets ChatGPT prompt). The AI agent asks questions sequentially, one at a time, with large friendly typography and no sidebar navigation visible.

**Questions (in order):**
1. "What are you building?" *(free text, 1–2 sentences)*
2. "Who are your users?" *(free text or quick-select chips: consumers / developers / SMB / enterprise)*
3. "What's your biggest unknown right now?" *(free text, with example prompts: 'whether people will pay', 'which feature to build next', 'why users churn')*
4. *(Conditional)* "Do you have any existing users or are you pre-launch?" *(binary toggle)*
5. *(Optional, skippable)* "Drop a competitor URL to benchmark against" *(text input, skip link prominent)*

**Why:** Eliminates the blank-slate problem. Mirrors PostHog's zero-friction activation pattern. Removes PM jargon barrier that causes Chisel/Canny to lose with this segment.

---

### Screen 2: `/onboarding/generating` — Live Generation State

**What changes:** Net new screen. A full-viewport animated state shown for 15–45 seconds while the AI configures the workspace. Shows a live "building your workspace" progress feed — e.g.:

```
✓ Mapping your product space...
✓ Identifying your top experiment candidates...
✓ Building your first prioritization view...
✓ Generating starter feedback board...
```

**Why:** Sets expectation that something real is being built. Reduces drop-off during generation wait. Builds perceived value before the artifact is revealed.

---

### Screen 3: Dashboard — First-Load Artifact State

**What changes:** Existing dashboard receives a pre-populated state instead of a blank slate. Shows:
- A **starter roadmap** with 2–3 pre-seeded hypothesis cards derived from the wizard answers
- A **feedback board** with placeholder structure labeled in plain language ("What users ask for", "What you're testing", "What you've learned")
- A **first prioritization view** showing the top 1 experiment recommendation with a one-line rationale ("Based on what you told us, this is your highest-leverage unknown")

**Banner at top:** `"Your workspace was set up based on your answers. Edit anything — or run your first experiment now."`

**Why:** Delivers the promised artifact. Closes the activation loop. Validated by PostHog's pattern of producing immediate value before asking for integrations.

---

### Screen 4: Homepage — Segment-Aware Hero Variant (A/B)

**What changes:** Add a second CTA variant below the primary hero button targeting the new segment:

```
→ "Just starting out? Get your first experiment in 5 minutes — no PM experience needed."
```

Links directly to `/onboarding`. Small text, beneath primary CTA. No redesign of existing hero required.

**Why:** Captures the pre-seed/solo founder segment arriving at the homepage without disrupting the existing ICP messaging. Low-risk surface test.

---

## Files To Change

Based on standard Next.js App Router structure:

```
app/
├── onboarding/
│   ├── page.tsx                  # NEW — Conversational wizard UI
│   ├── generating/
│   │   └── page.tsx              # NEW — Live generation state screen
│   └── layout.tsx                # NEW — Stripped layout (no sidebar/nav)
│
├── dashboard/
│   └── page.tsx                  # MODIFY — detect first-login state, render pre-populated artifact
│
├── auth/
│   └── login/
│       └── page.tsx              # MODIFY — post-auth redirect logic: new users → /onboarding
│
├── api/
│   └── onboarding/
│       └── route.ts              # NEW — API route: accepts wizard answers, calls AI, returns workspace config
│
components/
├── onboarding/
│   ├── WizardChat.tsx            # NEW — Chat-style question/answer component
│   ├── GeneratingState.tsx       # NEW — Animated progress feed
│   └── WizardQuestion.tsx        # NEW — Single question unit with input variants
│
├── dashboard/
│   └── FirstRunBanner.tsx        # NEW — "Your workspace was set up" banner component
│
lib/
└── onboarding/
    └── generateWorkspace.ts      # NEW — Business logic: maps wizard answers → roadmap/board/prioritization config
```

---

## Success Metric

**Primary metric:**
> `onboarding_wizard_completed` → `workspace_artifact_viewed` within the same session

Specifically: % of new sign-ups who complete all wizard questions **and** view the generated dashboard artifact within 5 minutes of starting onboarding.

**Baseline to beat:** Current new-user activation rate (define as: user who returns within 7 days and performs ≥1 core action — approving a hypothesis, viewing a competitor gap, or starting a test).

**Supporting events to instrument:**

| Event | Trigger |
|---|---|
| `onboarding_wizard_started` | User lands on `/onboarding` |
| `onboarding_question_answered` | Each question completed (Q1–Q5) |
| `onboarding_wizard_completed` | Final answer submitted |
| `workspace_generated` | AI config returned successfully |
| `artifact_first_viewed` | Dashboard first-load with pre-populated state |
| `first_experiment_started` | User clicks into first hypothesis card |

**Target:** 18–34% lift in 7-day retention for new users entering via wizard vs. current blank-slate onboarding.

---

## Evidence

1. **Chisel explicitly loses with pre-seed/solo founders** — wins only with "Head of Product or Product Manager at a Series B/C company." This confirms the segment is structurally underserved by the most direct competitor. *(Source: Competitor signals data, Chisel)*

2. **PostHog validated zero-friction onboarding as an activation driver** — cited directly as a validation source for this variation. PostHog's pattern of shipping immediate value (new dashboards, analytics)

## PM Iterations
- **Sign Up:** Experiment in 5 mins

## Prototype Screens
See `prototypes/` directory for HTML prototypes of each screen.
