import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const pathname = request.nextUrl.pathname
  const isAdminArea = pathname.startsWith('/admin')
  const isLogin = pathname.startsWith('/admin/login')

  const supabase =
    url && anonKey
      ? createServerClient(url, anonKey, {
          cookies: {
            getAll() {
              return request.cookies.getAll()
            },
            setAll(cookiesToSet) {
              cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
              response = NextResponse.next({ request })
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options),
              )
            },
          },
        })
      : null

  if (isAdminArea) {
    if (supabase && !isLogin) {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        const login = new URL('/admin/login', request.url)
        login.searchParams.set('next', pathname)
        return NextResponse.redirect(login)
      }
    }

    return response
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.includes('.')) {
    return response
  }

  let ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
  if (ip && ip.includes(',')) {
    ip = ip.split(',')[0].trim()
  }

  if (ip && supabase) {
    const { data: bannedIp } = await supabase
      .from('banned_ips')
      .select('ip_address')
      .eq('ip_address', ip)
      .single()

    if (bannedIp) {
      return new NextResponse(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Access Denied</title></head><body style="background-color:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div><h1>403 - Access Denied</h1><p>Your IP address (${ip}) has been blocked by the administrator.</p></div></body></html>`,
        { status: 403, headers: { 'content-type': 'text/html' } },
      )
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
