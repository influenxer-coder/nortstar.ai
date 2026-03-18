# DB Schema — Cron Job Reference

## Auth / User Identity

User identity is managed by **Supabase Auth** (`auth.users`). This is the source of truth for email addresses.

| Column | Notes |
|--------|-------|
| `auth.users.id` | UUID — primary key, used as `user_id` FK everywhere |
| `auth.users.email` | User's email address |
| `auth.users.created_at` | Signup timestamp |
| `auth.users.last_sign_in_at` | Last login |

> To get email in a query: `JOIN auth.users ON auth.users.id = <table>.user_id`
> Requires **service role key** to read `auth.users` (bypasses RLS).

---

## User Progress — Key Table: `projects`

This is the primary table to determine where a user is in the onboarding funnel.

```sql
SELECT
  p.id,
  p.user_id,
  u.email,
  p.name,
  p.url,
  p.onboarding_step,       -- current step (1–5); NULL = never started
  p.onboarding_completed,  -- true = finished all 5 steps
  p.north_star_metric,     -- set at step 2
  p.analytics_config,      -- set at step 3; {} = not connected
  p.sub_metrics,           -- set at step 4
  p.created_at,
  p.updated_at             -- last touched timestamp
FROM projects p
JOIN auth.users u ON u.id = p.user_id
```

### Onboarding step mapping

| `onboarding_step` | `onboarding_completed` | User's last action |
|--------------------|------------------------|--------------------|
| NULL / 1 | false | Signed up, entered product URL (Step 1 in progress) |
| 2 | false | Completed Step 1 (Product), working on NorthStar |
| 3 | false | Completed NorthStar step, working on Data Sources |
| 4 | false | Connected analytics, working on Growth Levers |
| 5 | false | Completed Growth Levers, working on Review |
| any | **true** | Fully onboarded — project is live |

---

## Agent Table: `agents`

Users who went through the **agent creation** flow (separate from product onboarding).

```sql
SELECT
  a.id,
  a.user_id,
  u.email,
  a.name,
  a.url,
  a.status,          -- 'draft' | 'Analyzing' | 'Active'
  a.created_at,
  a.updated_at
FROM agents a
JOIN auth.users u ON u.id = a.user_id
```

---

## Cron Job Logic

### Query: users needing a nudge

```sql
-- Users with incomplete onboarding, last active > 24h ago
SELECT
  u.email,
  p.user_id,
  p.id            AS project_id,
  p.name          AS product_name,
  p.onboarding_step,
  p.onboarding_completed,
  p.north_star_metric,
  p.analytics_config,
  p.updated_at
FROM projects p
JOIN auth.users u ON u.id = p.user_id
WHERE
  p.onboarding_completed = false
  AND p.updated_at < now() - interval '24 hours'
ORDER BY p.updated_at DESC;
```

### Email content by step

| Step | Subject | CTA |
|------|---------|-----|
| 1 (Product) | "Finish setting up your NorthStar" | Link to `/onboarding/product?projectId=<id>&step=1` |
| 2 (NorthStar) | "Your NorthStar metric is one step away" | `step=2` |
| 3 (Data Sources) | "Connect your analytics to activate NorthStar" | `step=3` |
| 4 (Growth Levers) | "Define what moves your NorthStar" | `step=4` |
| 5 (Review) | "You're almost live — review and launch" | `step=5` |
| completed | (no email) | — |

Deep-link pattern: `https://app.northstar.ai/onboarding/product?projectId={p.id}&step={p.onboarding_step}`

---

## Summary

- **Email** → `auth.users.email` (service role only)
- **Last action + stage** → `projects.onboarding_step` + `projects.updated_at`
- **Fully onboarded** → `projects.onboarding_completed = true`
- **Agent-only users** (skipped product onboarding) → `agents` table, no `projects` row
