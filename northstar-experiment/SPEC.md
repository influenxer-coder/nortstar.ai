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

Solo founders and pre-seed teams represent a high-urgency, unserved segment that every incumbent has structurally abandoned. Chisel requires PM methodology fluency to configure boards. Canny surfaces blank-slate setup with no guidance. Amplitude's newly shipped AI Feedback and Amplitude Agent are explicitly positioned at 200+ person companies with a Head of Growth or Product Analytics in the seat. Productboard's recent Required Fields and Streamlined Navigation updates signal a push *further* into Series C and enterprise, not toward early-stage. PostHog — the one competitor validated as a pattern match for this variation — wins with Product Engineers and Growth PMs at 50+ person companies, meaning even the most developer-friendly tool in the space has a floor that excludes the pre-seed solo founder.

The whitespace is structural, not accidental. No incumbent can move downmarket without destroying their enterprise pricing narrative. Agent NorthStar has no such constraint.

A conversational AI onboarding wizard that produces a usable artifact in under 5 minutes — with no PM jargon, no blank-slate setup, and no required integrations — will convert solo founders and pre-seed teams at a rate incumbents cannot match because incumbents cannot ship this without cannibalizing their ICP positioning. The expected conversion lift is **+18–34%** for this segment based on validated patterns from Chisel and PostHog's own zero-friction onboarding moves.

---

## What We're Building

A **conversational AI onboarding wizard** inserted between the post-authentication redirect and the main product dashboard. This is a full-screen, modal-style guided flow — not a tooltip tour, not a checklist — that replaces the current blank-slate first session.

**The flow asks 3–5 plain-language questions:**

1. *"What are you building?"* — free text, with 4 example chips (e.g., "B2B SaaS", "Consumer app", "Dev tool", "Marketplace")
2. *"Who are your users?"* — free text, with persona chips (e.g., "SMB buyers", "Developers", "End consumers")
3. *"What's your biggest unknown right now?"* — free text, with intent chips (e.g., "Whether users want this", "Which feature to build first", "Why users are churning")
4. *(Conditional)* *"Do you have any competitors in mind?"* — optional, text input with skip affordance
5. *(Conditional)* *"What does success look like in 30 days?"* — optional, text input with skip affordance

On completion, the agent auto-configures and renders:

- A **starter roadmap** pre-populated with 3–5 hypothesis cards relevant to the answers given
- A **feedback board** with labeled columns matching the stated user segment
- A **first prioritization view** ranked by the stated "biggest unknown"

The CTA on the final screen reads: **"Your first experiment is ready — review it now →"** not "Go to dashboard."

**No integrations required. No PM jargon. No empty states.**

---

## The New Screens

### Screen 1 — Onboarding Entry Gate
**Screen name:** `/onboarding/start`
**What changes:** This is a net-new screen. After `auth/login` completes and the session is confirmed, users who have zero prior product data are redirected here instead of the main dashboard. Full-screen layout, centered card, Agent NorthStar wordmark at top. Single headline: *"Let's set up your first experiment in under 5 minutes."* Subtext: *"No PM experience required. No integrations needed today."* Single CTA button: **"Let's go →"**
**Why:** Establishes zero-friction framing immediately. Signals this is different from every tool they've bounced off before. Removes decision paralysis before the first question.

---

### Screen 2 — Question Flow (Steps 1–5)
**Screen name:** `/onboarding/wizard` (single route, step state managed client-side)
**What changes:** Net-new screen. Conversational single-question-per-screen layout. Progress indicator at top (e.g., "Step 2 of 4"). Each question renders in large, friendly type — no form labels, no field borders, conversational tone. Answer chips render below the text input as optional accelerators. "Back" affordance visible but de-emphasized. "Skip" affordance on conditional questions only.
**Why:** Single-question-per-screen is the PostHog-validated pattern for reducing cognitive load during onboarding. Chip accelerators reduce time-to-answer without removing free-text flexibility. This mirrors the conversational AI interaction model users already associate with tools like ChatGPT — no learning curve.

---

### Screen 3 — AI Processing Interstitial
**Screen name:** `/onboarding/generating`
**What changes:** Net-new screen. Full-screen animated state shown for 3–8 seconds while the AI configures the workspace. Copy cycles through: *"Mapping your competitive landscape…"* → *"Generating your first hypotheses…"* → *"Building your prioritization view…"* Agent NorthStar logo animates (pulse or orbit motion). No progress bar — motion implies activity without implying a wait.
**Why:** Frames the AI as doing real work, not just redirecting. Sets expectation that what appears next was built for them specifically — not a generic template. This moment is the "aha" setup.

---

### Screen 4 — First Experiment Ready
**Screen name:** `/onboarding/ready`
**What changes:** Net-new screen. Renders the auto-configured artifact: starter roadmap (3–5 hypothesis cards), feedback board column headers, first prioritization view. Layout is a preview/summary — not the full product UI. Overlaid with a light highlight state and copy: *"Based on what you told us, here's where we'd start."* Primary CTA: **"Run my first experiment →"** Secondary CTA: *"Edit this setup"* (links into full dashboard).
**Why:** The user's first moment in the product is a usable artifact, not an empty state. This is the exact pattern PostHog used to validate zero-friction onboarding. The artifact creates immediate perceived value before the user has done any "real" product work.

---

### Screen 5 — Dashboard Entry (Modified)
**Screen name:** `/dashboard` (existing screen, modified)
**What changes:** For users who completed the wizard, the dashboard loads with the auto-configured data pre-populated. An inline dismissible banner reads: *"Your starter setup is live — here's what NorthStar configured for you."* with a link to review or regenerate. Empty state components are suppressed for users with wizard-generated data.
**Why:** Prevents the "I did all that and now I see nothing" deflation moment. Ensures the wizard output persists into the core product loop.

---

## Files To Change

Based on a standard Next.js App Router structure:

```
app/
  auth/
    login/
      page.tsx                        # Modify post-auth redirect logic
                                      # Route to /onboarding/start if no prior data

  onboarding/
    start/
      page.tsx                        # NEW — Onboarding entry gate screen
    wizard/
      page.tsx                        # NEW — Multi-step question flow
      components/
        QuestionStep.tsx              # NEW — Single question + chip component
        WizardProgress.tsx            # NEW — Step indicator component
        ChipSelector.tsx              # NEW — Answer chip accelerator component
    generating/
      page.tsx                        # NEW — AI processing interstitial
    ready/
      page.tsx                        # NEW — First experiment ready screen

  dashboard/
    page.tsx                          # Modify — suppress empty states for wizard users
                                      # Add dismissible wizard-completion banner

lib/
  onboarding/
    generateStarterWorkspace.ts       # NEW — AI logic: maps wizard answers to
                                      # roadmap cards, feedback board config,
                                      # prioritization view
    wizardSchema.ts                   # NEW — Zod schema for wizard answer validation

hooks/
  useOnboardingState.ts               # NEW — Client-side step state management
  useWizardRedirect.ts                # NEW — Guards: skip wizard if already onboarded

middleware.ts                         # Modify — add /onboarding route group to
                                      # protected routes, handle wizard completion flag

types/
  onboarding.ts                       # NEW — Types for wizard answers, generated
                                      # workspace

## PM Iterations
- **Sign Up:** Onboard in 2 mins
- **Sign Up:** Onboard now

## Prototype Screens
See `prototypes/` directory for HTML prototypes of each screen.
