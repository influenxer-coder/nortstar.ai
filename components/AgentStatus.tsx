'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const RUNNING_MESSAGES = [
  'Reading your product website...',
  'Scanning pricing and positioning...',
  'Identifying your target customer...',
  'Mapping competitive landscape...',
  'Building your intelligence profile...',
  'Extracting KPI candidates...',
]

type Enrichment = {
  companyName?: string
  kpiCandidates?: string[]
  competitorsMentioned?: string[]
  painThemesAddressed?: string[]
}

export function AgentStatus() {
  const [projectId, setProjectId] = useState<string | null>(null)
  const [enrichmentStatus, setEnrichmentStatus] = useState<string | null>(null)
  const [enrichment, setEnrichment] = useState<Enrichment | null>(null)
  const [runningMessageIndex, setRunningMessageIndex] = useState(0)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const id = localStorage.getItem('northstar_current_project_id')
    setProjectId(id || null)
  }, [])

  useEffect(() => {
    if (!projectId) return
    const supabase = createClient()
    supabase
      .from('projects')
      .select('enrichment_status, enrichment')
      .eq('id', projectId)
      .single()
      .then(({ data }) => {
        if (data) {
          setEnrichmentStatus(data.enrichment_status ?? null)
          setEnrichment((data.enrichment as Enrichment) ?? null)
        }
      })

    const channel = supabase
      .channel('project-enrichment')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `id=eq.${projectId}`,
        },
        (payload: { new: { enrichment_status?: string; enrichment?: Enrichment } }) => {
          setEnrichmentStatus(payload.new.enrichment_status ?? null)
          setEnrichment(payload.new.enrichment ?? null)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  useEffect(() => {
    if (enrichmentStatus !== 'running') return
    const id = setInterval(() => {
      setRunningMessageIndex((i) => (i + 1) % RUNNING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(id)
  }, [enrichmentStatus])

  if (!projectId || enrichmentStatus === 'pending' || !enrichmentStatus) return null

  return (
    <div
      className="fixed bottom-6 right-6 z-[1000] w-[280px] rounded-[10px] p-[14px_16px] transition-opacity duration-150"
      style={{ background: '#141414', border: '1px solid #2a2a2a' }}
    >
      {enrichmentStatus === 'running' && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span
              className="h-1 w-1 rounded-full bg-[#4f8ef7] animate-pulse"
              style={{ minWidth: 4, minHeight: 4 }}
            />
            <span className="text-xs font-medium text-[#4f8ef7]">Agent working</span>
          </div>
          <p className="text-[13px] text-[#666]">{RUNNING_MESSAGES[runningMessageIndex]}</p>
        </>
      )}
      {enrichmentStatus === 'done' && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1 w-1 rounded-full bg-[#22c55e]" style={{ minWidth: 4, minHeight: 4 }} />
            <span className="text-xs font-medium text-[#22c55e]">Agent ready</span>
          </div>
          <p className="text-[13px] text-[#888] mb-1">
            {enrichment?.companyName ?? 'Product'} profile complete
          </p>
          <p className="text-[11px] text-[#555]">
            Found {(enrichment?.kpiCandidates?.length ?? 0)} KPI candidates ·{' '}
            {(enrichment?.competitorsMentioned?.length ?? 0)} competitors ·{' '}
            {(enrichment?.painThemesAddressed?.length ?? 0)} pain themes
          </p>
        </>
      )}
      {enrichmentStatus === 'failed' && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="h-1 w-1 rounded-full bg-[#f97316]" style={{ minWidth: 4, minHeight: 4 }} />
            <span className="text-xs font-medium text-[#f97316]">Limited data found</span>
          </div>
          <p className="text-[13px] text-[#666]">We&apos;ll learn more as you add context</p>
        </>
      )}
    </div>
  )
}
