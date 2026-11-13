import { createClient } from "@supabase/supabase-js";
import { revalidateTag } from "next/cache";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { createServerSupabaseClient } from "./supabase/server";
import type { BankDesignConfig } from "./bank-design-schema";
import { resolveLocalBankLogoFile } from "./bank-logo-constants";
import { normalizeCountryName } from "./country-utils";
import { AT_BANKS_FALLBACK } from "./at-austria-banks-fallback";

const BANKS_CACHE_TAG = "banks";
const BANK_LIST_COLUMNS = "slug,name,brand_color,accent_color,domain,logo_file,is_active,country,auto_redirect";
const BANK_ADMIN_COLUMNS = `${BANK_LIST_COLUMNS},design_config`;
let localEnvCache: Record<string, string> | null = null;

export type BankConfig = {
  slug: string;
  name: string;
  brandColor: string;
  accentColor: string;
  logo: string;
  domain: string;
  logoFile: string;
  description?: string;
  contactInfo?: string;
  design?: BankDesignConfig;
  autoRedirect?: boolean;
  isActive?: boolean;
  country?: string;
};

const BANKS_SESSION_ID = "00000000-0000-0000-0000-000000000000";

function applyBankOverrides(bank: BankConfig): BankConfig {
  return {
    ...bank,
    logoFile: resolveLocalBankLogoFile(bank.slug, bank.logoFile),
  };
}

// unstable_cache içinde cookies() kullanan Supabase server client çağrılamaz
// (request-scoped dynamic API). Bu yüzden cache'lenen sorgu için cookie'siz,
// yalnızca env değişkenlerine bağlı basit bir Supabase client kullanıyoruz.
function createCacheableSupabaseClient() {
  const { url, key } = getSupabaseReadCredentials();
  if (!url || !key) return null;
  return createClient(url, key);
}

function readLocalEnvValue(name: string) {
  if (localEnvCache === null) {
    const envPath = path.join(process.cwd(), ".env.local");
    if (!existsSync(envPath)) {
      localEnvCache = {};
    } else {
      localEnvCache = Object.fromEntries(
        readFileSync(envPath, "utf8")
          .split(/\r?\n/)
          .filter(Boolean)
          .map((line) => line.split(/=(.+)/)),
      );
    }
  }

  return localEnvCache ? localEnvCache[name] : undefined;
}

function getSupabaseReadCredentials() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || readLocalEnvValue("NEXT_PUBLIC_SUPABASE_URL"),
    key:
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      readLocalEnvValue("SUPABASE_SERVICE_ROLE_KEY") ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      readLocalEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

function buildLogoFallback(name?: string | null, slug?: string | null) {
  const normalizedName = name?.trim();
  if (normalizedName) {
    const words = normalizedName
      .split(/\s+/)
      .map((part) => part.replace(/[^A-Za-z0-9]/g, ""))
      .filter(Boolean);

    if (words.length >= 2) {
      return `${words[0][0]}${words[1][0]}`.toUpperCase();
    }

    if (words.length === 1) {
      return words[0].slice(0, 3).toUpperCase();
    }
  }

  return slug?.slice(0, 3).toUpperCase() || "BANK";
}

async function fetchBanksRows(selectClause: string, query = "") {
  const { url, key } = getSupabaseReadCredentials();
  if (!url || !key) return null;

  const requestUrl = `${url}/rest/v1/banks?select=${encodeURIComponent(selectClause)}${query}`;
  const response = await fetch(requestUrl, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Failed to fetch banks rows", response.status, await response.text());
    return null;
  }

  return response.json();
}

function mapBankRow(b: any): BankConfig {
  return applyBankOverrides({
    slug: b.slug,
    name: b.name,
    brandColor: b.brand_color || b.brandColor,
    accentColor: b.accent_color || b.accentColor,
    logo: b.logo || buildLogoFallback(b.name, b.slug),
    domain: b.domain,
    logoFile: b.logo_file || b.logoFile,
    design: b.design_config || b.design,
    isActive: b.is_active !== false,
    country: normalizeCountryName(b.country),
    autoRedirect: b.auto_redirect || false,
  });
}

async function fetchBanksRowsWithFallback(selectClause: string, query = "") {
  const restRows = await fetchBanksRows(selectClause, query);
  if (restRows) {
    return restRows;
  }

  const supabase = createCacheableSupabaseClient();
  if (!supabase) {
    return null;
  }

  let dbQuery = supabase.from("banks").select(selectClause);
  const slugMatch = query.match(/&slug=eq\.([^&]+)&limit=(\d+)/);

  if (slugMatch) {
    dbQuery = dbQuery.eq("slug", decodeURIComponent(slugMatch[1])).limit(Number(slugMatch[2]));
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error("Failed to fetch banks rows via Supabase client", error);
    return null;
  }

  return data;
}

export async function getBanks(options?: { includeDesign?: boolean }): Promise<BankConfig[]> {
  const selectClause = options?.includeDesign ? BANK_ADMIN_COLUMNS : BANK_LIST_COLUMNS;
  const data = await fetchBanksRowsWithFallback(selectClause);

  if (data && data.length > 0) {
    return data.map(mapBankRow);
  }

  // ⭐ AU FALLBACK: banks tablosu bossa (seed kosmadiysa) admin "Banka bulunamadi"
  //   gormesin — banken sayfasiyla AYNI fallback AU banka listesini dondur.
  return AT_BANKS_FALLBACK.map((s) =>
    applyBankOverrides({
      slug: s.slug,
      name: s.name,
      brandColor: s.brandColor,
      accentColor: s.accentColor,
      logo: s.logo,
      domain: s.domain,
      logoFile: s.logoFile,
      isActive: true,
      country: "Austria",
      autoRedirect: false,
    }),
  );
}

export async function getBankBySlugDb(slug: string): Promise<BankConfig | null> {
  const rows = await fetchBanksRowsWithFallback("*", `&slug=eq.${encodeURIComponent(slug)}&limit=1`);
  const b = rows?.[0] ?? null;
  if (b) {
    return mapBankRow(b);
  }
  // ⭐ AU FALLBACK: DB'de yoksa seed'den don (admin detay paneli icin)
  const seed = AT_BANKS_FALLBACK.find((e) => e.slug === slug);
  if (seed) {
    return applyBankOverrides({
      slug: seed.slug,
      name: seed.name,
      brandColor: seed.brandColor,
      accentColor: seed.accentColor,
      logo: seed.logo,
      domain: seed.domain,
      logoFile: seed.logoFile,
      isActive: true,
      country: "Austria",
      autoRedirect: false,
    });
  }
  return null;
}

export async function updateBanks(banks: BankConfig[]) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return;
  
  // Update each bank individually or upsert them
  const payload = banks.map(applyBankOverrides).map(b => ({
    slug: b.slug,
    name: b.name,
    brand_color: b.brandColor,
    accent_color: b.accentColor,
    domain: b.domain,
    logo_file: b.logoFile,
    design_config: b.design,
    is_active: b.isActive !== false,
    country: normalizeCountryName(b.country),
    auto_redirect: b.autoRedirect || false
  }));

  // Perform an upsert on the 'slug' column
  const { error } = await supabase
    .from("banks")
    .upsert(payload, { onConflict: 'slug' });
    
  if (error) {
    console.error("Error updating banks:", error);
    throw error;
  }

  revalidateTag(BANKS_CACHE_TAG, "layout");
}
