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
    // Olcum (1200x829 webp): isim pill'i x~12.7-57.4 / y~41.0-48.1,
    // odul pill'i x~12.3-57.2 / y~61.0-67.7 — ikisi de ortada degil, sola dayali.
    // Onceki kutular %50 merkezliydi; buyuk FittedText pill'in disina tasip
    // kirmizi zemin uzerinde "siyah bar" gibi gorunuyordu.
    nameBoxClassName:
      "absolute left-[13.5%] top-[42%] flex h-[5.5%] w-[43%] items-center justify-center overflow-hidden",
    amountBoxClassName:
      "absolute left-[13.5%] top-[61.8%] flex h-[5.4%] w-[43%] items-center justify-center overflow-hidden",
    ctaClassName: "absolute left-[13%] top-[70.5%] h-[8%] w-[46%] rounded-full",
    closeClassName: "absolute right-[3%] top-[2%] h-[7%] w-[8%] rounded-full",
    messageFontSize: "clamp(0.95rem, 1.8vw, 1.4rem)",
    maxWidthClassName: "md:max-w-[680px]",
  },
  mobile: {
    src: "/mediamarkt/mobile-popup.webp",
    nameBoxClassName:
      "absolute left-[17%] top-[31.2%] flex h-[5%] w-[66%] items-center justify-center overflow-hidden",
    amountBoxClassName:
      "absolute left-[15%] top-[71.4%] flex h-[5.4%] w-[70%] items-center justify-center overflow-hidden",
    ctaClassName: "absolute left-[7%] top-[79%] h-[9.5%] w-[86%] rounded-full",
    closeClassName: "absolute right-[4%] top-[1.5%] h-[5%] w-[12%] rounded-full",
    messageFontSize: "clamp(0.8rem, 3vw, 1.1rem)",
    maxWidthClassName: "sm:max-w-[420px]",
  },
} as const;

// Yaziyi kutunun icine olabildigince buyuk sigdirir — canvas ile gercek glyph
// olcumu (en/boy tasmasi olmaz, kisa yazi kocaman, uzun yazi kuculur)
// DIKKAT: stack'te var(--font-*) KULLANILMAZ — canvas ctx.font var() cozumlemez
// (gecersiz font string'i sessizce yok sayilir, olcum 10px default'ta kalir ve
//  yazilar devasa render edilip "siyah bar" gibi gorunur). DOM tarafiyla ayni
//  somut stack kullanilmali ki olcum gercek glyph'lerle eslessin.
const FIT_FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

function FittedText({
  text,
  color,
}: {
  text: string;
  color: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      const box = boxRef.current;
      if (!box || !text.trim()) return;
      const boxW = box.clientWidth;
      const boxH = box.clientHeight;
      if (boxW < 4 || boxH < 4) return;

      const canvas = document.createElement("canvas").getContext("2d");
      if (!canvas) return;
      canvas.font = `800 100px ${FIT_FONT_STACK}`;
      const metrics = canvas.measureText(text);
      const glyphW = Math.max(1, metrics.width);
      const glyphH = Math.max(
        1,
        (metrics.actualBoundingBoxAscent || 70) + (metrics.actualBoundingBoxDescent || 20),
      );
      // 100px referans olcuyu kutuya oranla: en %88, boy %80
      const byWidth = (boxW * 0.88 * 100) / glyphW;
      const byHeight = (boxH * 0.8 * 100) / glyphH;
      // Guvenlik: olcum bozulsa bile yazi kutu yuksekligini asamaz
      setFontSize(Math.min(byWidth, byHeight, boxH));
    };

    measure();
    let fontsDone = false;
    if (typeof document !== "undefined" && "fonts" in document) {
      void document.fonts.ready.then(() => {
        if (!fontsDone) measure();
      });
    }
    const ro = new ResizeObserver(measure);
    if (boxRef.current) ro.observe(boxRef.current);
    return () => {
      fontsDone = true;
      ro.disconnect();
    };
  }, [text]);

  return (
    <div ref={boxRef} className="flex h-full w-full items-center justify-center overflow-hidden">
      <div
        aria-live="polite"
        className="whitespace-nowrap text-center font-extrabold"
        style={{
          fontFamily: FIT_FONT_STACK,
          fontSize: fontSize > 0 ? `${fontSize}px` : "1px",
          lineHeight: "1",
          letterSpacing: "-0.02em",
          color,
          visibility: fontSize > 0 ? "visible" : "hidden",
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
                    fontFamily: FIT_FONT_STACK,
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
