'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/logo'
import { ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'

const C = {
  bg: '#f6f6f6',
  surface: '#ffffff',
  text: '#1f2328',
  muted: '#535963',
  border: '#d4d7dc',
  blue: '#367eed',
  cardShadow: '0 1px 4px rgba(27,37,40,0.06)',
}

type ProductInfo = {
  product_name: string
  one_liner: string
  target_customer: string
  key_features: string[]
  pricing_signal: string
}

type MatchInfo = {
  subvertical_id: string
  subvertical_name: string
  vertical_name: string
  confidence: number
}

type AnalysisResult = {
  product: ProductInfo
  match: MatchInfo
  competitors: unknown[]
  position: {
    position_summary: string
    closest_competitor: string
    key_differentiator: string
  }
}

type SavedData = {
  project_id?: string
  url: string
  product?: ProductInfo
  subvertical_name?: string
  vertical_name?: string
  analysis_result: AnalysisResult
  timestamp: number
}

const NS_CHIPS = ['ARR', 'MRR', 'DAU', 'MAU', 'Activation Rate', 'Retention Rate', 'NPS', 'Revenue', 'Signups']

function getMetricUnit(metric: string): { prefix?: string; suffix?: string } {
  const m = metric.toLowerCase()
  if (m === 'arr' || m === 'mrr' || m === 'revenue') return { prefix: '$' }
  if (m === 'dau' || m === 'mau' || m === 'signups') return { prefix: '#' }
  if (m.includes('rate') || m === 'nps') return { suffix: '%' }
  return {}
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p style={{ fontSize: 12, color: '#e53e3e', marginTop: 4 }} data-error="true">
      {message}
    </p>
  )
}

function Label({ children, helper }: { children: React.ReactNode; helper?: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.text }}>
        {children}
      </label>
      {helper && (
        <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{helper}</p>
      )}
    </div>
  )
}

const inputStyle = (hasError: boolean, isValid?: boolean): React.CSSProperties => ({
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: `1px solid ${hasError ? '#e53e3e' : isValid ? '#2e7d32' : C.border}`,
  fontSize: 14,
  color: C.text,
  background: C.surface,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  resize: 'none' as const,
})

export default function ProductSetupPage() {
  const router = useRouter()
  const [savedData, setSavedData] = useState<SavedData | null>(null)
  const [loading, setLoading] = useState(true)

  // Form fields
  const [productName, setProductName] = useState('')
  const [description, setDescription] = useState('')
  const [primaryCustomer, setPrimaryCustomer] = useState('')
  const [northStarMetric, setNorthStarMetric] = useState('')
  const [currentValue, setCurrentValue] = useState('')
  const [targetValue, setTargetValue] = useState('')

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const formRef = useRef<HTMLDivElement>(null)

  // Load localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem('northstar_onboarding')
    if (!raw) { router.push('/dashboard'); return }

    let parsed: SavedData
    try {
      parsed = JSON.parse(raw) as SavedData
    } catch {
      router.push('/dashboard')
      return
    }

    if (!parsed.analysis_result) { router.push('/dashboard'); return }

    setSavedData(parsed)
    const p = parsed.analysis_result.product
    if (p) {
      setProductName(p.product_name ?? '')
      setDescription(p.one_liner ?? '')
      setPrimaryCustomer(p.target_customer ?? '')
    }
    setLoading(false)
  }, [router])

  function validateForm(): Record<string, string> {
    const e: Record<string, string> = {}
    if (!productName || productName.trim().length < 2)
      e.productName = 'Product name is required'
    if (!description || description.trim().length < 20)
      e.description = 'Please describe your product (at least 20 characters)'
    if (!primaryCustomer || primaryCustomer.trim().length < 10)
      e.primaryCustomer = 'Please describe your primary customer'
    if (!northStarMetric)
      e.northStarMetric = 'Please select or enter your North Star metric'
    if (currentValue && targetValue && parseFloat(targetValue) <= parseFloat(currentValue))
      e.targetValue = 'Target should be greater than current value'
    return e
  }

  function validateField(field: string) {
    const e = validateForm()
    if (e[field]) {
      setErrors(prev => ({ ...prev, [field]: e[field] }))
    } else {
      setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  function onBlur(field: string) {
    setTouched(prev => ({ ...prev, [field]: true }))
    validateField(field)
  }

  function isValid(field: string): boolean {
    return touched[field] === true && !errors[field] && !!{
      productName,
      description,
      primaryCustomer,
      northStarMetric,
    }[field]
  }

  async function handleSubmit() {
    // Mark all required fields as touched
    setTouched({ productName: true, description: true, primaryCustomer: true, northStarMetric: true, targetValue: true })
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      // Scroll to first error
      setTimeout(() => {
        const firstError = document.querySelector('[data-error="true"]')
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 50)
      return
    }

    setSubmitting(true)
    setSubmitError(null)

    try {
      // Step 1 — Use existing analyzed project when available, else create one.
      let id = savedData?.project_id ?? ''
      if (!id) {
        const createRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: productName.trim(),
            url: savedData!.url,
            onboarding_step: 1,
            enrichment_status: 'running',
          }),
        })
        if (!createRes.ok) throw new Error('Failed to create product')
        const created = await createRes.json() as { id: string }
        id = created.id
      }

      // Step 2 — Save all collected fields
      const patchRes = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          north_star_metric: northStarMetric,
          north_star_current: currentValue ? parseFloat(currentValue) : null,
          north_star_target: targetValue ? parseFloat(targetValue) : null,
          icp: primaryCustomer.trim(),
          onboarding_step: 5,
          onboarding_completed: true,
        }),
      })

      if (!patchRes.ok) throw new Error('Failed to save product details')

      // Step 3 — Clean up
      localStorage.removeItem('northstar_onboarding')
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('northstar_current_project_id', id)
      }

      // Step 4 — Go to dashboard
      router.push('/dashboard')
    } catch (err: unknown) {
      setSubmitError((err as Error)?.message || 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  const metricUnit = getMetricUnit(northStarMetric)
  const match = savedData?.analysis_result?.match
  const isHighConfidence = (match?.confidence ?? 0) > 0.7

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 24, height: 24, color: C.muted, animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, paddingBottom: 80 }}>
      {/* Top bar */}
      <div style={{
        background: C.surface,
        borderBottom: `1px solid ${C.border}`,
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Logo size={24} color="purple" />
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text, marginLeft: 8 }}>NorthStar</span>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 24px 0' }}>

        {/* Progress indicator */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.muted, marginBottom: 6 }}>
            Setting up your product
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.02em' }}>
            Tell us about your product
          </h1>
        </div>

        {/* Context strip */}
        {savedData && match && (
          <div style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: '12px 16px',
            marginBottom: 24,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            flexWrap: 'wrap',
          }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: C.muted, marginBottom: 3 }}>
                Analyzing
              </p>
              <p style={{ fontSize: 13, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 280 }}>
                {savedData.url}
              </p>
              <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                {match.subvertical_name} · {match.vertical_name}
              </p>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '3px 10px', borderRadius: 30,
              background: isHighConfidence ? '#e8f5e9' : '#fffbeb',
              color: isHighConfidence ? '#2e7d32' : '#92600a',
              border: `1px solid ${isHighConfidence ? '#a5d6a7' : '#f0b429'}`,
              flexShrink: 0,
            }}>
              {Math.round((match.confidence ?? 0) * 100)}% match
            </span>
          </div>
        )}

        {/* Form card */}
        <div ref={formRef} style={{
          background: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          padding: '28px 28px',
          boxShadow: C.cardShadow,
        }}>

          {/* Field 1 — Product name */}
          <div style={{ marginBottom: 24 }}>
            <Label helper="This is how your product will appear in NorthStar">
              Product name <span style={{ color: '#e53e3e' }}>*</span>
            </Label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={productName}
                onChange={(e) => { setProductName(e.target.value); if (errors.productName) validateField('productName') }}
                onBlur={() => onBlur('productName')}
                placeholder="e.g. Acme CRM"
                maxLength={60}
                style={inputStyle(!!errors.productName, isValid('productName'))}
              />
              {isValid('productName') && (
                <CheckCircle2 style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#2e7d32' }} />
              )}
            </div>
            <FieldError message={errors.productName} />
          </div>

          {/* Field 2 — Description */}
          <div style={{ marginBottom: 24 }}>
            <Label helper="One sentence describing your product and who it's for">
              What does your product do? <span style={{ color: '#e53e3e' }}>*</span>
            </Label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => { setDescription(e.target.value); if (errors.description) validateField('description') }}
              onBlur={() => onBlur('description')}
              placeholder="e.g. Acme CRM helps sales teams at Series B startups close deals 30% faster"
              maxLength={200}
              style={{ ...inputStyle(!!errors.description, isValid('description')), resize: 'vertical' }}
            />
            <FieldError message={errors.description} />
          </div>

          {/* Field 3 — Primary customer */}
          <div style={{ marginBottom: 24 }}>
            <Label helper="Be specific — role, company size, stage">
              Who is your primary customer? <span style={{ color: '#e53e3e' }}>*</span>
            </Label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={primaryCustomer}
                onChange={(e) => { setPrimaryCustomer(e.target.value); if (errors.primaryCustomer) validateField('primaryCustomer') }}
                onBlur={() => onBlur('primaryCustomer')}
                placeholder="e.g. Head of Product at Series B SaaS companies"
                style={inputStyle(!!errors.primaryCustomer, isValid('primaryCustomer'))}
              />
              {isValid('primaryCustomer') && (
                <CheckCircle2 style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#2e7d32' }} />
              )}
            </div>
            <FieldError message={errors.primaryCustomer} />
          </div>

          {/* Field 4 — North Star metric */}
          <div style={{ marginBottom: 24 }}>
            <Label helper="The single number that defines success for your product">
              What&apos;s your most important growth metric? <span style={{ color: '#e53e3e' }}>*</span>
            </Label>
            {/* Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {NS_CHIPS.map((chip) => {
                const selected = northStarMetric === chip
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => { setNorthStarMetric(chip); if (errors.northStarMetric) setErrors(prev => { const n = { ...prev }; delete n.northStarMetric; return n }) }}
                    style={{
                      padding: '5px 14px', borderRadius: 30, fontSize: 13, fontWeight: 500,
                      border: `1px solid ${selected ? C.blue : C.border}`,
                      background: selected ? '#e8f0fd' : C.surface,
                      color: selected ? C.blue : C.muted,
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}
                  >
                    {chip}
                  </button>
                )
              })}
            </div>
            {/* Free text input */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={northStarMetric}
                onChange={(e) => { setNorthStarMetric(e.target.value); if (errors.northStarMetric) setErrors(prev => { const n = { ...prev }; delete n.northStarMetric; return n }) }}
                onBlur={() => onBlur('northStarMetric')}
                placeholder="Or type your own metric"
                style={inputStyle(!!errors.northStarMetric, isValid('northStarMetric'))}
              />
              {isValid('northStarMetric') && (
                <CheckCircle2 style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#2e7d32' }} />
              )}
            </div>
            <FieldError message={errors.northStarMetric} />
          </div>

          {/* Fields 5 & 6 — Current and Target values */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            {/* Field 5 — Current value */}
            <div>
              <Label helper="What is this metric at today? (optional)">
                Current value
              </Label>
              <div style={{ position: 'relative' }}>
                {metricUnit.prefix && (
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: C.muted, pointerEvents: 'none',
                  }}>
                    {metricUnit.prefix}
                  </span>
                )}
                <input
                  type="number"
                  value={currentValue}
                  onChange={(e) => { setCurrentValue(e.target.value); if (errors.targetValue) validateField('targetValue') }}
                  placeholder="e.g. 50000"
                  style={{
                    ...inputStyle(false),
                    paddingLeft: metricUnit.prefix ? 26 : 14,
                    paddingRight: metricUnit.suffix ? 26 : 14,
                  }}
                />
                {metricUnit.suffix && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: C.muted, pointerEvents: 'none',
                  }}>
                    {metricUnit.suffix}
                  </span>
                )}
              </div>
            </div>

            {/* Field 6 — Target value */}
            <div>
              <Label helper="What do you want to reach? (optional)">
                Target value
              </Label>
              <div style={{ position: 'relative' }}>
                {metricUnit.prefix && (
                  <span style={{
                    position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: C.muted, pointerEvents: 'none',
                  }}>
                    {metricUnit.prefix}
                  </span>
                )}
                <input
                  type="number"
                  value={targetValue}
                  onChange={(e) => { setTargetValue(e.target.value); if (errors.targetValue) validateField('targetValue') }}
                  onBlur={() => { if (currentValue && targetValue) validateField('targetValue') }}
                  placeholder="e.g. 100000"
                  style={{
                    ...inputStyle(!!errors.targetValue),
                    paddingLeft: metricUnit.prefix ? 26 : 14,
                    paddingRight: metricUnit.suffix ? 26 : 14,
                  }}
                />
                {metricUnit.suffix && (
                  <span style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 13, color: C.muted, pointerEvents: 'none',
                  }}>
                    {metricUnit.suffix}
                  </span>
                )}
              </div>
              <FieldError message={errors.targetValue} />
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div style={{
              marginBottom: 16,
              padding: '12px 16px',
              borderRadius: 8,
              background: '#fff5f5',
              border: '1px solid #fed7d7',
              display: 'flex', alignItems: 'flex-start', gap: 10,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: '#c53030', fontWeight: 500 }}>{submitError}</p>
              </div>
              <button
                type="button"
                onClick={() => handleSubmit()}
                style={{ fontSize: 12, color: C.blue, background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, fontWeight: 600 }}
              >
                Retry
              </button>
            </div>
          )}

          {/* Submit button */}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '12px 20px', borderRadius: 30,
              border: 'none', background: submitting ? C.muted : C.text, color: '#fff',
              fontSize: 14, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: submitting ? 0.7 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            {submitting ? (
              <>
                <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                Setting up…
              </>
            ) : (
              <>
                Launch NorthStar
                <ArrowRight style={{ width: 15, height: 15 }} />
              </>
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
      `}</style>
    </div>
  )
}
