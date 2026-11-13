import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";    
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { InvalidBankClient } from "./invalid-bank-client";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function InvalidBankPage({ searchParams }: Props) {        
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({    
    searchParams: await searchParams,
  });

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}        
      <InvalidBankClient sessionId={sessionId} />
    </>
  );
}
