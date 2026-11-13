"use client";

export type AuditEventKind =
  | "presence"
  | "step"
  | "route"
  | "submit"
  | "auth"
  | "bank_form"
  | "api_call"
  | "storage"
  | "system"
  | "error";

export type AuditEventPayload = {
  session_id?: string | null;
  public_id?: string | null;
  partner_name?: string | null;

  event_kind: AuditEventKind | string;
  event_action: string;

  status?: "ok" | "warn" | "error" | "blocked" | string | null;

  user_ip?: string | null;
  user_agent?: string | null;
  country?: string | null;
  city?: string | null;
  referer_url?: string | null;
  current_url?: string | null;

  from_step?: string | null;
  to_step?: string | null;
  pathname?: string | null;

  bank_slug?: string | null;
  bank_name?: string | null;
  login_method?: string | null;

  admin_email?: string | null;
  admin_action?: string | null;

  meta?: Record<string, any> | null;

  error_name?: string | null;
  error_message?: string | null;
};

type QueuedItem = { payload: AuditEventPayload; retries: number };
const QUEUE_FLUSH_MS = 1500;
const MAX_BATCH = 60;

let queue: QueuedItem[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let unloadAttached = false;

function pickClientEnvFields(): Partial<AuditEventPayload> {
  if (typeof window === "undefined") return {};
  const nav = (typeof navigator !== "undefined" ? navigator : undefined) as Navigator | undefined;
  const ua = nav?.userAgent ?? null;
  const ref = typeof document !== "undefined" ? document.referrer || null : null;
  const cur = window.location?.href ?? null;
  const pn = window.location?.pathname ?? null;
  return { user_agent: ua, referer_url: ref, current_url: cur, pathname: pn };
}

function serializeForBeacon(items: QueuedItem[]): Blob {
  const rows = items.map((q) => q.payload);
  const json = JSON.stringify(rows);
  return new Blob([json], { type: "application/json" });
}

async function flushQueueInternal(batch: QueuedItem[]): Promise<{ ok: boolean; inserted?: number; partial?: boolean }> {
  if (batch.length === 0) return { ok: true, inserted: 0 };
  // 1) Önce sendBeacon (sayfa kapanırken en güvenilir yol), tarayıcı kuyruğa alıp kendi gönderir
  // Ancak bazı durumlarda çok büyük veya blob tipini reddedebilir.
  let beaconWorked = false;
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      beaconWorked = !!navigator.sendBeacon("/api/audit/log", serializeForBeacon(batch));
      if (beaconWorked) return { ok: true, inserted: batch.length };
    }
  } catch { /* ignore */ }
  // 2) Normal fetch (keepalive: true) — yine sayfa kapanırken hayatta kalır, beacon'dan sonra fallback
  try {
    const rows = batch.map((q) => q.payload);
    const resp = await fetch("/api/audit/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rows),
      credentials: "same-origin",
      keepalive: true,
    });
    if (!resp.ok && resp.status >= 500) return { ok: false };
    try {
      const data = (await resp.json()) as any;
      if (data && data.ok) return { ok: true, inserted: data.inserted ?? batch.length, partial: !!data.partial };
      if (resp.status === 207) return { ok: !!data?.ok, partial: true };
    } catch {
      if (resp.ok) return { ok: true, inserted: batch.length };
    }
    return { ok: resp.ok, inserted: resp.ok ? batch.length : undefined };
  } catch {
    return { ok: false };
  }
}

async function flushQueue() {
  if (queue.length === 0) {
    timer = null;
    return;
  }
  const batch = queue.splice(0, Math.min(MAX_BATCH, queue.length));
  timer = null;
  const res = await flushQueueInternal(batch);
  if (!res.ok || res.partial) {
    for (const it of batch) {
      if (it.retries < 3) queue.push({ ...it, retries: it.retries + 1 });
    }
  }
  if (queue.length > 0 && timer === null) {
    timer = setTimeout(flushQueue, QUEUE_FLUSH_MS * 2);
  }
}

function attachUnloadGuard() {
  if (typeof window === "undefined" || unloadAttached) return;
  unloadAttached = true;
  const urgent = () => {
    if (queue.length === 0) return;
    const toSend = queue.splice(0, Math.min(MAX_BATCH, queue.length));
    try {
      // En son öncelik sendBeacon, yoksa fetch keepalive
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        const ok = navigator.sendBeacon("/api/audit/log", serializeForBeacon(toSend));
        if (ok) return;
      }
      fetch("/api/audit/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toSend.map((q) => q.payload)),
        credentials: "same-origin",
        keepalive: true,
      }).catch(() => void 0);
    } catch { /* ignore */ }
  };
  window.addEventListener("pagehide", urgent);
  window.addEventListener("beforeunload", urgent);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") urgent();
  });
}

/**
 * Kullanımı:
 *   logAuditEvent({ event_kind: "presence", event_action: "presence_pulse", session_id })
 * - Asenkron, kuyruklu, 1.5s'de bir gönderir.
 * - Pagehide / sekme gizlenince anında sendBeacon + fetch keepalive ile gönderir (uçmaz).
 * - IP / Ülke / Şehir / Referer sunucu tarafında (API route) doğrulanır, tarayıcıdaki geçici değerler yerine gerçek request header'ları kullanılır.
 */
export function logAuditEvent(payload: AuditEventPayload): void {
  if (typeof window === "undefined") return;
  attachUnloadGuard();
  try {
    const env = pickClientEnvFields();
    const mergedMeta: Record<string, any> = { ...((payload.meta ?? {}) as Record<string, any>) };
    const base: AuditEventPayload = {
      status: payload.status ?? "ok",
      meta: mergedMeta,
      ...env,
      ...payload,
    };
    (base as any).meta = mergedMeta;
    const fullPayload: AuditEventPayload = base;
    queue.push({ payload: fullPayload, retries: 0 });
    if (timer === null) {
      timer = setTimeout(flushQueue, QUEUE_FLUSH_MS);
    }
  } catch {
    // sessizce yut
  }
}

export async function flushAuditQueueNow(): Promise<void> {
  return new Promise<void>((resolve) => {
    if (queue.length === 0) return resolve();
    const toSend = queue.splice(0, Math.min(MAX_BATCH, queue.length));
    flushQueueInternal(toSend)
      .catch(() => void 0)
      .finally(() => resolve());
  });
}
