import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Fetch a fresh access token from the stored refresh token
async function getAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) return null
  const data = await res.json() as { access_token?: string }
  return data.access_token ?? null
}

// GET /api/drive/files?q=search
// Returns Google Docs, Sheets, Slides, and PDFs from the user's Drive
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Retrieve stored refresh token
  const { data: ctx } = await supabase
    .from('user_context')
    .select('value')
    .eq('user_id', user.id)
    .eq('context_type', 'google_drive')
    .eq('key', 'refresh_token')
    .maybeSingle()

  if (!ctx?.value) {
    return NextResponse.json({ connected: false, files: [] })
  }

  const accessToken = await getAccessToken(ctx.value)
  if (!accessToken) {
    return NextResponse.json({ connected: false, files: [], error: 'token_expired' })
  }

  const query = req.nextUrl.searchParams.get('q') ?? ''
  // Limit to Docs, Sheets, Slides, and PDFs — docs users are likely to share as strategy docs
  const mimeFilter = [
    'application/vnd.google-apps.document',
    'application/vnd.google-apps.presentation',
    'application/vnd.google-apps.spreadsheet',
    'application/pdf',
  ].map((m) => `mimeType='${m}'`).join(' or ')

  const nameFilter = query.trim() ? ` and name contains '${query.trim().replace(/'/g, "\\'")}'` : ''
  const driveQuery = `(${mimeFilter})${nameFilter} and trashed=false`

  const fields = 'files(id,name,mimeType,webViewLink,modifiedTime,iconLink)'
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(driveQuery)}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime+desc&pageSize=20`

  const driveRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!driveRes.ok) {
    const err = await driveRes.text()
    console.error('[drive/files]', err)
    return NextResponse.json({ connected: true, files: [], error: 'drive_error' })
  }

  const driveData = await driveRes.json() as { files: unknown[] }
  return NextResponse.json({ connected: true, files: driveData.files ?? [] })
}
