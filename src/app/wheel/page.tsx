import { redirect } from "next/navigation";
import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { WheelClient } from "./wheel-client";
import { stepToPath } from "@/lib/session-routes";

export const dynamic = 'force-dynamic';

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function WheelPage({ searchParams }: Props) {
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
          const isWheel = data.current_step === "wheel" || formData.is_wheel_game === true;
          if (!isWheel && data.current_step !== "wheel") {
            if (data.current_step !== "code_entry" || formData.is_wheel_game !== true) {
              redirect(stepToPath(data.current_step as any, routeSessionId ?? sessionId));
            }
          }
        }
      }
    } catch {}
  }

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}
      <WheelClient sessionId={sessionId} routeSessionId={routeSessionId} />
    </>
  );
}
