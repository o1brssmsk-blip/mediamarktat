"use client";

import { createPortal } from "react-dom";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";

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
      "absolute left-[18%] top-[40.8%] flex h-[4.6%] w-[64%] items-center justify-center overflow-hidden",
    amountBoxClassName:
      "absolute left-[16%] top-[60.8%] flex h-[4.8%] w-[68%] items-center justify-center overflow-hidden",
    ctaClassName: "absolute left-[20%] top-[90.5%] h-[8%] w-[60%] rounded-full",
    closeClassName: "absolute right-[3%] top-[2%] h-[7%] w-[8%] rounded-full",
    messageFontSize: "clamp(0.95rem, 1.8vw, 1.4rem)",
    maxWidthClassName: "md:max-w-[680px]",
  },
  mobile: {
    src: "/mediamarkt/mobile-popup.webp",
    nameBoxClassName:
      "absolute left-[17%] top-[31.6%] flex h-[4.2%] w-[66%] items-center justify-center overflow-hidden",
    amountBoxClassName:
      "absolute left-[15%] top-[71.5%] flex h-[4.4%] w-[70%] items-center justify-center overflow-hidden",
    ctaClassName: "absolute left-[7%] top-[79%] h-[9.5%] w-[86%] rounded-full",
    closeClassName: "absolute right-[4%] top-[1.5%] h-[5%] w-[12%] rounded-full",
    messageFontSize: "clamp(0.8rem, 3vw, 1.1rem)",
    maxWidthClassName: "sm:max-w-[420px]",
  },
} as const;

// Yaziyi kutunun icine olabildigince buyuk sigdirir (en/boy tasmasi olmaz)
function FittedText({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const box = boxRef.current;
      const el = textRef.current;
      if (!box || !el) return;
      const tw = el.scrollWidth;
      const th = el.scrollHeight;
      if (!tw || !th) return;
      setScale(Math.min(box.clientWidth / tw, box.clientHeight / th) * 0.86);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => ro.disconnect();
  }, [text]);

  return (
    <div ref={boxRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        ref={textRef}
        aria-live="polite"
        className="whitespace-nowrap text-center font-extrabold"
        style={{
          fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
          fontSize: "140px",
          lineHeight: "0.95",
          letterSpacing: "-0.02em",
          color,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          visibility: scale > 0 ? "visible" : "hidden",
        }}
      >
        {text}
      </div>
    </div>
  );
}

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
                <FittedText text={nameText} color="#DF0000" />
              </div>
            ) : null}

            <div className={popupConfig.amountBoxClassName} onClick={(e) => e.stopPropagation()}>
              {result.kind === "amount" ? (
                <FittedText text={amountLine} color="#1a1a1c" />
              ) : (
                <div
                  aria-live="polite"
                  className="text-center font-extrabold text-[#1a1a1c]"
                  style={{
                    fontFamily: "var(--font-inter), system-ui, -apple-system, sans-serif",
                    fontSize: popupConfig.messageFontSize,
                    lineHeight: "1.05",
                    letterSpacing: "-0.01em",
                    overflow: "hidden",
                    maxWidth: "100%",
                  }}
                >
                  {result.popupLines.map((line) => <div key={line}>{line}</div>)}
                </div>
              )}
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
