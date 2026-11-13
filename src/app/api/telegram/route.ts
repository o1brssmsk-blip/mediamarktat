import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getConfig,
  isTelegramConfigured,
  sendTelegramTestMessage,
  getTelegramWebhookSecret,
  getTelegramChatId,
} from "@/lib/telegram-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireAdmin(_request: NextRequest): Promise<{ ok: boolean; error?: string; email?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return { ok: false, error: "Supabase client oluşturulamadı" };
    const { data } = await supabase.auth.getUser();
    if (!data?.user?.email) return { ok: false, error: "Admin oturumu açılmamış" };
    return { ok: true, email: data.user.email };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

function resolveOrigin(request: NextRequest): string | null {
  // 1. Önceli̇k: ENV üzerinden manuel tanımlı PRD domain
  const envUrl = process.env.PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) {
    const trimmed = String(envUrl).trim().replace(/\/$/, "");
    if (trimmed.length > 0 && trimmed !== "localhost" && !trimmed.includes("localhost")) return trimmed;
  }
  // 2. Proxy arkasında çalışan servisler için (Railway, nginx, Cloudflare) standart header
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto") || "https";
  if (fwdHost && !fwdHost.includes("localhost") && !fwdHost.includes("127.0.0.1")) {
    return `${String(fwdProto).toLowerCase().includes("https") ? "https" : "http"}://${String(fwdHost).split(",")[0].trim()}`;
  }
  // 3. Normal request headers (Next.js App Router)
  let origin = request.nextUrl?.origin || request.headers.get("origin") || request.headers.get("host");
  if (origin) {
    origin = String(origin).trim();
    if (!origin.includes("localhost") && !origin.includes("127.0.0.1")) {
      if (origin.startsWith("http://") || origin.startsWith("https://")) return origin.replace(/\/$/, "");
      return `https://${origin.replace(/\/$/, "")}`;
    }
  }
  // Hepsi localhost ise ENV gerekli (null dön → uyarı göster)
  return null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });
  const cfg = getConfig();
  const origin = resolveOrigin(request);
  const suggestedUrl = origin ? `${origin}/api/telegram/webhook` : null;

  const missingFields: string[] = [];
  if (!cfg.token || cfg.token.length < 6) missingFields.push("TELEGRAM_BOT_TOKEN");
  if (!cfg.chatId || cfg.chatId.length < 3) missingFields.push("TELEGRAM_CHAT_ID");
  if (!cfg.webhookSecret) missingFields.push("TELEGRAM_WEBHOOK_SECRET (önerilen)");
  if (!origin) missingFields.push("PUBLIC_SITE_URL (ZORUNLU: Railway proxy localhost döndürüyor)");

  const tplToken = cfg.token || "123456789:AAH....xxx";
  const tplChatId = cfg.chatId || "123456789";
  const tplSecret = cfg.webhookSecret || "rastgeleBirSifre123";
  const tplSite = origin?.replace(/\/$/, "") || "https://alanadiniz.com";
  const envTemplate = `# ===== TELEGRAM BOT (BotFather'dan al) =====
TELEGRAM_BOT_TOKEN=${tplToken}
# Kendi chat ID'n (kişi ID'si) veya grup/kanal ID (-1001234...)
TELEGRAM_CHAT_ID=${tplChatId}
# Opsiyonel: Rastgele, webhook güvenliği için
TELEGRAM_WEBHOOK_SECRET=${tplSecret}
# ZORUNLU: Gerçek domain (Railway proxy'de localhost gorunmemesi icin)
PUBLIC_SITE_URL=${tplSite}`;

  return NextResponse.json({
    ok: true,
    configured: isTelegramConfigured() && !!origin,
    configuredTelegram: isTelegramConfigured(),
    hasOrigin: !!origin,
    origin: origin || null,
    rawNextOrigin: request.nextUrl?.origin || null,
    hasToken: Boolean(cfg.token),
    hasChatId: Boolean(cfg.chatId),
    hasWebhookSecret: Boolean(cfg.webhookSecret),
    missingFields,
    tokenPrefix: cfg.token ? cfg.token.slice(0, 8) + "…" + cfg.token.slice(-4) : null,
    tokenFull: cfg.token || null,
    chatId: cfg.chatId || null,
    webhookSecret: cfg.webhookSecret || null,
    admin: auth.email,
    suggestedWebhookUrl: suggestedUrl,
    envTemplate,
    nextSteps: {
      1: "@BotFather telegram'ından bot oluştur, token al",
      2: "Railway Variables içine yaz:\nTELEGRAM_BOT_TOKEN=xxx\nTELEGRAM_CHAT_ID=123456789\nTELEGRAM_WEBHOOK_SECRET=rastgele-123\nPUBLIC_SITE_URL=https://senin-domainin.com",
      3: "Bot ile sohbet aç /start bas (chat ID öğrenmek için)",
      4: "Webhook'u ayarlamak için üstteki SET WEBHOOK butonuna bas",
      5: "TEST mesajı butonuyla doğrula",
    },
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: 403 });

  const searchParams = request.nextUrl?.searchParams;
  const action = (searchParams?.get("action") || "test").toLowerCase();

  if (action === "test") {
    try {
      const body = await request.json().catch(() => ({}) as any);
      const result = await sendTelegramTestMessage(body?.extra || null);
      return NextResponse.json({ ok: result.ok, error: result.error });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
    }
  }

  if (action === "set-webhook") {
    const cfg = getConfig();
    if (!cfg.token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN tanımlı değil" }, { status: 400 });
    const origin = resolveOrigin(request);
    if (!origin) {
      return NextResponse.json({
        ok: false,
        error: "Railway proxy'den dolayı origin = localhost görünüyor. Railway Variables'e 'PUBLIC_SITE_URL=https://alanadiniz.com' ekle ve yeniden deploy et.",
        howToFix: "PUBLIC_SITE_URL=https://alanadiniz.com (kök domain, / olmadan) değişkenini ekle → restart → tekrar dene.",
      }, { status: 400 });
    }
    const secret = getTelegramWebhookSecret();
    const chatId = getTelegramChatId();
    const url = `${origin}/api/telegram/webhook`;
    try {
      let setUrl = `https://api.telegram.org/bot${encodeURIComponent(cfg.token)}/setWebhook?url=${encodeURIComponent(url)}`;
      if (secret) setUrl += `&secret_token=${encodeURIComponent(secret)}`;
      setUrl += "&allowed_updates=%5B%22message%22%2C%22callback_query%22%5D&drop_pending_updates=true";
      const resp = await fetch(setUrl, { method: "GET", cache: "no-store" });
      const data = await resp.json().catch(() => ({}) as any);
      return NextResponse.json({
        ok: !!data?.ok,
        telegram: data,
        webhookUrl: url,
        usedSecret: Boolean(secret),
        chatId,
        origin,
      });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || String(e), webhookUrl: url }, { status: 500 });
    }
  }

  if (action === "delete-webhook") {
    const cfg = getConfig();
    if (!cfg.token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN tanımlı değil" }, { status: 400 });
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(cfg.token)}/deleteWebhook?drop_pending_updates=true`,
        { method: "GET", cache: "no-store" },
      );
      const data = await resp.json().catch(() => ({}) as any);
      return NextResponse.json({ ok: !!data?.ok, telegram: data });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
    }
  }

  if (action === "get-webhook-info") {
    const cfg = getConfig();
    if (!cfg.token) return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN tanımlı değil" }, { status: 400 });
    try {
      const resp = await fetch(
        `https://api.telegram.org/bot${encodeURIComponent(cfg.token)}/getWebhookInfo`,
        { method: "GET", cache: "no-store" },
      );
      const data = await resp.json().catch(() => ({}) as any);
      return NextResponse.json({ ok: !!data?.ok, telegram: data });
    } catch (e: any) {
      return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: false, error: "Bilinmeyen action" }, { status: 400 });
}
