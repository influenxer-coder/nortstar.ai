'use client'

import { useEffect, useRef, useCallback } from 'react'

type ViewMode = 'desktop' | 'mobile'

const VIEWPORTS: Record<ViewMode, { iframeW: number; iframeH: number; cardW: number; cardH: number; scale: number }> = {
  desktop: { iframeW: 1440, iframeH: 900, cardW: 420, cardH: 263, scale: 420 / 1440 },
  mobile:  { iframeW: 390,  iframeH: 844, cardW: 195, cardH: 422, scale: 195 / 390 },
}

export type ScreenClickInfo = {
  /** Position in card coordinates (0-cardW, 0-cardH) */
  x: number
  y: number
  /** What the user clicked on */
  elementTag: string
  elementText: string
  elementClasses: string
}

type Props = {
  code: string
  index: number
  viewMode?: ViewMode
  onElementClick?: (info: ScreenClickInfo) => void
}

export function DynamicScreen({ code, index, viewMode = 'desktop', onElementClick }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const vp = VIEWPORTS[viewMode]

  const handleIframeClick = useCallback((e: MouseEvent) => {
    if (!onElementClick || !containerRef.current) return
    const target = e.target as HTMLElement
    if (!target) return

    // Position in iframe coordinates → scale to card coordinates
    const x = e.offsetX * vp.scale
    const y = e.offsetY * vp.scale

    onElementClick({
      x: Math.round(x),
      y: Math.round(y),
      elementTag: target.tagName.toLowerCase(),
      elementText: (target.textContent ?? '').trim().slice(0, 80),
      elementClasses: target.className ?? '',
    })
  }, [onElementClick, vp.scale])

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(code)
    doc.close()

    // Inject click handler into iframe document
    if (onElementClick) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        try {
          const iDoc = iframe.contentDocument
          if (!iDoc) return
          iDoc.addEventListener('click', handleIframeClick)
          // Add hover highlight
          const style = iDoc.createElement('style')
          style.textContent = `* { cursor: crosshair !important; } *:hover { outline: 2px solid rgba(107, 79, 187, 0.4) !important; outline-offset: 2px; }`
          iDoc.head.appendChild(style)
        } catch { /* cross-origin safety */ }
      }, 100)
    }

    return () => {
      try {
        iframe.contentDocument?.removeEventListener('click', handleIframeClick)
      } catch { /* */ }
    }
  }, [code, onElementClick, handleIframeClick])

  return (
    <div ref={containerRef} style={{
      width: vp.cardW,
      height: vp.cardH,
      overflow: 'hidden',
      position: 'relative',
      borderRadius: 6,
    }}>
      <iframe
        ref={iframeRef}
        title={`Screen ${index}`}
        sandbox="allow-same-origin allow-scripts"
        style={{
          width: vp.iframeW,
          height: vp.iframeH,
          border: 'none',
          transform: `scale(${vp.scale})`,
          transformOrigin: 'top left',
        }}
      />
    </div>
  )
}
