import { redirect } from "next/navigation";
import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { CodeEntryClient } from "./code-client";
import { stepToPath } from "@/lib/session-routes";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export const dynamic = "force-dynamic";

export default async function CodeEntryPage({ searchParams }: Props) {
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
    searchParams: await searchParams,
  });

  if (sessionId) {
    try {
      const supabase = await createServerSupabaseClient();
      if (supabase) {
        const { data } = await supabase
          .from("sessions")
          .select("current_step,form_data")
          .eq("id", sessionId)
          .maybeSingle();
        if (data?.current_step) {
          const formData = (data.form_data ?? {}) as Record<string, unknown>;
          const isWheel = formData.is_wheel_game === true || data.current_step === "wheel";
          if (isWheel) {
            redirect(`/wheel?session=${encodeURIComponent(routeSessionId ?? sessionId)}`);
          }
          if (data.current_step !== "code_entry") {
            redirect(stepToPath(data.current_step as any, routeSessionId ?? sessionId));
          }
        }
      }
    } catch {}
  }

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}
      <CodeEntryClient sessionId={sessionId} routeSessionId={routeSessionId} />
    </>
  );
}
