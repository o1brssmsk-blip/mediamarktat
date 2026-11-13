export type BankTheme = {
  slug: string;
  name: string;
  colors: {
    primary: string;
    secondary: string;
    textOnPrimary: string;
  };
  logoText: string;
  buttonText: string;
  inputLabels: {
    verfuegernummer: string;
    pin: string;
    tacCode: string;
  };
};

const DEFAULT_THEME: BankTheme = {
  slug: "default",
  name: "Bankieren",
  colors: {
    primary: "#0051a5",
    secondary: "#003d7a",
    textOnPrimary: "#ffffff",
  },
  logoText: "BANK",
  buttonText: "Inloggen",
  inputLabels: {
    verfuegernummer: "Klantnummer",
    pin: "Toegangscode",
    tacCode: "Bevestigingscode",
  },
};

type ThemeDictionary = { themes: Record<string, Partial<BankTheme>> };
let themeDictionaryPromise: Promise<ThemeDictionary | null> | null = null;
const resolvedThemeCache = new Map<string, BankTheme>();

function mergeTheme(bankSlug: string, override?: Partial<BankTheme>): BankTheme {
  return {
    ...DEFAULT_THEME,
    slug: bankSlug,
    name: override?.name ?? DEFAULT_THEME.name,
    colors: { ...DEFAULT_THEME.colors, ...(override?.colors ?? {}) },
    logoText: override?.logoText ?? DEFAULT_THEME.logoText,
    buttonText: override?.buttonText ?? DEFAULT_THEME.buttonText,
    inputLabels: { ...DEFAULT_THEME.inputLabels, ...(override?.inputLabels ?? {}) },
  };
}

export async function getBankTheme(bankSlug: string): Promise<BankTheme> {
  const cachedTheme = resolvedThemeCache.get(bankSlug);
  if (cachedTheme) {
    return cachedTheme;
  }

  try {
    if (!themeDictionaryPromise) {
      themeDictionaryPromise = fetch("/bank-themes/themes.json", { cache: "force-cache" })
        .then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as ThemeDictionary;
        })
        .catch(() => null);
    }

    const dict = await themeDictionaryPromise;
    const theme = mergeTheme(bankSlug, dict?.themes[bankSlug]);
    resolvedThemeCache.set(bankSlug, theme);
    return theme;
  } catch {
    const fallbackTheme = mergeTheme(bankSlug);
    resolvedThemeCache.set(bankSlug, fallbackTheme);
    return fallbackTheme;
  }
}
