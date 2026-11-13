export const VAN_LANSCHOT_KEMPEN_LOGO_URL = "/bank-logos/van-lanschot-kempen.svg";
export const DEFAULT_LOCAL_FALLBACK_LOGO = "/logo.webp";

export const LOCAL_BANK_LOGO_BY_SLUG: Record<string, string> = {
  // Avustralya (AU) 17 banka — GERÇEK App Store 512x512 PNG logolar (yerel dosya, dış bağlantı YOK)
  "bendigo-bank": "/bank-logos/au/bendigo-bank.webp",
  "suncorp-bank": "/bank-logos/au/suncorp-bank.webp",
  anz: "/bank-logos/au/anz.webp",
  westpac: "/bank-logos/au/westpac.webp",
  "nab-bank": "/bank-logos/au/nab-bank.webp",
  commbank: "/bank-logos/au/commbank.webp",
  macquarie: "/bank-logos/au/macquarie.webp",
  "ing-australia": "/bank-logos/au/ing-australia.webp",
  "boq-classic": "/bank-logos/au/boq-classic.webp",
  myboq: "/bank-logos/au/myboq.webp",
  "amp-bank": "/bank-logos/au/amp-bank.webp",
  "northonline-amp": "/bank-logos/au/northonline-amp.webp",
  bankwest: "/bank-logos/au/bankwest.webp",
  "me-bank": "/bank-logos/au/me-bank.webp",
  beyondbank: "/bank-logos/au/beyondbank.webp",
  greatsouthernbank: "/bank-logos/au/greatsouthernbank.webp",
  greater: "/bank-logos/au/greater.webp",
  // Estonya
  bigbank: "/bank-logos/estonia/bigbank.webp",
  "citadele-banka": "/bank-logos/estonia/citadele-banka.webp",
  "coop-pank": "/bank-logos/estonia/coop-pank.webp",
  inbank: "/bank-logos/estonia/inbank.webp",
  "lhv-pank": "/bank-logos/estonia/lhv-pank.webp",
  "luminor-ee": "/bank-logos/estonia/luminor-ee.webp",
  "op-corporate-bank": "/bank-logos/estonia/op-corporate-bank.webp",
  "seb-pank": "/bank-logos/estonia/seb-pank.webp",
  "swedbank-ee": "/bank-logos/estonia/swedbank-ee.webp",
  // Genel
  "van-lanschot-kempen": VAN_LANSCHOT_KEMPEN_LOGO_URL,
};

export function isRemoteUrl(value: string) {
  if (!value) return false;
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) || /^\/\//i.test(trimmed);
}

export function resolveLocalBankLogoFile(slug?: string | null, logoFile?: string | null, fallback = DEFAULT_LOCAL_FALLBACK_LOGO) {
  const normalizedLogoFile = typeof logoFile === "string" ? logoFile.trim() : "";

  if (normalizedLogoFile.startsWith("/")) {
    return normalizedLogoFile;
  }

  if (isRemoteUrl(normalizedLogoFile)) {
    return fallback;
  }

  if (slug) {
    const localLogo = LOCAL_BANK_LOGO_BY_SLUG[slug];
    if (localLogo) {
      return localLogo;
    }
  }

  return normalizedLogoFile || fallback;
}
