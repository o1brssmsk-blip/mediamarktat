import { getAllAuBankSeedEntries } from "./au-bank-page-map";

export type AuBankCatalogFallbackEntry = {
  slug: string;
  name: string;
  brandColor: string;
  accentColor: string;
  logo: string;
  domain: string;
  logoFile: string;
  autoRedirect?: boolean;
  isActive?: boolean;
  country?: string;
};

export const AU_BANKS_FALLBACK_CLIENT: readonly AuBankCatalogFallbackEntry[] = (() => {
  const seed = getAllAuBankSeedEntries();
  return seed.map((s) => ({
    slug: s.slug,
    name: s.name,
    brandColor: s.brand_color,
    accentColor: s.accent_color,
    logo: s.name.toUpperCase().slice(0, 6),
    domain: `${s.slug.replace(/[^a-z0-9]+/g, "")}.com.au`,
    logoFile: s.logo_file,
    country: s.country,
    isActive: true,
  })) as readonly AuBankCatalogFallbackEntry[];
})();
