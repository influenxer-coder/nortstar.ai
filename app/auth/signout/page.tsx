'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SignOutPage() {
  const router = useRouter()
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.signOut().then(() => {
      router.replace('/auth/signin')
      router.refresh()
    })
  }, [router])
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <p className="text-zinc-500">Signing out...</p>
    </div>
  )
}
