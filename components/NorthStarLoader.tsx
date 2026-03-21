'use client'

import { useState, useEffect } from 'react'

const MESSAGES = [
  'Loading your product surface...',
  'Syncing PostHog · Salesforce · Zendesk...',
  'Ranking hypotheses by impact score...',
  'Querying species memory...',
  'Mapping vertical patterns...',
  'Scoring effort vs. impact...',
  'NorthStar is ready',
]

interface Props {
  onComplete?: () => void
  bgColor?: string
}

export default function NorthStarLoader({ onComplete, bgColor }: Props) {
  const [msgIndex, setMsgIndex] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let t1: ReturnType<typeof setTimeout>
    let t2: ReturnType<typeof setTimeout>

    if (msgIndex >= MESSAGES.length - 1) {
      t1 = setTimeout(() => onComplete?.(), 800)
    } else {
      t1 = setTimeout(() => {
        setExiting(true)
        t2 = setTimeout(() => {
          setMsgIndex((i) => i + 1)
          setExiting(false)
        }, 350)
      }, 2200)
    }

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [msgIndex, onComplete])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 20,
        padding: '48px 24px',
      }}
    >
      {/* Orb */}
      <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background:
              'conic-gradient(from 0deg, #C084FC, #818CF8, #38BDF8, #34D399, #C084FC)',
            animation: 'ns-breathe 3s ease-in-out infinite, ns-spin 8s linear infinite',
          }}
        />
        {/* Inner cutout */}
        <div
          style={{
            position: 'absolute',
            inset: 8,
            borderRadius: '50%',
            background: bgColor ?? 'hsl(var(--background))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg
            width={24}
            height={24}
            viewBox="0 0 24 24"
            fill="none"
            style={{ opacity: 0.85 }}
          >
            <path
              d="M12 3L20 8V16L12 21L4 16V8L12 3Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
            />
            <circle cx="12" cy="12" r="2.5" fill="currentColor" opacity=".7" />
          </svg>
        </div>
      </div>

      {/* Message + dots inline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Message ticker */}
        <div style={{ height: 22, position: 'relative', overflow: 'hidden', minWidth: 220 }}>
          <div
            style={{
              fontSize: 13,
              color: 'hsl(var(--muted-foreground))',
              animation: exiting
                ? 'ns-fadeOut 350ms forwards'
                : 'ns-fadeIn 500ms forwards',
              whiteSpace: 'nowrap',
            }}
          >
            {MESSAGES[msgIndex]}
          </div>
        </div>

        {/* Three dots */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {[0, 0.2, 0.4].map((delay, i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'hsl(var(--muted-foreground))',
                animation: `ns-pulse 1.4s ease-in-out ${delay}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
