'use client'

import { useEffect, useRef } from 'react'

type ViewMode = 'desktop' | 'mobile'

const VIEWPORTS: Record<ViewMode, { iframeW: number; iframeH: number; cardW: number; cardH: number; scale: number }> = {
  desktop: { iframeW: 1440, iframeH: 900, cardW: 420, cardH: 263, scale: 420 / 1440 },
  mobile:  { iframeW: 390,  iframeH: 844, cardW: 195, cardH: 422, scale: 195 / 390 },
}

export function DynamicScreen({ code, index, viewMode = 'desktop' }: { code: string; index: number; viewMode?: ViewMode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const vp = VIEWPORTS[viewMode]

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    const doc = iframe.contentDocument
    if (!doc) return
    doc.open()
    doc.write(code)
    doc.close()
  }, [code])

  return (
    <div style={{
      width: vp.cardW,
      height: vp.cardH,
      overflow: 'hidden',
      position: 'relative',
      borderRadius: 6,
    }}>
      <iframe
        ref={iframeRef}
        title={`Screen ${index}`}
        sandbox="allow-same-origin"
        style={{
          width: vp.iframeW,
          height: vp.iframeH,
          border: 'none',
          transform: `scale(${vp.scale})`,
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
