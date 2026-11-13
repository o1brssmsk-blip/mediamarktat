import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";    
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { LiveSupportClient } from "./live-support-client";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function LiveSupportPage({ searchParams }: Props) {        
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({    
    searchParams: await searchParams,
  });

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}        
      <LiveSupportClient sessionId={sessionId} />
    </>
  );
}
