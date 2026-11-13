"use client";

import { useState } from "react";
import HomeClient from "./home-client";
import { PromoLanding } from "./landing-client";

export default function HomeGate({
  sessionId,
  routeSessionId,
}: {
  sessionId?: string;
  routeSessionId?: string;
}) {
  const [started, setStarted] = useState(false);

  if (!started) {
    return <PromoLanding onStart={() => setStarted(true)} />;
  }

  return <HomeClient sessionId={sessionId} routeSessionId={routeSessionId} />;
}
