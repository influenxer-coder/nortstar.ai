'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { UseCaseMatrix } from '@/components/ci/UseCaseMatrix'
import { SegmentCards } from '@/components/ci/SegmentCards'
import { StrengthsList } from '@/components/ci/StrengthsList'
import { GapsList } from '@/components/ci/GapsList'
import { CompetitorCards } from '@/components/ci/CompetitorCards'
import { GoalsList } from '@/components/ci/GoalsList'
import type { CiData } from '@/components/ci/types'

const C = { bg: '#f6f6f6', surface: '#ffffff', text: '#1f2328', muted: '#535963', border: '#d4d7dc' }

function Section({ title, subtitle, children, defaultOpen = true }: { title: string; subtitle: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ marginBottom: 24 }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '12px 0', textAlign: 'left' }}>
        <div>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>{title}</p>
          <p style={{ fontSize: 12, color: C.muted }}>{subtitle}</p>
        </div>
        {open ? <ChevronUp style={{ width: 16, height: 16, color: C.muted }} /> : <ChevronDown style={{ width: 16, height: 16, color: C.muted }} />}
      </button>
      {open && <div style={{ paddingTop: 4 }}>{children}</div>}
    </div>
  )
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 60, borderRadius: 8, background: '#f0f0f0', animation: 'pulse 1.5s ease-in-out infinite' }} />
      ))}
    </div>
  )
}

export function CiIntelligenceSections({ projectId, productName }: { projectId: string; productName: string }) {
  const [data, setData] = useState<CiData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/products/${projectId}/ci-intelligence`)
      .then(r => r.json())
      .then(d => setData(d as CiData))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [projectId])

  if (loading) {
    return (
      <div style={{ padding: '20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Loader2 style={{ width: 14, height: 14, color: C.muted, animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 12, color: C.muted }}>Loading competitive intelligence...</span>
        </div>
        <Skeleton />
      </div>
    )
  }

  if (!data?.ci_enriched) return null

  const name = data.product_name || productName

  return (
    <>
      <Section title={`Who buys ${name}`} subtitle="Segments identified from market research and competitive analysis">
        <UseCaseMatrix rows={data.use_case_rows} productName={name} />
        <SegmentCards segments={data.segments} rows={data.use_case_rows} productName={name} />
      </Section>

      <Section title={`Where ${name} wins`} subtitle={`Use cases where ${name} scores highest in the market`}>
        <StrengthsList rows={data.use_case_rows} productName={name} />
      </Section>

      <Section title={`Gaps ${name} needs to close`} subtitle="Competitive gaps identified from feature and scoring analysis">
        <GapsList gaps={data.gaps} okrs={data.okrs} designs={data.designs} productName={name} />
      </Section>

      <Section title={`How ${name} compares`} subtitle="Direct competitors and how they compare across use cases">
        <CompetitorCards competitors={data.competitors_direct} rows={data.use_case_rows} productName={name} />
      </Section>

      <Section title={`Where ${name} is headed`} subtitle="Strategic goals backed by public evidence">
        <GoalsList goals={data.goals} productName={name} />
      </Section>

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  )
}
