'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText } from 'lucide-react'
import type { IdeaWithImpact } from './OpportunityCard'

const C = {
  text:    '#1d1d1f',
  muted:   '#6e6e73',
  border:  '#e5e5ea',
  surface: '#ffffff',
  bg:      '#f5f5f7',
}

const SIGNAL_SOURCES = [
  'Past experiments',
  'Page analytics (Posthog)',
  'Slack signals',
  'Competitor intel',
  'Market data',
  'PMM Inbounds',
  'Leadership priority',
  'UX Research',
  'Rage Shakes',
]

type Props = {
  projectId: string
  onClose:   () => void
  onSaved:   (idea: IdeaWithImpact) => void
}

export default function AddOpportunityDialog({ projectId, onClose, onSaved }: Props) {
  const [title,       setTitle]       = useState('')
  const [sources,     setSources]     = useState<string[]>([])
  const [liftLow,     setLiftLow]     = useState('')
  const [liftHigh,    setLiftHigh]    = useState('')
  const [effort,      setEffort]      = useState<'low' | 'medium' | 'high'>('medium')
  const [impact,      setImpact]      = useState(5)
  const [pdfFile,     setPdfFile]     = useState<File | null>(null)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const toggleSource = (s: string) =>
    setSources(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) { setError('Title is required'); return }
    setSaving(true)
    setError(null)

    try {
      let pdfUrl: string | null = null
      if (pdfFile) {
        const form = new FormData()
        form.append('file', pdfFile)
        const res = await fetch('/api/opportunities/upload', { method: 'POST', body: form })
        if (res.ok) {
          const data = await res.json() as { url?: string }
          pdfUrl = data.url ?? null
        }
      }

      const idea: IdeaWithImpact & { pdf_url?: string } = {
        title:              title.trim(),
        goal:               '',
        effort,
        evidence:           sources.length ? `Sources: ${sources.join(', ')}` : '',
        winning_pattern:    '',
        expected_lift_low:  liftLow  ? Number(liftLow)  : null,
        expected_lift_high: liftHigh ? Number(liftHigh) : null,
        confidence:         null,
        confidence_reason:  null,
        impact_score:       impact,
        decision_badge:     null,
        human_number:       pdfUrl ? `PDF: ${pdfUrl}` : null,
        ...(pdfUrl ? { pdf_url: pdfUrl } : {}),
      }

      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, idea, append: true }),
      })
      if (!res.ok) {
        const body = await res.json() as { error?: string }
        throw new Error(body.error ?? 'Failed to save')
      }

      onSaved(idea)
      onClose()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: C.surface, borderRadius: 20,
        width: '100%', maxWidth: 560,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px 28px 0' }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>Add idea</h2>
          <button
            type="button" onClick={onClose}
            style={{ background: C.bg, border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X style={{ width: 16, height: 16, color: C.muted }} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ padding: '20px 28px 28px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Title */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Improve onboarding email sequence"
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: `1px solid ${C.border}`, fontSize: 14, color: C.text,
                background: C.surface, outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Signal sources */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Signal sources
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SIGNAL_SOURCES.map(s => {
                const active = sources.includes(s)
                return (
                  <button
                    key={s} type="button" onClick={() => toggleSource(s)}
                    style={{
                      fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 30, cursor: 'pointer',
                      border: `1px solid ${active ? '#86efac' : C.border}`,
                      background: active ? '#dcfce7' : C.bg,
                      color: active ? '#166534' : C.muted,
                      transition: 'all 0.1s',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Expected lift */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Expected lift (%)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number" min={0} max={100} value={liftLow}
                onChange={e => setLiftLow(e.target.value)}
                placeholder="Low  e.g. 10"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.text, background: C.surface, outline: 'none' }}
              />
              <span style={{ color: C.muted, fontSize: 13 }}>to</span>
              <input
                type="number" min={0} max={100} value={liftHigh}
                onChange={e => setLiftHigh(e.target.value)}
                placeholder="High  e.g. 25"
                style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, color: C.text, background: C.surface, outline: 'none' }}
              />
            </div>
          </div>

          {/* Effort */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Effort
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['low', 'medium', 'high'] as const).map(e => (
                <button
                  key={e} type="button" onClick={() => setEffort(e)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    border: `1px solid ${effort === e ? (e === 'low' ? '#86efac' : e === 'high' ? '#fca5a5' : '#fde68a') : C.border}`,
                    background: effort === e ? (e === 'low' ? '#dcfce7' : e === 'high' ? '#fee2e2' : '#fef9c3') : C.bg,
                    color: effort === e ? (e === 'low' ? '#166534' : e === 'high' ? '#991b1b' : '#92600a') : C.muted,
                  }}
                >
                  {e.charAt(0).toUpperCase() + e.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Impact score */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              Impact score — <span style={{ color: C.text, fontWeight: 700 }}>{impact}/10</span>
            </label>
            <input
              type="range" min={1} max={10} step={1} value={impact}
              onChange={e => setImpact(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#1d1d1f' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontSize: 11, color: C.muted }}>1 — Low</span>
              <span style={{ fontSize: 11, color: C.muted }}>10 — Critical</span>
            </div>
          </div>

          {/* PDF upload */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: C.muted, letterSpacing: '0.04em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
              1-pager PDF <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span>
            </label>
            <input
              ref={fileRef} type="file" accept=".pdf"
              onChange={e => setPdfFile(e.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
                border: `1px dashed ${pdfFile ? '#86efac' : C.border}`,
                background: pdfFile ? '#f0fdf4' : C.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {pdfFile ? (
                <>
                  <FileText style={{ width: 16, height: 16, color: '#166534' }} />
                  <span style={{ fontSize: 13, color: '#166534', fontWeight: 500 }}>{pdfFile.name}</span>
                </>
              ) : (
                <>
                  <Upload style={{ width: 16, height: 16, color: C.muted }} />
                  <span style={{ fontSize: 13, color: C.muted }}>Click to upload PDF</span>
                </>
              )}
            </button>
          </div>

          {error && (
            <p style={{ fontSize: 13, color: '#be123c', background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 12px' }}>
              {error}
            </p>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <button
              type="button" onClick={onClose}
              style={{ padding: '10px 20px', borderRadius: 30, border: `1px solid ${C.border}`, background: C.bg, color: C.muted, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              style={{
                padding: '10px 24px', borderRadius: 30, border: 'none',
                background: saving ? '#6e6e73' : '#1d1d1f', color: '#fff',
                fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving…' : 'Add idea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
