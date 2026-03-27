'use client'

import { useEffect, useRef } from 'react'

export function DynamicScreen({ code, index }: { code: string; index: number }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return

    // Write HTML content into the iframe
    const doc = iframe.contentDocument
    if (!doc) return

    doc.open()
    doc.write(code)
    doc.close()
  }, [code])

  return (
    <div style={{
      width: 320,
      height: 500,
      overflow: 'hidden',
      position: 'relative',
    }}>
      <iframe
        ref={iframeRef}
        title={`Screen ${index}`}
        sandbox="allow-same-origin"
        style={{
          width: 1280,
          height: 2000,
          border: 'none',
          transform: 'scale(0.25)',
          transformOrigin: 'top left',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
