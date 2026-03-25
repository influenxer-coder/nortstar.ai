'use client'

import { useState } from 'react'

const C = {
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  cardShadow: '0 1px 3px rgba(0,0,0,0.06)',
}

function buildSrcDoc(code: string): string {
  const cleaned = code
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; }
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
try {
${cleaned}
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(React.createElement(BeforeAfterPrototype));
} catch(e) {
  document.getElementById('root').innerHTML = '<div style="color:#b91c1c;padding:12px;font-size:13px">' + e.message + '</div>';
}
</script>
</body>
</html>`
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
  const [instruction, setInstruction] = useState('')
  const srcDoc = buildSrcDoc(code)

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
        overflow: 'hidden',
        boxShadow: C.cardShadow,
      }}>
        <iframe
          key={code}
          srcDoc={srcDoc}
          style={{ width: '100%', height: 520, border: 'none', display: 'block' }}
          sandbox="allow-scripts"
          title="Prototype preview"
        />
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
