import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do NOT retrieve the user session details before refreshing the token.
  // Refresh the session if needed.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // Public paths
  const isPublicPath =
    path === '/' ||
    path === '/login' ||
    path === '/signup' ||
    path === '/forgot-password' ||
    path.startsWith('/auth/')

  // If user is not logged in:
  if (!user) {
    // If attempting to access a protected path, redirect to login
    if (!isPublicPath) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
    return supabaseResponse
  }

  // If user is logged in:
  // Fetch their profile to check onboarding status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded')
    .eq('id', user.id)
    .single()

  const isOnboarded = profile?.onboarded === true

  if (!isOnboarded) {
    // Authenticated but NOT onboarded. They should only be allowed on /onboarding or public homepage.
    if (path !== '/onboarding' && !path.startsWith('/auth/') && path !== '/') {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  } else {
    // Authenticated and onboarded.
    // If they try to visit login, signup, forgot-password, or onboarding, redirect to dashboard.
    if (
      path === '/login' ||
      path === '/signup' ||
      path === '/forgot-password' ||
      path === '/onboarding'
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
