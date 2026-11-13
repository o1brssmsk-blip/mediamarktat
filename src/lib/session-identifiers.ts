export function normalizeSessionIdentifier(value?: string | null): string {
  return value?.trim() ?? "";
}

export function isUuidSessionIdentifier(value?: string | null): boolean {
  const normalized = normalizeSessionIdentifier(value);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalized);
}

export function isNumericSessionIdentifier(value?: string | null): boolean {
  const normalized = normalizeSessionIdentifier(value);
  return /^\d+$/.test(normalized);
}
