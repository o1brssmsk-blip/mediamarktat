// Kampanya tema rengi: admin tek ana renk secer, koyu/panel tonlari otomatik turetilir.
// CSS degiskenleri: --brand, --brand-dark, --brand-panel, --brand-rgb

export const DEFAULT_BRAND = "#12584F";

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const [r, g, b] = [v[1], v[2], v[3]];
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return null;
}

export function getThemePrimary(settings: { wheel_settings?: unknown } | null | undefined): string {
  const ws = (settings?.wheel_settings ?? {}) as Record<string, unknown>;
  return normalizeHexColor(ws.theme_primary) ?? DEFAULT_BRAND;
}

function hexToRgb(hex: string): [number, number, number] {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

// amount 0..1 -> koyulastir (siyaha yaklastir)
export function darken(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  const f = (c: number) => Math.round(c * (1 - amount));
  const to2 = (n: number) => n.toString(16).padStart(2, "0");
  return `#${to2(f(r))}${to2(f(g))}${to2(f(b))}`;
}

export function applyBrandTheme(primary: unknown) {
  if (typeof document === "undefined") return;
  // Admin acikca tema rengi secmediyse globals.css'teki varsayilanlar korunur.
  const brand = normalizeHexColor(primary);
  if (!brand) return;
  const [r, g, b] = hexToRgb(brand);
  const root = document.documentElement.style;
  root.setProperty("--brand", brand);
  root.setProperty("--brand-rgb", `${r},${g},${b}`);
  // Koyu gradyan ucu ve koyu panel arka plani ana renkten turetilir
  root.setProperty("--brand-dark", darken(brand, 0.3));
  root.setProperty("--brand-panel", darken(brand, 0.87));
}
