"use client";

import { createPortal } from "react-dom";
import type { RefObject } from "react";

type PrizePopupHistoryItem = {
  prize: string;
  date: string;
  formattedDate: string;
};

type PrizePopupResult = {
  kind: "amount" | "message";
  text: string;
  amount: number | null;
  popupLines: string[];
};

type Props = {
  open: boolean;
  isMobile: boolean;
  result: PrizePopupResult | null;
  amountLine: string;
  description: string;
  continueButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

const POPUP_CONFIG = {
  desktop: {
    src: "/popup-assets/popup-desktop.webp",
    amountBoxClassName: "absolute left-[20%] top-[52%] flex h-[12%] w-[60%] items-center justify-center px-[4%]",
    ctaClassName: "absolute left-[28%] top-[68%] h-[10%] w-[44%] rounded-full",
    closeClassName: "absolute right-[4%] top-[3%] h-[8%] w-[8%] rounded-full",
    amountFontSize: (label: string) =>
      label.length >= 6 ? "clamp(1.5rem, 3vw, 2.5rem)" : label.length >= 5 ? "clamp(2rem, 3.5vw, 3rem)" : "clamp(2.5rem, 4.5vw, 3.5rem)",
    messageFontSize: "clamp(1.5rem, 2.5vw, 2rem)",
    maxWidthClassName: "md:max-w-[720px]",
  },
  mobile: {
    src: "/popup-assets/popup-mobile.webp",
    amountBoxClassName: "absolute left-[10%] top-[54%] flex h-[15%] w-[80%] items-center justify-center px-[4%]",
    ctaClassName: "absolute left-[18%] top-[77.5%] h-[10.5%] w-[64%] rounded-full",
    closeClassName: "absolute right-[4%] top-[3%] h-[6%] w-[12%] rounded-full",
    amountFontSize: (label: string) =>
      label.length >= 6 ? "clamp(2rem, 8vw, 2.8rem)" : label.length >= 5 ? "clamp(2.3rem, 9vw, 3.2rem)" : "clamp(2.6rem, 10vw, 3.6rem)",
    messageFontSize: "clamp(1.1rem, 5vw, 1.5rem)",
    maxWidthClassName: "sm:max-w-[420px]",
  },
} as const;

export function PrizePopup({
  open,
  isMobile,
  result,
  amountLine,
  description,
  continueButtonRef,
  onClose,
}: Props) {
  if (!open || !result || typeof document === "undefined") {
    return null;
  }

  const popupConfig = isMobile ? POPUP_CONFIG.mobile : POPUP_CONFIG.desktop;

  return createPortal(
    <div
      data-overlay-root="true"
      className="fixed inset-0 z-[99999] overflow-hidden bg-[#021b59]/20 px-2 py-2 animate-in fade-in duration-300"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingRight: "max(0.5rem, env(safe-area-inset-right))",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
      }}
    >
      <div className="flex h-full items-center justify-center">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="wheel-result-title"
          aria-describedby="wheel-result-description"
          className={`relative mx-auto w-full max-w-[92vw] text-center animate-in zoom-in-95 duration-300 ${popupConfig.maxWidthClassName}`}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              onClose();
            }
          }}
          tabIndex={-1}
        >
          <div className="relative">
            <h2 id="wheel-result-title" className="sr-only">
              Herzlichen Glueckwunsch!
            </h2>
            <p id="wheel-result-description" className="sr-only">
              {description}
            </p>

            <img
              src={popupConfig.src}
              alt=""
              aria-hidden="true"
              className="mx-auto h-auto w-full select-none object-contain"
              draggable={false}
            />

            <div className={popupConfig.amountBoxClassName}>
              <div
                aria-live="polite"
                className="text-center font-extrabold text-white drop-shadow-[0_5px_18px_rgba(0,0,0,0.42)]"
                style={{
                  fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
                  fontSize: result.kind === "amount" ? popupConfig.amountFontSize(amountLine) : popupConfig.messageFontSize,
                  lineHeight: result.kind === "amount" ? "0.95" : "1.05",
                  letterSpacing: result.kind === "amount" ? "-0.035em" : "-0.01em",
                }}
              >
                {result.kind === "amount" ? amountLine : result.popupLines.map((line) => <div key={line}>{line}</div>)}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Popup schliessen"
              className={`${popupConfig.closeClassName} bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75`}
            />

            <button
              ref={continueButtonRef}
              type="button"
              onClick={onClose}
              className={`${popupConfig.ctaClassName} bg-transparent outline-none`}
            >
              <span className="sr-only">Alles klar</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
