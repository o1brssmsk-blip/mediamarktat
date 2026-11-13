import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  return new NextResponse(
    JSON.stringify({
      status: "ok",
      service: "mediamarkt-at-campaign",
      ts: Date.now(),
      nodeEnv: process.env.NODE_ENV || "unknown",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control":
          "no-store, no-cache, max-age=0, must-revalidate, proxy-revalidate",
        "x-health-check": "pass",
      },
    }
  );
}
