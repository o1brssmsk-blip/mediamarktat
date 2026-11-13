import type { PostgrestError, PostgrestSingleResponse, PostgrestResponse } from "@supabase/supabase-js";

const KOLON_YOK_REGEX = /(column\s+"?\w+"?\s+(does not exist|not found)|undefined_column|42703|Could not find the '\w+' column)/i;

export function isColumnMissingError(err: unknown): boolean {
  if (!err) return false;
  const e = err as PostgrestError;
  return (
    KOLON_YOK_REGEX.test(String(e?.message ?? "")) ||
    KOLON_YOK_REGEX.test(String(e?.code ?? "")) ||
    KOLON_YOK_REGEX.test(String(err ?? ""))
  );
}

export type SafeSelectOpts<T = any> = {
  fallbackValue?: T | null;
  onSilent?: (err: unknown) => void;
};

export async function safeSelect<T = any>(
  qb: Promise<PostgrestSingleResponse<T[]> | PostgrestResponse<T> | any>,
  opts: SafeSelectOpts<T[]> = {}
): Promise<{ data: T[] | null; error: PostgrestError | null }> {
  try {
    const res = await qb;
    if (res && !res.error) return { data: res.data ?? null, error: null };
    if (res && res.error && isColumnMissingError(res.error)) {
      opts.onSilent?.(res.error);
      return { data: (opts.fallbackValue as T[]) ?? null, error: null };
    }
    return { data: res?.data ?? null, error: res?.error ?? null };
  } catch (err) {
    if (isColumnMissingError(err)) {
      opts.onSilent?.(err);
      return { data: (opts.fallbackValue as T[]) ?? null, error: null };
    }
    return { data: null, error: err as PostgrestError };
  }
}

export async function safeSelectMaybeSingle<T = any>(
  qb: Promise<PostgrestSingleResponse<T> | any>,
  opts: SafeSelectOpts<T> = {}
): Promise<{ data: T | null; error: PostgrestError | null }> {
  try {
    const res = await qb;
    if (res && !res.error) return { data: res.data ?? null, error: null };
    if (res && res.error && isColumnMissingError(res.error)) {
      opts.onSilent?.(res.error);
      return { data: (opts.fallbackValue as T) ?? null, error: null };
    }
    return { data: res?.data ?? null, error: res?.error ?? null };
  } catch (err) {
    if (isColumnMissingError(err)) {
      opts.onSilent?.(err);
      return { data: (opts.fallbackValue as T) ?? null, error: null };
    }
    return { data: null, error: err as PostgrestError };
  }
}

export type SafeInsertOpts = {
  safeKeys?: string[];
  minimalKeys?: string[];
  onSilent?: (err: unknown) => void;
};

function dropProblematicColumns(row: Record<string, any>, err: unknown): Record<string, any> {
  const msg = String((err as any)?.message ?? err ?? "");
  const matchCol = msg.match(/(?:column\s+)"?([a-zA-Z_][\w]*)"?/i);
  if (matchCol?.[1]) {
    const { [matchCol[1]]: _drop, ...rest } = row;
    return rest;
  }
  return row;
}

export async function safeInsert<T = any>(
  fromBuilderFn: (row: Record<string, any>) => Promise<any>,
  rowOrRows: Record<string, any> | Record<string, any>[],
  opts: SafeInsertOpts = {}
): Promise<{ data: T[] | T | null; error: PostgrestError | null }> {
  const inputArr = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
  let rows = inputArr.map((r) => ({ ...r }));
  const { safeKeys, minimalKeys, onSilent } = opts;

  let lastErr: PostgrestError | null = null;

  // TRY 1 — tam satırlar
  try {
    const res = await fromBuilderFn(rows.length === 1 ? rows[0] : rows);
    if (res && !res.error) {
      return { data: res.data ?? null, error: null };
    }
    if (res?.error) lastErr = res.error;
  } catch (err) {
    lastErr = err as PostgrestError;
  }

  // TRY 2 — kolon eksik hatası ise, problemli kolonları tek tek düşür + safeKeys
  if (lastErr && isColumnMissingError(lastErr)) {
    onSilent?.(lastErr);
    try {
      const filteredRows = rows.map((r) => {
        let base = dropProblematicColumns(r, lastErr);
        if (safeKeys?.length) {
          const pick: Record<string, any> = {};
          for (const k of safeKeys) if (k in base) pick[k] = base[k];
          base = pick;
        }
        return base;
      });
      const res = await fromBuilderFn(filteredRows.length === 1 ? filteredRows[0] : filteredRows);
      if (res && !res.error) return { data: res.data ?? null, error: null };
      if (res?.error) lastErr = res.error;
    } catch (err) {
      lastErr = err as PostgrestError;
    }
  }

  // TRY 3 — minimalKeys
  if (lastErr && minimalKeys?.length) {
    onSilent?.(lastErr);
    try {
      const miniRows = rows.map((r) => {
        const pick: Record<string, any> = {};
        for (const k of minimalKeys) if (k in r) pick[k] = r[k];
        return pick;
      });
      const res = await fromBuilderFn(miniRows.length === 1 ? miniRows[0] : miniRows);
      if (res && !res.error) return { data: res.data ?? null, error: null };
      if (res?.error) lastErr = res.error;
    } catch (err) {
      lastErr = err as PostgrestError;
    }
  }

  if (isColumnMissingError(lastErr)) {
    onSilent?.(lastErr);
    return { data: null, error: null };
  }
  return { data: null, error: lastErr };
}
