export const DEFAULT_CAMPAIGN_NAME = "MediaMarkt";

// global_settings.wheel_settings.campaign_name'den kampanya adini okur
export function getCampaignNameFromSettings(
  data: { wheel_settings?: unknown } | null | undefined,
): string {
  const ws = (data?.wheel_settings ?? {}) as Record<string, unknown>;
  const v = ws.campaign_name;
  if (typeof v === "string" && v.trim() !== "" && v.trim() !== "MediaMarkt") {
    return v.trim();
  }
  return DEFAULT_CAMPAIGN_NAME;
}

export function brandify(text: string, campaignName: string): string;
export function brandify<T>(text: T, campaignName: string): T;
export function brandify(text: unknown, campaignName: string): unknown {
  if (typeof text !== "string" || !campaignName) {
    return text;
  }
  return text.replace(/\bMediaMarkt\b/g, campaignName);
}

// Objedeki tum string alanlari brandify'dan gecirir (settings objeleri icin)
export function brandifySettings<T extends Record<string, unknown>>(
  obj: T,
  campaignName: string,
): T {
  if (!campaignName) return obj;
  const next: Record<string, unknown> = { ...obj };
  for (const [k, v] of Object.entries(next)) {
    if (typeof v === "string") next[k] = brandify(v, campaignName);
  }
  return next as T;
}
