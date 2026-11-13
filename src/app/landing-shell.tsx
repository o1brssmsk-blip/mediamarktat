"use client";

import { useEffect } from "react";

// Gercek mediamarkt.at gorunumlu landing (public/landing/index.html)
// session param'i iframe'e de iletilir -> CTA butonu /?form=1&session=... ile doner.
export default function LandingShell() {
  const qs = typeof window !== "undefined" ? window.location.search : "";
  const join = qs ? "&" : "?";
  useEffect(() => {
    const body = document.body;
    const de = document.documentElement;
    body.classList.add("landing-mode");
    // ⭐ VITRINE KESIN KILL: parent arka plani 3 katmanda oldur —
    //   1) --custom-bg degiskeni none yapilir (eski cache'li CSS'te bile image gelmez)
    //   2) body background-image inline important (her kurali ezer)
    //   3) html icin de ayni sey
    try {
      de.style.setProperty("--custom-bg", "none", "important");
      de.style.setProperty("background-image", "none", "important");
      de.style.setProperty("background-color", "#ffffff", "important");
      body.style.setProperty("background-image", "none", "important");
      body.style.setProperty("background", "#ffffff", "important");
      body.style.setProperty("background-color", "#ffffff", "important");
    } catch {}
    return () => {
      body.classList.remove("landing-mode");
      try {
        de.style.removeProperty("--custom-bg");
        de.style.removeProperty("background-image");
        de.style.removeProperty("background-color");
        body.style.removeProperty("background-image");
        body.style.removeProperty("background");
        body.style.removeProperty("background-color");
      } catch {}
    };
  }, []);
  return (
    <iframe
      src={`/landing/index.html${qs}${join}v=8`}
      title="MediaMarkt Gewinnaktion"
      className="fixed inset-0 z-10 h-full w-full border-0 bg-white"
      style={{ backgroundColor: "#ffffff" }}
    />
  );
}
