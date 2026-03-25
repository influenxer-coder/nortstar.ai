'use client'

import { useMemo, useState } from 'react'

const C = {
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

function compileComponent(code: string): { Component: React.ComponentType | null; error: string | null } {
  try {
    const cleaned = code
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    // Expect a global component named BeforeAfterPrototype.
    // Disallow exports to keep eval simple.
    const withoutExports = cleaned
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+\{[\s\S]*?\};?/g, '')

    // eslint-disable-next-line no-new-func
    const fn = new Function('React', `${withoutExports}\nreturn (typeof BeforeAfterPrototype !== 'undefined') ? BeforeAfterPrototype : null;`)
    const Component = fn(require('react')) as unknown as React.ComponentType | null
    if (!Component) return { Component: null, error: 'Prototype code did not define BeforeAfterPrototype.' }
    return { Component, error: null }
  } catch (e) {
    return { Component: null, error: (e as Error).message || 'Failed to compile prototype.' }
  }
}

export function PrototypeViewer({
  code,
  history,
  onUndoTo,
  onSubmitEdit,
  editing,
}: {
  code: string
  history: Array<{ label: string; code: string }>
  onUndoTo: (idx: number) => void
  onSubmitEdit: (instruction: string) => void
  editing: boolean
}) {
  const compiled = useMemo(() => compileComponent(code), [code])
  const [instruction, setInstruction] = useState('')

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
          Prototype
        </h3>
        <p style={{ fontSize: 12, color: C.muted }}>Interactive before/after preview + inline edits</p>
      </div>

      {history.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {history.map((h, idx) => (
            <button
              key={`${h.label}-${idx}`}
              type="button"
              onClick={() => onUndoTo(idx)}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: C.muted,
                background: '#f5f5f7',
                border: `1px solid ${C.border}`,
                borderRadius: 30,
                padding: '4px 10px',
                cursor: 'pointer',
              }}
            >
              {h.label}
            </button>
          ))}
        </div>
      )}

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 14,
        boxShadow: C.cardShadow,
      }}>
        {compiled.error ? (
          <div style={{ fontSize: 13, color: '#b91c1c' }}>
            {compiled.error}
          </div>
        ) : compiled.Component ? (
          <compiled.Component />
        ) : null}
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Describe a change... e.g. 'Make the CTA bigger' or 'Skip the form entirely'"
          style={{
            width: '100%',
            padding: '12px 12px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            color: C.text,
          }}
        />
        <button
          type="button"
          disabled={!instruction.trim() || editing}
          onClick={() => {
            const v = instruction.trim()
            if (!v) return
            onSubmitEdit(v)
            setInstruction('')
          }}
          style={{
            marginTop: 10,
            borderRadius: 10,
            border: 'none',
            background: '#1f2328',
            color: '#fff',
            padding: '10px 12px',
            fontSize: 13,
            fontWeight: 800,
            cursor: (!instruction.trim() || editing) ? 'not-allowed' : 'pointer',
            opacity: (!instruction.trim() || editing) ? 0.6 : 1,
          }}
        >
          {editing ? 'Updating…' : 'Update prototype →'}
        </button>
      </div>
    </div>
  )
}

