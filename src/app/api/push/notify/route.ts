import { NextRequest, NextResponse } from "next/server";
import { sendPushToAll } from "@/lib/push-server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Yeni ziyaretci / onemli event'lerde admin cihazlarina web-push gonderir.
// Client tarafi bunu fire-and-forget cagirir (sonuc beklenmez).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = typeof body?.title === "string" ? body.title.slice(0, 120) : "";
    if (!title) return NextResponse.json({ error: "title required" }, { status: 400 });

    const sent = await sendPushToAll({
      title,
      body: typeof body?.body === "string" ? body.body.slice(0, 300) : "",
      url: typeof body?.url === "string" ? body.url.slice(0, 200) : "/admin1",
      tag: typeof body?.tag === "string" ? body.tag.slice(0, 120) : undefined,
    });
    return NextResponse.json({ ok: true, sent });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
