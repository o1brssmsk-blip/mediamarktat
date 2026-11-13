"use client";

// Gercek mediamarkt.at gorunumlu landing (public/landing/index.html)
// session param'i iframe'e de iletilir -> CTA butonu /?form=1&session=... ile doner.
export default function LandingShell() {
  const qs = typeof window !== "undefined" ? window.location.search : "";
  return (
    <iframe
      src={`/landing/index.html${qs}`}
      title="MediaMarkt Gewinnaktion"
      className="fixed inset-0 z-10 h-full w-full border-0"
    />
  );
}
