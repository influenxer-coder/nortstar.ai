'use client'

import { useState, useEffect, Fragment } from 'react'
import type { RisingProduct } from '@/lib/rising-products-data'
import type { ProspectJobRow } from '@/app/api/rising-products/jobs/route'
import { ChevronRight } from 'lucide-react'

const VERTICAL_COLORS: Record<string, string> = {
  'B2B SaaS': 'border-l-[#3B82F6]',
  'HR / Ops': 'border-l-emerald-500',
  'Fintech': 'border-l-amber-500',
}

function formatPostedAt(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const now = new Date()
  const days = Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return d.toLocaleDateString()
}

export function RisingProductsTable({ companies }: { companies: RisingProduct[] }) {
  const [expandedCompany, setExpandedCompany] = useState<string | null>(null)
  const [jobsByCompany, setJobsByCompany] = useState<Record<string, ProspectJobRow[]>>({})
  const [jobsLoading, setJobsLoading] = useState(true)
  const [syncLoading, setSyncLoading] = useState(false)

  const loadJobs = () => {
    setJobsLoading(true)
    fetch('/api/rising-products/jobs')
      .then((r) => r.json())
      .then((data: ProspectJobRow[]) => {
        const byCompany: Record<string, ProspectJobRow[]> = {}
        for (const j of data) {
          if (!byCompany[j.company_name]) byCompany[j.company_name] = []
          byCompany[j.company_name].push(j)
        }
        setJobsByCompany(byCompany)
      })
      .catch(() => setJobsByCompany({}))
      .finally(() => setJobsLoading(false))
  }

  useEffect(() => { loadJobs() }, [])

  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncNextOffset, setSyncNextOffset] = useState<number | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  const handleSync = () => {
    setSyncLoading(true)
    setSyncError(null)
    setSyncMessage(null)
    const body = syncNextOffset !== null ? JSON.stringify({ offset: syncNextOffset }) : '{}'
    fetch('/api/rising-products/jobs/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      .then(async (r) => {
        const text = await r.text()
        let data: { error?: string; message?: string; jobsInserted?: number; nextOffset?: number; totalCompanies?: number; hasMore?: boolean } = {}
        try {
          data = JSON.parse(text)
        } catch {
          throw new Error(r.ok ? 'Invalid response' : text.slice(0, 200) || `Sync failed (${r.status})`)
        }
        if (!r.ok) throw new Error(data.error ?? data.message ?? text.slice(0, 150) || `Sync failed (${r.status})`)
        return data
      })
      .then((data) => {
        setSyncNextOffset(data.nextOffset ?? null)
        if (data.hasMore && data.nextOffset != null) {
          setSyncMessage(`Synced ${data.jobsInserted ?? 0} jobs. ${(data.totalCompanies ?? 0) - data.nextOffset} companies left — click again to sync more.`)
        } else if (data.jobsInserted != null) {
          setSyncMessage(`Synced ${data.jobsInserted} jobs.`)
          setSyncNextOffset(null)
        }
        loadJobs()
      })
      .catch((e) => setSyncError(e.message ?? 'Sync failed'))
      .finally(() => setSyncLoading(false))
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-end gap-3 mb-3">
        {syncError && (
          <p className="text-xs text-red-400 max-w-md">{syncError}</p>
        )}
        {syncMessage && !syncError && (
          <p className="text-xs text-zinc-500 max-w-md">{syncMessage}</p>
        )}
        <button
          type="button"
          onClick={handleSync}
          disabled={syncLoading}
          className="text-xs px-3 py-1.5 rounded-md border border-[#1a1a1a] text-zinc-400 hover:text-zinc-100 hover:border-[#7C3AED]/50 transition-colors disabled:opacity-50"
        >
          {syncLoading ? 'Syncing…' : syncNextOffset != null ? 'Sync next 5 companies' : 'Sync PM jobs (5 companies, last 3 months)'}
        </button>
      </div>
      <div className="border border-[#1a1a1a] rounded-xl overflow-hidden bg-[#0A0A0A]">
        <div className="overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 z-10 bg-[#0d0d0d] border-b border-[#1a1a1a]">
            <tr>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest w-9 shrink-0" />
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest w-8 shrink-0">#</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[120px]">Company</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[100px]">Website</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[90px]">Vertical</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[90px]">Stage</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[140px]">Key investors</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[220px]">What they do</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[180px]">Key metric to optimize</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[160px]">Target contact</th>
              <th className="px-4 py-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest min-w-[90px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((row, i) => {
              const isExpanded = expandedCompany === row.company
              const jobs = jobsByCompany[row.company] ?? []
              const hasJobs = jobs.length > 0
              return (
                <Fragment key={row.company}>
                  <tr
                    key={`${row.company}-${i}`}
                    className={`border-b border-[#1a1a1a]/80 hover:bg-[#0d0d0d]/60 transition-colors border-l-4 ${VERTICAL_COLORS[row.vertical] ?? 'border-l-transparent'} ${isExpanded ? 'bg-[#0d0d0d]/40' : ''}`}
                    onClick={() => setExpandedCompany(isExpanded ? null : row.company)}
                  >
                    <td className="px-2 py-3 w-9">
                      {(hasJobs || jobsLoading) && (
                        <ChevronRight
                          className={`h-4 w-4 text-zinc-500 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-600 font-mono">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                      {row.company}
                      {hasJobs && (
                        <span className="ml-2 text-[10px] font-normal text-zinc-500">
                          ({jobs.length} PM job{jobs.length !== 1 ? 's' : ''})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={`https://${row.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-[#7C3AED] hover:text-violet-400 font-mono"
                      >
                        {row.website}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{row.vertical}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400">{row.stage}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{row.investors}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 leading-snug max-w-[220px]">{row.whatTheyDo}</td>
                    <td className="px-4 py-3 text-xs text-zinc-400 leading-snug max-w-[180px]">{row.keyMetric}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{row.targetContact}</td>
                    <td className="px-4 py-3 text-xs text-zinc-600">{row.status}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${row.company}-exp`} className="bg-[#08080a] border-b border-[#1a1a1a]/80">
                      <td colSpan={10} className="px-4 py-0">
                        <div className="py-4 pl-12 pr-4">
                          {jobsLoading ? (
                            <p className="text-xs text-zinc-500">Loading jobs…</p>
                          ) : jobs.length === 0 ? (
                            <p className="text-xs text-zinc-500">No PM jobs in the last 3 months. Run sync to fetch.</p>
                          ) : (
                            <div className="space-y-4">
                              {jobs.map((job) => (
                                <div
                                  key={job.id}
                                  className="border border-[#1a1a1a] rounded-lg bg-[#0A0A0A] p-4 text-left"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                                    <h4 className="text-sm font-semibold text-zinc-100">
                                      {job.url ? (
                                        <a
                                          href={job.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#7C3AED] hover:text-violet-400"
                                        >
                                          {job.title} →
                                        </a>
                                      ) : (
                                        job.title
                                      )}
                                    </h4>
                                    <span className="text-[10px] text-zinc-500 font-mono shrink-0">
                                      {formatPostedAt(job.posted_at)}
                                    </span>
                                  </div>
                                  {job.description_summary && (
                                    <p className="text-xs text-zinc-400 leading-relaxed mb-3">
                                      {job.description_summary}
                                    </p>
                                  )}
                                  {job.skills && job.skills.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {job.skills.map((s) => (
                                        <span
                                          key={s}
                                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-[#7C3AED]/15 text-[10px] text-violet-300"
                                        >
                                          {s}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}
