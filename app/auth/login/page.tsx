import { Suspense } from 'react'
import { RequestAccessForm } from './RequestAccessForm'

function RequestAccessFallback() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
      <div className="text-sm text-zinc-500">Loading…</div>
    </div>
  )
}

export default function RequestAccessPage() {
  return (
    <Suspense fallback={<RequestAccessFallback />}>
      <RequestAccessForm />
    </Suspense>
  )
}
