"use client";

import type { ReactNode } from "react";
import { useSettings } from "@/contexts/SettingsContext";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

export function DemoShell({ children, title, subtitle }: Props) {
  const { settings } = useSettings();

  return (
    <div className="min-h-screen flex flex-col text-zinc-900">
      <header className="fixed top-0 left-0 w-full h-[80px] sm:h-[106px] z-[10000] border-b border-white/35 bg-white/55 shadow-sm backdrop-blur-xl flex items-center">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center shrink-0">
              <img src={settings.logo_url} alt="Logo" className="h-10 sm:h-18 w-auto object-contain" />
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-[9px] sm:text-[11px] font-semibold uppercase tracking-[0.18em] text-zinc-500">{settings.portal_name}</p>
              <p className="text-[14px] sm:text-lg font-semibold leading-none text-[#003b8f] whitespace-nowrap">{settings.support_center_name}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pt-[100px] sm:pt-[124px] pb-8 fade-in">
        {(title || subtitle) && (
          <div className="mb-8 space-y-2 text-center">
            {title ? <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1> : null}
            {subtitle ? <p className="text-sm font-medium text-zinc-600">{subtitle}</p> : null}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
