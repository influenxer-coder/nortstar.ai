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
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [existingUser, setExistingUser] = useState(false)
  const [error, setError] = useState('')
  const [showResetLink, setShowResetLink] = useState(false)

  useEffect(() => {
    const err = searchParams.get('error')
    const desc = searchParams.get('error_description')
    if (desc) setError(decodeURIComponent(desc.replace(/\+/g, ' ')))
    else if (err && err !== 'no_code') setError(err)
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) return
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    const personalDomains = new Set([
      'gmail.com','yahoo.com','hotmail.com','outlook.com','icloud.com',
      'protonmail.com','aol.com','live.com','me.com','mac.com','msn.com','ymail.com',
    ])
    const domain = email.trim().split('@')[1]?.toLowerCase()
    if (!domain || personalDomains.has(domain)) {
      setError('Please sign up with your work email address.')
      return
    }

    setLoading(true)
    setError('')

    const supabase = createClient()
    const baseUrl = window.location.origin
    const redirectTo = `${baseUrl}/auth/callback`
    console.log('[SignUp] Requesting sign up', {
      email: email.trim(),
      emailRedirectTo: redirectTo,
      timestamp: new Date().toISOString(),
    })
    // Sign up with email + password (Supabase will send verification email)
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (err) {
      console.error('[SignUp] Error:', err?.message, err)
      const msg = err.message || ''
      const isAlreadyExists =
        /already registered|already exists|user already/i.test(msg) ||
        msg.includes('already been registered')
      setError(err.message)
      if (isAlreadyExists) setShowResetLink(true)
      setLoading(false)
    } else {
      const hasUser = !!data?.user
      const hasSession = !!data?.session
      const createdAt = data?.user?.created_at
      const isNewUser = createdAt && Date.now() - new Date(createdAt).getTime() < 60_000
      console.log('[SignUp] Success:', {
        hasUser,
        hasSession,
        userId: data?.user?.id,
        emailConfirmed: data?.user?.email_confirmed_at != null,
        created_at: data?.user?.created_at,
        isLikelyNewUser: isNewUser,
        fullData: data,
      })
      console.log(
        '[SignUp] Email: Supabase sends the verification email server-side. If confirmation is enabled, an email should have been sent to',
        email.trim()
      )
      if (data.user && !data.session) {
        if (isNewUser) {
          setSent(true)
          setExistingUser(false)
        } else {
          setExistingUser(true)
          setSent(false)
        }
      } else if (data.session) {
        window.location.href = '/dashboard'
      } else {
        setSent(true)
        setExistingUser(false)
      }
      setLoading(false)
    }
  }

  async function handleResendEmail() {
    if (!email.trim()) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const baseUrl = window.location.origin
    const redirectTo = `${baseUrl}/auth/callback`
    console.log('[Resend] Requesting resend verification email', {
      email: email.trim(),
      type: 'signup',
      emailRedirectTo: redirectTo,
      timestamp: new Date().toISOString(),
    })
    const { error: err } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: {
        emailRedirectTo: redirectTo,
      },
    })

    if (err) {
      console.error('[Resend] Error:', err?.message, err)
      setError(err.message)
    } else {
      console.log('[Resend] Resend requested successfully. Supabase should have sent verification email to', email.trim())
      setError('')
      alert('Verification email sent! Check your inbox and spam folder.')
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Logo size={28} className="shrink-0" />
            <span className="text-xl font-semibold text-foreground">NorthStar</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {existingUser ? 'Already registered' : sent ? 'Check your email' : 'Sign up'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {existingUser
              ? `This email is already registered. Sign in or reset your password.`
              : sent
                ? `We sent a verification link to ${email}. Click it to verify your email and complete signup.`
                : 'Create your account. We\'ll send a verification link to your email.'}
          </p>
        </div>

        {existingUser ? (
          <div className="space-y-4 text-center">
            <Link
              href={`/auth/signin?email=${encodeURIComponent(email)}`}
              className="block w-full rounded-md bg-violet-600 hover:bg-violet-500 px-4 py-3 text-center text-sm font-medium text-white"
            >
              Sign in
            </Link>
            <Link
              href="/auth/forgot-password"
              className="block w-full rounded-md border border-border px-4 py-3 text-center text-sm font-medium text-foreground hover:bg-muted"
            >
              Reset password
            </Link>
            <button
              type="button"
              onClick={() => { setExistingUser(false) }}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Use a different email
            </button>
          </div>
        ) : sent ? (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-violet-500/20 bg-violet-500/10 text-3xl">
              📧
            </div>
            <p className="text-sm text-muted-foreground">
              Click the verification link in your email. After verifying, you'll be able to sign in with your email and password.
            </p>
            <p className="text-xs text-muted-foreground">
              Open the link in the <strong>same browser</strong> where you signed up. The link expires in 1 hour.
            </p>
            <div className="rounded-md border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
              <p className="font-semibold mb-1">Email not arriving?</p>
              <ul className="list-disc list-inside space-y-1 text-yellow-300/80">
                <li>Check your spam/junk folder</li>
                <li>Click &quot;Resend verification email&quot; below</li>
                <li>Or <strong>try signing in</strong> with your password — if your project has email confirmation turned off in Supabase, it will work</li>
              </ul>
            </div>
            <div className="space-y-3">
              <Link
                href={`/auth/signin?email=${encodeURIComponent(email)}`}
                className="block w-full rounded-md border border-primary/40 bg-primary/10 px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-primary/20"
              >
                Try signing in with my password
              </Link>
              <button
                type="button"
                onClick={handleResendEmail}
                disabled={loading}
                className="text-sm text-primary hover:text-primary/80 disabled:opacity-50"
              >
                {loading ? 'Sending...' : 'Resend verification email'}
              </button>
              <p className="text-xs text-muted-foreground">
                Already have an account?{' '}
                <Link href="/auth/forgot-password" className="text-primary hover:text-primary/80 underline">
                  Reset your password
                </Link>
              </p>
              <div className="text-xs text-muted-foreground">
                Didn&apos;t receive it? Check spam folder or{' '}
                <button
                  type="button"
                  onClick={() => setSent(false)}
                  className="text-primary hover:text-primary/80 underline"
                >
                  use a different email
                </button>
              </div>
            </div>
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
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
            <Input
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              className="bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {error}
                {error.includes('invalid') || error.includes('expired') ? (
                  <p className="mt-1 text-zinc-400">Request a new link and open it in the same browser.</p>
                ) : null}
                {showResetLink && (
                  <p className="mt-2">
                    <Link href="/auth/forgot-password" className="text-violet-300 hover:text-violet-200 underline">
                      Reset your password instead →
                    </Link>
                  </p>
                )}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account…
                </>
              ) : (
                'Sign up'
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-primary hover:text-primary/80">
                Sign in
              </Link>
            </p>
          </form>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{' '}
          <a href="#" className="text-foreground hover:text-foreground/80">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-foreground hover:text-foreground/80">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
