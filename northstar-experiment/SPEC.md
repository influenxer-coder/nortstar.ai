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

Solo founders and pre-seed teams represent a high-urgency, unserved whitespace segment that every current incumbent explicitly fails to convert. The failure mode is consistent and structural: **pricing complexity plus required PM expertise creates a zero-to-one barrier** that eliminates the segment before they reach value.

Chisel wins with "Head of Product or Product Manager at a Series B/C company" — meaning their product is architected for someone who already knows what a prioritization framework is. ProdPad wins with "Head of Product at a Series C company." Amplitude wins at "200+ person companies." The pattern is universal: every competitor has optimized their onboarding for practitioners, not builders.

PostHog is the closest exception — they win with "Product Engineer or Head of Product at a Series C or enterprise company" and have shipped a substantial feature surface (new dashboard, improved analytics, enhanced security in the last 90 days), suggesting rapid iteration velocity. They are the most dangerous validator of the zero-friction thesis, not a threat to this specific segment play.

Agent NorthStar's current homepage speaks to the same ICP gap: "Run NorthStar on my product →" assumes the visitor already has a product with trackable flows and a PM to approve specs. A solo founder at pre-seed has none of that scaffolding. The opportunity is to intercept them **before they bounce on the blank-slate problem**, using a conversational AI wizard that produces a real artifact — not a demo, not a tour — in under 5 minutes.

If a user lands, answers 3–5 plain-language questions, and leaves with a configured roadmap + prioritization view, the marginal cost of "not getting it" collapses to zero. That is the bet.

---

## What We're Building

A **Conversational AI Onboarding Wizard** — a new, distinct entry path on the Agent NorthStar sign-up or post-auth flow that replaces the blank-slate dashboard with a guided 3–5 question sequence.

**Specific changes:**

- **New CTA on homepage hero**: Add a secondary button below the primary "Run NorthStar on my product →" reading: **"Just starting out? Set up in 5 minutes →"** — targeting the pre-seed / solo founder who self-identifies as not-yet-a-PM.
- **New onboarding route** (`/onboarding/guided`): A full-screen conversational step sequence, one question per screen, no sidebar navigation, no empty tables, no integration prompts.
- **Question sequence** (plain language, no jargon):
  1. "What are you building?" *(free text, 1–2 sentences)*
  2. "Who is it for?" *(free text or optional category pills: consumers / small businesses / developers / internal teams)*
  3. "What's your biggest unknown right now?" *(pills: Will people pay for it? / Are they using the right features? / Why are users dropping off? / What to build next?)*
  4. "How many people are on your team?" *(1 / 2–5 / 6–15 / 16+)*
  5. *(Conditional)* "Do you have any users yet?" *(Yes — some / Yes — hundreds+ / Not yet)*
- **Auto-generated artifact**: On completion, NorthStar's AI synthesizes answers and produces:
  - A named **starter roadmap** (3 pre-populated hypotheses derived from their stated unknown)
  - A **feedback board** with 2–3 seeded questions to ask their first users
  - A **first prioritization view** ranked by the stated unknown
- The artifact screen headline reads: **"Here's your starting point. You can change anything."** — removing the terror of the blank slate.

---

## The New Screens

### Screen 1 — Homepage Hero (modified)
**What changes:** Add a second CTA button beneath the existing primary CTA.
- Current: `[Run NorthStar on my product →]`
- Add: `[Just starting out? Set up in 5 minutes →]` — lower visual weight (outlined, not filled), positioned directly below.
- **Why:** Creates a self-selection fork. The existing ICP (VP/Head of Product at Series B–D) continues on the current path. The new segment self-routes without polluting the primary conversion funnel.

---

### Screen 2 — Onboarding Entry Gate (`/onboarding/guided`)
**What changes:** New screen, full-page, no app chrome.
- Headline: **"Let's build your first product map."**
- Subhead: **"Answer 3–5 questions. We'll set everything up."**
- Single "Start →" button.
- Progress indicator: 5 dots, none filled yet.
- **Why:** Signals low commitment, establishes the 5-minute contract, removes the cognitive load of a feature-heavy dashboard appearing all at once.

---

### Screen 3–7 — Question Steps (`/onboarding/guided/step/[1–5]`)
**What changes:** Five sequential full-screen question cards, one per route step.
- Each card: question in large type (24–28px), input method appropriate to question (free text or pill selection), "Continue →" CTA, back chevron top-left.
- No progress bar percentage — just dot indicators (reduces anxiety about length).
- Step 3 (biggest unknown): pill answers only — no free text — to reduce drop-off from open-ended paralysis.
- **Why:** Pill-based answers on the pivotal question (biggest unknown) mirror how PostHog reduced onboarding friction through opinionated defaults. Forces completion over reflection.

---

### Screen 8 — Generating Artifact (`/onboarding/guided/generating`)
**What changes:** New interstitial screen shown for 4–8 seconds while AI configures the workspace.
- Animated visual: three cards assembling (roadmap / feedback board / prioritization view) with labels appearing.
- Copy cycling through: *"Mapping your unknowns…" → "Building your first roadmap…" → "Setting up your feedback board…"*
- **Why:** Creates perceived value of AI work. Raises the psychological worth of the artifact before the user sees it. Borrowed from Chisel's pattern of making setup feel effortful on the system's side, not the user's.

---

### Screen 9 — Artifact Reveal (`/onboarding/guided/result`)
**What changes:** New screen — the first real dashboard view, but pre-populated.
- Headline: **"Here's your starting point. You can change anything."**
- Three panels visible above the fold:
  - **Roadmap panel**: 3 hypothesis cards, each titled with an assumption derived from their stated unknown (e.g., if they said "Will people pay for it?" → cards like "Test willingness to pay at $X/mo", "Validate core use case with 5 users", "Identify the moment they'd pay vs. leave").
  - **Feedback board**: 2–3 pre-seeded user questions.
  - **Prioritization view**: Ranked list, pre-labeled with their product name from Question 1.
- Persistent bottom bar: **"Invite a collaborator"** (single email field) and **"Connect your first data source"** — both optional, neither blocking.
- **Why:** The artifact exists before they have to do anything. The blank-slate problem is eliminated. Optionality (invite / connect) is presented after value is delivered, not before — inverting the standard SaaS onboarding mistake.

---

### Screen 10 — Homepage `/` (secondary modification)
**What changes:** Add a minimal social proof line beneath the new secondary CTA.
- Copy: **"Used by 200+ early-stage builders with no PM background."** *(update number as real data accrues)*
- **Why:** Reduces self-selection anxiety for the target segment. Signals "this is for you" without repositioning the primary brand message.

---

## Files To Change

Based on standard Next.js App Router structure:

```
/app
  /page.tsx                                  # Homepage — add secondary CTA button + social proof line

  /onboarding
    /guided
      /page.tsx                              # Onboarding entry gate (Screen 2)
      /step
        /[step]
          /page.tsx                          # Dynamic question step renderer (Screens 3–7)
      /generating
        /page.tsx                            # Artifact generation interstitial (Screen 8)
      /result
        /page.tsx                            #

## PM Iterations
- **Sign Up:** chaneg this to start now

## Prototype Screens
See `prototypes/` directory for HTML prototypes of each screen.
