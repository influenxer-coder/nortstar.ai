import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

const POSTHOG_HOST = 'https://app.posthog.com'

// Raw PostHog JS using only single-quoted strings so it can be safely
// embedded in a double-quoted JSX attribute or an HTML <script> tag.
function buildPosthogRawJs(apiKey: string): string {
  return `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split('.');2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}var m=(p=document.createElement('script')).type='text/javascript';p.async=!0,p.src=s.api_host+'/static/array.js',(r=document.getElementsByTagName('script')[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a='posthog',u.people=u.people||[],u.toString=function(t){var e='posthog';return'posthog'!==a&&(e+='.'+a),t||(e+=' (stub)'),e},u.people.toString=function(){return u.toString()+' (stub)'},o='capture identify alias people.set people.set_once set_config register register_once unregister opt_out_capturing has_opted_out_capturing opt_in_capturing reset isFeatureEnabled onFeatureFlags getFeatureFlag getFeatureFlagPayload reloadFeatureFlags group updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures getActiveMatchingSurveys getSurveys onSessionId'.split(' '),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init('${apiKey}',{api_host:'https://us.i.posthog.com',capture_pageview:!0,capture_pageleave:!0,autocapture:!0})`
}

// For Next.js JSX/TSX files: generates a JSX element with dangerouslySetInnerHTML.
// JSON.stringify produces a properly escaped double-quoted JS string.
function buildJsxScriptElement(apiKey: string): string {
  const raw = buildPosthogRawJs(apiKey)
  return `<script dangerouslySetInnerHTML={{ __html: ${JSON.stringify(raw)} }} />`
}

// For static HTML files: generates a plain <script> tag.
function buildHtmlScriptTag(apiKey: string): string {
  return `<!-- NorthStar Analytics -->\n<script>\n${buildPosthogRawJs(apiKey)}\n</script>`
}

function injectScript(content: string, fileType: string, apiKey: string): string {
  if (fileType === 'nextjs-app') {
    const jsx = buildJsxScriptElement(apiKey)
    // Self-closing <head /> → expand to include the script
    if (content.includes('<head />')) {
      return content.replace('<head />', `<head>\n        ${jsx}\n      </head>`)
    }
    if (content.includes('</head>')) {
      return content.replace('</head>', `      ${jsx}\n      </head>`)
    }
    // No explicit head — inject immediately before <body (valid JSX inside <html>)
    if (content.includes('<body')) {
      return content.replace('<body', `${jsx}\n      <body`)
    }
  }
  if (fileType === 'nextjs-pages') {
    const jsx = buildJsxScriptElement(apiKey)
    if (content.includes('</Head>')) {
      return content.replace('</Head>', `        ${jsx}\n        </Head>`)
    }
    if (content.includes('</head>')) {
      return content.replace('</head>', `      ${jsx}\n      </head>`)
    }
  }
  // Static HTML
  const html = buildHtmlScriptTag(apiKey)
  if (content.includes('</head>')) {
    return content.replace('</head>', `${html}\n</head>`)
  }
  return content + '\n' + html
}

export async function POST(request: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: { github_repo: string; agent_id: string; url?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { github_repo, agent_id } = body
  if (!github_repo || !agent_id) {
    return NextResponse.json({ error: 'github_repo and agent_id are required' }, { status: 400 })
  }

  const [owner, repo] = github_repo.split('/')
  if (!owner || !repo) {
    return NextResponse.json({ error: 'Invalid github_repo format (expected owner/repo)' }, { status: 400 })
  }

  // Fetch GitHub token
  const { data: tokenRow } = await supabase
    .from('user_context')
    .select('value')
    .eq('user_id', user.id)
    .eq('context_type', 'github')
    .eq('key', 'access_token')
    .maybeSingle()

  const githubToken = tokenRow?.value
  if (!githubToken) {
    return NextResponse.json({ error: 'GitHub not connected. Please reconnect in step 2.' }, { status: 400 })
  }

  const ghHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  }

  // --- 1. Create PostHog project under master account (if env vars present) ---
  let posthogApiKey = ''
  let posthogProjectId = ''

  const masterApiKey = process.env.POSTHOG_MASTER_API_KEY
  const masterOrgId = process.env.POSTHOG_MASTER_ORG_ID || '@current'

  if (masterApiKey) {
    try {
      const { data: agentRow } = await supabase.from('agents').select('name').eq('id', agent_id).single()
      const projectName = `NorthStar: ${agentRow?.name || agent_id}`
      const phRes = await fetch(`${POSTHOG_HOST}/api/organizations/${masterOrgId}/projects/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${masterApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: projectName }),
      })
      if (phRes.ok) {
        const phData = await phRes.json()
        posthogApiKey = phData.api_token || ''
        posthogProjectId = String(phData.id || '')
      }
    } catch {
      // Non-fatal — continue without managed PostHog
    }
  }

  // Fallback: use a placeholder key (PR still ships, user replaces the key)
  if (!posthogApiKey) {
    posthogApiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'REPLACE_WITH_YOUR_POSTHOG_KEY'
  }

  // --- 2. Detect framework and find target file ---
  const candidateFiles = [
    { path: 'app/layout.tsx', type: 'nextjs-app' },
    { path: 'app/layout.jsx', type: 'nextjs-app' },
    { path: 'pages/_document.tsx', type: 'nextjs-pages' },
    { path: 'pages/_document.jsx', type: 'nextjs-pages' },
    { path: 'index.html', type: 'static' },
    { path: 'public/index.html', type: 'static' },
  ]

  // Get default branch first
  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: ghHeaders })
  if (!repoRes.ok) {
    return NextResponse.json({ error: 'Could not access repository. Make sure the token has repo scope.' }, { status: 400 })
  }
  const repoData = await repoRes.json()
  const defaultBranch: string = repoData.default_branch || 'main'

  let targetFile: { path: string; type: string; content: string; sha: string } | null = null
  for (const { path, type } of candidateFiles) {
    const fileRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${defaultBranch}`,
      { headers: ghHeaders }
    )
    if (fileRes.ok) {
      const fileData = await fileRes.json()
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8')
      targetFile = { path, type, content, sha: fileData.sha }
      break
    }
  }

  if (!targetFile) {
    return NextResponse.json({
      error: 'Could not detect framework. Expected one of: app/layout.tsx, pages/_document.tsx, index.html',
    }, { status: 400 })
  }

  // --- 3. Check if PostHog already in the default branch ---
  const alreadyInRepo =
    targetFile.content.includes('posthog.init(') ||
    targetFile.content.includes('us.i.posthog.com') ||
    targetFile.content.includes('posthog-js')
  if (alreadyInRepo) {
    return NextResponse.json({ already_installed: true })
  }

  // --- 3b. Inject script ---
  const newContent = injectScript(targetFile.content, targetFile.type, posthogApiKey)
  if (newContent === targetFile.content) {
    return NextResponse.json({ error: 'Could not find a suitable injection point in the file.' }, { status: 400 })
  }

  // --- 4. Create branch ---
  const branchSuffix = agent_id.slice(0, 8)
  const branchName = `northstar/add-analytics-${branchSuffix}`

  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`,
    { headers: ghHeaders }
  )
  if (!refRes.ok) {
    return NextResponse.json({ error: 'Could not get branch reference' }, { status: 400 })
  }
  const refData = await refRes.json()
  const headSha: string = refData.object?.sha

  const createBranchRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/refs`,
    {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: headSha }),
    }
  )
  if (!createBranchRes.ok) {
    const errJson = await createBranchRes.json()
    // Ignore "already exists" so retries work
    if (!errJson.message?.toLowerCase().includes('already exists')) {
      return NextResponse.json({ error: `Could not create branch: ${errJson.message}` }, { status: 400 })
    }
  }

  // --- 5. Commit updated file ---
  // Re-fetch from the branch to get the current SHA. Also check if the branch content
  // already matches what we'd commit (no-op case from a previous retry) to skip the commit.
  let commitSha = targetFile.sha
  let skipCommit = false
  const branchFileRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${targetFile.path}?ref=${branchName}`,
    { headers: ghHeaders }
  )
  if (branchFileRes.ok) {
    const branchFileData = await branchFileRes.json()
    if (branchFileData.sha) {
      commitSha = branchFileData.sha
      try {
        const branchContent = Buffer.from(branchFileData.content.replace(/\n/g, ''), 'base64').toString('utf-8')
        if (branchContent === newContent) skipCommit = true
      } catch { /* ignore decode errors, just commit */ }
    }
  }

  if (!skipCommit) {
    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${targetFile.path}`,
      {
        method: 'PUT',
        headers: ghHeaders,
        body: JSON.stringify({
          message: 'feat: add NorthStar behavioral analytics',
          content: Buffer.from(newContent).toString('base64'),
          sha: commitSha,
          branch: branchName,
        }),
      }
    )
    if (!updateRes.ok) {
      const errJson = await updateRes.json()
      return NextResponse.json({ error: `Could not commit file: ${errJson.message}` }, { status: 400 })
    }
  }

  // --- 6. Create PR ---
  const prRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls`,
    {
      method: 'POST',
      headers: ghHeaders,
      body: JSON.stringify({
        title: 'NorthStar: Add behavioral tracking',
        body: `## NorthStar Analytics Setup\n\nThis PR adds PostHog analytics to enable your NorthStar agent to read user behavior signals.\n\n**What this adds:**\n- Click tracking on all interactive elements\n- Scroll depth measurement\n- Session recordings\n- Page view tracking\n\n**Managed by NorthStar** — no account needed.\n\nMerge this PR to activate your agent.`,
        head: branchName,
        base: defaultBranch,
      }),
    }
  )
  if (!prRes.ok) {
    const errJson = await prRes.json()
    // "Validation Failed" usually means a PR already exists for this branch — find and return it.
    const isAlreadyExists =
      errJson.message === 'Validation Failed' ||
      (errJson.errors as { message?: string }[] | undefined)?.some(e =>
        e.message?.toLowerCase().includes('pull request already exists')
      )
    if (isAlreadyExists) {
      const existingRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/pulls?head=${owner}:${branchName}&base=${defaultBranch}&state=all`,
        { headers: ghHeaders }
      )
      if (existingRes.ok) {
        const existing = await existingRes.json()
        if (Array.isArray(existing) && existing[0]?.html_url) {
          const pr = existing[0]
          return NextResponse.json({ pr_url: pr.html_url, pr_number: pr.number })
        }
      }
    }
    return NextResponse.json({ error: `Could not create PR: ${errJson.message}` }, { status: 400 })
  }
  const prData = await prRes.json()

  // --- 7. Save PostHog credentials to agent ---
  if (posthogProjectId) {
    await supabase.from('agents').update({
      posthog_api_key: posthogApiKey,
      posthog_project_id: posthogProjectId,
    }).eq('id', agent_id)
  }

  return NextResponse.json({ pr_url: prData.html_url, pr_number: prData.number })
}
