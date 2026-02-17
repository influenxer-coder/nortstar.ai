'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { Loader2 } from 'lucide-react'

export function RequestAccessForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const err = searchParams.get('error')
    const desc = searchParams.get('error_description')
    if (desc) setError(decodeURIComponent(desc.replace(/\+/g, ' ')))
    else if (err && err !== 'no_code') setError(err)
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Logo size={28} className="shrink-0" />
            <span className="text-xl font-semibold text-zinc-100">NorthStar</span>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            {sent ? 'Check your email' : 'Request access'}
          </h1>
          <p className="text-sm text-zinc-400">
            {sent
              ? `We sent a verification link to ${email}`
              : 'Enter your email. We\'ll send you a link to verify and open the app.'}
          </p>
        </div>

        {sent ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 text-3xl">
              📧
            </div>
            <p className="text-sm text-zinc-400">
              Click the link in the email to verify and sign in. You'll then be taken to the app to test NorthStar.
            </p>
            <p className="text-xs text-zinc-500">
              Open the link in the <strong>same browser</strong> where you requested access. The link expires in 1 hour.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              Use a different email
            </button>
          </div>
        ) : (
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
                {error.includes('invalid') || error.includes('expired') ? (
                  <p className="mt-1 text-zinc-400">Request a new link and open it in the same browser.</p>
                ) : null}
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
                'Send verification email'
              )}
            </Button>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-zinc-500">
          By continuing, you agree to our{' '}
          <a href="#" className="text-zinc-400 hover:text-zinc-300">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-zinc-400 hover:text-zinc-300">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
