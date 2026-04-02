import { NextRequest, NextResponse } from 'next/server'
import { lookupCiAnalysis } from '@/lib/ci/lookupCiAnalysis'

export async function POST(req: NextRequest) {
  const { url } = await req.json() as { url?: string }
  if (!url) return NextResponse.json({ enrichment: null })

  const enrichment = await lookupCiAnalysis(url)
  return NextResponse.json({ enrichment })
}
