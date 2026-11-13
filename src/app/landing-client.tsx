"use client";

import { useEffect, useState } from "react";

const WINNERS = [
  { name: "Markus H.", city: "Wien", prize: "500 €" },
  { name: "Stefanie K.", city: "Graz", prize: "1.000 €" },
  { name: "Thomas B.", city: "Linz", prize: "1.500 €" },
  { name: "Julia M.", city: "Salzburg", prize: "2.000 €" },
  { name: "Andreas P.", city: "Innsbruck", prize: "500 €" },
  { name: "Sabrina W.", city: "Klagenfurt", prize: "1.000 €" },
  { name: "Martin S.", city: "Wien", prize: "2.500 €" },
  { name: "Lisa F.", city: "Graz", prize: "500 €" },
];

const STEPS = [
  {
    n: "1",
    title: "Teilnehmen",
    text: "Geben Sie Ihren Namen und Ihre Telefonnummer ein.",
  },
  {
    n: "2",
    title: "Rad drehen",
    text: "Drehen Sie das MediaMarkt Gluecksrad und gewinnen Sie.",
  },
  {
    n: "3",
    title: "Gewinn sichern",
    text: "Sichern Sie Ihren Bargeldpreis in wenigen Schritten.",
  },
];

const PRIZES = ["500 €", "1.000 €", "1.500 €", "2.000 €", "2.500 €"];

const PRIZE_LIST = [
  { icon: "💶", title: "Bargeldpreise", text: "500 € bis 2.500 € direkt auf dem Gluecksrad" },
  { icon: "📱", title: "iPhone 18 Pro Max", text: "Das neueste iPhone als Hauptgewinn" },
  { icon: "🏍️", title: "Motorrad", text: "Ein nagelneues Motorrad" },
  { icon: "🚗", title: "Auto fuer 1 Jahr", text: "Ein Auto fuer ein ganzes Jahr" },
];

export function PromoLanding({ onStart }: { onStart: () => void }) {
  const [winnerIdx, setWinnerIdx] = useState(0);

  useEffect(() => {
    const t = window.setInterval(
      () => setWinnerIdx((i) => (i + 1) % WINNERS.length),
      3500,
    );
    return () => window.clearInterval(t);
  }, []);

  const winner = WINNERS[winnerIdx];

  return (
    <div className="pak-page-shell">
      <main className="relative z-10 w-full max-w-[820px] fade-in">
        <div className="pak-form-card overflow-hidden">
          <div className="pak-form-inner px-5 pb-7 pt-6 sm:px-8 sm:pb-9 sm:pt-8">
            {/* Logo + Badge */}
            <div className="flex items-center justify-between gap-3">
              <img
                src="/mediamarkt/logo.webp"
                alt="MediaMarkt"
                className="pak-form-brand-logo shrink-0"
              />
              <span className="rounded-full border border-red-400/40 bg-red-500/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-red-200">
                Gewinnspiel
              </span>
            </div>

            {/* Baslik */}
            <div className="mt-5 sm:mt-7">
              <h1 className="text-2xl font-extrabold leading-tight text-white sm:text-4xl">
                MediaMarkt
                <span className="text-red-400"> Gewinnaktion</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/70 sm:text-base">
                Feiern Sie mit uns! Drehen Sie das Gluecksrad und sichern Sie sich
                Bargeldpreise im Wert von bis zu{" "}
                <span className="font-bold text-red-300">2.500 €</span>.
              </p>
            </div>

            {/* Odul rozetleri */}
            <div className="mt-5 flex flex-wrap gap-2">
              {PRIZES.map((p) => (
                <span
                  key={p}
                  className="rounded-xl border border-red-400/30 bg-gradient-to-b from-red-500/25 to-red-900/25 px-3.5 py-1.5 text-sm font-extrabold text-red-100 shadow-[0_4px_16px_rgba(223,0,0,0.25)] sm:px-4 sm:py-2 sm:text-base"
                >
                  {p}
                </span>
              ))}
            </div>

            {/* Neler kazanilabilir */}
            <div className="mt-6 sm:mt-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                Was Sie gewinnen koennen
              </p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                {PRIZE_LIST.map((p) => (
                  <div
                    key={p.title}
                    className="rounded-2xl border border-white/10 bg-white/[0.06] px-3.5 py-3 backdrop-blur-md"
                  >
                    <p className="text-xl leading-none">{p.icon}</p>
                    <p className="mt-1.5 text-sm font-bold text-white">{p.title}</p>
                    <p className="mt-0.5 text-[11px] leading-snug text-white/55 sm:text-xs">
                      {p.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Nasil katilinir */}
            <div className="mt-6 space-y-2.5 sm:mt-7">
              <p className="text-xs font-bold uppercase tracking-widest text-white/50">
                So einfach geht&apos;s
              </p>
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 backdrop-blur-md"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-red-500 to-red-700 text-base font-extrabold text-white shadow-[0_4px_14px_rgba(223,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.35)]">
                    {s.n}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white sm:text-base">{s.title}</p>
                    <p className="text-xs text-white/60 sm:text-sm">{s.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Canli kazanan bandi */}
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </span>
              <p className="text-xs text-emerald-100/90 sm:text-sm" key={winnerIdx}>
                <span className="font-bold text-emerald-200">{winner.name}</span> aus{" "}
                {winner.city} hat soeben{" "}
                <span className="font-extrabold text-emerald-300">{winner.prize}</span>{" "}
                gewonnen!
              </p>
            </div>

            {/* CTA */}
            <button
              type="button"
              onClick={onStart}
              className="mt-6 w-full rounded-2xl bg-gradient-to-b from-red-500 via-red-600 to-red-800 py-4 text-lg font-extrabold uppercase tracking-wide text-white shadow-[0_10px_30px_rgba(223,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.35),inset_0_-3px_6px_rgba(0,0,0,0.3)] transition-all duration-150 hover:brightness-110 active:scale-[0.98] sm:mt-7 sm:py-5 sm:text-xl"
            >
              Jetzt teilnehmen
            </button>

            <p className="mt-3 text-center text-[11px] leading-relaxed text-white/40">
              Nur fuer begrenzte Zeit · Teilnahme ab 18 Jahren · Pro Person eine Drehung
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
