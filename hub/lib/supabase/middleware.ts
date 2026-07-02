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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh the session if expired, then verify the JWT LOCALLY (ES256 against
  // a cached JWKS — ADR-U037). This runs on EVERY matched request, so it must
  // never pay an Auth-server round-trip on the hot path: the previous
  // `getUser()` here cost a measured ~250-750 ms per request (arn1 -> eu-west-1,
  // even for fully static pages). `getClaims()` resolves the session via
  // `getSession()` (which refreshes + re-sets cookies when expired) and does
  // the signature check in WebCrypto. Keep this side-effect-free beyond the
  // refresh.
  try {
    await supabase.auth.getClaims()
  } catch (err: unknown) {
    // The proxy must never take the whole surface down over an auth hiccup
    // (e.g. a transient JWKS fetch failure) — every route gates its own auth.
    // Logged, not swallowed silently.
    console.error('proxy updateSession failed', err)
  }

  return supabaseResponse
}
