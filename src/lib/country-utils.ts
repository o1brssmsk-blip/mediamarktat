const COUNTRY_ALIASES: Record<string, string> = {
  au: "Australia",
  australia: "Australia",
  avustralya: "Australia",
  aus: "Australia",

  nl: "Netherlands",
  netherlands: "Netherlands",
  holland: "Netherlands",
  hollanda: "Netherlands",
  nederland: "Netherlands",
  nederlands: "Netherlands",
  niederlande: "Netherlands",
  niederlanden: "Netherlands",

  at: "Austria",
  austria: "Austria",
  osterreich: "Austria",
  oesterreich: "Austria",
  avusturya: "Austria",

  fi: "Finland",
  finland: "Finland",
  finlandiya: "Finland",
  suomi: "Finland",

  es: "Spain",
  spain: "Spain",
  espana: "Spain",
  espanya: "Spain",
  ispanya: "Spain",

  de: "Germany",
  germany: "Germany",
  almanya: "Germany",

  be: "Belgium",
  belgium: "Belgium",
  belcika: "Belgium",

  ch: "Switzerland",
  switzerland: "Switzerland",
  isvicre: "Switzerland",

  it: "Italy",
  italy: "Italy",
  italya: "Italy",

  fr: "France",
  france: "France",
  fransa: "France",

  cz: "Czechia",
  czechia: "Czechia",
  czechrepublic: "Czechia",
  cekya: "Czechia",

  ee: "Estonia",
  estonia: "Estonia",
  estonya: "Estonia",

  pl: "Poland",
  poland: "Poland",
  polonya: "Poland",

  sv: "Sweden",
  se: "Sweden",
  sweden: "Sweden",
  isvec: "Sweden",

  da: "Denmark",
  dk: "Denmark",
  denmark: "Denmark",
  danimarka: "Denmark",

  ro: "Romania",
  romania: "Romania",
  romanya: "Romania",

  el: "Greece",
  gr: "Greece",
  greece: "Greece",
  yunanistan: "Greece",

  pt: "Portugal",
  portugal: "Portugal",
  portekiz: "Portugal",

  hu: "Hungary",
  hungary: "Hungary",
  macaristan: "Hungary",

  tumu: "All",
  "tümü": "All",
  all: "All",
};

function normalizeLookupKey(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/[^a-z0-9]+/g, "");
}

export function normalizeCountryName(value?: string | null, fallback = "Austria") {
  if (!value || !value.trim()) return fallback;

  if (COUNTRY_ALIASES[value]) {
    return COUNTRY_ALIASES[value];
  }

  const normalizedKey = normalizeLookupKey(value);
  return COUNTRY_ALIASES[normalizedKey] ?? value.trim();
}

export function countriesMatch(left?: string | null, right?: string | null) {
  return normalizeCountryName(left) === normalizeCountryName(right);
}
