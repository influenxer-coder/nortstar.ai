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
- Type: emails
- Value: {"emails":["amritasshwar@gmail.com"]}

## Feature Flag
- Key: `northstar-exp-launch-a-zero-expertise-ai-onboarding-fl-f5015z`
- Check endpoint: `https://www.agent-northstar.com/api/flags/northstar-exp-launch-a-zero-expertise-ai-onboarding-fl-f5015z?email={user_email}`

## Plan
# Investigation Plan

## The Hypothesis

Agent NorthStar's current homepage positions the product around "autonomous experimentation" and competitor tracking — language that implicitly requires a reader to already understand A/B testing, OKRs, and product loops. This creates an invisible expertise gate that excludes solo founders and pre-seed teams who have urgent product problems but no PM vocabulary.

Every named competitor confirms this gap by default: **Chisel, Canny, Amplitude, and ProdPad all lose with solo founders and pre-seed teams due to pricing complexity and required PM expertise** (Whitespace Synthesis, Competitor Signal Data). Meanwhile, **PostHog has validated zero-friction onboarding as a wedge** — it wins with product engineers and growth PMs precisely because it removes setup friction and meets users where they are technically.

The opportunity: ship a conversational AI onboarding wizard that produces a usable artifact in under 5 minutes, with no PM jargon, no blank-slate setup, and no required integrations on day one. The synthesis data flags this segment as **"high urgency" with no incumbent fully serving it**. The expected lift is **+18–34%** on the north star activation metric.

---

## What We're Building

A **conversational AI onboarding wizard** surfaced immediately after sign-up (and optionally accessible from the homepage CTA for logged-out visitors).

The wizard asks **3–5 plain-language questions** in a chat-style interface:

1. "What are you building?"
2. "Who are your users?"
3. "What's your biggest unknown right now?"
4. *(conditional)* "Are you pre-launch, in beta, or live?"
5. *(conditional)* "What does success look like in the next 30 days?"

On completion, the agent **auto-configures three artifacts** without the user touching any settings:

- A **starter roadmap** (3–5 pre-populated items based on answers)
- A **feedback board** (pre-labeled columns matching their stated user type)
- A **first prioritization view** (a ranked hypothesis list tied to their stated "biggest unknown")

The entire flow targets **under 5 minutes from sign-up to first usable artifact**.

**Specific changes:**

- **Sign-up success screen**: Replace the current blank dashboard redirect with the wizard entry screen
- **Wizard modal / full-page flow**: New conversational UI, progress indicator (Step 1 of 3), plain-language copy throughout — zero PM jargon
- **Dashboard home**: Post-wizard state shows pre-populated roadmap, feedback board, and prioritization view with a "Your NorthStar setup is ready" confirmation banner
- **Homepage hero CTA copy**: Change `"Run NorthStar on my product →"` to `"Get your first experiment in 5 minutes →"` to set expectation before sign-up

---

## The New Screens

### Screen 1: Wizard Entry — "Welcome Gate"
**What changes:** Replaces the blank post-signup redirect. Full-screen centered card with headline: *"Let's build your first experiment in under 5 minutes."* Single primary CTA: `"Start setup →"`. No navigation, no sidebar, no options. Escape hatch: `"Skip and explore manually"` in small text below.

**Why:** Blank-slate dashboards are cited as a primary drop-off driver for non-PM users. Removing all choice at this moment forces forward momentum and signals that the product will do the work.

---

### Screen 2: Conversational Wizard — Question Flow
**What changes:** New full-page or modal UI. Chat-bubble interface with the NorthStar agent "speaking" each question sequentially. User responds via free-text input or pre-set option chips (e.g., for "Who are your users?": `B2B teams` / `Consumers` / `Developers` / `Other`). Progress bar at top: `Step 1 of 3`. Back button available. No submit button until final question — auto-advances on answer.

**Why:** PostHog's onboarding success is built on progressive disclosure and removing cognitive load at each step. Option chips reduce friction for users who don't know how to describe their stack in PM terms.

---

### Screen 3: "Building Your Setup" Loading State
**What changes:** New interstitial screen shown for 8–12 seconds while the AI configures artifacts. Animated NorthStar agent icon. Rotating text lines:
- *"Mapping your competitive landscape…"*
- *"Setting up your feedback board…"*
- *"Generating your first hypothesis…"*

**Why:** Perceived effort and processing time increase trust in AI-generated outputs. This also sets expectation for what they're about to receive before they see the dashboard.

---

### Screen 4: Pre-Populated Dashboard — "First Artifact View"
**What changes:** Post-wizard dashboard state. Three panels visible on load: (1) Starter Roadmap with 3–5 pre-filled items, (2) Feedback Board with labeled columns, (3) Prioritization View showing top hypothesis tied to their stated "biggest unknown." Persistent banner at top: *"Your NorthStar is configured. Here's where to start."* A tooltip-style walkthrough highlights each panel in sequence (dismissible).

**Why:** The hypothesis requires producing "a usable artifact in under 5 minutes." The artifact must be visible and legible immediately — not buried in a menu or requiring a second action to generate.

---

### Screen 5: Homepage Hero — CTA Copy Update
**What changes:** Primary CTA button copy changes from `"Run NorthStar on my product →"` to `"Get your first experiment in 5 minutes →"`. Supporting subheadline below the hero headline updated from the current speed/competitor framing to: *"Answer 3 questions. NorthStar builds your roadmap, feedback board, and first test — automatically."*

**Why:** The current homepage copy assumes the reader knows what "autonomous product building" means. The new copy speaks directly to the solo founder or pre-seed operator who knows their problem but not the solution vocabulary.

---

## Files To Change

Based on standard Next.js app structure with an `/app` directory and likely Tailwind CSS:

```
/app
  /auth
    /login
      page.tsx                        # Existing — confirm redirect destination post-login
    /signup
      page.tsx                        # Existing — update redirect to /onboarding instead of /dashboard

  /onboarding
    page.tsx                          # NEW — Wizard entry "Welcome Gate" screen
    layout.tsx                        # NEW — Stripped layout (no nav, no sidebar)

  /onboarding
    /wizard
      page.tsx                        # NEW — Conversational question flow (step controller)
      WizardStep.tsx                  # NEW — Individual question component with chips + free text
      WizardProgress.tsx              # NEW — Progress bar component (Step X of Y)
      useWizardState.ts               # NEW — State hook managing question flow and collected answers

    /processing
      page.tsx                        # NEW — Loading interstitial with animated agent + rotating text

  /dashboard
    page.tsx                          # EXISTING — Update to handle two states: fresh (post-wizard) vs. returning
    DashboardWelcomeBanner.tsx        # NEW — "Your NorthStar is configured" banner component
    OnboardingTooltipWalkthrough.tsx  # NEW — Sequential tooltip overlay for first-time dashboard view

/components
  /wizard
    QuestionBubble.tsx                # NEW — Chat-bubble display component for agent questions
    AnswerChips.tsx                   # NEW — Option chip selector component
    FreeTextInput.tsx                 # NEW — Styled free-text answer input

/lib
  /ai
    configureFromWizard.ts            # NEW — Function that takes wizard answers, calls AI, returns roadmap/board/prioritization config
    wizardPrompts.ts                  # NEW — Prompt templates for each question's AI interpretation

/content (or /copy)
  onboarding.ts                       # NEW — Centralized copy strings for all wizard screens (enables easy A/B testing of question wording)

# Homepage
/app
  page.tsx                            # EXISTING — Update hero CTA copy and subheadline
  HeroCTA.tsx                         # EXISTING (if componentized) — Copy change to button label
```

---

## Success Metric

**Primary metric:** `onboarding_wizard_completed` → `first_artifact_viewed` within a single session, measured as a **funnel conversion rate**.

## PM Iterations
- **Sign Up:** Change to onboard in 2 mins

## Prototype Screens
See `prototypes/` directory for HTML prototypes of each screen.
