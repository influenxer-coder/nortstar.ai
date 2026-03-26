'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

type Props = {
  title: string
  onClose: () => void
}

export function InvestigateModal({ title, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(0,0,0,0.4)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 51,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          height: 48,
          background: '#ffffff',
          borderBottom: '1px solid #E5E3DD',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A' }}>
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 24,
              height: 24,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#9B9A97',
              padding: 0,
              borderRadius: 4,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#1A1A1A' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#9B9A97' }}
          >
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, background: '#ffffff' }} />
      </div>
    </div>
  )
}
