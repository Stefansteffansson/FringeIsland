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
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
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

  // Refresh session if expired
  try {
    await supabase.auth.getUser()
  } catch (err: unknown) {
    // Supabase may throw when a refresh token is missing (e.g. no session yet).
    // Ignore that specific case to avoid noisy logs during dev/startup.
    const e = err as { code?: string; status?: number }
    if (e?.code === 'refresh_token_not_found' || e?.status === 400) {
      // harmless — no session to refresh
    } else {
      throw err
    }
  }

  return supabaseResponse
}
