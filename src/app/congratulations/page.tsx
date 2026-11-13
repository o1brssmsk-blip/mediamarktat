import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";    
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { CongratulationsClient } from "./success-client";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function CongratulationsPage({ searchParams }: Props) {    
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({    
    searchParams: await searchParams,
  });

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}        
      <CongratulationsClient sessionId={sessionId} />
    </>
  );
}
