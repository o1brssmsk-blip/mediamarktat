import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ACTIVE_SESSION_COOKIE } from "@/lib/session-constants";
import { stepToPath } from "@/lib/session-routes";
import type { SessionStep } from "@/types/session";

export const RESUME_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 saat icinde ayni cihaz/IP -> kaldigi yerden devam

export type ResumableSession = {
  id: string;
  public_id: number | string | null;
  current_step: string | null;
};

// Kullanicinin kaldigi yerden devam edebilecegi session'i bulur.
// Sirayla: (1) cihaz cookie'si, (2) ayni IP'den son 24 saatin en son gizli olmayan session'i.
// allowIpFallback=false -> sadece cookie (olusturulan linklerde IP resume kullanilmaz).
export async function findResumableSession(allowIpFallback = true): Promise<ResumableSession | null> {
  const cutoff = new Date(Date.now() - RESUME_WINDOW_MS).toISOString();
  const notHidden = "is_hidden.is.false,is_hidden.is.null";
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return null;

    // 1) Cookie'deki session uuid -> ayni cihazdan tekrar giris
    try {
      const cookieStore = await cookies();
      const cookieSessionId = cookieStore.get(ACTIVE_SESSION_COOKIE)?.value?.trim();
      if (cookieSessionId) {
        const { data } = await supabase
          .from("sessions")
          .select("id, public_id, current_step")
          .eq("id", cookieSessionId)
          .or(notHidden)
          .gte("created_at", cutoff)
          .maybeSingle();
        if (data?.id) return data as ResumableSession;
      }
    } catch {
      /* cookie okunamazsa IP fallback'e dus */
    }

    // 2) IP bazli: son 24 saatte ayni IP'den en son gizli olmayan session
    // (olusturulan linklerle gelenlerde devre disi - her link yeni session)
    if (!allowIpFallback) return null;
    const h = await headers();
    let ip = h.get("x-forwarded-for") || h.get("x-real-ip") || "";
    if (ip.includes(",")) ip = ip.split(",")[0].trim();
    if (!ip) return null;

    const { data } = await supabase
      .from("sessions")
      .select("id, public_id, current_step")
      .eq("ip_address", ip)
      .or(notHidden)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data?.id ? data : null) as ResumableSession | null;
  } catch {
    return null;
  }
}

// Session parametresi OLMAYAN girisler icin (herhangi bir domain/sayfa):
// 1) Cihazin veya IP'nin aktif session'i varsa -> kaldigi adima yonlendir
// 2) Hic session yoksa -> ana domain'e gonder (orada yeni session acilir)
// ?session= tasiyan olusturulmus linklerde bu fonksiyon hicbir sey yapmaz.
export async function resumeOrRedirectHome(searchParams?: { session?: string | null }): Promise<void> {
  const hasSession =
    !!searchParams?.session && String(searchParams.session).trim() !== "";
  if (hasSession) return;

  const resumed = await findResumableSession(true);
  if (resumed) {
    const routeId =
      resumed.public_id != null && String(resumed.public_id).trim() !== ""
        ? String(resumed.public_id)
        : resumed.id;
    redirect(
      stepToPath((resumed.current_step || "win") as SessionStep, resumed.id, routeId),
    );
  }
  redirect("/");
}
