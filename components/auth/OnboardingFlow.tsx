'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Logo } from '@/components/logo'

const ONBOARDING_STEPS = [
  {
    id: 'company',
    title: 'Tell us about your company',
    fields: [
      { name: 'company', label: 'Company Name', type: 'text', required: true },
      { name: 'role', label: 'Your Role', type: 'select', options: ['Product Manager', 'Founder', 'Designer', 'Engineer', 'Other'], required: true },
      { name: 'company_size', label: 'Company Size', type: 'select', options: ['1-10', '11-50', '51-200', '200+'], required: true },
    ],
  },
  {
    id: 'product',
    title: 'Tell us about your product',
    fields: [
      { name: 'product_name', label: 'Product Name', type: 'text', required: true },
      { name: 'product_stage', label: 'Product Stage', type: 'select', options: ['Idea', 'MVP', 'Growth', 'Scale'], required: true },
      { name: 'product_description', label: 'Brief Description', type: 'textarea', required: true, placeholder: 'What does your product do?' },
      { name: 'target_users', label: 'Target Users', type: 'text', required: true, placeholder: 'e.g., B2B SaaS companies, 20-200 employees' },
    ],
  },
  {
    id: 'workflow',
    title: 'How do you work today?',
    fields: [
      { name: 'current_tools', label: 'Tools You Use', type: 'multi-select', options: ['Jira', 'Linear', 'Notion', 'Confluence', 'Productboard', 'Mixpanel', 'Amplitude', 'Figma', 'Slack'], required: true },
      { name: 'main_pain_points', label: 'Top Pain Points', type: 'multi-select', options: ['Manual research aggregation', 'Writing PRDs takes too long', 'Hard to prioritize roadmap', 'Not enough time for strategy', 'Too many meetings', 'Dashboard fatigue'], required: true },
      { name: 'north_star_metric', label: 'North Star Metric', type: 'text', required: false, placeholder: 'e.g., Weekly Active Users' },
    ],
  },
]

export function OnboardingFlow() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const currentStep = ONBOARDING_STEPS[step]

  const handleNext = async () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1)
    } else {
      await handleComplete()
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company: (formData.company as string) ?? null,
          role: (formData.role as string) ?? null,
          company_size: (formData.company_size as string) ?? null,
          product_name: (formData.product_name as string) ?? null,
          product_stage: (formData.product_stage as string) ?? null,
          product_description: (formData.product_description as string) ?? null,
          target_users: (formData.target_users as string) ?? null,
          current_tools: Array.isArray(formData.current_tools) ? formData.current_tools as string[] : null,
          main_pain_points: Array.isArray(formData.main_pain_points) ? formData.main_pain_points as string[] : null,
          north_star_metric: (formData.north_star_metric as string) || null,
          onboarding_completed: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      const contextEntries: { user_id: string; context_type: string; key: string; value: string }[] = [
        { user_id: user.id, context_type: 'product', key: 'name', value: (formData.product_name as string) ?? '' },
        { user_id: user.id, context_type: 'product', key: 'description', value: (formData.product_description as string) ?? '' },
        { user_id: user.id, context_type: 'product', key: 'target_users', value: (formData.target_users as string) ?? '' },
        { user_id: user.id, context_type: 'product', key: 'stage', value: (formData.product_stage as string) ?? '' },
      ]
      if (formData.north_star_metric) {
        contextEntries.push({ user_id: user.id, context_type: 'metric', key: 'north_star', value: formData.north_star_metric as string })
      }
      for (const entry of contextEntries) {
        await supabase.from('user_context').upsert(
          { ...entry, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,context_type,key' }
        )
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const updateFormData = (name: string, value: unknown) => {
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Logo size={32} />
          <span className="text-lg font-semibold text-zinc-100">NorthStar</span>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex gap-1">
            {ONBOARDING_STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded ${i <= step ? 'bg-violet-600' : 'bg-zinc-800'}`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-zinc-500">
            Step {step + 1} of {ONBOARDING_STEPS.length}
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-zinc-100">{currentStep.title}</h2>

          <div className="space-y-4">
            {currentStep.fields.map((field) => (
              <div key={field.name}>
                <label className="mb-2 block text-sm font-medium text-zinc-300">
                  {field.label}
                  {field.required && <span className="ml-1 text-red-500">*</span>}
                </label>

                {field.type === 'text' && (
                  <Input
                    placeholder={field.placeholder as string}
                    value={(formData[field.name] as string) ?? ''}
                    onChange={(e) => updateFormData(field.name, e.target.value)}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                )}

                {field.type === 'textarea' && (
                  <Textarea
                    placeholder={field.placeholder as string}
                    value={(formData[field.name] as string) ?? ''}
                    onChange={(e) => updateFormData(field.name, e.target.value)}
                    rows={3}
                    className="bg-zinc-900 border-zinc-700 text-zinc-100"
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={(formData[field.name] as string) ?? ''}
                    onChange={(e) => updateFormData(field.name, e.target.value)}
                    className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  >
                    <option value="">Select...</option>
                    {(field.options as string[]).map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'multi-select' && (
                  <div className="space-y-2">
                    {(field.options as string[]).map((opt) => (
                      <label key={opt} className="flex cursor-pointer items-center gap-2 text-zinc-300">
                        <input
                          type="checkbox"
                          checked={((formData[field.name] as string[]) ?? []).includes(opt)}
                          onChange={(e) => {
                            const current = (formData[field.name] as string[]) ?? []
                            const updated = e.target.checked ? [...current, opt] : current.filter((v) => v !== opt)
                            updateFormData(field.name, updated)
                          }}
                          className="rounded border-zinc-700 bg-zinc-900 text-violet-500"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex justify-between pt-6">
            <Button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              variant="ghost"
              className="text-zinc-400"
            >
              Back
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={loading}
              className="bg-violet-600 hover:bg-violet-500"
            >
              {step === ONBOARDING_STEPS.length - 1
                ? loading ? 'Completing...' : 'Complete Setup'
                : 'Continue'}
            </Button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-zinc-500">
          <button
            type="button"
            onClick={async () => {
              const { data: { user } } = await supabase.auth.getUser()
              if (user) {
                await supabase.from('profiles').update({ onboarding_completed: true, updated_at: new Date().toISOString() }).eq('id', user.id)
                router.push('/dashboard')
                router.refresh()
              }
            }}
            className="text-violet-400 hover:underline"
          >
            Skip for now
          </button>
        </p>
      </div>
    </div>
  )
}
