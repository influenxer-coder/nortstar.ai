'use client'

import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Pencil } from 'lucide-react'

const C = {
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
  blue: '#367eed',
}

function splitSections(md: string): Array<{ heading: string; content: string }> {
  const lines = md.split('\n')
  const sections: Array<{ heading: string; content: string }> = []
  let current: { heading: string; content: string[] } | null = null

  for (const line of lines) {
    const h2 = line.match(/^##\s+(.*)$/)
    if (h2) {
      if (current) sections.push({ heading: current.heading, content: current.content.join('\n').trim() })
      current = { heading: h2[1].trim(), content: [] }
      continue
    }
    if (!current) {
      current = { heading: 'Overview', content: [] }
    }
    current.content.push(line)
  }
  if (current) sections.push({ heading: current.heading, content: current.content.join('\n').trim() })
  return sections.filter((s) => s.content.length > 0)
}

export function PlanViewer({
  markdown,
  onChange,
}: {
  markdown: string
  onChange: (next: string) => void
}) {
  const [editingHeading, setEditingHeading] = useState<string | null>(null)
  const sections = useMemo(() => splitSections(markdown), [markdown])

  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ marginBottom: 10 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>
          Investigation plan
        </h3>
        <p style={{ fontSize: 12, color: C.muted }}>Streaming markdown — you can edit any section inline</p>
      </div>

      <div style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 12,
        padding: 14,
        boxShadow: C.cardShadow,
      }}>
        {sections.map((s) => {
          const isEditing = editingHeading === s.heading
          return (
            <div key={s.heading} style={{ position: 'relative', padding: '8px 0', borderTop: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 800, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {s.heading}
                </p>
                <button
                  type="button"
                  onClick={() => setEditingHeading(isEditing ? null : s.heading)}
                  style={{
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    color: C.muted,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  <Pencil style={{ width: 14, height: 14 }} />
                  Edit
                </button>
              </div>

              {isEditing ? (
                <textarea
                  defaultValue={`## ${s.heading}\n${s.content}`.trim()}
                  onBlur={(e) => {
                    const nextBlock = e.target.value
                    // naive replace by heading
                    const next = markdown.replace(new RegExp(`##\\s+${s.heading.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}[\\s\\S]*?(?=\\n##\\s+|$)`), nextBlock + '\n')
                    onChange(next.trim())
                    setEditingHeading(null)
                  }}
                  style={{
                    width: '100%',
                    marginTop: 10,
                    minHeight: 120,
                    padding: '12px 12px',
                    borderRadius: 10,
                    border: `1px solid ${C.border}`,
                    fontSize: 13,
                    color: C.text,
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                    lineHeight: 1.55,
                  }}
                />
              ) : (
                <div style={{ marginTop: 8 }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {`## ${s.heading}\n${s.content}`.trim()}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setEditingHeading('ALL')}
        style={{
          marginTop: 12,
          borderRadius: 10,
          border: `1px solid ${C.border}`,
          background: '#eef4ff',
          color: C.blue,
          padding: '10px 12px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Edit this plan
      </button>

      {editingHeading === 'ALL' && (
        <textarea
          defaultValue={markdown}
          onBlur={(e) => {
            onChange(e.target.value)
            setEditingHeading(null)
          }}
          style={{
            width: '100%',
            marginTop: 10,
            minHeight: 260,
            padding: '12px 12px',
            borderRadius: 10,
            border: `1px solid ${C.border}`,
            fontSize: 13,
            color: C.text,
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            lineHeight: 1.55,
          }}
        />
      )}
    </div>
  )
}

