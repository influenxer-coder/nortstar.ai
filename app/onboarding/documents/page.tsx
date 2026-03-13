import { redirect } from 'next/navigation'

// Superseded by /onboarding/product (the full multi-step flow).
// Redirect legacy links that include a projectId, or fall back to step 1.
export default function OnboardingDocumentsPage({
  searchParams,
}: {
  searchParams: { projectId?: string }
}) {
  const { projectId } = searchParams
  if (projectId) {
    redirect(`/onboarding/product?projectId=${projectId}&step=2`)
  }
  redirect('/onboarding/product')
}
