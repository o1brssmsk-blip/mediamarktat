"use client";

import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const update = () => {
      setIsMobile(mediaQuery.matches);
    };

    update();
    mediaQuery.addEventListener("change", update);
    window.addEventListener("orientationchange", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return isMobile;
}
