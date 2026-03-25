'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { VariationPicker } from '@/components/VariationPicker'
import { ActivationPicker } from '@/components/ActivationPicker'
import { PlanViewer } from '@/components/PlanViewer'
import { PrototypeViewer } from '@/components/PrototypeViewer'

type Variation = {
  name: string
  pattern: string
  validated_by: string[]
  what_they_did: string
  what_this_means: string
  works_best_for: string
  expected_lift_low: number
  expected_lift_high: number
  risk: 'low' | 'medium' | 'high'
  risk_reason: string
  is_recommended: boolean
}

type Candidate = {
  event_name: string
  file: string
  line: number
  description: string
  code_snippet: string
}

const C = {
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

type Step = 1 | 2 | 3 | 4 | 5

function parseSseLine(line: string): unknown | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  const normalized = trimmed.startsWith('data:') ? trimmed.slice(5).trim() : trimmed
  try {
    return JSON.parse(normalized) as unknown
  } catch {
    return null
  }
}

export function InvestigatePanel({
  opportunityId,
  onClose,
}: {
  opportunityId: string
  onClose: () => void
}) {
  const [step, setStep] = useState<Step>(1)

  // Step 1
  const [variationsLoading, setVariationsLoading] = useState(true)
  const [variationsError, setVariationsError] = useState<string | null>(null)
  const [variations, setVariations] = useState<Variation[]>([])
  const [selectedVariationIdx, setSelectedVariationIdx] = useState<number | null>(null)

  // Step 2
  const [activationLoading, setActivationLoading] = useState(false)
  const [activationCandidates, setActivationCandidates] = useState<Candidate[]>([])
  const [githubConnected, setGithubConnected] = useState(false)
  const [selectedActivation, setSelectedActivation] = useState<string | null>(null)

  // Step 3
  const [planRunning, setPlanRunning] = useState(false)
  const [planStatus, setPlanStatus] = useState<string>('')
  const [planMd, setPlanMd] = useState<string>('')

  // Step 4/5
  const [protoRunning, setProtoRunning] = useState(false)
  const [protoStatus, setProtoStatus] = useState<string>('')
  const [protoCode, setProtoCode] = useState<string>('')
  const [protoHistory, setProtoHistory] = useState<Array<{ label: string; code: string }>>([])
  const [protoEditRunning, setProtoEditRunning] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)

  const recommendedIndex = useMemo(() => variations.findIndex(v => v.is_recommended), [variations])

  useEffect(() => {
    let cancelled = false
    setVariationsLoading(true)
    setVariationsError(null)
    void fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/variations`, { method: 'POST' })
      .then(async (r) => {
        if (!r.ok) {
          const j = await r.json().catch(() => ({}))
          throw new Error(j.error ?? 'Failed to load variations')
        }
        return r.json() as Promise<{ variations: Variation[] }>
      })
      .then((d) => {
        if (cancelled) return
        setVariations(d.variations ?? [])
        const rec = (d.variations ?? []).findIndex(v => v.is_recommended)
        setSelectedVariationIdx(rec >= 0 ? rec : (d.variations?.length ? 0 : null))
      })
      .catch((e) => { if (!cancelled) setVariationsError((e as Error).message) })
      .finally(() => { if (!cancelled) setVariationsLoading(false) })
    return () => { cancelled = true }
  }, [opportunityId])

  useEffect(() => {
    // slide-down auto scroll into view
    setTimeout(() => containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
  }, [])

  async function loadActivationCandidates() {
    setActivationLoading(true)
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/activation-events`)
      if (!res.ok) throw new Error('Failed to read activation candidates')
      const data = await res.json() as { candidates?: Candidate[] }
      const c = data.candidates ?? []
      setActivationCandidates(c)
      setGithubConnected(c.length > 0)
    } catch {
      setActivationCandidates([])
      setGithubConnected(false)
    } finally {
      setActivationLoading(false)
    }
  }

  async function generatePlan() {
    if (selectedVariationIdx == null || !selectedActivation) return
    setPlanRunning(true)
    setPlanStatus('Building your investigation plan...')
    setPlanMd('')
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variation: variations[selectedVariationIdx],
          activation_event: selectedActivation,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Failed to generate plan')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          const lines = part.split('\n')
          for (const line of lines) {
            const evt = parseSseLine(line) as Record<string, unknown> | null
            if (!evt) continue
            if (evt.type === 'log') setPlanStatus(String(evt.message ?? ''))
            if (evt.type === 'chunk') setPlanMd(prev => prev + String(evt.content ?? ''))
            if (evt.type === 'error') throw new Error(String(evt.message ?? 'Failed to generate plan'))
          }
        }
      }
      setStep(4)
    } catch (e) {
      setPlanStatus((e as Error).message || 'Plan failed')
    } finally {
      setPlanRunning(false)
    }
  }

  async function buildPrototype() {
    if (selectedVariationIdx == null || !selectedActivation || !planMd) return
    setProtoRunning(true)
    setProtoStatus('Building your prototype...')
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/prototype`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variation: variations[selectedVariationIdx],
          activation_event: selectedActivation,
          plan_markdown: planMd,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Failed to build prototype')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          for (const line of part.split('\n')) {
            const evt = parseSseLine(line) as Record<string, unknown> | null
            if (!evt) continue
            if (evt.type === 'log') setProtoStatus(String(evt.message ?? ''))
            if (evt.type === 'result') {
              const code = String(evt.code ?? '')
              setProtoCode(code)
              setProtoHistory([{ label: 'v1', code }])
              setStep(5)
            }
            if (evt.type === 'error') throw new Error(String(evt.message ?? 'Prototype failed'))
          }
        }
      }
    } catch (e) {
      setProtoStatus((e as Error).message || 'Prototype failed')
    } finally {
      setProtoRunning(false)
    }
  }

  async function submitPrototypeEdit(instruction: string) {
    if (!protoCode) return
    setProtoEditRunning(true)
    try {
      const res = await fetch(`/api/opportunities/${encodeURIComponent(opportunityId)}/prototype/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_prototype_code: protoCode,
          edit_instruction: instruction,
          variation: selectedVariationIdx != null ? variations[selectedVariationIdx] : null,
          plan_markdown: planMd,
        }),
      })
      if (!res.ok || !res.body) throw new Error('Failed to edit prototype')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''
        for (const part of parts) {
          for (const line of part.split('\n')) {
            const evt = parseSseLine(line) as Record<string, unknown> | null
            if (!evt) continue
            if (evt.type === 'result') {
              const code = String(evt.code ?? '')
              setProtoCode(code)
              setProtoHistory((prev) => [...prev, { label: `v${prev.length + 1}`, code }])
            }
            if (evt.type === 'error') throw new Error(String(evt.message ?? 'Edit failed'))
          }
        }
      }
    } catch {
      // surface via status line
      setProtoStatus('Could not apply edit — try again.')
    } finally {
      setProtoEditRunning(false)
    }
  }

  return (
    <div
      ref={containerRef}
      style={{
        marginTop: 12,
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: 14,
        boxShadow: C.cardShadow,
        overflow: 'hidden',
        animation: 'nsSlideDown 180ms ease-out',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 2 }}>
            Investigate
          </p>
          <p style={{ fontSize: 13, color: C.text, fontWeight: 700 }}>
            Step {step} of 5
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            border: `1px solid ${C.border}`,
            background: '#f5f5f7',
            color: C.muted,
            borderRadius: 30,
            padding: '6px 12px',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Close
        </button>
      </div>

      {/* STEP 1 */}
      {variationsLoading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, padding: '10px 2px' }}>
          <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Finding competitor patterns...</span>
        </div>
      ) : variationsError ? (
        <div style={{ padding: 10, borderRadius: 10, border: '1px solid #fecaca', background: '#fff1f2', color: '#b91c1c', fontSize: 13 }}>
          {variationsError}
        </div>
      ) : (
        <>
          <VariationPicker
            variations={variations}
            selectedIndex={selectedVariationIdx}
            onSelect={(idx) => setSelectedVariationIdx(idx)}
          />

          <button
            type="button"
            disabled={selectedVariationIdx == null}
            onClick={() => {
              setStep(2)
              void loadActivationCandidates()
            }}
            style={{
              marginTop: 12,
              width: '100%',
              borderRadius: 10,
              border: 'none',
              background: '#1f2328',
              color: '#fff',
              padding: '10px 12px',
              fontSize: 13,
              fontWeight: 800,
              cursor: selectedVariationIdx == null ? 'not-allowed' : 'pointer',
              opacity: selectedVariationIdx == null ? 0.6 : 1,
            }}
          >
            Plan this approach →
          </button>

          {recommendedIndex >= 0 && selectedVariationIdx == null && (
            <p style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
              NorthStar recommends: <strong style={{ color: C.text }}>{variations[recommendedIndex]?.name}</strong>
            </p>
          )}
        </>
      )}

      {/* STEP 2 */}
      {step >= 2 && (
        <>
          {activationLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: C.muted, padding: '12px 2px' }}>
              <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 13 }}>{githubConnected ? 'Reading your codebase...' : 'Loading suggestions...'}</span>
            </div>
          ) : (
            <ActivationPicker
              githubConnected={githubConnected}
              candidates={activationCandidates}
              selected={selectedActivation}
              onSelect={(evt) => setSelectedActivation(evt)}
            />
          )}

          {step >= 2 && (
            <button
              type="button"
              disabled={!selectedActivation || planRunning}
              onClick={() => { setStep(3); void generatePlan() }}
              style={{
                marginTop: 12,
                width: '100%',
                borderRadius: 10,
                border: 'none',
                background: '#1f2328',
                color: '#fff',
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: 800,
                cursor: (!selectedActivation || planRunning) ? 'not-allowed' : 'pointer',
                opacity: (!selectedActivation || planRunning) ? 0.6 : 1,
              }}
            >
              {planRunning ? 'Generating…' : 'Generate investigation plan →'}
            </button>
          )}
        </>
      )}

      {/* STEP 3 */}
      {step >= 3 && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 4 }}>
            {planRunning ? 'Building your investigation plan...' : 'Plan ready'}
          </p>
          <p style={{ fontSize: 12, color: C.muted }}>
            {planStatus}
          </p>
        </div>
      )}

      {/* Plan viewer */}
      {planMd && (
        <PlanViewer markdown={planMd} onChange={setPlanMd} />
      )}

      {/* Step 4 trigger */}
      {planMd && step >= 4 && (
        <button
          type="button"
          disabled={protoRunning}
          onClick={() => void buildPrototype()}
          style={{
            marginTop: 12,
            width: '100%',
            borderRadius: 12,
            border: 'none',
            background: C.blue,
            color: '#fff',
            padding: '12px 14px',
            fontSize: 14,
            fontWeight: 900,
            cursor: protoRunning ? 'not-allowed' : 'pointer',
            opacity: protoRunning ? 0.7 : 1,
          }}
        >
          {protoRunning ? 'Building…' : 'Looks right → Build prototype →'}
        </button>
      )}

      {/* Prototype status */}
      {protoStatus && (
        <p style={{ marginTop: 10, fontSize: 12, color: C.muted }}>
          {protoStatus}
        </p>
      )}

      {/* Prototype viewer + Step 5 */}
      {protoCode && (
        <PrototypeViewer
          code={protoCode}
          history={protoHistory}
          editing={protoEditRunning}
          onUndoTo={(idx) => {
            const chosen = protoHistory[idx]
            if (!chosen) return
            setProtoCode(chosen.code)
            setProtoHistory(protoHistory.slice(0, idx + 1))
          }}
          onSubmitEdit={(instruction) => void submitPrototypeEdit(instruction)}
        />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes nsSlideDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}

