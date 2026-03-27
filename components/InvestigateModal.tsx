'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, ArrowRight, Pencil, Check, Copy, Monitor, Smartphone, ZoomIn, ZoomOut } from 'lucide-react'
import { FlowDiagram, type FlowObject, type FlowNode } from '@/components/investigate/FlowDiagram'
import { DynamicScreen } from '@/components/investigate/DynamicScreen'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Variation = {
  name: string
  pattern: string
  validated_by: string[]
  what_they_did: string
  what_this_means: string
  expected_lift_low: number
  expected_lift_high: number
  risk: 'low' | 'medium' | 'high'
  is_recommended: boolean
}

type ProtoScreen = {
  id: string
  label: string
  type: 'new' | 'modified' | 'removed' | 'existing'
  component_code: string
}

const RISK_COLORS: Record<string, { color: string; bg: string }> = {
  low:    { color: '#166534', bg: '#dcfce7' },
  medium: { color: '#92600a', bg: '#fef9c3' },
  high:   { color: '#be123c', bg: '#ffe4e6' },
}

const STEPS = ['Approach', 'Plan', 'Preview']

const PLAN_SUB_MESSAGES = [
  'Reading competitor patterns...',
  'Analyzing your product...',
  'Writing investigation plan...',
]

const PROTO_SUB_MESSAGES = [
  'Reading your plan...',
  'Building screens...',
  'Almost ready...',
]

const TYPE_BADGE: Record<string, { bg: string; color: string; text: string }> = {
  new:      { bg: '#EEF6F1', color: '#4D9B6F', text: 'New' },
  modified: { bg: '#FBF4E6', color: '#9B6D1A', text: 'Modified' },
  removed:  { bg: '#FAEAEA', color: '#9B3030', text: 'Removed' },
  existing: { bg: '#F7F7F5', color: '#9B9A97', text: 'Current' },
}

type Props = {
  title: string
  opportunityId: string
  projectId: string
  productUrl: string
  goal: string | null
  onClose: () => void
}

export function InvestigateModal({ title, opportunityId, projectId, productUrl, goal, onClose }: Props) {
  // Step 1 state
  const [currentStep, setCurrentStep] = useState(1)
  const [variations, setVariations] = useState<Variation[]>([])
  const [variationsLoading, setVariationsLoading] = useState(true)
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)
  const [flows, setFlows] = useState<FlowObject[]>([])
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [savedIdxLoaded, setSavedIdxLoaded] = useState(false)

  // Step 2 (Plan) state
  const [planState, setPlanState] = useState<'idle' | 'generating' | 'streaming' | 'complete' | 'error'>('idle')
  const [planMarkdown, setPlanMarkdown] = useState('')
  const [planError, setPlanError] = useState<string | null>(null)
  const [editingSection, setEditingSection] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const planSubMsgIdx = useRef(0)
  const [planSubMessage, setPlanSubMessage] = useState(PLAN_SUB_MESSAGES[0])
  const planEndRef = useRef<HTMLDivElement>(null)

  // Step 3 (Preview) state
  const [protoState, setProtoState] = useState<'idle' | 'generating' | 'ready' | 'error'>('idle')
  const [protoScreens, setProtoScreens] = useState<ProtoScreen[]>([])
  const [protoError, setProtoError] = useState<string | null>(null)
  const [activeScreenId, setActiveScreenId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop')
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const protoSubMsgIdx = useRef(0)
  const [protoSubMessage, setProtoSubMessage] = useState(PROTO_SUB_MESSAGES[0])
  const screenScrollRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  // Fetch variations + saved explore state + saved plan in parallel, then fetch flows
  useEffect(() => {
    setVariationsLoading(true)
    Promise.all([
      fetch(`/api/opportunities/${opportunityId}/variations`, { method: 'POST' })
        .then(r => r.json()) as Promise<{ variations?: Variation[] }>,
      fetch(`/api/opportunities/${opportunityId}/explore-state`)
        .then(r => r.json()) as Promise<{ selected_variation_index: number | null }>,
      fetch(`/api/opportunities/${opportunityId}`)
        .then(r => r.json())
        .catch(() => ({})) as Promise<{ plan_markdown?: string | null }>,
    ])
      .then(([varData, stateData, oppData]) => {
        const vars = varData.variations ?? []
        setVariations(vars)
        const savedIdx = stateData.selected_variation_index
        if (savedIdx !== null && savedIdx !== undefined && savedIdx < vars.length) {
          setSelectedIdx(savedIdx)
        } else {
          const recIdx = vars.findIndex(v => v.is_recommended)
          setSelectedIdx(recIdx >= 0 ? recIdx : vars.length > 0 ? 0 : null)
        }
        setSavedIdxLoaded(true)

        // Restore saved plan if available
        const savedPlan = oppData.plan_markdown
        if (savedPlan && savedPlan.trim()) {
          setPlanMarkdown(savedPlan)
          setPlanState('complete')
          setCurrentStep(2)
        }

        if (vars.length > 0) {
          setFlowsLoading(true)
          fetch(`/api/opportunities/${opportunityId}/flows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variations: vars }),
          })
            .then(r => r.json())
            .then((fd: { flows?: FlowObject[] }) => setFlows(fd.flows ?? []))
            .catch(() => {})
            .finally(() => setFlowsLoading(false))
        }
      })
      .catch(() => {})
      .finally(() => setVariationsLoading(false))
  }, [opportunityId])

  // Save selected variation index after initial load
  useEffect(() => {
    if (!savedIdxLoaded || selectedIdx === null) return
    fetch(`/api/opportunities/${opportunityId}/explore-state`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selected_variation_index: selectedIdx }),
    }).catch(() => {})
  }, [opportunityId, selectedIdx, savedIdxLoaded])

  // Sub-message rotation while generating plan
  useEffect(() => {
    if (planState !== 'generating') return
    planSubMsgIdx.current = 0
    setPlanSubMessage(PLAN_SUB_MESSAGES[0])
    const interval = setInterval(() => {
      planSubMsgIdx.current = (planSubMsgIdx.current + 1) % PLAN_SUB_MESSAGES.length
      setPlanSubMessage(PLAN_SUB_MESSAGES[planSubMsgIdx.current])
    }, 2000)
    return () => clearInterval(interval)
  }, [planState])

  // Sub-message rotation while generating prototype
  useEffect(() => {
    if (protoState !== 'generating') return
    protoSubMsgIdx.current = 0
    setProtoSubMessage(PROTO_SUB_MESSAGES[0])
    const interval = setInterval(() => {
      protoSubMsgIdx.current = (protoSubMsgIdx.current + 1) % PROTO_SUB_MESSAGES.length
      setProtoSubMessage(PROTO_SUB_MESSAGES[protoSubMsgIdx.current])
    }, 2000)
    return () => clearInterval(interval)
  }, [protoState])

  // Auto-scroll while streaming plan
  useEffect(() => {
    if (planState === 'streaming') {
      planEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [planMarkdown, planState])

  // Save plan to DB when complete
  useEffect(() => {
    if (planState !== 'complete' || !planMarkdown) return
    fetch(`/api/opportunities/${opportunityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_markdown: planMarkdown }),
    }).catch(() => {})
  }, [planState, planMarkdown, opportunityId])

  const activeIdx = hoveredIdx ?? selectedIdx ?? 0
  const activeFlow = flows[activeIdx] ?? null
  const activeVariation = variations[activeIdx] ?? null

  // ── PLAN ──────────────────────────────────────────────────────────────────
  const startPlan = async () => {
    setPlanState('generating')
    setPlanMarkdown('')
    setPlanError(null)

    try {
      const variation = variations[selectedIdx ?? 0]
      if (!variation) throw new Error('No variation selected')

      const res = await fetch(`/api/opportunities/${opportunityId}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ variation }),
      })

      if (!res.ok || !res.body) throw new Error('Plan generation failed')

      setPlanState('streaming')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        setPlanMarkdown(prev => prev + chunk)
      }

      setPlanState('complete')
    } catch (err: unknown) {
      setPlanError(err instanceof Error ? err.message : 'Plan generation failed')
      setPlanState('error')
    }
  }

  // ── PROTOTYPE ─────────────────────────────────────────────────────────────
  const startPrototype = async () => {
    setProtoState('generating')
    setProtoScreens([])
    setProtoError(null)
    setActiveScreenId(null)

    try {
      const variation = variations[selectedIdx ?? 0]
      const flowNodes = activeFlow?.proposed_flow ?? []

      const res = await fetch(`/api/opportunities/${opportunityId}/prototype`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_markdown: planMarkdown,
          variation: variation ?? {},
          flow_nodes: flowNodes,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Failed' })) as { error?: string }
        throw new Error(err.error ?? 'Prototype generation failed')
      }

      if (!res.body) throw new Error('No response body')

      // Read NDJSON stream — each line is one screen
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let firstScreen = true

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          try {
            const screen = JSON.parse(trimmed) as ProtoScreen
            setProtoScreens(prev => [...prev, screen])
            if (firstScreen) {
              setActiveScreenId(screen.id)
              setProtoState('ready')
              firstScreen = false
            }
          } catch {
            // skip unparseable lines
          }
        }
      }

      // Handle any remaining buffer
      if (buffer.trim()) {
        try {
          const screen = JSON.parse(buffer.trim()) as ProtoScreen
          setProtoScreens(prev => [...prev, screen])
          if (firstScreen) {
            setActiveScreenId(screen.id)
            firstScreen = false
          }
        } catch {
          // skip
        }
      }

      setProtoState('ready')
    } catch (err: unknown) {
      setProtoError(err instanceof Error ? err.message : 'Prototype generation failed')
      setProtoState('error')
    }
  }

  const scrollToScreen = (id: string) => {
    setActiveScreenId(id)
    const el = document.getElementById(`proto-screen-${id}`)
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }

  const copyPromptForCursor = async () => {
    const variation = variations[selectedIdx ?? 0]
    const prompt = `# Implementation Task

## Product Context
Goal: ${goal ?? ''}
Opportunity: ${title}
Variation: ${variation?.name ?? ''}
Pattern: ${variation?.pattern ?? ''}

## Plan
${planMarkdown}

## Prototype Screens
${protoScreens.map(s => `### ${s.label} (${s.type})\n\`\`\`jsx\n${s.component_code}\n\`\`\``).join('\n\n')}

## Instructions
Implement the changes described in the plan above. The prototype screens show what each screen should look like. Match the design closely.`

    await navigator.clipboard.writeText(prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── SECTION EDITING ───────────────────────────────────────────────────────
  const splitSections = (md: string) => {
    const parts: { heading: string; content: string }[] = []
    const lines = md.split('\n')
    let current: { heading: string; lines: string[] } | null = null

    for (const line of lines) {
      if (line.startsWith('## ')) {
        if (current) parts.push({ heading: current.heading, content: current.lines.join('\n') })
        current = { heading: line, lines: [] }
      } else if (current) {
        current.lines.push(line)
      } else {
        if (parts.length === 0 && !current) {
          parts.push({ heading: '', content: line })
        } else if (parts.length > 0 && !parts[parts.length - 1].heading) {
          parts[parts.length - 1].content += '\n' + line
        } else {
          parts.push({ heading: '', content: line })
        }
      }
    }
    if (current) parts.push({ heading: current.heading, content: current.lines.join('\n') })
    return parts
  }

  const handleSectionEdit = (sectionIdx: number) => {
    const sections = splitSections(planMarkdown)
    const section = sections[sectionIdx]
    if (!section) return
    setEditingSection(sectionIdx)
    setEditValue(section.content.trim())
  }

  const handleSectionSave = () => {
    if (editingSection === null) return
    const sections = splitSections(planMarkdown)
    const section = sections[editingSection]
    if (!section) return
    section.content = '\n' + editValue + '\n'
    const newMd = sections.map(s => (s.heading ? s.heading + '\n' + s.content : s.content)).join('\n')
    setPlanMarkdown(newMd)
    setEditingSection(null)
    setEditValue('')
  }

  // ── LEFT PANEL ────────────────────────────────────────────────────────────
  const renderLeftPanel = () => {
    // Step 3: Prototype display
    if (currentStep === 3) {
      if (protoState === 'generating') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Loader2 style={{ width: 24, height: 24, color: '#9B9A97', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#9B9A97' }}>Generating your prototype...</span>
            <span style={{ fontSize: 12, color: '#C9C8C5' }}>{protoSubMessage}</span>
          </div>
        )
      }

      if (protoState === 'error') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#9B3030' }}>Could not generate prototype</p>
            <button
              type="button"
              onClick={() => startPrototype()}
              style={{ background: 'transparent', border: '1px solid #E5E3DD', borderRadius: 6, padding: '6px 16px', fontSize: 13, color: '#1A1A1A', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        )
      }

      if (protoState === 'ready' && protoScreens.length > 0) {
        const visibleScreens = protoScreens.filter(s => s.type !== 'removed')
        const cardW = viewMode === 'desktop' ? 420 : 195
        const cardH = viewMode === 'desktop' ? 263 : 422
        return (
          <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
            {/* Canvas controls */}
            <div style={{
              position: 'absolute', top: 12, right: 12, zIndex: 10,
              display: 'flex', gap: 4, background: '#ffffff', border: '1px solid #E5E3DD',
              borderRadius: 8, padding: 4, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}>
              <button type="button" onClick={() => setViewMode('desktop')}
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, cursor: 'pointer', background: viewMode === 'desktop' ? '#F0ECFA' : 'transparent', color: viewMode === 'desktop' ? '#6B4FBB' : '#9B9A97' }}>
                <Monitor style={{ width: 14, height: 14 }} />
              </button>
              <button type="button" onClick={() => setViewMode('mobile')}
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, cursor: 'pointer', background: viewMode === 'mobile' ? '#F0ECFA' : 'transparent', color: viewMode === 'mobile' ? '#6B4FBB' : '#9B9A97' }}>
                <Smartphone style={{ width: 14, height: 14 }} />
              </button>
              <div style={{ width: 1, background: '#E5E3DD', margin: '2px 2px' }} />
              <button type="button" onClick={() => setCanvasZoom(z => Math.min(3, z + 0.15))}
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: '#9B9A97' }}>
                <ZoomIn style={{ width: 14, height: 14 }} />
              </button>
              <button type="button" onClick={() => setCanvasZoom(z => Math.max(0.3, z - 0.15))}
                style={{ width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: '#9B9A97' }}>
                <ZoomOut style={{ width: 14, height: 14 }} />
              </button>
              <button type="button" onClick={() => { setCanvasZoom(1); setCanvasPan({ x: 0, y: 0 }) }}
                style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: 4, cursor: 'pointer', background: 'transparent', color: '#9B9A97', fontSize: 11, fontWeight: 500, padding: '0 6px' }}>
                {Math.round(canvasZoom * 100)}%
              </button>
            </div>

            {/* Zoomable + pannable canvas */}
            <div ref={canvasRef}
              style={{
                width: '100%', height: '100%', overflow: 'hidden', background: '#F7F7F5',
                cursor: isDragging ? 'grabbing' : 'grab',
                userSelect: 'none',
              }}
              onWheel={e => {
                if (e.ctrlKey || e.metaKey) {
                  e.preventDefault()
                  setCanvasZoom(z => Math.min(3, Math.max(0.3, z + (e.deltaY > 0 ? -0.08 : 0.08))))
                } else {
                  setCanvasPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }))
                }
              }}
              onMouseDown={e => {
                if (e.button !== 0) return
                setIsDragging(true)
                dragStart.current = { x: e.clientX, y: e.clientY, panX: canvasPan.x, panY: canvasPan.y }
              }}
              onMouseMove={e => {
                if (!isDragging) return
                setCanvasPan({
                  x: dragStart.current.panX + (e.clientX - dragStart.current.x),
                  y: dragStart.current.panY + (e.clientY - dragStart.current.y),
                })
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <div ref={screenScrollRef} style={{
                display: 'flex', flexDirection: 'row', gap: 32, padding: 40,
                alignItems: 'flex-start',
                transform: `translate(${canvasPan.x}px, ${canvasPan.y}px) scale(${canvasZoom})`,
                transformOrigin: 'top left',
                minWidth: 'fit-content',
              }}>
                {visibleScreens.map((screen, i) => {
                  const badge = TYPE_BADGE[screen.type] ?? TYPE_BADGE.existing
                  const isActive = activeScreenId === screen.id
                  return (
                    <div key={screen.id} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
                      <div
                        id={`proto-screen-${screen.id}`}
                        onMouseUp={e => {
                          const dx = Math.abs(e.clientX - dragStart.current.x)
                          const dy = Math.abs(e.clientY - dragStart.current.y)
                          if (dx < 5 && dy < 5) setActiveScreenId(screen.id)
                        }}
                        style={{ width: cardW, flexShrink: 0 }}
                      >
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A' }}>{screen.label}</span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: badge.color, background: badge.bg, borderRadius: 20, padding: '2px 8px' }}>
                            {badge.text}
                          </span>
                        </div>
                        {/* Screen frame */}
                        <div style={{
                          width: cardW, height: cardH,
                          border: isActive ? '2px solid #6B4FBB' : '1px solid #E5E3DD',
                          borderRadius: 8, overflow: 'hidden', background: '#ffffff', position: 'relative',
                        }}>
                          <DynamicScreen code={screen.component_code} index={i} viewMode={viewMode} />
                        </div>
                      </div>
                      {i < visibleScreens.length - 1 && (
                        <span style={{ color: '#C9C8C5', fontSize: 18, margin: '0 12px', alignSelf: 'center', marginTop: cardH / 2, flexShrink: 0 }}>→</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      }
    }

    // Steps 1 & 2: Flow diagram
    if (variationsLoading || (flowsLoading && !activeFlow)) {
      return <FlowDiagram currentFlow={[]} proposedFlow={[]}
        summary={{ removed_count: 0, added_count: 0, changed_count: 0, key_change: '' }}
        variationName="" validatedBy={[]} isLoading />
    }
    if (activeFlow) {
      return <FlowDiagram
        currentFlow={activeFlow.current_flow}
        proposedFlow={activeFlow.proposed_flow}
        summary={activeFlow.summary}
        variationName={activeVariation?.name ?? ''}
        validatedBy={activeVariation?.validated_by ?? []}
        isLoading={flowsLoading} />
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <span style={{ fontSize: 13, color: '#C9C8C5' }}>No flow data available</span>
      </div>
    )
  }

  // ── RIGHT PANEL ───────────────────────────────────────────────────────────
  const renderRightPanel = () => {
    // Step 1 — Approach
    if (currentStep === 1) {
      return (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 600, color: '#1A1A1A', marginBottom: 4 }}>
            How do you want to approach this?
          </h3>
          <p style={{ fontSize: 13, color: '#9B9A97', marginBottom: 20 }}>
            Based on what&apos;s working in your market
          </p>

          {variationsLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9B9A97', fontSize: 13 }}>
              <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
              Finding popular patterns…
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {variations.map((v, idx) => {
                const isSelected = selectedIdx === idx
                const risk = RISK_COLORS[v.risk] ?? RISK_COLORS.medium
                return (
                  <div key={idx}>
                    {v.is_recommended && (
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#6B4FBB', marginBottom: 4, letterSpacing: '0.03em' }}>
                        Recommended
                      </div>
                    )}
                    <div
                      onClick={() => setSelectedIdx(idx)}
                      onMouseEnter={() => setHoveredIdx(idx)}
                      onMouseLeave={() => setHoveredIdx(null)}
                      style={{
                        border: isSelected ? '2px solid #6B4FBB' : '1px solid #E5E3DD',
                        borderRadius: 10,
                        padding: isSelected ? '13px 15px' : '14px 16px',
                        background: isSelected ? '#F0ECFA' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1A1A1A', marginBottom: 4 }}>{v.name}</div>
                      <div style={{ fontSize: 13, color: '#6B6A67', marginBottom: 8, lineHeight: 1.4 }}>{v.pattern}</div>
                      {v.validated_by.length > 0 && (
                        <div style={{ fontSize: 12, color: '#9B9A97', marginBottom: 8 }}>
                          Validated by: {v.validated_by.slice(0, 3).join(', ')}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                          +{v.expected_lift_low}–{v.expected_lift_high}%
                        </span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: risk.color, background: risk.bg, borderRadius: 20, padding: '2px 8px' }}>
                          {v.risk} risk
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ position: 'sticky', bottom: 0, background: '#ffffff', paddingTop: 12, marginTop: 16, borderTop: '1px solid #E5E3DD' }}>
            <button
              type="button"
              disabled={selectedIdx === null}
              onClick={() => { setCurrentStep(2); startPlan() }}
              style={{
                width: '100%', height: 36, borderRadius: 6, border: 'none',
                background: '#1A1A1A', color: '#ffffff', fontSize: 13, fontWeight: 500,
                cursor: selectedIdx !== null ? 'pointer' : 'not-allowed',
                opacity: selectedIdx === null ? 0.4 : 1,
                transition: 'background 0.15s, opacity 0.15s',
              }}
              onMouseEnter={e => { if (selectedIdx !== null) (e.currentTarget as HTMLButtonElement).style.background = '#333333' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A' }}
            >
              Plan this approach →
            </button>
          </div>
        </>
      )
    }

    // Step 2 — Plan
    if (currentStep === 2) {
      if (planState === 'generating') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Loader2 style={{ width: 24, height: 24, color: '#9B9A97', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#9B9A97' }}>Building your investigation plan...</span>
            <span style={{ fontSize: 12, color: '#C9C8C5' }}>{planSubMessage}</span>
          </div>
        )
      }

      if (planState === 'error') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#9B3030' }}>{planError}</p>
            <button
              type="button"
              onClick={() => startPlan()}
              style={{ background: 'transparent', border: '1px solid #E5E3DD', borderRadius: 6, padding: '6px 16px', fontSize: 13, color: '#1A1A1A', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#6B4FBB' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#E5E3DD' }}
            >
              Try again
            </button>
          </div>
        )
      }

      if (planState === 'streaming' || planState === 'complete') {
        const sections = splitSections(planMarkdown)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              {sections.map((section, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  {section.heading && editingSection !== i && (
                    <button
                      type="button"
                      onClick={() => handleSectionEdit(i)}
                      style={{
                        position: 'absolute', top: 0, right: 0, background: 'none', border: 'none',
                        cursor: 'pointer', padding: 4, color: '#C9C8C5', transition: 'color 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#6B4FBB' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#C9C8C5' }}
                    >
                      <Pencil style={{ width: 12, height: 12 }} />
                    </button>
                  )}
                  {editingSection === i ? (
                    <div>
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                        {section.heading}
                      </ReactMarkdown>
                      <textarea
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onBlur={() => handleSectionSave()}
                        autoFocus
                        style={{
                          width: '100%', minHeight: 120, border: '1px solid #6B4FBB', borderRadius: 6,
                          padding: '10px 12px', fontSize: 13, color: '#444', lineHeight: 1.6,
                          fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  ) : (
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
                      {section.heading ? section.heading + '\n' + section.content : section.content}
                    </ReactMarkdown>
                  )}
                </div>
              ))}
              {planState === 'streaming' && (
                <span style={{ display: 'inline-block', width: 6, height: 14, background: '#6B4FBB', animation: 'blink 1s step-end infinite', verticalAlign: 'text-bottom', marginLeft: 2 }} />
              )}
              <div ref={planEndRef} />
            </div>

            {planState === 'complete' && (
              <div style={{ borderTop: '1px solid #E5E3DD', padding: '12px 20px', background: '#ffffff' }}>
                <button
                  type="button"
                  onClick={() => { setCurrentStep(3); startPrototype() }}
                  style={{
                    width: '100%', height: 36, borderRadius: 6, border: 'none',
                    background: '#1A1A1A', color: '#ffffff', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333333' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A' }}
                >
                  Build prototype →
                </button>
              </div>
            )}
          </div>
        )
      }

      return null
    }

    // Step 3 — Preview
    if (currentStep === 3) {
      if (protoState === 'generating') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <Loader2 style={{ width: 24, height: 24, color: '#9B9A97', animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: 13, color: '#9B9A97' }}>Generating screens...</span>
          </div>
        )
      }

      if (protoState === 'error') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#9B3030' }}>{protoError}</p>
            <button
              type="button"
              onClick={() => startPrototype()}
              style={{ background: 'transparent', border: '1px solid #E5E3DD', borderRadius: 6, padding: '6px 16px', fontSize: 13, color: '#1A1A1A', cursor: 'pointer' }}
            >
              Try again
            </button>
          </div>
        )
      }

      if (protoState === 'ready') {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9B9A97', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Prototype screens
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {protoScreens.filter(s => s.type !== 'removed').map(screen => {
                  const badge = TYPE_BADGE[screen.type] ?? TYPE_BADGE.existing
                  const isActive = activeScreenId === screen.id
                  return (
                    <div
                      key={screen.id}
                      onClick={() => scrollToScreen(screen.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                        borderRadius: 6, cursor: 'pointer',
                        background: isActive ? '#F0ECFA' : 'transparent',
                        border: isActive ? '1px solid #D4C8F0' : '1px solid transparent',
                        transition: 'background 0.15s',
                      }}
                    >
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: badge.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 13, color: '#1A1A1A', flex: 1 }}>{screen.label}</span>
                      <span style={{ fontSize: 10, color: badge.color }}>{badge.text}</span>
                    </div>
                  )
                })}
              </div>

              <div style={{ margin: '20px 0', borderTop: '1px solid #E5E3DD' }} />

              <div style={{ fontSize: 12, fontWeight: 500, color: '#9B9A97', marginBottom: 12 }}>What&apos;s next</div>

              <button
                type="button"
                onClick={() => copyPromptForCursor()}
                style={{
                  width: '100%', height: 36, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  background: '#1A1A1A', color: '#ffffff', fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333333' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A' }}
              >
                {copied ? <><Check style={{ width: 13, height: 13 }} /> Copied!</> : <><Copy style={{ width: 13, height: 13 }} /> Copy prompt for Cursor →</>}
              </button>
            </div>
          </div>
        )
      }
    }

    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.35)' }} onClick={onClose} />

      {/* Modal */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', flexDirection: 'column', background: '#ffffff', overflow: 'hidden' }}>

        {/* ── TOP BAR ── */}
        <div style={{ height: 48, flexShrink: 0, background: '#ffffff', borderBottom: '1px solid #E5E3DD', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#1A1A1A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', maxWidth: 400 }}>
              {title}
            </span>
          </div>

          {/* 3-step indicator */}
          <div style={{ flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {STEPS.map((label, i) => {
                const filled = i + 1 <= currentStep
                const isCurrent = i + 1 === currentStep
                return (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                      background: filled ? '#1A1A1A' : 'transparent',
                      border: filled ? 'none' : '1.5px solid #D4D4D4',
                    }} />
                    {isCurrent && (
                      <span style={{ fontSize: 10, color: '#9B9A97', whiteSpace: 'nowrap' }}>{label}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ flexShrink: 0 }}>
            <button
              type="button"
              onClick={onClose}
              style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', borderRadius: 6, cursor: 'pointer', color: '#9B9A97', padding: 0 }}
              onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = '#F7F7F5'; b.style.color = '#1A1A1A' }}
              onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.background = 'none'; b.style.color = '#9B9A97' }}
            >
              <X style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ display: 'flex', flexDirection: 'row', height: 'calc(100vh - 48px - 56px)', overflow: 'hidden' }}>

          {/* Left panel (60%) */}
          <div style={{ width: '65%', height: '100%', background: '#F7F7F5', borderRight: '1px solid #E5E3DD', overflow: 'hidden' }}>
            {renderLeftPanel()}
          </div>

          {/* Right panel (35%) */}
          <div style={{
            width: '35%', height: '100%', background: '#ffffff', display: 'flex', flexDirection: 'column',
            overflowY: currentStep === 2 ? 'hidden' : 'auto',
            padding: currentStep === 2 ? 0 : '24px 20px',
          }}>
            {renderRightPanel()}
          </div>
        </div>

        {/* ── BOTTOM BAR ── */}
        <div style={{ height: 56, flexShrink: 0, background: '#ffffff', borderTop: '1px solid #E5E3DD', display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
          <input
            type="text"
            placeholder={currentStep === 3 ? "Describe a change... e.g. 'Make the CTA button larger'" : 'Ask anything about this step...'}
            style={{ flex: 1, height: 36, background: '#F7F7F5', border: '1px solid #E5E3DD', borderRadius: 6, fontSize: 13, color: '#1A1A1A', padding: '0 12px', outline: 'none' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#6B4FBB'; e.currentTarget.style.boxShadow = '0 0 0 2px #6B4FBB20' }}
            onBlur={e => { e.currentTarget.style.borderColor = '#E5E3DD'; e.currentTarget.style.boxShadow = 'none' }}
          />
          <button
            type="button"
            onClick={() => console.log('send')}
            style={{ width: 36, height: 36, flexShrink: 0, background: '#1A1A1A', color: '#ffffff', border: 'none', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#333333' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1A1A1A' }}
          >
            <ArrowRight style={{ width: 15, height: 15 }} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes blink { 50% { opacity: 0; } }
        input::placeholder { color: #C9C8C5; }
      `}</style>
    </>
  )
}

// ── MARKDOWN COMPONENTS ───────────────────────────────────────────────────────
const mdComponents = {
  h1: ({ children, ...props }: React.ComponentProps<'h1'>) => (
    <h1 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A1A', marginBottom: 12, marginTop: 0 }} {...props}>{children}</h1>
  ),
  h2: ({ children, ...props }: React.ComponentProps<'h2'>) => (
    <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1A1A1A', marginBottom: 8, marginTop: 20 }} {...props}>{children}</h2>
  ),
  h3: ({ children, ...props }: React.ComponentProps<'h3'>) => (
    <h3 style={{ fontSize: 13, fontWeight: 600, color: '#1A1A1A', marginBottom: 6, marginTop: 12 }} {...props}>{children}</h3>
  ),
  p: ({ children, ...props }: React.ComponentProps<'p'>) => (
    <p style={{ fontSize: 13, color: '#444', lineHeight: 1.6, marginBottom: 8, marginTop: 0 }} {...props}>{children}</p>
  ),
  ul: ({ children, ...props }: React.ComponentProps<'ul'>) => (
    <ul style={{ fontSize: 13, color: '#444', paddingLeft: 16, marginBottom: 8, marginTop: 0 }} {...props}>{children}</ul>
  ),
  ol: ({ children, ...props }: React.ComponentProps<'ol'>) => (
    <ol style={{ fontSize: 13, color: '#444', paddingLeft: 16, marginBottom: 8, marginTop: 0 }} {...props}>{children}</ol>
  ),
  li: ({ children, ...props }: React.ComponentProps<'li'>) => (
    <li style={{ marginBottom: 4 }} {...props}>{children}</li>
  ),
  strong: ({ children, ...props }: React.ComponentProps<'strong'>) => (
    <strong style={{ fontWeight: 600, color: '#1A1A1A' }} {...props}>{children}</strong>
  ),
  code: ({ children, ...props }: React.ComponentProps<'code'>) => (
    <code style={{
      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
      fontSize: 12, background: '#F7F7F5', padding: '1px 4px', borderRadius: 3,
    }} {...props}>{children}</code>
  ),
  hr: (props: React.ComponentProps<'hr'>) => (
    <hr style={{ borderColor: '#E5E3DD', borderStyle: 'solid', borderWidth: '1px 0 0 0', margin: '16px 0' }} {...props} />
  ),
}
