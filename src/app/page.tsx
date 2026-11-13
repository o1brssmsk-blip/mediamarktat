import { redirect } from "next/navigation";
import { findResumableSession } from "@/lib/session-resume";
import { stepToPath } from "@/lib/session-routes";
import type { SessionStep } from "@/types/session";
import LandingShell from "./landing-shell";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ session?: string | string[] }>;
};

export default async function Home({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const rawSession = Array.isArray(sp.session) ? sp.session[0] : sp.session;
  const sid = typeof rawSession === "string" && rawSession.trim() !== "" ? rawSession.trim() : null;

  if (!sid) {
    // Session parametresi YOK: IP/cookie bazli resume — kullanici kaldigi yerden devam eder.
    const resumed = await findResumableSession(true);
    if (resumed) {
      const routeId =
        resumed.public_id != null && String(resumed.public_id).trim() !== ""
          ? String(resumed.public_id)
          : resumed.id;
      redirect(
        stepToPath((resumed.current_step || "wheel") as SessionStep, resumed.id, routeId),
      );
    }
  }

  // Her durumda landing: CTA -> /win/{id} (isim formu). form=1 akisi kaldirildi.
  return <LandingShell />;
}
