import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ==================== SITE KONTROL ====================
// global_settings tablosundan okunan ayarlar:
//   site_enabled (bool)        -> site kapaliyken admin disi herkese 503
//   site_control (jsonb):
//     allowed_countries[]      -> bos ise kisitlama yok; doluysa sadece bu ulkeler girer
//     geo_redirect_url         -> izin verilmeyen ulke ziyaretcisi bu adrese gider
//     block_bots (bool)        -> bilinen kotu bot UA'lari 403
//   banned_ips (tablo)         -> admin panelinden banlanan IP'ler 403

type SiteControl = {
  siteEnabled: boolean
  blockBots: boolean
  allowedCountries: string[] | null
  geoRedirectUrl: string
}

const DEFAULT_GEO_REDIRECT = 'https://www.mediamarkt.at'

const FALLBACK_CONTROL: SiteControl = {
  siteEnabled: true,
  blockBots: false,
  allowedCountries: null,
  geoRedirectUrl: DEFAULT_GEO_REDIRECT,
}

let controlCache: { at: number; value: SiteControl } | null = null
const CONTROL_CACHE_MS = 30_000

async function getSiteControl(supabase: any): Promise<SiteControl> {
  if (controlCache && Date.now() - controlCache.at < CONTROL_CACHE_MS) {
    return controlCache.value
  }
  try {
    const { data } = await supabase
      .from('global_settings')
      .select('site_enabled, site_control')
      .limit(1)
      .maybeSingle()

    const sc = (data?.site_control ?? {}) as Record<string, unknown>
    const countries = Array.isArray(sc.allowed_countries)
      ? sc.allowed_countries
          .map((c: unknown) => (typeof c === 'string' ? c.trim().toUpperCase() : ''))
          .filter((c: string) => /^[A-Z]{2}$/.test(c))
      : []

    const value: SiteControl = {
      siteEnabled: data?.site_enabled !== false,
      blockBots: sc.block_bots === true,
      allowedCountries: countries.length > 0 ? countries : null,
      geoRedirectUrl:
        typeof sc.geo_redirect_url === 'string' && sc.geo_redirect_url.trim() !== ''
          ? sc.geo_redirect_url.trim()
          : DEFAULT_GEO_REDIRECT,
    }
    controlCache = { at: Date.now(), value }
    return value
  } catch {
    return controlCache?.value ?? FALLBACK_CONTROL
  }
}

// Sosyal medya onizleme / OG crawler'lari: geo ve bot filtresinden HER ZAMAN muaf
const OG_CRAWLER_UA =
  /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|discordbot|slackbot|pinterest|redditbot|skypeuripreview|viber|vkshare|applebot|googlebot|bingbot|duckduckbot|baiduspider|yandex/i

// block_bots acikken engellenen kotu bot/crawler UA'lari
const BAD_BOT_UA =
  /python-requests|python-urllib|scrapy|curl|wget|httpie|java\/|libwww|sqlmap|nikto|nmap|masscan|acunetix|nessus|openvas|hydra|metasploit|gobuster|dirbuster|wpscan|nuclei|httpx|zgrab|zmap|phantomjs|headlesschrome|selenium|puppeteer|playwright|ahrefsbot|semrushbot|mj12bot|dotbot|petalbot|bytespider|dataforseo|serpstat|sistrix|seznambot|exabot|megaindex|blexbot/i

const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost|fc|fd)/i

const COUNTRY_HEADERS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-country-code',
  'x-geo-country',
  'x-appengine-country',
]

function getClientIp(request: NextRequest): string | null {
  const fwd = request.headers.get('x-forwarded-for')
  if (fwd) {
    const ip = fwd.split(',')[0]?.trim()
    if (ip) return ip
  }
  return request.headers.get('x-real-ip')?.trim() || null
}

// IP -> ulke cache: ayni ziyaretci icin harici API'ye tekrar gitme
const countryCache = new Map<string, { cc: string | null; at: number }>()
const COUNTRY_CACHE_TTL = 10 * 60 * 1000

async function resolveCountryCode(request: NextRequest): Promise<string | null> {
  for (const key of COUNTRY_HEADERS) {
    const v = request.headers.get(key)
    if (v && /^[A-Za-z]{2}$/.test(v.trim())) return v.trim().toUpperCase()
  }
  const ip = getClientIp(request)
  if (!ip || PRIVATE_IP.test(ip)) return null

  const cached = countryCache.get(ip)
  if (cached && Date.now() - cached.at < COUNTRY_CACHE_TTL) return cached.cc

  let cc: string | null = null
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country_code/`, {
      signal: AbortSignal.timeout(2500),
      headers: { 'User-Agent': 'geo-check' },
    })
    if (res.ok) {
      const text = (await res.text()).trim().toUpperCase()
      cc = /^[A-Z]{2}$/.test(text) ? text : null
    }
  } catch {
    cc = null
  }
  if (countryCache.size > 500) countryCache.clear()
  countryCache.set(ip, { cc, at: Date.now() })
  return cc
}

const FORBIDDEN_HTML = (ip: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Access Denied</title></head><body style="background-color:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div><h1>403 - Access Denied</h1><p>Your IP address (${ip}) has been blocked by the administrator.</p></div></body></html>`

const SITE_OFFLINE_HTML = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>503 - Service Unavailable</title></head><body style="background-color:#0a0a0a;color:#e5e5e5;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;"><div style="text-align:center;padding:2rem;"><h1 style="font-size:3rem;margin:0 0 1rem;">503</h1><p style="font-size:1.1rem;opacity:.7;">Service Unavailable</p></div></body></html>`

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdminArea = pathname.startsWith('/admin')
  const isLogin = pathname.startsWith('/admin/login')

  // Force HTTPS in production when the incoming protocol is forwarded as HTTP.
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  if (process.env.NODE_ENV === 'production' && forwardedProto === 'http') {
    const httpsUrl = new URL(request.url)
    httpsUrl.protocol = 'https:'
    return NextResponse.redirect(httpsUrl, 308)
  }

  let response = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

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

  // ============ SITE KONTROL (admin disi tum sayfalar) ============
  const isStatic = pathname.startsWith('/_next') || pathname.includes('.')

  if (supabase && !isStatic) {
    const control = await getSiteControl(supabase)
    const ua = request.headers.get('user-agent') || ''
    const isOgCrawler = OG_CRAWLER_UA.test(ua)

    // 1) Site kapali -> 503
    if (!control.siteEnabled) {
      return new NextResponse(SITE_OFFLINE_HTML, {
        status: 503,
        headers: { 'content-type': 'text/html; charset=utf-8', 'retry-after': '60' },
      })
    }

    // 2) Kotu bot engelleme (OG crawler'lari muaf)
    if (control.blockBots && !isOgCrawler && BAD_BOT_UA.test(ua)) {
      return new NextResponse(FORBIDDEN_HTML(getClientIp(request) || 'unknown'), {
        status: 403,
        headers: { 'content-type': 'text/html' },
      })
    }

    const ip = getClientIp(request)

    // 4) banned_ips tablosu
    if (ip && !pathname.startsWith('/api')) {
      const { data: bannedIp } = await supabase
        .from('banned_ips')
        .select('ip_address')
        .eq('ip_address', ip)
        .maybeSingle()

      if (bannedIp) {
        return new NextResponse(FORBIDDEN_HTML(ip), {
          status: 403,
          headers: { 'content-type': 'text/html' },
        })
      }
    }

    // 5) Ulke filtresi (geo) — OG crawler + aktif session + private IP muaf, fail-open
    if (control.allowedCountries && !isOgCrawler && !pathname.startsWith('/api')) {
      const hasActiveSession = Boolean(request.cookies.get('active_session_id')?.value?.trim())
      if (!hasActiveSession) {
        const cc = await resolveCountryCode(request)
        if (cc && !control.allowedCountries.includes(cc)) {
          let target = control.geoRedirectUrl
          if (!/^https?:\/\//i.test(target)) target = `https://${target}`
          // Sonsuz dongu: hedef kendi hostumuzsa yonlendirme yapma
          try {
            const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || ''
            const t = new URL(target)
            if (!host || t.host.toLowerCase() !== host.toLowerCase()) {
              return NextResponse.redirect(target, 302)
            }
          } catch {
            /* gecersiz URL -> engelleme */
          }
        }
      }
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
