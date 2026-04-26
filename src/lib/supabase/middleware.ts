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

    // Attempt to verify the user session — gracefully degrade if Supabase is unreachable
    let user = null
    try {
        const { data } = await supabase.auth.getUser()
        user = data.user
    } catch {
        // Network failure (ISP / Supabase outage) — allow the request through
        // rather than crashing the proxy. Protected pages will still redirect
        // on the next successful check.
        console.warn('[STREETS proxy] Supabase unreachable — skipping auth check')
        return supabaseResponse
    }

    // Protected Routes Logic
    if (request.nextUrl.pathname.startsWith('/assessment') && !user) {
        const url = request.nextUrl.clone()
        url.pathname = '/auth/login'
        return NextResponse.redirect(url)
    }

    return supabaseResponse
}
