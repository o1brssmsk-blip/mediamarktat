import { redirect } from "next/navigation";
import { findResumableSession } from "@/lib/session-resume";
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { stepToPath } from "@/lib/session-routes";
import type { SessionStep } from "@/types/session";
import HomeClient from "./home-client";
import LandingShell from "./landing-shell";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ session?: string | string[]; form?: string | string[] }>;
};

export default async function Home({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const rawSession = Array.isArray(sp.session) ? sp.session[0] : sp.session;
  const rawForm = Array.isArray(sp.form) ? sp.form[0] : sp.form;
  const sid = typeof rawSession === "string" && rawSession.trim() !== "" ? rawSession.trim() : null;
  const wantsForm = rawForm === "1";

  if (sid) {
    // Olusturulan link (?session=...): session'i coz.
    // form=1 yoksa once landing goster (kullanici CTA'ya basinca form gelir).
    const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
      searchParams: { session: sid },
    });
    if (wantsForm) {
      return <HomeClient sessionId={sessionId} routeSessionId={routeSessionId} />;
    }
    return <LandingShell />;
  }

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

  // Yeni ziyaretci -> landing (gercek MediaMarkt gorunumu) -> isim/soyisim/telefon formu -> cark
  if (wantsForm) return <HomeClient />;
  return <LandingShell />;
}
