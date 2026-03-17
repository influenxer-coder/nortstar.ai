import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProductOnboardingFlow from './ProductOnboardingFlow'
import OnboardingErrorBoundary from './OnboardingErrorBoundary'

export default async function ProductOnboardingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login?next=/onboarding/product')

  return (
    <OnboardingErrorBoundary>
      <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a]" />}>
        <ProductOnboardingFlow />
      </Suspense>
    </OnboardingErrorBoundary>
  )
}
