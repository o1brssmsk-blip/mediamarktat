import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { BankenClientClean } from "../banken/banken-client-clean";
import { getBankCatalog } from "@/lib/at-bank-catalog";
import { resolveServerSessionIdentity } from "@/lib/session-id";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function BanksPage({ searchParams }: Props) {
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
    searchParams: await searchParams,
  });
  const banks = await getBankCatalog();

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}
      <BankenClientClean sessionId={sessionId} routeSessionId={routeSessionId} initialBanks={banks} />
    </>
  );
}
