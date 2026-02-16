'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/logo'
import { Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [ssoLoading, setSsoLoading] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleDemoAccess() {
    // Demo mode: go straight to dashboard with pre-seeded data
    router.push('/dashboard?demo=true')
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handleSSO(provider: 'google') {
    setSsoLoading(provider)
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    setSsoLoading(null)
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Logo size={28} className="shrink-0" />
            <span className="text-xl font-semibold">NorthStar</span>
          </Link>
          <h1 className="text-2xl font-bold text-zinc-100 mb-2">
            {sent ? 'Check your email' : 'Welcome back'}
          </h1>
          <p className="text-sm text-zinc-400">
            {sent
              ? `We sent a login link to ${email}`
              : 'Sign in to your NorthStar workspace'}
          </p>
        </div>

        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-3xl">
              📧
            </div>
            <p className="text-sm text-zinc-400">
              Click the link in your email to sign in. The link expires in 1 hour.
            </p>
            <button
              onClick={() => setSent(false)}
              className="text-sm text-violet-400 hover:text-violet-300"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Demo access - prominent */}
            <button
              onClick={handleDemoAccess}
              className="w-full border border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 rounded-lg p-4 text-left transition-colors group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-violet-300 mb-0.5">
                    <Logo size={18} />
                    Try Demo (No login required)
                  </div>
                  <div className="text-xs text-zinc-500">
                    See NorthStar with 239 real-world data points
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-zinc-950 px-3 text-zinc-600">or sign in with your account</span>
              </div>
            </div>

            {/* Corporate SSO section */}
            <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900/50">
              <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Corporate SSO</p>
              <div className="space-y-2">
                <button
                  className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-md px-4 py-2.5 text-sm text-zinc-200 transition-colors"
                  onClick={() => {}}
                >
                  <span className="text-base">🔵</span>
                  Sign in with Okta
                  <span className="ml-auto text-xs text-zinc-500">Enterprise</span>
                </button>
                <button
                  className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-md px-4 py-2.5 text-sm text-zinc-200 transition-colors"
                  onClick={() => {}}
                >
                  <span className="text-base">🪟</span>
                  Sign in with Azure AD
                  <span className="ml-auto text-xs text-zinc-500">Enterprise</span>
                </button>
                <button
                  onClick={() => handleSSO('google')}
                  disabled={ssoLoading === 'google'}
                  className="w-full flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-md px-4 py-2.5 text-sm text-zinc-200 transition-colors disabled:opacity-50"
                >
                  {ssoLoading === 'google' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <span className="text-base">🔍</span>
                  )}
                  Sign in with Google
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-zinc-950 px-3 text-zinc-600">or email magic link</span>
              </div>
            </div>

            {/* Email magic link */}
            <form onSubmit={handleMagicLink} className="space-y-3">
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              {error && (
                <p className="text-xs text-red-400">{error}</p>
              )}
              <Button
                type="submit"
                className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending…
                  </>
                ) : (
                  'Send Magic Link'
                )}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-xs text-zinc-600 mt-8">
          By signing in, you agree to our{' '}
          <a href="#" className="text-zinc-500 hover:text-zinc-400">Terms</a>
          {' '}and{' '}
          <a href="#" className="text-zinc-500 hover:text-zinc-400">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
