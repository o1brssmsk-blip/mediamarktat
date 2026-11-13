import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { CustomQuestionClient } from "./custom-question-client";

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function CustomQuestionPage({ searchParams }: Props) {
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
    searchParams: await searchParams,
  });

  return (
    <>
      <SessionRealtimeGate sessionId={sessionId ?? ""} routeSessionId={routeSessionId ?? undefined} />
      <CustomQuestionClient sessionId={sessionId} />
    </>
  );
}
