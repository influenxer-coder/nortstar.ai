'use client'

import { useEffect, useState } from 'react'

export type FlowNode = {
  id: string
  label: string
  type: 'existing' | 'removed' | 'added' | 'changed'
  cta: string
}

export type FlowSummary = {
  removed_count: number
  added_count: number
  changed_count: number
  key_change: string
}

export type FlowObject = {
  variation_index: number
  current_flow: FlowNode[]
  proposed_flow: FlowNode[]
  summary: FlowSummary
}

const NODE_STYLES: Record<string, { bg: string; border: string; label: string; cta: string; strike: boolean }> = {
  existing: { bg: '#F7F7F5', border: '#E5E3DD', label: '#1A1A1A', cta: '#9B9A97', strike: false },
  removed:  { bg: '#FAEAEA', border: '#F0BBBB', label: '#9B3030', cta: '#C9A0A0', strike: true },
  added:    { bg: '#EEF6F1', border: '#A8D5B8', label: '#4D9B6F', cta: '#7BB898', strike: false },
  changed:  { bg: '#FBF4E6', border: '#E8C87A', label: '#9B6D1A', cta: '#C4A04A', strike: false },
}

type EllipsisItem = { ellipsis: true; hidden: string[] }
type DisplayItem = FlowNode | EllipsisItem

function truncateNodes(nodes: FlowNode[]): DisplayItem[] {
  if (nodes.length <= 5) return nodes
  const hidden = nodes.slice(2, nodes.length - 2).map(n => n.label)
  return [nodes[0], nodes[1], { ellipsis: true, hidden }, nodes[nodes.length - 2], nodes[nodes.length - 1]]
}

function NodeBox({ node }: { node: FlowNode }) {
  const s = NODE_STYLES[node.type] ?? NODE_STYLES.existing
  return (
    <div style={{
      minWidth: 80,
      maxWidth: 120,
      padding: '8px 10px',
      borderRadius: 6,
      border: `1.5px solid ${s.border}`,
      background: s.bg,
      textAlign: 'center',
      flexShrink: 0,
    }}>
      <div style={{
        fontSize: 12,
        fontWeight: 500,
        color: s.label,
        lineHeight: 1.3,
        textDecoration: s.strike ? 'line-through' : 'none',
        marginBottom: node.cta ? 3 : 0,
      }}>
        {node.label}
      </div>
      {node.cta && (
        <div style={{ fontSize: 10, color: s.cta, lineHeight: 1.2 }}>
          {node.cta}
        </div>
      )}
    </div>
  )
}

function EllipsisBox({ hidden }: { hidden: string[] }) {
  return (
    <div
      title={hidden.join(' → ')}
      style={{
        minWidth: 36,
        padding: '8px 10px',
        borderRadius: 6,
        border: '1.5px dashed #C9C8C5',
        background: '#F7F7F5',
        textAlign: 'center',
        flexShrink: 0,
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: 13, color: '#C9C8C5', lineHeight: 1 }}>···</div>
    </div>
  )
}

function Arrow() {
  return (
    <span style={{ color: '#C9C8C5', fontSize: 14, margin: '0 6px', alignSelf: 'center', flexShrink: 0 }}>
      →
    </span>
  )
}

function FlowRow({ label, nodes }: { label: string; nodes: FlowNode[] }) {
  const items = truncateNodes(nodes)
  return (
    <div>
      <div style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        color: '#C9C8C5',
        textTransform: 'uppercase',
        marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
        {items.map((item, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
            {'ellipsis' in item
              ? <EllipsisBox hidden={item.hidden} />
              : <NodeBox node={item} />
            }
            {i < items.length - 1 && <Arrow />}
          </span>
        ))}
      </div>
    </div>
  )
}

function SkeletonBox() {
  return (
    <div style={{
      minWidth: 80,
      height: 52,
      borderRadius: 6,
      background: '#E5E3DD',
      animation: 'diagramPulse 1.5s ease-in-out infinite',
      flexShrink: 0,
    }} />
  )
}

function SkeletonRow({ label }: { label: string }) {
  return (
    <div>
      <div style={{
        fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
        color: '#C9C8C5', textTransform: 'uppercase', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {[0, 1, 2, 3].map(i => (
          <span key={i} style={{ display: 'flex', alignItems: 'center' }}>
            <SkeletonBox />
            {i < 3 && <Arrow />}
          </span>
        ))}
      </div>
    </div>
  )
}

type Props = {
  currentFlow: FlowNode[]
  proposedFlow: FlowNode[]
  summary: FlowSummary
  variationName: string
  validatedBy: string[]
  isLoading: boolean
}

export function FlowDiagram({ currentFlow, proposedFlow, summary, variationName, validatedBy, isLoading }: Props) {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    setVisible(false)
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [variationName])

  return (
    <div style={{ padding: 32, height: '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
      {isLoading ? (
        <>
          {/* Skeleton header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ height: 18, width: 180, borderRadius: 4, background: '#E5E3DD', animation: 'diagramPulse 1.5s ease-in-out infinite', marginBottom: 8 }} />
            <div style={{ height: 14, width: 260, borderRadius: 4, background: '#E5E3DD', animation: 'diagramPulse 1.5s ease-in-out infinite' }} />
          </div>
          <SkeletonRow label="CURRENT" />
          <div style={{ marginTop: 20 }}>
            <SkeletonRow label="PROPOSED" />
          </div>
        </>
      ) : (
        <div style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.2s' }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#1A1A1A', marginBottom: 4 }}>
              {variationName}
            </div>
            {summary.key_change && (
              <div style={{ fontSize: 13, color: '#9B9A97', fontStyle: 'italic' }}>
                {summary.key_change}
              </div>
            )}
          </div>

          {/* Flow rows */}
          <FlowRow label="CURRENT" nodes={currentFlow} />
          <div style={{ marginTop: 20 }}>
            <FlowRow label="PROPOSED" nodes={proposedFlow} />
          </div>

          {/* Summary chips */}
          {(summary.removed_count > 0 || summary.added_count > 0 || summary.changed_count > 0) && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
              {summary.removed_count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 500, color: '#9B3030', background: '#FAEAEA', borderRadius: 4, padding: '3px 8px' }}>
                  −{summary.removed_count} steps removed
                </span>
              )}
              {summary.added_count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 500, color: '#4D9B6F', background: '#EEF6F1', borderRadius: 4, padding: '3px 8px' }}>
                  +{summary.added_count} steps added
                </span>
              )}
              {summary.changed_count > 0 && (
                <span style={{ fontSize: 11, fontWeight: 500, color: '#9B6D1A', background: '#FBF4E6', borderRadius: 4, padding: '3px 8px' }}>
                  {summary.changed_count} steps changed
                </span>
              )}
            </div>
          )}

          {/* Competitor evidence */}
          {validatedBy.length > 0 && (
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid #E5E3DD' }}>
              <span style={{ fontSize: 11, color: '#C9C8C5', marginRight: 8 }}>Based on:</span>
              {validatedBy.map((name, i) => (
                <span
                  key={i}
                  style={{
                    display: 'inline-block',
                    fontSize: 11,
                    color: '#6B4FBB',
                    background: '#F0ECFA',
                    borderRadius: 4,
                    padding: '2px 8px',
                    marginRight: 4,
                    marginBottom: 4,
                  }}
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes diagramPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  )
}
