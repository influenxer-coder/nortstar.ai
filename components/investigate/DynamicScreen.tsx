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
export function DynamicScreen({ code, index }: { code: string; index: number }) {
  const Comp = useMemo(() => {
    try {
      const fn = new Function(
        'React',
        'useState',
        'useEffect',
        'useMemo',
        `${code}
        if (typeof Screen_${index} !== 'undefined') return Screen_${index};
        if (typeof Component !== 'undefined') return Component;
        if (typeof App !== 'undefined') return App;
        return function() { return React.createElement('div', {style: {padding: 16, fontSize: 13, color: '#9B9A97'}}, 'Preview not available'); };`
      )
      return fn(React, useState, useEffect, useMemo) as React.FC
    } catch {
      return () => (
        <div style={{ padding: 16, color: '#9B3030', fontSize: 13 }}>
          Preview error
        </div>
      )
    }
  }, [code, index])

  return (
    <ErrorBoundary
      fallback={
        <div style={{ padding: 16, fontSize: 13, color: '#9B9A97' }}>
          Preview unavailable
        </div>
      }
    >
      <div style={{
        width: 1280,
        height: 2000,
        transform: 'scale(0.25)',
        transformOrigin: 'top left',
      }}>
        <Comp />
      </div>
    </ErrorBoundary>
  )
}
