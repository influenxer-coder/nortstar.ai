'use client'

import { useMemo, useState } from 'react'

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
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

const FALLBACK_EVENTS = [
  'User completes onboarding',
  'User creates first item',
  'User invites a team member',
  'User connects first integration',
]

export function ActivationPicker({
  githubConnected,
  candidates,
  selected,
  onSelect,
}: {
  githubConnected: boolean
  candidates: Candidate[]
  selected: string | null
  onSelect: (event: string) => void
}) {
  const [custom, setCustom] = useState('')
  const showCandidates = githubConnected && candidates.length > 0

  const options = useMemo(() => {
    if (showCandidates) return candidates.map((c) => c.event_name)
    return [...FALLBACK_EVENTS]
  }, [showCandidates, candidates])

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
          What counts as activated?
        </h3>
        <p style={{ fontSize: 12, color: C.muted }}>We&apos;ll optimize specifically toward this moment</p>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 12,
        boxShadow: C.cardShadow,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
          {options.map((event) => {
            const isSelected = selected === event
            const cand = candidates.find((c) => c.event_name === event)
            return (
              <label key={event} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: 10,
                borderRadius: 10,
                border: `1px solid ${isSelected ? '#b8d0f7' : 'transparent'}`,
                background: isSelected ? '#eef4ff' : 'transparent',
                cursor: 'pointer',
              }}>
                <input
                  type="radio"
                  checked={isSelected}
                  onChange={() => onSelect(event)}
                  style={{ marginTop: 3 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>{event}</p>
                  {cand ? (
                    <>
                      <p style={{ fontSize: 11, color: C.muted }}>
                        Found in: <strong style={{ color: C.text }}>{cand.file}</strong> line {cand.line || '—'}
                      </p>
                      <p style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{cand.description}</p>
                    </>
                  ) : (
                    <p style={{ fontSize: 11, color: C.muted }}>
                      Choose this if it matches your activation milestone.
                    </p>
                  )}
                </div>
              </label>
            )
          })}

          <label style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: 10,
            borderRadius: 10,
            cursor: 'pointer',
          }}>
            <input
              type="radio"
              checked={selected === '__custom__'}
              onChange={() => onSelect('__custom__')}
              style={{ marginTop: 3 }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 2 }}>Let me define it myself</p>
              {selected === '__custom__' && (
                <input
                  type="text"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  onBlur={() => {
                    const v = custom.trim()
                    if (v) onSelect(v)
                  }}
                  placeholder="Describe your activation moment…"
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${C.border}`,
                    fontSize: 13,
                    color: C.text,
                  }}
                />
              )}
              <p style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
                We&apos;ll optimize specifically toward this moment.
              </p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )
}

