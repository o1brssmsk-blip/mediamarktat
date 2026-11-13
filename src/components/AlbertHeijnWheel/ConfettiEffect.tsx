"use client";

import confetti from "canvas-confetti";
import { useEffect } from "react";

type Props = {
  active: boolean;
  triggerKey: string | null;
};

const COLORS = ["#16A34A", "#FFFFFF", "#AAD84A"];
const BURST_COUNT = 8;
const PARTICLES_PER_BURST = 25;
const BURST_INTERVAL_MS = 250;

export function ConfettiEffect({ active, triggerKey }: Props) {
  useEffect(() => {
    if (!active || !triggerKey) {
      return;
    }

    const timeouts: number[] = [];

    for (let index = 0; index < BURST_COUNT; index += 1) {
      const timeoutId = window.setTimeout(() => {
        void confetti({
          particleCount: PARTICLES_PER_BURST,
          spread: 100,
          startVelocity: 38,
          ticks: 160,
          gravity: 0.92,
          scalar: 0.96,
          colors: COLORS,
          origin: {
            x: index % 2 === 0 ? 0.25 : 0.75,
            y: 0.5,
          },
        });
      }, index * BURST_INTERVAL_MS);

      timeouts.push(timeoutId);
    }

    return () => {
      timeouts.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, [active, triggerKey]);

  return null;
}
