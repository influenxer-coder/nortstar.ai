import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

// ── helpers ─────────────────────────────────────────────────────────────────
function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
}

function userHash(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  return Math.abs(h).toString(36).slice(0, 6)
}

// ── GET: current launch state ───────────────────────────────────────────────
export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabase
    .from('opportunity_launches')
    .select('*')
    .eq('opportunity_id', params.id)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ launch: data ?? null })
}

// ── POST: create launch ─────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as {
    targeting_type: 'emails' | 'percentage' | 'category'
    targeting_value: Record<string, unknown>
    plan_markdown: string
    prototype_screens: unknown[]
    screen_comments: unknown[]
    variation: Record<string, unknown>
  }

  // Validate targeting
  const { targeting_type, targeting_value } = body
  if (!['emails', 'percentage', 'category'].includes(targeting_type)) {
    return NextResponse.json({ error: 'Invalid targeting type' }, { status: 400 })
  }

  // Get opportunity + product
  const { data: opportunity } = await supabase
    .from('opportunities')
    .select('*, projects!inner(name, url, strategy_json)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()
  if (!opportunity) return NextResponse.json({ error: 'Opportunity not found' }, { status: 404 })

  const product = (opportunity as Record<string, unknown>).projects as Record<string, unknown> | null
  const strategy = (product?.strategy_json ?? {}) as Record<string, unknown>
  const match = (strategy.match ?? {}) as Record<string, unknown>

  // Get GitHub token
  const { data: ghRow } = await supabase
    .from('user_context')
    .select('value')
    .eq('user_id', user.id)
    .eq('context_type', 'github')
    .eq('key', 'access_token')
    .maybeSingle()
  const githubToken = ghRow?.value?.trim()

  // Get repo from agents table (linked to this product)
  const productId = opportunity.project_id as string
  const { data: agent } = await supabase
    .from('agents')
    .select('github_repo')
    .eq('product_id', productId)
    .not('github_repo', 'is', null)
    .limit(1)
    .maybeSingle()

  const githubRepo = agent?.github_repo?.trim() ?? null

  // Build flag key and branch name
  const oppSlug = slugify(opportunity.title ?? 'experiment')
  const hash = userHash(user.id)
  const flagKey = `northstar-exp-${oppSlug}-${hash}`
  const branchName = `northstar/${oppSlug}-${hash}`

  // Create launch record
  const { data: launch, error: insertErr } = await supabase
    .from('opportunity_launches')
    .upsert({
      opportunity_id: params.id,
      user_id: user.id,
      targeting_type,
      targeting_value,
      flag_key: flagKey,
      flag_enabled: true,
      github_repo: githubRepo,
      branch_name: branchName,
      plan_markdown: body.plan_markdown ?? '',
      prototype_screens: body.prototype_screens ?? [],
      screen_comments: body.screen_comments ?? [],
      variation: body.variation ?? {},
      status: 'preparing',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'opportunity_id,user_id' })
    .select()
    .single()

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // If no GitHub, return launch without PR
  if (!githubToken || !githubRepo) {
    await supabase.from('opportunity_launches')
      .update({ status: 'under_testing', updated_at: new Date().toISOString() })
      .eq('id', launch.id)

    return NextResponse.json({
      launch: { ...launch, status: 'under_testing' },
      github_connected: false,
      flag_snippet: buildFlagSnippet(flagKey),
    })
  }

  // ── GitHub: create branch + PR ──────────────────────────────────────────
  const [owner, repo] = githubRepo.split('/')
  const ghHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }

  try {
    // 1. Get default branch SHA
    const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders })
    if (!repoRes.ok) throw new Error('Could not access repository')
    const repoData = await repoRes.json()
    const defaultBranch: string = repoData.default_branch || 'main'

    const refRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
      { headers: ghHeaders }
    )
    if (!refRes.ok) throw new Error('Could not get branch reference')
    const refData = await refRes.json()
    const headSha: string = refData.object?.sha

    // 2. Create branch
    const createBranchRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/refs`,
      {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: headSha }),
      }
    )
    if (!createBranchRes.ok) {
      const err = await createBranchRes.json()
      if (!err.message?.toLowerCase().includes('already exists')) {
        throw new Error(`Could not create branch: ${err.message}`)
      }
    }

    // 3. Commit spec file
    const specContent = buildSpecFile(opportunity, body, flagKey, targeting_type, targeting_value)
    await commitFile(owner, repo, branchName, 'northstar-experiment/SPEC.md', specContent, 'docs: NorthStar experiment spec', ghHeaders)

    // 4. Commit flag snippet
    const snippetContent = buildFlagSnippet(flagKey)
    await commitFile(owner, repo, branchName, 'northstar-experiment/flag-snippet.js', snippetContent, 'feat: NorthStar feature flag snippet', ghHeaders)

    // 5. Commit prototype HTML files
    const screens = (body.prototype_screens ?? []) as { id: string; label: string; component_code: string }[]
    for (let i = 0; i < screens.length; i++) {
      const s = screens[i]
      if (s.component_code) {
        await commitFile(
          owner, repo, branchName,
          `northstar-experiment/prototypes/${slugify(s.label)}.html`,
          s.component_code,
          `docs: prototype screen — ${s.label}`,
          ghHeaders
        )
      }
    }

    // 6. Create PR
    const targetingDesc = targeting_type === 'emails'
      ? `**Emails:** ${(targeting_value.emails as string[])?.join(', ')}`
      : targeting_type === 'percentage'
        ? `**${targeting_value.percentage}% of users** (deterministic hash)`
        : `**Category:** ${targeting_value.category}`

    const prBody = `## 🧪 NorthStar Experiment

**Opportunity:** ${opportunity.title}
**Goal:** ${opportunity.goal ?? ''}
**Variation:** ${(body.variation as Record<string, unknown>)?.name ?? ''}

### Targeting
${targetingDesc}

### Feature Flag
Flag key: \`${flagKey}\`
Endpoint: \`${process.env.NEXT_PUBLIC_SITE_URL}/api/flags/${flagKey}\`

### How to integrate
Add the snippet from \`northstar-experiment/flag-snippet.js\` to your app.
See \`northstar-experiment/SPEC.md\` for the full implementation plan.
Prototype screens are in \`northstar-experiment/prototypes/\`.

### Plan
${(body.plan_markdown ?? '').slice(0, 3000)}

${(body.screen_comments as { screenLabel: string; instruction: string }[])?.length > 0
  ? `### PM Iterations\n${(body.screen_comments as { screenLabel: string; instruction: string }[]).map(c => `- **${c.screenLabel}:** ${c.instruction}`).join('\n')}`
  : ''}

---
🤖 Created by [NorthStar AI](${process.env.NEXT_PUBLIC_SITE_URL})`

    let prUrl = ''
    let prNumber = 0

    const prRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls`,
      {
        method: 'POST',
        headers: ghHeaders,
        body: JSON.stringify({
          title: `🧪 NorthStar: ${opportunity.title}`,
          body: prBody,
          head: branchName,
          base: defaultBranch,
        }),
      }
    )

    if (prRes.ok) {
      const prData = await prRes.json()
      prUrl = prData.html_url
      prNumber = prData.number
    } else {
      // PR might already exist
      const existingRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${branchName}&state=open`,
        { headers: ghHeaders }
      )
      if (existingRes.ok) {
        const existing = await existingRes.json()
        if (Array.isArray(existing) && existing[0]) {
          prUrl = existing[0].html_url
          prNumber = existing[0].number
        }
      }
    }

    // 7. Update launch record
    await supabase.from('opportunity_launches')
      .update({
        status: 'under_testing',
        pr_url: prUrl || null,
        pr_number: prNumber || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', launch.id)

    return NextResponse.json({
      launch: { ...launch, status: 'under_testing', pr_url: prUrl, pr_number: prNumber, branch_name: branchName },
      github_connected: true,
      flag_snippet: buildFlagSnippet(flagKey),
    })
  } catch (e) {
    // Still mark as under_testing even if GitHub fails — the flag works independently
    await supabase.from('opportunity_launches')
      .update({ status: 'under_testing', updated_at: new Date().toISOString() })
      .eq('id', launch.id)

    return NextResponse.json({
      launch: { ...launch, status: 'under_testing' },
      github_connected: true,
      github_error: (e as Error).message,
      flag_snippet: buildFlagSnippet(flagKey),
    })
  }
}

// ── PATCH: rollback or deploy to all ────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action } = await req.json() as { action: 'rollback' | 'deploy_all' }

  const { data: launch } = await supabase
    .from('opportunity_launches')
    .select('*')
    .eq('opportunity_id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!launch) return NextResponse.json({ error: 'No launch found' }, { status: 404 })

  if (action === 'rollback') {
    // Disable flag + close PR if exists
    await supabase.from('opportunity_launches')
      .update({
        status: 'rolled_back',
        flag_enabled: false,
        rolled_back_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', launch.id)

    // Close PR via GitHub if we have the info
    if (launch.pr_number && launch.github_repo) {
      try {
        const { data: ghRow } = await supabase
          .from('user_context')
          .select('value')
          .eq('user_id', user.id)
          .eq('context_type', 'github')
          .eq('key', 'access_token')
          .maybeSingle()
        const token = ghRow?.value?.trim()
        if (token) {
          const [owner, repo] = (launch.github_repo as string).split('/')
          await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${launch.pr_number}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' },
            body: JSON.stringify({ state: 'closed' }),
          })
        }
      } catch { /* best effort */ }
    }

    return NextResponse.json({ status: 'rolled_back' })
  }

  if (action === 'deploy_all') {
    await supabase.from('opportunity_launches')
      .update({
        status: 'deployed_to_all',
        deployed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', launch.id)

    return NextResponse.json({ status: 'deployed_to_all' })
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
}

// ── Helpers ─────────────────────────────────────────────────────────────────
async function commitFile(
  owner: string, repo: string, branch: string,
  path: string, content: string, message: string,
  headers: Record<string, string>
) {
  // Check if file exists to get SHA
  let sha: string | undefined
  const existRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
    { headers }
  )
  if (existRes.ok) {
    const existData = await existRes.json()
    sha = existData.sha
  }

  await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        ...(sha ? { sha } : {}),
      }),
    }
  )
}

function buildSpecFile(
  opportunity: Record<string, unknown>,
  body: Record<string, unknown>,
  flagKey: string,
  targetingType: string,
  targetingValue: Record<string, unknown>
) {
  const variation = (body.variation ?? {}) as Record<string, unknown>
  const comments = (body.screen_comments ?? []) as { screenLabel: string; instruction: string }[]

  return `# NorthStar Experiment Spec

## Opportunity
**${opportunity.title}**
${opportunity.evidence ?? ''}

## Goal
${opportunity.goal ?? ''}

## Variation
**${variation.name ?? ''}**
${variation.pattern ?? ''}

## Targeting
- Type: ${targetingType}
- Value: ${JSON.stringify(targetingValue)}

## Feature Flag
- Key: \`${flagKey}\`
- Check endpoint: \`${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/api/flags/${flagKey}?email={user_email}\`

## Plan
${body.plan_markdown ?? ''}

${comments.length > 0 ? `## PM Iterations\n${comments.map(c => `- **${c.screenLabel}:** ${c.instruction}`).join('\n')}` : ''}

## Prototype Screens
See \`prototypes/\` directory for HTML prototypes of each screen.
`
}

function buildFlagSnippet(flagKey: string) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nortstar-ai.vercel.app'
  return `// NorthStar Experiment Flag
// Add this to your app to control who sees the experiment.
//
// Option 1: Async check (recommended)
async function checkNorthStarFlag(userEmail, userId) {
  try {
    const res = await fetch(
      '${siteUrl}/api/flags/${flagKey}?email=' + encodeURIComponent(userEmail) + '&user_id=' + encodeURIComponent(userId || '')
    );
    const data = await res.json();
    return data.enabled === true;
  } catch {
    return false; // fail closed
  }
}

// Option 2: React hook
// import { useState, useEffect } from 'react';
//
// function useNorthStarFlag(userEmail, userId) {
//   const [enabled, setEnabled] = useState(false);
//   useEffect(() => {
//     checkNorthStarFlag(userEmail, userId).then(setEnabled);
//   }, [userEmail, userId]);
//   return enabled;
// }
//
// Usage in component:
// const showExperiment = useNorthStarFlag(user.email, user.id);
// if (showExperiment) {
//   return <NewExperience />;
// }
// return <CurrentExperience />;
`
}
