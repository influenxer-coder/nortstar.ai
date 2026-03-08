import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // Protect admin routes — require ADMIN_EMAIL match
  if (path.startsWith('/admin')) {
    const adminEmail = process.env.ADMIN_EMAIL
    if (!user || !adminEmail || user.email !== adminEmail) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // Protect dashboard and onboarding (require auth)
  if (!user && (path.startsWith('/dashboard') || path.startsWith('/onboarding'))) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/signin'
    url.searchParams.set('next', path)
    return NextResponse.redirect(url)
  }

  // If signed in and hitting login/signin/forgot-password, redirect to dashboard (or onboarding)
  if (user && (path.startsWith('/auth/login') || path.startsWith('/auth/signin') || path.startsWith('/auth/forgot-password'))) {
    const url = request.nextUrl.clone()
    const next = request.nextUrl.searchParams.get('next')
    if (next && (next.startsWith('/dashboard') || next.startsWith('/onboarding'))) {
      url.pathname = next
      url.search = ''
      return NextResponse.redirect(url)
    }
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
