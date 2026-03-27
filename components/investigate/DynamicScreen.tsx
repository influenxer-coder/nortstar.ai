'use client'

import React, { Component, useMemo, useState, useEffect, type ReactNode } from 'react'

// ── Error Boundary ──────────────────────────────────────────────────────────
type EBProps = { fallback: ReactNode; children: ReactNode }
type EBState = { hasError: boolean }

class ErrorBoundary extends Component<EBProps, EBState> {
  constructor(props: EBProps) {
    super(props)
    this.state = { hasError: false }
  }
  static getDerivedStateFromError() {
    return { hasError: true }
  }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}

// ── Dynamic Screen Renderer ─────────────────────────────────────────────────
export function DynamicScreen({ code }: { code: string }) {
  const Component = useMemo(() => {
    try {
      const fn = new Function(
        'React',
        'useState',
        'useEffect',
        'useMemo',
        `${code}
        return typeof Component !== 'undefined'
          ? Component
          : typeof App !== 'undefined'
            ? App
            : () => React.createElement('div', {style: {padding: 16, fontSize: 13, color: '#9B9A97'}}, 'Preview not available')`
      )
      return fn(React, useState, useEffect, useMemo) as React.FC
    } catch {
      return () => (
        <div style={{ padding: 16, color: '#9B3030', fontSize: 13 }}>
          Preview error
        </div>
      )
    }
  }, [code])

  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: 16, fontSize: 13, color: '#9B9A97' }}>
          Preview unavailable
        </div>
      }
    >
      <Component />
    </ErrorBoundary>
  )
}
