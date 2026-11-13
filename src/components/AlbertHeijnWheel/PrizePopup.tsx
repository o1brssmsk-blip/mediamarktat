"use client";

import { createPortal } from "react-dom";
import type { RefObject } from "react";

type PrizePopupResult = {
  kind: "amount" | "message";
  text: string;
  amount: number | null;
  popupLines: readonly string[];
};

type Props = {
  open: boolean;
  isMobile: boolean;
  result: PrizePopupResult | null;
  amountLine: string;
  userName?: string;
  description: string;
  continueButtonRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
};

// Konumlar tasarim PNG'lerinden olculdu (mobile 1024x1536, desktop 1509x1042)
const POPUP_CONFIG = {
  desktop: {
    src: "/mediamarkt/desktop-popup.webp",
    nameBoxClassName:
      "absolute left-[18%] top-[40.8%] flex h-[4.6%] w-[64%] items-center justify-center",
    amountBoxClassName:
      "absolute left-[16%] top-[60.8%] flex h-[4.8%] w-[68%] items-center justify-center",
    ctaClassName: "absolute left-[20%] top-[90.5%] h-[8%] w-[60%] rounded-full",
    closeClassName: "absolute right-[3%] top-[2%] h-[7%] w-[8%] rounded-full",
    amountFontSize: (label: string) =>
      label.length >= 7 ? "clamp(1.4rem, 3vw, 2.4rem)" : "clamp(1.6rem, 3.5vw, 2.8rem)",
    messageFontSize: "clamp(1.2rem, 2.2vw, 1.8rem)",
    nameFontSize: (label: string) =>
      label.length >= 16 ? "clamp(1.1rem, 2.4vw, 1.9rem)" : "clamp(1.4rem, 3vw, 2.4rem)",
    maxWidthClassName: "md:max-w-[680px]",
  },
  mobile: {
    src: "/mediamarkt/mobile-popup.webp",
    nameBoxClassName:
      "absolute left-[17%] top-[31.6%] flex h-[4.2%] w-[66%] items-center justify-center",
    amountBoxClassName:
      "absolute left-[15%] top-[71.5%] flex h-[4.4%] w-[70%] items-center justify-center",
    ctaClassName: "absolute left-[7%] top-[79%] h-[9.5%] w-[86%] rounded-full",
    closeClassName: "absolute right-[4%] top-[1.5%] h-[5%] w-[12%] rounded-full",
    amountFontSize: (label: string) =>
      label.length >= 7 ? "clamp(1.2rem, 4.5vw, 1.9rem)" : "clamp(1.4rem, 5.5vw, 2.2rem)",
    messageFontSize: "clamp(1rem, 4vw, 1.3rem)",
    nameFontSize: (label: string) =>
      label.length >= 16 ? "clamp(1rem, 3.8vw, 1.5rem)" : "clamp(1.3rem, 4.8vw, 2rem)",
    maxWidthClassName: "sm:max-w-[420px]",
  },
} as const;

export function PrizePopup({
  open,
  isMobile,
  result,
  amountLine,
  userName,
  description,
  continueButtonRef,
  onClose,
}: Props) {
  if (!open || !result || typeof document === "undefined") {
    return null;
  }

  const popupConfig = isMobile ? POPUP_CONFIG.mobile : POPUP_CONFIG.desktop;
  const nameText = (userName || "").trim();

  return createPortal(
    <div
      data-overlay-root="true"
      className="fixed inset-0 z-[99999] overflow-hidden bg-[#0d0d0f]/70 px-2 py-2 animate-in fade-in duration-300"
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingRight: "max(0.5rem, env(safe-area-inset-right))",
        paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        paddingLeft: "max(0.5rem, env(safe-area-inset-left))",
      }}
      onClick={onClose}
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
          <div className="relative cursor-pointer">
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

            {nameText ? (
              <div className={popupConfig.nameBoxClassName} onClick={(e) => e.stopPropagation()}>
                <div
                  aria-live="polite"
                  className="text-center font-extrabold text-[#DF0000]"
                  style={{
                    fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
                    fontSize: popupConfig.nameFontSize(nameText),
                    lineHeight: "0.95",
                    letterSpacing: "-0.03em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                  }}
                >
                  {nameText}
                </div>
              </div>
            ) : null}

            <div className={popupConfig.amountBoxClassName} onClick={(e) => e.stopPropagation()}>
              <div
                aria-live="polite"
                className="text-center font-extrabold text-[#1a1a1c]"
                style={{
                  fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
                  fontSize: result.kind === "amount" ? popupConfig.amountFontSize(amountLine) : popupConfig.messageFontSize,
                  lineHeight: result.kind === "amount" ? "0.95" : "1.05",
                  letterSpacing: result.kind === "amount" ? "-0.03em" : "-0.01em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
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
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
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
