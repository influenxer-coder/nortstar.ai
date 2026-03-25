'use client'

import React, { useMemo, useState } from 'react'

const C = {
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

class PrototypeErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(err: unknown) {
    const message = err instanceof Error ? err.message : 'Prototype render failed'
    return { error: message }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ fontSize: 13, color: '#b91c1c' }}>
          {this.state.error}
        </div>
      )
    }
    return this.props.children
  }
}

function compileComponent(code: string): { Component: React.ComponentType | null; error: string | null } {
  try {
    const cleaned = code
      .replace(/^```[a-z]*\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim()

    // Remove any import/export keywords so we can evaluate in a plain function scope.
    const withoutImports = cleaned.replace(/^import[^\n]*\n/gm, '')
    const withoutExports = withoutImports
      .replace(/export\s+default\s+/g, '')
      .replace(/export\s+\{[\s\S]*?\};?/g, '')
      .replace(/^\s*export\s+(?=function|const|let|var)\s+/gm, '')

    // eslint-disable-next-line no-new-func
    const fn = new Function(
      'React',
      `
      const { useState, useEffect, useMemo, useRef, useCallback } = React;
      ${withoutExports}
      return (typeof BeforeAfterPrototype !== 'undefined') ? BeforeAfterPrototype : null;
    `.trim(),
    )

    const Component = fn(React) as unknown as React.ComponentType | null
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
  const Comp = compiled.Component

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
        ) : Comp ? (
          <PrototypeErrorBoundary key={code}>
            <Comp />
          </PrototypeErrorBoundary>
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

