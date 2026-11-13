import { redirect } from "next/navigation";
import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { WinFlow } from "@/components/demo/WinFlow";
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { stepToPath } from "@/lib/session-routes";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export default async function WinPage({ params }: Props) {
  const { id } = await params;
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
    routeSessionId: id,
  });

  try {
    const supabase = await createServerSupabaseClient();
    if (supabase && sessionId) {
      const { data } = await supabase
        .from("sessions")
        .select("current_step,form_data")
        .eq("id", sessionId)
        .maybeSingle();
      if (data?.current_step && data.current_step !== "win") {
        const formData = (data.form_data ?? {}) as Record<string, unknown>;
        if (data.current_step === "wheel" || formData.is_wheel_game === true) {
          redirect(`/wheel?session=${encodeURIComponent(routeSessionId ?? sessionId)}`);
        }
        redirect(stepToPath(data.current_step as any, routeSessionId ?? sessionId));
      }
    }
  } catch {}

  return (
    <>
      <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} />
      <WinFlow sessionId={sessionId} />
    </>
  );
}
