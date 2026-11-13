export type AtBankCatalogFallbackEntry = {
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

const at = (
  slug: string,
  name: string,
  brandColor: string,
  accentColor: string,
  domain?: string,
): AtBankCatalogFallbackEntry => ({
  slug,
  name,
  brandColor,
  accentColor,
  logo: name.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6),
  domain: domain ?? `${slug.replace(/[^a-z0-9]+/g, "")}.at`,
  logoFile: `/app-icons/${slug}.webp`,
  isActive: true,
  country: "Austria",
});

// Avusturya banka listesi — banken sayfasi + admin "Banka Listesi" fallback'i.
export const AT_BANKS_FALLBACK: readonly AtBankCatalogFallbackEntry[] = [
  at("erste-bank", "Erste Bank", "#0d2d5c", "#e60028", "erstebank.at"),
  at("bank-austria", "Bank Austria", "#d6002a", "#a50021", "bankaustria.at"),
  at("bawag", "BAWAG", "#004c97", "#003874", "bawag.at"),
  at("raiffeisen", "Raiffeisen Bank", "#fcd400", "#111111", "raiffeisen.at"),
  at("volksbank", "Volksbank", "#d9232e", "#b01c25", "volksbank.at"),
  at("oberbank", "Oberbank", "#e6000f", "#b5000c", "oberbank.at"),
  at("easybank", "easybank", "#6e1e5c", "#551745", "easybank.at"),
  at("bks-bank", "BKS Bank", "#00549f", "#003e75", "bks.at"),
  at("btv", "BTV", "#004b8d", "#003768", "btv.at"),
  at("bank99", "bank99", "#111111", "#d4ff3f", "bank99.at"),
  at("posojilnica", "Posojilnica Bank", "#00843d", "#00662f", "posojilnica.at"),
  at("aerztebank", "Ärztebank", "#003b71", "#002d56", "aerztebank.at"),
  at("spaengler", "Spängler Bank", "#7a003c", "#5c002e", "spaengler.at"),
  at("schelhammer", "Schelhammer Capital", "#003366", "#00264d", "schelhammer.at"),
  at("schoellerbank", "Schoellerbank", "#004f9f", "#003c78", "schoellerbank.at"),
  at("schoellerbank-ag", "Schoellerbank AG", "#004f9f", "#003c78", "schoellerbank.at"),
  at("sparda-bank", "Sparda-Bank", "#004c97", "#003974", "spardabank.at"),
  at("vkb", "VKB-Bank", "#d40511", "#a8040d", "vkb-bank.at"),
  at("anadi-bank", "Anadi Bank", "#005596", "#004074", "anadibank.com"),
  at("marchfelder", "Marchfelder Bank", "#007a33", "#005c26", "marchfelderbank.at"),
  at("dolomitenbank", "DolomitenBank", "#004080", "#003060", "dolomitenbank.at"),
  at("hypo-noe", "Hypo NÖ", "#00549f", "#00407a", "hypnoe.at"),
  at("hypo-tirol", "Hypo Tirol Bank", "#0069b4", "#004f87", "hypotirol.com"),
  at("hypo-vorarlberg", "Hypo Vorarlberg", "#005baa", "#004380", "hypovbg.at"),
  at("hypo-burgenland", "Hypo Burgenland", "#0072bb", "#00568d", "hypo-burgenland.at"),
  at("hypo-ooe", "Hypo OÖ", "#005baa", "#004380", "hypo.at"),
];
