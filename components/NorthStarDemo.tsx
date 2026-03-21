'use client'

import { useState, useEffect, useRef } from 'react'

const C = {
  bg: '#07080A',
  surface: '#0F1114',
  surface2: '#161A1F',
  amber: '#E8A030',
  text: '#F2EDE6',
  muted: 'rgba(242,237,230,0.45)',
  dim: 'rgba(242,237,230,0.22)',
  border: 'rgba(255,255,255,0.07)',
  green: '#2ECC71',
} as const

const STEPS = [
  { num: '01', label: 'IDEAS' },
  { num: '02', label: 'HYPOTHESIS' },
  { num: '03', label: 'VARIANTS' },
  { num: '04', label: 'SPEC' },
  { num: '05', label: 'TEST' },
  { num: '06', label: 'IMPACT' },
]

const STEP_TITLES = [
  'NorthStar listens to ideas across your teams',
  'NorthStar ranks the bet',
  'Three variants. One assumption each.',
  'Spec ready. PR open. No ticket written.',
  'Test live. Signal in 8 days.',
  'Loop closed. Next hypothesis queued.',
]

const MD_SPEC = `# Experiment: WhatsApp Setup Wizard
KR: activation 12% → 35%
Component: WhatsAppSetupPage.tsx
Variant: Replace external link with
  in-app 3-step wizard component
Flag: optimizely.variation('wa_setup_wizard')
Success metric: whatsapp_connected event
Do not change: billing flow, channel selector`

// ── Step 1 ────────────────────────────────────────────────────────────────────

function Step1({ cardVis }: { cardVis: boolean[] }) {
  const signals = [
    {
      label: 'COMPETITOR',
      source: 'LinkedIn / Product Hunt',
      text: 'Hootsuite shipped TikTok Business Messaging Sep 2025',
    },
    {
      label: 'SALES',
      source: 'Salesforce · 3 lost deals',
      text: '"They have WhatsApp, we don\'t" — mentioned across 3 closed-lost deals this month',
    },
    {
      label: 'ANALYTICS',
      source: 'Heap · WhatsApp setup page',
      text: '73% drop-off at step 2. No whatsapp_connected event fired for 841 sessions.',
    },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {signals.map((s, i) => (
        <div
          key={i}
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            padding: '18px 24px',
            opacity: cardVis[i] ? 1 : 0,
            transform: cardVis[i] ? 'translateX(0)' : 'translateX(-20px)',
            transition: 'opacity 400ms ease, transform 400ms ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.amber, letterSpacing: '0.08em' }}>
              {s.label}
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.dim }}>
              — {s.source}
            </span>
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.55 }}>{s.text}</div>
        </div>
      ))}
    </div>
  )
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

function Step2() {
  const [selected, setSelected] = useState(0)
  const hypotheses = [
    {
      rank: '#1',
      confidence: 0.91,
      text: 'Surface WhatsApp setup as a guided 3-step wizard instead of linking to Meta docs.',
      kr: 'WhatsApp activation 12% → 35%',
    },
    {
      rank: '#2',
      confidence: 0.74,
      text: 'Add a "WhatsApp setup" prompt in the onboarding checklist.',
      kr: 'Trial activation 34% → 42%',
    },
    {
      rank: '#3',
      confidence: 0.61,
      text: 'Surface a live chat offer when user reaches step 2 of WhatsApp setup.',
      kr: 'Support deflection 18% → 30%',
    },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {hypotheses.map((h, i) => (
        <div
          key={i}
          onClick={() => setSelected(i)}
          style={{
            background: selected === i ? 'rgba(232,160,48,0.06)' : C.surface,
            border: `1px solid ${selected === i ? 'rgba(232,160,48,0.4)' : C.border}`,
            padding: '18px 24px',
            cursor: 'pointer',
            transition: 'all 250ms',
            animation: i === 0 && selected === 0 ? 'demo-pulse 2.5s ease infinite' : 'none',
            opacity: 0,
            animationFillMode: 'forwards',
          }}
          // fade in staggered
          ref={(el) => {
            if (el) {
              el.style.animation =
                i === 0 && selected === 0
                  ? `demo-fadeUp 400ms ${i * 120}ms ease forwards, demo-pulse 2.5s ${i * 120 + 400}ms ease infinite`
                  : `demo-fadeUp 400ms ${i * 120}ms ease forwards`
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: selected === i ? C.amber : C.dim, letterSpacing: '0.06em' }}>
              {h.rank}
            </span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.dim }}>
              confidence {h.confidence}
            </span>
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.55 }}>{h.text}</div>
          {selected === i && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.amber, marginTop: 10 }}>
              Maps to Q2 KR: {h.kr}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

function Step3() {
  const variants = [
    {
      name: 'VARIANT A',
      desc: '3-step in-app wizard replaces Meta docs link',
      assumption: 'Users want guided setup, not external docs',
      complexity: 'Med',
      risk: 'Low',
      selected: true,
    },
    {
      name: 'VARIANT B',
      desc: 'Video walkthrough modal on setup page entry',
      assumption: 'Users learn better from video than text',
      complexity: 'Low',
      risk: 'Low',
      selected: false,
    },
    {
      name: 'VARIANT C',
      desc: 'Live chat offer when user reaches step 2',
      assumption: 'Human support converts stuck users',
      complexity: 'Low',
      risk: 'Low',
      selected: false,
    },
  ]
  return (
    <div className="demo-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {variants.map((v, i) => (
        <div
          key={i}
          style={{
            background: v.selected ? 'rgba(232,160,48,0.06)' : C.surface,
            border: `1px solid ${v.selected ? 'rgba(232,160,48,0.4)' : C.border}`,
            padding: '24px',
            opacity: 0,
            animation: `demo-fadeUp 400ms ${i * 150}ms ease forwards`,
          }}
        >
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: v.selected ? C.amber : C.dim, marginBottom: 12, letterSpacing: '0.06em' }}>
            {v.name}{v.selected ? ' · SELECTED' : ''}
          </div>
          <div style={{ fontSize: 14, color: C.text, lineHeight: 1.5, marginBottom: 12 }}>{v.desc}</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 16 }}>{v.assumption}</div>
          <div style={{ display: 'flex', gap: 24 }}>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.dim, marginBottom: 4, letterSpacing: '0.06em' }}>COMPLEXITY</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.text }}>{v.complexity}</div>
            </div>
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.dim, marginBottom: 4, letterSpacing: '0.06em' }}>RISK</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.green }}>{v.risk}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Step 4 ────────────────────────────────────────────────────────────────────

function Step4({ typedText }: { typedText: string }) {
  return (
    <div className="demo-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* MD spec */}
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '10px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['#ff5f57', '#febc2e', '#28c840'] as const).map((color, i) => (
            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
          ))}
          <span style={{ marginLeft: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.dim }}>
            experiment-wa-setup-wizard.md
          </span>
        </div>
        <div style={{ padding: '20px', fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.text, lineHeight: 1.8, whiteSpace: 'pre-wrap', minHeight: 200 }}>
          {typedText}
          <span style={{ animation: 'demo-cursorBlink 0.8s step-end infinite', display: 'inline-block' }}>▌</span>
        </div>
      </div>

      {/* PR card */}
      <div
        style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          padding: '28px',
          opacity: 0,
          animation: 'demo-fadeUp 400ms 700ms ease forwards',
          alignSelf: 'start',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block' }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.green }}>Open</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.dim }}>· Review requested</span>
        </div>
        <div style={{ fontSize: 15, color: C.text, marginBottom: 14, lineHeight: 1.4 }}>
          PR #2847 — feat: WhatsApp setup wizard variant
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.muted }}>
          Changed files: 1 · +47 −3
        </div>
      </div>
    </div>
  )
}

// ── Step 5 ────────────────────────────────────────────────────────────────────

function Step5({ barFill }: { barFill: boolean }) {
  const [badgeVis, setBadgeVis] = useState(false)

  useEffect(() => {
    if (barFill) {
      const t = setTimeout(() => setBadgeVis(true), 1800)
      return () => clearTimeout(t)
    } else {
      setBadgeVis(false)
    }
  }, [barFill])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: C.surface, border: `1px solid ${C.border}`, padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.dim, letterSpacing: '0.06em' }}>CONTROL</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.muted }}>3.2% setup completion</span>
        </div>
        <div style={{ background: C.surface2, height: 8, borderRadius: 4, marginBottom: 28, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: barFill ? '50%' : '0%', background: C.dim, borderRadius: 4, transition: 'width 2s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.amber, letterSpacing: '0.06em' }}>VARIANT A</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.green }}>18.7% setup completion</span>
        </div>
        <div style={{ background: C.surface2, height: 8, borderRadius: 4, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: barFill ? '50%' : '0%', background: C.amber, borderRadius: 4, transition: 'width 2s cubic-bezier(0.4,0,0.2,1)' }} />
        </div>

        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.dim, letterSpacing: '0.06em', marginBottom: 6 }}>CONFIDENCE</div>
            <div style={{ background: C.surface2, height: 4, width: 160, borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
              <div style={{ height: '100%', width: barFill ? '97%' : '0%', background: C.green, borderRadius: 2, transition: 'width 2.5s cubic-bezier(0.4,0,0.2,1)' }} />
            </div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.green }}>97%</span>
          </div>
          <div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: C.dim, letterSpacing: '0.06em', marginBottom: 6 }}>DURATION</div>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.text }}>Day 8 of 14</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 20px',
          background: 'rgba(46,204,113,0.08)',
          border: '1px solid rgba(46,204,113,0.3)',
          opacity: badgeVis ? 1 : 0,
          transform: badgeVis ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 400ms ease, transform 400ms ease',
          animation: badgeVis ? 'demo-significantPulse 2.5s ease infinite' : 'none',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.green, display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.green, letterSpacing: '0.04em' }}>
          Significant result detected
        </span>
      </div>
    </div>
  )
}

// ── Step 6 ────────────────────────────────────────────────────────────────────

function Step6() {
  const items = [
    { value: '$127,400', label: 'ARR attributed' },
    { value: '+847', label: 'WhatsApp activations' },
    { value: '−34%', label: 'churn risk in this cohort' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="demo-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              padding: '32px 24px',
              opacity: 0,
              animation: `demo-fadeUp 400ms ${i * 150}ms ease forwards`,
            }}
          >
            <div style={{ fontSize: 'clamp(28px,3vw,40px)', fontWeight: 400, color: C.amber, lineHeight: 1, marginBottom: 10 }}>
              {item.value}
            </div>
            <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.4 }}>{item.label}</div>
          </div>
        ))}
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 20px',
          border: `1px solid ${C.border}`,
          background: C.surface,
          flexWrap: 'wrap',
          opacity: 0,
          animation: 'demo-fadeUp 400ms 500ms ease forwards',
        }}
      >
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.amber }}>Next hypothesis queued →</span>
        <span style={{ fontSize: 13, color: C.muted }}>Add WhatsApp template library surface for power users</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: C.dim, marginLeft: 'auto' }}>confidence 0.78</span>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function NorthStarDemo() {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(true)
  const [typedText, setTypedText] = useState('')
  const [barFill, setBarFill] = useState(false)
  const [cardVis, setCardVis] = useState([false, false, false])
  const autoRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typeRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const goToStep = (next: number) => {
    if (autoRef.current) clearTimeout(autoRef.current)
    if (typeRef.current) clearTimeout(typeRef.current)
    setVisible(false)
    setTimeout(() => {
      setStep(next)
      setTypedText('')
      setBarFill(false)
      setCardVis([false, false, false])
      setVisible(true)
    }, 400)
  }

  // Auto-advance every 5s
  useEffect(() => {
    autoRef.current = setTimeout(() => goToStep((step + 1) % 6), 5000)
    return () => { if (autoRef.current) clearTimeout(autoRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step])

  // Stagger cards for step 0
  useEffect(() => {
    if (step === 0) {
      const timers = [0, 1, 2].map((i) =>
        setTimeout(
          () => setCardVis((prev) => { const n = [...prev]; n[i] = true; return n }),
          300 + i * 200
        )
      )
      return () => timers.forEach(clearTimeout)
    }
  }, [step])

  // Typewriter for step 3
  useEffect(() => {
    if (step === 3) {
      let i = 0
      const type = () => {
        setTypedText(MD_SPEC.slice(0, i + 1))
        i++
        if (i < MD_SPEC.length) typeRef.current = setTimeout(type, 40)
      }
      typeRef.current = setTimeout(type, 400)
      return () => { if (typeRef.current) clearTimeout(typeRef.current) }
    }
  }, [step])

  // Bar fill for step 4
  useEffect(() => {
    if (step === 4) {
      const t = setTimeout(() => setBarFill(true), 400)
      return () => clearTimeout(t)
    }
  }, [step])

  return (
    <div style={{ background: C.bg, padding: '80px 24px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes demo-fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes demo-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(232,160,48,0.3); }
          50%       { box-shadow: 0 0 0 8px rgba(232,160,48,0); }
        }
        @keyframes demo-cursorBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes demo-significantPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.6; }
        }
        @media (max-width: 768px) {
          .demo-grid-3 { grid-template-columns: 1fr !important; }
          .demo-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Step nav */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, marginBottom: 48, overflowX: 'auto' }}>
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              style={{
                flex: 1,
                minWidth: 72,
                padding: '12px 8px',
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${i === step ? C.amber : 'transparent'}`,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                marginBottom: -1,
                transition: 'all 200ms',
              }}
            >
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: i === step ? C.amber : C.dim, letterSpacing: '0.08em', transition: 'color 200ms' }}>
                {s.num}
              </span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: i === step ? C.amber : C.dim, letterSpacing: '0.06em', transition: 'color 200ms' }}>
                {s.label}
              </span>
            </button>
          ))}
        </div>

        {/* Step header */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 400ms, transform 400ms',
            marginBottom: 32,
          }}
        >
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: C.amber, letterSpacing: '0.1em', marginBottom: 12 }}>
            {STEPS[step].num} — {STEPS[step].label}
          </div>
          <div style={{ fontSize: 'clamp(20px, 2.5vw, 28px)', color: C.text, lineHeight: 1.2 }}>
            {STEP_TITLES[step]}
          </div>
        </div>

        {/* Step content */}
        <div
          style={{
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(8px)',
            transition: 'opacity 400ms, transform 400ms',
            minHeight: 280,
          }}
        >
          {step === 0 && <Step1 cardVis={cardVis} />}
          {step === 1 && <Step2 />}
          {step === 2 && <Step3 />}
          {step === 3 && <Step4 typedText={typedText} />}
          {step === 4 && <Step5 barFill={barFill} />}
          {step === 5 && <Step6 />}
        </div>

        {/* Tagline */}
        <div style={{ textAlign: 'center', marginTop: 56, fontFamily: "'DM Mono', monospace", fontSize: 12, color: C.dim, letterSpacing: '0.08em' }}>
          The fastest learners win.
        </div>
      </div>
    </div>
  )
}
