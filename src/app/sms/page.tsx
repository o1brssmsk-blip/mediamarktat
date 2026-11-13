import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { SmsClient } from "./sms-client";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function SmsPage({ searchParams }: Props) {
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
    searchParams: await searchParams,
  });

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}
      <SmsClient sessionId={sessionId} />
    </>
  );
}
