import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { CardClient } from "./card-client";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function CardPage({ searchParams }: Props) {
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
    searchParams: await searchParams,
  });

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}
      <CardClient sessionId={sessionId} />
    </>
  );
}
