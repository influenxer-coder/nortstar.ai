'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { Loader2 } from 'lucide-react'

function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const redirectTo = `${window.location.origin}/auth/callback`
    console.log('[ForgotPassword] Requesting password reset email', {
      email: email.trim(),
      redirectTo,
      timestamp: new Date().toISOString(),
    })
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    })

    if (err) {
      console.error('[ForgotPassword] Error:', err?.message, err)
      setError(err.message)
    } else {
      console.log('[ForgotPassword] Reset email requested. Supabase should have sent password reset email to', email.trim())
      setSent(true)
    }
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Logo size={28} className="shrink-0" />
            <span className="text-xl font-semibold text-zinc-100">NorthStar</span>
          </Link>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 text-3xl mb-4">
            📧
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Check your email</h1>
          <p className="text-sm text-zinc-400 mb-6">
            We sent a password reset link to <strong className="text-zinc-300">{email}</strong>. 
            Click the link to set a new password.
          </p>
          <p className="text-xs text-zinc-500 mb-6">
            Open the link in the same browser. The link expires in 1 hour. Check spam if you don&apos;t see it.
          </p>
          <Link href="/auth/signin" className="text-sm text-violet-400 hover:text-violet-300">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Logo size={28} className="shrink-0" />
            <span className="text-xl font-semibold text-zinc-100">NorthStar</span>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">Reset password</h1>
          <p className="text-sm text-zinc-400">Enter your email and we&apos;ll send you a link to reset your password.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            autoFocus
            className="bg-zinc-900 border-zinc-700 text-zinc-100 placeholder:text-zinc-500"
          />
          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-500 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              'Send reset link'
            )}
          </Button>
          <p className="text-center text-xs text-zinc-500">
            <Link href="/auth/signin" className="text-violet-400 hover:text-violet-300">
              Back to sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
          <div className="text-sm text-zinc-500">Loading…</div>
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  )
}
