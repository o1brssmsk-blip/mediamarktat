"use client";

import type { ActiveWheelLayout, WheelSceneKey } from "@/app/wheel/wheel-layout";

type Props = {
  layout: ActiveWheelLayout;
  rotation: number;
  spinning: boolean;
  disabled: boolean;
  onSpin: () => void;
  onSpinEnd: () => void;
};

const WHEEL_ASSETS: Record<
  WheelSceneKey,
  {
    backgroundSrc: string;
    wheelSrc: string;
    rimSrc: string;
    pointerSrc: string;
    buttonSrc: string;
    centerHubSrc: string;

    wheelLeft: string;
    wheelTop: string;
    wheelWidth: string;
    wheelHeight: string;
    wheelCx: number;
    wheelCy: number;
    wheelScale: number;

    hubWidthPct: number;

    pointerLeft: string;
    pointerTop: string;
    pointerWidth: string;
    pointerHeight: string;

    buttonLeft: string;
    buttonTop: string;
    buttonWidth: string;
    buttonHeight: string;
  }
> = {
  desktop: {
    backgroundSrc: "/wheel-assets/desktop/png/mediamarkt-background.webp",
    wheelSrc: "/wheel-assets/desktop/png/mediamarkt-wheel.webp",
    rimSrc: "/wheel-assets/desktop/png/mediamarkt-rim.webp",
    pointerSrc: "/wheel-assets/desktop/png/mediamarkt-pointer.webp",
    buttonSrc: "/wheel-assets/desktop/png/mediamarkt-button.webp",
    centerHubSrc: "/wheel-assets/desktop/png/mediamarkt-hub.webp",

    // Tekerlek kutusu (sahne icindeki kare alan). Rim ayni kutuda cizilir,
    // disk rim'in ic deligine oturacak sekilde wheelScale ile kuculur.
    wheelLeft: "28.977%",
    wheelTop: "9.295%",
    wheelWidth: "41.818%",
    wheelHeight: "74.304%",
    wheelCx: 49.28,
    wheelCy: 49.92,
    wheelScale: 0.72,

    // Hub gorseli, wheel kutusunun yuzdesi olarak merkeze oturur.
    hubWidthPct: 22,

    pointerLeft: "45.6%",
    pointerTop: "0%",
    pointerWidth: "8.5%",
    pointerHeight: "12.5%",

    buttonLeft: "36%",
    buttonTop: "82.5%",
    buttonWidth: "28%",
    buttonHeight: "18.2%",
  },
  mobile: {
    backgroundSrc: "/wheel-assets/mobile/png/mediamarkt-background.webp",
    wheelSrc: "/wheel-assets/mobile/png/mediamarkt-wheel.webp",
    rimSrc: "/wheel-assets/mobile/png/mediamarkt-rim.webp",
    pointerSrc: "/wheel-assets/mobile/png/mediamarkt-pointer.webp",
    buttonSrc: "/wheel-assets/mobile/png/mediamarkt-button.webp",
    centerHubSrc: "/wheel-assets/mobile/png/mediamarkt-hub.webp",

    wheelLeft: "11.2306%",
    wheelTop: "22.226%",
    wheelWidth: "77.433%",
    wheelHeight: "43.579%",
    wheelCx: 49.92,
    wheelCy: 49.92,
    wheelScale: 0.72,

    hubWidthPct: 22,

    pointerLeft: "42.5%",
    pointerTop: "16.8%",
    pointerWidth: "15%",
    pointerHeight: "7.5%",

    buttonLeft: "19%",
    buttonTop: "81.5%",
    buttonWidth: "62%",
    buttonHeight: "11.7%",
  },
};

export function AlbertHeijnWheel({ layout, rotation, spinning, disabled, onSpin, onSpinEnd }: Props) {
  const scene = layout.scene;
  const assets = WHEEL_ASSETS[layout.sceneKey];

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{
        overflow: "hidden",
        overflowX: "hidden",
        overflowY: "hidden",
        clipPath: "inset(0 0 0 0)",
        WebkitClipPath: "inset(0 0 0 0)",
        clip: "rect(0px, auto, auto, 0px)",
      }}
    >
      <div
        className="relative flex h-full w-full items-center justify-center overflow-hidden"
        style={{
          // ⭐⭐⭐ KALICI FIX: padding 16px SILINDI (eskiden etrafinda 16px bosluk vardi, kenarlarda dis siyah görünüyordu)
          padding: "0px",
          boxSizing: "border-box",
          contain: "layout paint size",
          transform: "translateZ(0)",
          overflow: "hidden",
          overflowX: "hidden",
          overflowY: "hidden",
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            // ⭐⭐⭐ KALICI FIX (ASPECT RATIO KORU + OBJECT-COVER GIBI):
            // Aspect ratio sahnenin (market + cark + buton) GENISLIK/YUKSEKLIK oranı sabit.
            // Ekrana sığdırırken ORAN KORUNMALIDIR (yoksa cark, buton, pointer konumlari bozulur).
            // - 1. adim: sahnenin ORIJINAL aspect ratio'sunu SABITLE:
            aspectRatio: scene.aspectRatio,
            // - 2. adim: EN AZINDAN 100vw/100vh (kucukse buyut, ekranda bosluk kalmasın):
            minWidth: "100%",
            minHeight: "100%",
            // - 3. adim: Hicbir zaman ekran buyuklugunden (100% w/h) kucuk olmasın (tam kaplasın):
            width: "auto",
            height: "auto",
            // ⭐ OBJECT-COVER GIBI DAVRAS:
            //   aspect ratio = w/h ise:
            //   Eger ekran genisligi > oran (daha yatay ekran):  height=100% → width = height * oran → genislikten tasan KESILIR.
            //   Eger ekran yuksekligi > oran (daha dikey ekran): width=100% → height = width / oran → yukseklikten tasan KESILIR.
            //   Sonuc: SAHNE TUM EKRANI KAPLAR (kenarlarda siyah bosluk KALMAZ) ama ASPECT RATIO BOZULMAZ (icindeki % konumlar CALISIR).
            //   Flex container (L124) items-center justify-center ile tasan kisimlar ORTALANIR → CENTER & COVER davranisi.
            contain: "layout paint size",
            transform: "translateZ(0)",
            WebkitTransform: "translateZ(0)",
            overflow: "hidden",
            overflowX: "hidden",
            overflowY: "hidden",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundRepeat: "no-repeat",
          }}
        >
          {/* 1. BACKGROUND */}
          <img
            src={assets.backgroundSrc}
            alt={layout.sceneKey === "desktop" ? "Desktop Gluecksrad Hintergrund" : "Mobiles Gluecksrad Hintergrund"}
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full select-none object-fill"
            draggable={false}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            style={{
              transform: "translateZ(0)",
              WebkitTransform: "translateZ(0)",
              backfaceVisibility: "hidden",
              imageRendering: "auto",
            }}
          />

          {/* 2. ROTATING WHEEL */}
          <div
            className="pointer-events-none absolute z-[2] will-change-transform"
            style={{
              left: assets.wheelLeft,
              top: assets.wheelTop,
              width: assets.wheelWidth,
              height: assets.wheelHeight,
              transformOrigin: `${assets.wheelCx}% ${assets.wheelCy}%`,
              transform: `translate3d(0,0,0) rotate(${rotation}deg) scale(${assets.wheelScale})`,
              WebkitTransform: `translate3d(0,0,0) rotate(${rotation}deg)`,
              // ⭐ NEW ZELLAND (eski proje) ile BIRBIR AYNI spin hissi:
              //   - Toplam sure: 5000ms (5 saniye)
              //   - Tam tur: MIN_FULL_SPINS=6 (wheel-client.tsx icinde)
              //   - Easing: cubic-bezier(.12,.8,.18,1): ilk 12% hafif ivme (0.8 max
              //     hiz), sonra 18% kontrol (lineer akis), son 40% dogal yavaslama.
              //   - Sonuc: kullanıcı her segmenti GOREBILIR, nerede duracagini anlar
              //     (eski AUD 20 saniye 8 tur cok hizli akip segmentler secilemiyordu)
              transition: spinning
                ? "transform 5000ms cubic-bezier(.12,.8,.18,1)"
                : "none",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              imageRendering: "auto",
              contain: "layout paint size",
            }}
            onTransitionEnd={onSpinEnd}
          >
            <img
              src={assets.wheelSrc}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="h-full w-full select-none object-fill"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              style={{
                transform: "translate3d(0,0,0)",
                WebkitTransform: "translate3d(0,0,0)",
                backfaceVisibility: "hidden",
                imageRendering: "auto",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* 3. STATIC RIM (BULB RING — DOES NOT ROTATE) */}
          <img
            src={assets.rimSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute z-[3] select-none object-fill"
            loading="eager"
            decoding="async"
            style={{
              left: assets.wheelLeft,
              top: assets.wheelTop,
              width: assets.wheelWidth,
              height: assets.wheelHeight,
              transform: "translate3d(0,0,0)",
              WebkitTransform: "translate3d(0,0,0)",
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              imageRendering: "auto",
              contain: "layout paint size",
            }}
          />

          {/* 4. STATIC CENTER HUB (PERFECTLY CENTERED OVER WHEEL) */}
          <div
            className="pointer-events-none absolute z-[4]"
            style={{
              left: assets.wheelLeft,
              top: assets.wheelTop,
              width: assets.wheelWidth,
              height: assets.wheelHeight,
            }}
          >
            <img
              src={assets.centerHubSrc}
              alt=""
              aria-hidden="true"
              draggable={false}
              className="absolute select-none object-contain"
              loading="eager"
              decoding="async"
              style={{
                left: `${assets.wheelCx}%`,
                top: `${assets.wheelCy}%`,
                transform: `translate(-50%, -50%) scale(${assets.wheelScale})`,
                width: `${assets.hubWidthPct}%`,
                height: `${assets.hubWidthPct}%`,
              }}
            />
          </div>

          {/* 5. STATIC POINTER (AYNI GPU KATMANI) */}
          <img
            src={assets.pointerSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            className="pointer-events-none absolute z-[5] select-none object-fill"
            loading="eager"
            decoding="async"
            style={{
              left: assets.pointerLeft,
              top: assets.pointerTop,
              width: assets.pointerWidth,
              height: assets.pointerHeight,
              transform: "translate3d(0,0,0)",
              WebkitTransform: "translate3d(0,0,0)",
              backfaceVisibility: "hidden",
              imageRendering: "auto",
              contain: "layout paint size",
            }}
          />

          {/* 6. BUTTON HIGHLIGHT GLOW */}
          <div
            className={`pointer-events-none absolute z-[6] transition-all duration-300 ${spinning ? "bg-white/10 shadow-[0_0_36px_rgba(255,255,255,0.28)]" : "bg-transparent"}`}
            style={{
              left: assets.buttonLeft,
              top: assets.buttonTop,
              width: assets.buttonWidth,
              height: assets.buttonHeight,
              borderRadius: "100px",
              transform: "translateZ(0)",
              backfaceVisibility: "hidden",
            }}
          />

          {/* 7. STATIC BUTTON ART */}
          <img
            src={assets.buttonSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`pointer-events-none absolute z-[7] select-none transition-transform duration-200 object-fill ${disabled ? "opacity-90" : "opacity-100"}`}
            loading="eager"
            decoding="async"
            style={{
              left: assets.buttonLeft,
              top: assets.buttonTop,
              width: assets.buttonWidth,
              height: assets.buttonHeight,
              transform: "translate3d(0,0,0)",
              WebkitTransform: "translate3d(0,0,0)",
              backfaceVisibility: "hidden",
              imageRendering: "auto",
              contain: "layout paint size",
            }}
          />

          {/* CLICKABLE HIT AREA */}
          <button
            type="button"
            onClick={onSpin}
            disabled={disabled}
            aria-label="Gluecksrad drehen"
            className="absolute z-[8] bg-transparent focus:outline-none focus-visible:ring-4 focus-visible:ring-white/80 disabled:cursor-not-allowed"
            style={{
              left: assets.buttonLeft,
              top: assets.buttonTop,
              width: assets.buttonWidth,
              height: assets.buttonHeight,
              touchAction: "manipulation",
              borderRadius: "100px",
              transform: "translateZ(0)",
            }}
          >
            <span className="sr-only">{spinning ? "Dreht" : "Jetzt drehen"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
