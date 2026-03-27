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

Solo founders and pre-seed teams represent a high-urgency whitespace segment that every major incumbent — Chisel, Canny, Amplitude, ProdPad, and Aha! — structurally ignores. Their pricing complexity and required PM expertise create a hard floor that excludes users who don't yet have a dedicated product function. PostHog has validated that zero-friction onboarding converts this segment: their recent velocity of shipped features (new dashboard, improved analytics, enhanced security in a 90-day window) demonstrates compound momentum built on fast activation loops. Chisel wins with Head of Product or PM at Series B/C — explicitly not solo founders. Canny wins with PM at Series C or enterprise. The gap is not a positioning accident; it is a structural blind spot baked into every competitor's ICP.

Agent NorthStar can capture this segment by shipping a conversational AI onboarding wizard that produces a usable artifact — starter roadmap, feedback board, first prioritization view — in under 5 minutes, with no PM jargon, no blank-slate setup, and no required integrations on day one. The expected conversion lift is +18–34%.

---

## What We're Building

A **Guided AI Onboarding Wizard** — a full-screen conversational flow triggered immediately after account creation, replacing any blank-slate dashboard or empty-state screen currently shown to new users.

**Specific changes:**

- **Screen:** Post-signup landing / new user dashboard entry point
- **Element:** Replace the current empty dashboard or first-login state with a full-screen modal wizard overlay
- **Copy change on CTA:** Change `"Get Started"` or any generic entry CTA to `"Set up your product in 5 minutes — no experience needed"`
- **Wizard asks exactly 3–5 plain-language questions in sequence:**
  1. `"What are you building?"` — free text, with 4 soft-select tiles (SaaS tool / mobile app / marketplace / something else)
  2. `"Who are your users?"` — free text, with examples: `"early adopters"`, `"SMB teams"`, `"developers"`
  3. `"What's your biggest unknown right now?"` — free text, with soft-select options: `"Will people pay for this?"` / `"Which feature to build next?"` / `"Why are users churning?"` / `"Not sure yet"`
  4. *(Conditional)* `"How many people are on your team?"` — solo / 2–5 / 6–15 / 15+
  5. *(Conditional)* `"Do you have any live users yet?"` — Yes / Getting first users / Not yet
- **On completion:** AI auto-generates and renders three artifacts without user configuration:
  - A **starter roadmap** with 3 pre-populated hypotheses derived from wizard answers
  - A **feedback board** with 2–3 placeholder feedback themes relevant to their stated unknown
  - A **first prioritization view** ranked by impact vs. effort, pre-seeded with the roadmap items
- **Progress indicator:** Minimal step dots (not a progress bar with percentages — no friction signaling)
- **Escape hatch:** Small `"Skip and set up manually"` text link, bottom-right, visible but not prominent

---

## The New Screens

### Screen 1: Wizard Entry Gate
**What changes:** The first post-login screen. Currently likely renders an empty dashboard or a generic welcome message. Replace with full-screen centered wizard container. White or near-white background. Single question visible at a time. No navigation chrome visible during the flow.

**Why:** Blank-slate interfaces are the primary activation killer for non-PM users. Chisel and ProdPad both fail here — their empty states assume the user knows what a roadmap should contain. Removing the blank slate removes the expertise requirement.

---

### Screen 2: Question Flow — Step 1 of 3–5
**What changes:** Renders `"What are you building?"` as a large-type question with a free-text input and four soft-select tile options below. Selecting a tile populates the text input but allows editing. Primary CTA: `"Next →"`. No back button on step 1.

**Why:** Soft-select tiles reduce cognitive load while preserving flexibility. PostHog's rapid iteration pattern (new dashboard, improved analytics shipped in 90 days) reflects a design philosophy of progressive disclosure — show structure, allow override.

---

### Screen 3: Question Flow — Steps 2–5 (same component, different content)
**What changes:** Same full-screen layout. Question text swaps. Tile options swap. For step 3 (`"What's your biggest unknown?"`) the tiles are larger and more emotionally resonant — these are the words the user will see reflected back in their generated artifacts, so they must feel accurate.

**Why:** Each answer directly influences the AI generation output. The user must feel the questions are intelligent, not form-filling. The copy must avoid PM jargon entirely — no `"epics"`, `"OKRs"`, `"velocity"`, or `"sprints"` appear in this flow.

---

### Screen 4: Generation Loading State
**What changes:** After final question, full-screen animated state. Large text: `"Building your setup…"`. Below it, three artifact names appear sequentially with a soft fade-in: `"Starter roadmap ✓"` → `"Feedback board ✓"` → `"First priorities ✓"`. Timer visible: `"This takes about 20 seconds"`.

**Why:** Perceived wait time is a conversion variable. Naming the artifacts as they "complete" builds anticipation and communicates value before the user sees the dashboard. This is the moment the user decides whether they got something real or another empty template.

---

### Screen 5: Generated Dashboard — First-Time State
**What changes:** The dashboard now renders with pre-populated content derived from wizard answers. Three panels visible above the fold: Roadmap (3 items), Feedback Board (2–3 themes), Prioritization View (ranked list). A persistent dismissible banner at top: `"NorthStar built this from your answers — edit anything"`. All content is editable inline.

**Why:** The artifact must feel personal, not generic. If the user said their biggest unknown is `"Which feature to build next?"`, the roadmap hypotheses must reflect discovery-stage thinking, not growth-stage optimization. Generic templates fail this test. Amplitude and Aha! both ship AI features (`AI Feedback`, `AI-powered analysis`) but target 200+ person companies — their AI outputs assume data richness that pre-seed teams don't have.

---

### Screen 6: Contextual Empty-State Prompts (Ongoing)
**What changes:** Any section of the dashboard that would normally show an empty state now shows a single-sentence AI prompt instead. Example: where a blank feedback board would appear, render: `"No feedback yet — NorthStar can help you write your first 3 user interview questions based on your setup."` With a `"Generate →"` inline CTA.

**Why:** Sustains the zero-expertise experience beyond onboarding. Canny's win profile (PM at Series C or enterprise) reveals they assume ongoing PM expertise to populate and maintain boards. This screen eliminates that assumption.

---

## Files To Change

Based on a standard Next.js app structure with a `/app` or `/pages` directory, authentication via a provider like NextAuth or Supabase, and a component library:

```
/app
  /auth
    /callback
      page.tsx                  ← Redirect logic post-signup; add wizard trigger flag
  /onboarding
    page.tsx                    ← NEW: Wizard entry point, full-screen route
    /steps
      step-what-building.tsx    ← NEW: Question 1 component
      step-who-users.tsx        ← NEW: Question 2 component
      step-biggest-unknown.tsx  ← NEW: Question 3 component
      step-team-size.tsx        ← NEW: Question 4 (conditional)
      step-live-users.tsx       ← NEW: Question 5 (conditional)
    wizard-shell.tsx            ← NEW: Shared layout, progress dots, navigation logic
    generation-loading.tsx      ← NEW: Animated artifact-build loading screen
  /dashboard
    page.tsx                    ← MODIFY: Detect onboarding_complete flag; render seeded vs. empty state
    /components
      roadmap-panel.tsx         ← MODIFY: Accept pre-seeded props from onboarding



## Prototype Screens
See `prototypes/` directory for HTML prototypes of each screen.
