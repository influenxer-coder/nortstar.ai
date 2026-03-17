## Agent NorthStar – Product & System Overview

This document is for the **backend coding agent** collaborating with the existing **Next.js + Supabase frontend**. It explains:

- What the product does and how it behaves from the user’s point of view
- How the codebase is organized (frontend, API routes, libraries)
- The core **database schema** relevant to agents, projects, onboarding, and artifacts
- The **onboarding flows** and how Step 1’s strategy agent integrates with the rest of the system
- Where backend agents should plug in, and which contracts to keep stable

All file paths below are relative to the repo root.

---

## 1. Product Overview

**Agent NorthStar** is an autonomous product improvement agent for B2B SaaS:

- Reads analytics (PostHog, and/or other tools)
- Forms **ranked hypotheses** about what to change
- Generates **Cursor / Claude Code–ready specs**
- Drives changes via coding agents (e.g. Claude Code, Cursor) and GitHub
- Measures impact and **attributes revenue** back to each change

Target user: **VP / Head of Product** at Series B–D SaaS, being asked to ship more without adding headcount.

Key concepts:

- **Projects / products**: What the user is onboarding – URL, strategy docs, metrics, ICP.
- **Agents**: Internal analysis/experimentation agents attached to a product.
- **Hypotheses**: Ranked suggestions for what to build or change.
- **Artifacts**: PRDs, insights, roadmaps, analytics artifacts.
- **Brain**: Central knowledge/pattern store (admin-only views) that learns from hypotheses and outcomes.

---

## 2. High-level Architecture

### 2.1 Frontend

**Framework**: Next.js 14 (App Router), TypeScript, Tailwind, Radix UI.

Key entry points:

- `app/page.tsx` – Marketing homepage (dark, minimal, hero, CTA → `/auth/login`).
- `app/dashboard/page.tsx` – Authenticated dashboard shell; loads products and agents, renders `DashboardHome`.
- `app/onboarding/product/page.tsx` – Entry for **multi-step product onboarding**. Checks auth and renders `ProductOnboardingFlow` as a client component.
- `app/dashboard/layout.tsx` – Dashboard layout, side nav, and **auth + onboarding gate** (`onboarding_completed` check).

Global layout:

- `app/layout.tsx` – Root `Metadata`, `<html>` and `<body>`, PostHog client injection.
- `app/globals.css` – Global Tailwind and design tokens (dark theme).

UI components:

- `components/` – Shared UI (cards, button, textarea, dialog, etc.), command palette, PostHog provider.
- `components/chat/*` – Chat interface and message list (used by the “PM agent” features).
- `components/artifacts/*` – Rendering of PRD, Insight, Roadmap artifacts (Markdown via `react-markdown` + `remark-gfm`).

### 2.2 API Surface (Next.js Route Handlers)

All backend HTTP entry points are under `app/api/**/route.ts`. The important groups:

- **Projects & onboarding**
  - `app/api/projects/route.ts` – `POST` create project, `GET` list projects.
  - `app/api/projects/[id]/route.ts` – `GET`/`PATCH` project, onboarding fields, analytics config.
  - `app/api/enrich-project/route.ts` – Background enrichment of a project (crawl URL, fetch doc, call Claude, write back to `projects`).

- **Agents & hypotheses**
  - `app/api/agents/route.ts`, `app/api/agents/[id]/route.ts` – CRUD for agents.
  - `app/api/agents/[id]/hypotheses/route.ts`, `app/api/agents/[id]/hypotheses/[hid]/route.ts` – Read/modify hypotheses per agent.
  - `app/api/agents/[id]/hypotheses/[hid]/chat/route.ts` – Chat with a single hypothesis, including tool-use to update it.
  - `app/api/agents/[id]/analyze/route.ts` – Long-running analysis for an agent (Claude, PostHog, etc.).
  - `app/api/agents/[id]/simulate/route.ts` – Simulation endpoints (personas, regret gaps, etc.).

- **Artifacts & chat**
  - `app/api/chat/route.ts` – Orchestrates chat with the “PM agent” backend (`lib/agents/orchestrator.ts`).
  - `app/api/generate-prd/route.ts` – Generates PRDs.
  - `app/api/generate-insights/route.ts` – Generates insights from feedback/analytics.

- **Analytics integration**
  - `app/api/analytics/validate/route.ts` – Validates PostHog credentials.
  - `app/api/analytics/status/route.ts`, `app/api/analytics/install/route.ts` – Setup and status of analytics integration.
  - `app/api/posthog/validate/route.ts` – PostHog-only validation.

- **Brain (admin-only)**
  - `app/api/brain/stats/route.ts` – Used by admin Brain dashboard.
  - `app/api/brain/agents/route.ts`, `app/api/brain/agents/[id]/route.ts`.
  - `app/api/brain/knowledge/route.ts`, `app/api/brain/knowledge/[kid]/route.ts`.
  - `app/api/brain/patterns/route.ts`, `app/api/brain/patterns/[pid]/route.ts`.

- **Docs & strategy extraction**
  - `app/api/drive/files/route.ts` – Google Drive listing.
  - `app/api/extract-doc-text/route.ts` – Extracts plain text from uploaded docs for the strategy agent:
    - `.pdf` via `pdf-parse`
    - `.docx` via `mammoth.extractRawText`
    - `.txt` / `.md` via `Buffer.toString('utf-8')`

- **Auth & callbacks**
  - `app/api/auth/*` – GitHub, Slack, Google Drive auth and callbacks; Supabase email callback in `app/auth/callback/route.ts`.

There is **no direct internal RPC for the Modal strategy agent** – the frontend calls the Modal HTTP endpoint using `NEXT_PUBLIC_AGENT_URL`.

### 2.3 Libraries

- `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`
  - Typed clients for browser/server, and middleware that refreshes session / guards routes.
- `lib/agents/orchestrator.ts`
  - “PM Orchestrator” agent using Anthropic; accepts a task and returns both a conversational reply and an optional JSON artifact for PRDs/insights/roadmaps.
- `lib/brain.ts`, `lib/analyze-agent.ts`
  - Back-end logic for the “Brain” and agent analysis pipelines.
- `lib/taxonomy.ts`, `lib/rising-products-data.ts`, `lib/demo-data.ts`
  - Helper libraries for classification, demo content, rising products jobs.
- `lib/types.ts`
  - Shared TypeScript types mirroring core database entities (profiles, conversations, messages, artifacts, products, agents, hypotheses, simulations, etc.).

---

## 3. Database Model (Supabase / Postgres)

This is a high-level view of the tables that matter most for backend/agent work.

### 3.1 Organizations & auth (initial schema)

Defined in `supabase/migrations/001_initial_schema.sql`:

- `organizations` – Top-level tenant, with `name`, `domain`.
- `users` – Org users, with `email`, `full_name`, `role` (`admin`, `pm`, `viewer`).
- `data_sources`, `feedback_items`, `insights`, `prds` – Early design for org-level feedback and AI insight/PRD generation.

These are mostly **legacy / foundation** for future org-level features; current per-user product onboarding leans more on `profiles`, `projects`, and `agents`.

### 3.2 Profiles, conversations, artifacts

In `lib/types.ts` and subsequent migrations:

- `profiles`
  - `id` (FK to Supabase auth `users`)
  - `email`, `full_name`, `company`, `role`
  - `product_name`, `product_description`, `target_users`, `north_star_metric`
  - `onboarding_completed` (boolean) – gates access to the dashboard.

- `conversations`, `messages`
  - Standard chat history; `messages` include `role`, `content`, `agent_used`, `processing_time_ms`.

- `artifacts`
  - `{ id, user_id, conversation_id, message_id, type, title, content, quality_score, human_edited }`
  - `type` ∈ `['prd', 'insight', 'roadmap', 'analytics', 'user_story']`
  - `content` is JSON; interpreted by `PRDArtifact`, `InsightArtifact`, `RoadmapArtifact`, etc.

### 3.3 Projects & Product Onboarding

**Table:** `projects`  
Migrations: `016_projects.sql`, `017_projects_enrichment_schema.sql`, `018_projects_onboarding_fields.sql`.

Core columns:

- `id uuid` – primary key
- `user_id uuid` – owner; RLS always checks `auth.uid() = user_id`
- `name text` – derived from domain or user-specified product name
- `url text` – main product URL
- `description text` – (legacy; newer fields add more structure)
- `north_star_metric text`, `north_star_current text`, `north_star_target text`
- `icp jsonb` – `{ role, sizes, industry, pain_points }`
- `sub_metrics jsonb[]` – sub-metrics that ladder up to North Star
- `analytics_config jsonb` – credentials/config for analytics tools (PostHog, etc.)
- `enrichment_status text` – for enrichment pipeline (e.g. `pending`, `done`, `failed`)
- `onboarding_step int` – current step in onboarding (1–6)
- `onboarding_completed boolean` – true once Step 6 is done

**How it’s used:**

- `DashboardHome` inspects `projects` to determine if there’s an **in-progress product setup**, and exposes “Continue setup” with `?projectId=...&step=n`.
- `ProductOnboardingFlow`:
  - On mount, if `projectId` is present, it **fetches `/api/projects/[id]`** and populates fields from `url`, `doc_url`, `north_star_metric`, `icp`, `sub_metrics`, `analytics_config`, etc.
  - On each step submit, it `PATCH`es `projects` with the relevant fields and updates `onboarding_step`.
  - On Step 6, it sets `onboarding_completed=true` and clears `northstar_current_project_id` from localStorage.

### 3.4 Agents & Hypotheses

Agents (`supabase/migrations/003_agents.sql` and later migrations) evolved from a simple table to a richer schema; current TypeScript mirror in `lib/types.ts`:

Key columns (simplified):

- `agents`
  - `id`, `user_id`, `product_id` (FK to `products`), `name`
  - `url`, `github_repo`, `posthog_api_key`, `posthog_project_id`
  - `analytics_config jsonb` – raw analytics settings; may include PostHog credentials before promotion
  - `status` – includes `'draft'` and active statuses
  - `system_instructions`, `context_summary` – RAG / context pipeline
  - Slack integration fields: `slack_bot_token`, `slack_team_id`, `slack_user_id`, `slack_channel_id`
  - Additional fields like `google_drive_roadmap_url`, `main_kpi`

- `agent_hypotheses`
  - `id`, `agent_id`, `title`, `source`
  - `hypothesis text`, `suggested_change text`
  - `impact_score int`, `status` ∈ `['proposed', 'accepted', 'rejected', 'shipped']`
  - `pr_url` – link to GitHub PR

Agents are rendered in `/dashboard/agents/...` and orchestrated by `lib/analyze-agent.ts` and the various `/api/agents/*` routes.

### 3.5 Brain / Knowledge

Admin-only **Brain** tables (see `014_brain.sql`, `lib/brain.ts`):

- `brain_knowledge` – learned chunks of knowledge from hypotheses, outcomes, and content.
- `brain_patterns` – uplift patterns (e.g. “pricing page CTA”, “onboarding step 3 friction”).
- `brain_learning_events` / `brain_skill_weights` – track learning and confidence.

The **Brain dashboard** at `/admin/brain` visualizes:

- Knowledge chunk count
- Learning event count
- Skill weights
- Top patterns by confidence

Backend agents that generate patterns or learning events should write here; the frontend only reads.

---

## 4. Onboarding Flows (Frontend + Contracts)

### 4.1 Access Control & Entry Points

- If a user is signed in but `profiles.onboarding_completed = false`, `dashboard/layout.tsx` redirects them to `/onboarding`.
- `/onboarding/page.tsx`:
  - Checks auth; if `onboarding_completed` is already true, redirects to `/dashboard`.
  - Otherwise redirects to `/onboarding/product`.

### 4.2 Product Onboarding – `ProductOnboardingFlow`

File: `app/onboarding/product/ProductOnboardingFlow.tsx` (client component).

**Step labels / order**:

1. Product (URL & strategy doc; **strategy agent** Step 1)
2. NorthStar metric
3. ICP
4. Growth levers (sub-metrics)
5. Data sources (analytics tools)
6. Review & launch

Core state:

- `step` – current step (1–6).
- `projectId` – current project; created on Step 1 if not present.
- Step-specific state:
  - Step 1: `productUrl`, `productDescription`, `docFile`, `docTab`, Drive state.
  - Step 2: `nsMetric`, `nsCurrent`, `nsTarget`.
  - Step 3: `icpRole`, `icpSizes`, `icpIndustry`, `icpPain`.
  - Step 4: `subMetrics[]`.
  - Step 5: `analyticsInputs`, `analyticsConnected`, etc.

Each step’s submit handler:

- Validates minimal inputs.
- Calls `PATCH /api/projects/[id]` with the relevant fields and increments `onboarding_step`, or `POST /api/projects` when first creating.
- Calls `goToStep(n)` which updates the URL (`/onboarding/product?projectId=...&step=n`) and scrolls to top.

### 4.3 Step 1 – Strategy Agent Integration

**Goal:** User enters product URL + optional description/strategy doc → Step 1 calls an external **Modal strategy agent** that:

1. Streams **NDJSON** events with `{"type":"log"}` and a final `{"type":"result"}`.
2. Returns a **strategy JSON** object, which the frontend converts to a Markdown **Product Strategy Report**.

#### 4.3.1 File extraction

`extractStrategyDocText(file: File): Promise<string>`

- For `.txt` / `.md`:
  - Uses `FileReader.readAsText` on the client.
- For `.pdf` / `.docx`:
  - `POST /api/extract-doc-text` with a `FormData` field `file`.
  - That route:
    - Uses `pdf-parse` to read `.pdf`.
    - Uses `mammoth.extractRawText({ buffer })` to read `.docx`.
    - Returns `{ text: string }`.

The result text is passed to the agent as `strategy_doc`.

#### 4.3.2 Streaming helper – `runAgentStream`

Defined in `ProductOnboardingFlow.tsx`:

```ts
type AgentEvent =
  | { type: 'log'; message?: string; content?: string }
  | { type: 'result'; data: unknown }
  | { type: 'error'; message?: string }

async function runAgentStream({
  url,
  description = '',
  strategy_doc = '',
  onLog,
  onResult,
  onError,
  signal,
}: {
  url: string
  description?: string
  strategy_doc?: string
  onLog: (msg: string) => void
  onResult: (data: unknown) => void
  onError: (msg: string) => void
  signal?: AbortSignal
}): Promise<void> {
  const agentUrl = process.env.NEXT_PUBLIC_AGENT_URL
  if (!agentUrl) throw new Error('Agent URL not configured (NEXT_PUBLIC_AGENT_URL).')

  const res = await fetch(agentUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({ url, description, strategy_doc: strategy_doc || undefined }),
  })

  if (!res.ok || !res.body) throw new Error(res.status === 0 ? 'Connection lost' : `Request failed (${res.status})`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.trim()) continue
      let event: AgentEvent | null = null
      try {
        event = JSON.parse(line) as AgentEvent
      } catch {
        continue
      }
      if (event.type === 'log') {
        const msg = event.message ?? event.content ?? ''
        if (msg) onLog(msg)
      }
      if (event.type === 'result') onResult(event.data)
      if (event.type === 'error') onError(event.message ?? 'Unknown error')
    }
  }
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer.trim()) as AgentEvent
      if (event.type === 'log') {
        const msg = event.message ?? event.content ?? ''
        if (msg) onLog(msg)
      }
      if (event.type === 'result') onResult(event.data)
      if (event.type === 'error') onError(event.message ?? 'Unknown error')
    } catch {
      // ignore incomplete final line
    }
  }
}
```

**Contract for the Modal strategy agent:**

- Accepts `POST` JSON:

```jsonc
{
  "url": "https://yourproduct.com",
  "description": "human-written description",
  "strategy_doc": "plain text extracted from PDF/DOCX/TXT/MD"
}
```

- Streams **NDJSON** lines, with each line being a JSON object of the form:

```jsonc
{ "type": "log", "message": "Phase 1 – Understanding product…" }
{ "type": "log", "message": "Crawled homepage, found pricing & about." }
{ "type": "result", "data": { /* StrategyResultData JSON */ } }
// or
{ "type": "error", "message": "Human-readable error" }
```

Where `data` must be compatible with `StrategyResultData` in `strategyReportBuilder.ts`.

#### 4.3.3 StrategyResultData and Markdown report

`app/onboarding/product/strategyReportBuilder.ts` defines `StrategyResultData` and an exporter:

- `input_product` – `{ name, category, core_value_prop, job_it_replaces, target_customer }`
- `stage`, `framework_applied`, `framework_selection_reasoning`
- `icp_inferred_from_competitors`, `icp_inference_reasoning`
- `direct_competitors[]`, `indirect_competitors[]` – each with `name`, `what_they_do`, `complaints[]`, `quotes[]`.
- `status_quo` – `{ description, frustrations[] }`
- `emerging_trends[]`, `new_threats[]`
- `unmet_needs[]`, `momentum_advantages[]`
- `ranked_opportunities[]` – ranking, composite score, dimension scores & reasoning.
- `recommended_wedge`, `threats_to_monitor[]`

`buildReportMarkdown(data: StrategyResultData): string` constructs the full **Product Strategy Report** in Markdown, following the spec you provided (sections for Product Overview, Competitive Landscape, Market Trends, Unmet Needs, Ranked Opportunities, etc.).

The report is rendered with:

```tsx
<ReactMarkdown remarkPlugins={[remarkGfm]}>{step1ReportMd}</ReactMarkdown>
```

and downloadable as `northstar-strategy-{product-name}-{date}.md`.

### 4.4 Step 1 Streaming UI Behavior

In `ProductOnboardingFlow`:

- State:

```ts
const [step1Screen, setStep1Screen] = useState<'form' | 'streaming' | 'report'>('form')
const [step1CurrentStatus, setStep1CurrentStatus] = useState('')
const [step1Logs, setStep1Logs] = useState<string[]>([])
const [step1Running, setStep1Running] = useState(false)
const [step1Elapsed, setStep1Elapsed] = useState(0)
const [step1Error, setStep1Error] = useState('')
const [step1DetailsOpen, setStep1DetailsOpen] = useState(false)
const step1AbortRef = useRef<AbortController | null>(null)
```

- When the user submits Step 1:
  - Validates URL.
  - Extracts doc text (optional).
  - Creates `AbortController`, sets `step1Running=true`, `step1CurrentStatus='Connecting…'`, `step1Logs=[]`, `step1Screen='streaming'`.
  - Starts `runAgentStream`.

- On `onLog(msg)`:
  - `setStep1CurrentStatus(msg)`
  - `setStep1Logs(prev => [...prev, msg])`

- On `onResult(data)`:
  - Stops timer + running.
  - Stores `StrategyResultData` and builds Markdown.
  - `setStep1Screen('report')`.

- On `onError(msg)`:
  - Special handling for the “Could not parse model output as JSON / Raw output” error – tries to extract a ` ```json ... ``` ` block, parse it as `StrategyResultData`, and treat as a `result`.
  - Otherwise, stores `step1Error` and returns to the form with a **Dismiss / Try again** inline error.

---

## 5. Collaboration Guidance for Backend Agent

When extending or modifying behavior:

1. **Respect existing contracts**
   - `runAgentStream` expects **NDJSON** events as described above.
   - `StrategyResultData` is the canonical contract for Step 1’s strategy report.
   - Supabase RLS assumes user-level isolation (`auth.uid()` checks) for `projects`, `agents`, `agent_hypotheses`, etc.

2. **Where to plug in backend logic**
   - For **new long-running analyses**: prefer a new API under `app/api/.../route.ts` and, where needed, a separate Modal or background worker (Railway backend, Supabase function, etc.).
   - For **agent orchestration**:
     - Reuse `lib/agents/orchestrator.ts` style: accept a typed task, call Anthropic/OpenAI, return both human-readable reply and machine-readable artifact.
     - Wire via `app/api/chat/route.ts` or a new route.

3. **How to add new onboarding data**
   - Add fields to `projects` (new migration) and update:
     - `ProductOnboardingFlow` state and submit handlers.
     - `DashboardHome` if you want to surface new information.
   - Keep `onboarding_step` semantics intact so gating logic doesn’t break.

4. **Testing locally**
   - Use `.env.local` with:
     - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `NEXT_PUBLIC_AGENT_URL` (Modal strategy endpoint)
   - `npm run dev` and run through `/onboarding/product` to exercise the entire flow.

5. **Error reporting**
   - Surface **human-readable errors** in `event.message` for `{"type": "error"}` events.
   - For parse errors, include enough context but avoid dumping huge blobs; the frontend already attempts a best-effort recovery for code-fenced JSON.

This document should give you enough context to reason about **where** to put new backend features and how they will be consumed by the existing frontend. When in doubt, search this repo for similar patterns (e.g. `analyzeAgent`, `generate-prd`, `StrategyResultData`) and mirror those contracts.

