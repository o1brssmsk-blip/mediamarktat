import { cookies, headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACTIVE_SESSION_COOKIE } from "@/lib/session-constants";

// Sosyal medya onizleme / crawler botlari: OG etiketleri icin ASLA engellenmez
const BOT_UA =
  /facebookexternalhit|facebot|twitterbot|whatsapp|telegrambot|linkedinbot|discordbot|slackbot|pinterest|redditbot|skypeuripreview|viber|vkshare|applebot|googlebot|bingbot|duckduckbot|baiduspider|yandex/i;

const DEFAULT_GEO_REDIRECT = "https://www.tesco.ie";

type GeoSettings = { countries: string[] | null; redirectUrl: string };

let cache: { at: number; value: GeoSettings } | null = null;

async function getGeoSettings(): Promise<GeoSettings> {
  if (cache && Date.now() - cache.at < 30_000) return cache.value;
  const fallback: GeoSettings = { countries: null, redirectUrl: DEFAULT_GEO_REDIRECT };
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return fallback;
    const { data } = await supabase
      .from("global_settings")
      .select("wheel_settings")
      .limit(1)
      .maybeSingle();
    const ws = (data?.wheel_settings ?? {}) as Record<string, unknown>;
    const raw = Array.isArray(ws.allowed_countries) ? ws.allowed_countries : [];
    const countries = raw
      .map((x) => (typeof x === "string" ? x.trim().toUpperCase() : ""))
      .filter((x) => /^[A-Z]{2}$/.test(x));
    const redirectUrl =
      typeof ws.geo_redirect_url === "string" && ws.geo_redirect_url.trim() !== ""
        ? ws.geo_redirect_url.trim()
        : DEFAULT_GEO_REDIRECT;
    const value: GeoSettings = {
      countries: countries.length > 0 ? countries : null,
      redirectUrl,
    };
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return fallback;
  }
}

const COUNTRY_HEADERS = [
  "x-vercel-ip-country",
  "cf-ipcountry",
  "cloudfront-viewer-country",
  "x-country-code",
  "x-geo-country",
  "x-appengine-country",
];

function getClientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const ip = fwd.split(",")[0]?.trim();
    if (ip) return ip;
  }
  return h.get("x-real-ip")?.trim() || null;
}

const PRIVATE_IP = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1|localhost)/i;

// IP -> ulke sonucu cache: ayni ziyaretci sayfalar arasinda gezinirken
// harici API'ye tekrar tekrar gitmesin (hiz + rate-limit korumasi)
const countryCache = new Map<string, { cc: string | null; at: number }>();
const COUNTRY_CACHE_TTL = 10 * 60 * 1000;

async function resolveCountryCode(h: Headers): Promise<string | null> {
  for (const key of COUNTRY_HEADERS) {
    const v = h.get(key);
    if (v && /^[A-Za-z]{2}$/.test(v.trim())) return v.trim().toUpperCase();
  }
  const ip = getClientIp(h);
  if (!ip || PRIVATE_IP.test(ip)) return null;

  const cached = countryCache.get(ip);
  if (cached && Date.now() - cached.at < COUNTRY_CACHE_TTL) return cached.cc;

  let cc: string | null = null;
  try {
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country_code/`, {
      signal: AbortSignal.timeout(2500),
      headers: { "User-Agent": "geo-check" },
    });
    if (res.ok) {
      const text = (await res.text()).trim().toUpperCase();
      cc = /^[A-Z]{2}$/.test(text) ? text : null;
    }
  } catch {
    cc = null;
  }

  // Cache sadece olumlu sonuc icin degil, negatif de olsa tutulur (API'yi yormaz);
  // ancak boyutu sinirli tut
  if (countryCache.size > 500) countryCache.clear();
  countryCache.set(ip, { cc, at: Date.now() });
  return cc;
}

function normalizeRedirectUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_GEO_REDIRECT;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Izin verilmeyen ulkeden geliyorsa yonlendirme URL'si dondurur; serbest ise null.
// Crawler/bot UA'lari her zaman serbest (og:image onizlemesi bozulmasin).
// Bos allowed_countries listesi = kisitlama yok. Ulke cozulemezse fail-open (girer).
export async function getBlockedRedirectUrl(userAgent: string): Promise<string | null> {
  if (BOT_UA.test(userAgent || "")) return null;
  const { countries, redirectUrl } = await getGeoSettings();
  if (!countries) return null;

  // Bu cihazin zaten gecerli bir session'i varsa geo kontrolu uygulanmaz:
  // akisin ortasindaki gercek kullaniciyi asla disari atma.
  try {
    const jar = await cookies();
    if (jar.get(ACTIVE_SESSION_COOKIE)?.value?.trim()) return null;
  } catch {
    /* cookie okunamazsa kontrol devam eder */
  }

  const h = await headers();
  const cc = await resolveCountryCode(h);
  if (!cc) return null;
  if (countries.includes(cc)) return null;

  const target = normalizeRedirectUrl(redirectUrl);

  // Sonsuz dongu korumasi: hedef URL kendi domainimizse yonlendirme yapma
  const host = h.get("x-forwarded-host") || h.get("host") || "";
  try {
    const t = new URL(target);
    if (host && t.host.toLowerCase() === host.toLowerCase()) return null;
  } catch {
    return DEFAULT_GEO_REDIRECT; // gecersiz URL -> guvenli varsayilan
  }
  return target;
}
