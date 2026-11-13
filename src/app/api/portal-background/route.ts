import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const PORTAL_ASSET_DIR = join("C:", "Users", "XENOTIC", "Desktop", "paknsave-nz-campaign-package", "assets", "portal");

const VARIANT_FILES = {
  desktop: "desktop-background.png",
  mobile: "mobile-background.png",
} as const;

export async function GET(request: NextRequest) {
  const variant = request.nextUrl.searchParams.get("variant") === "mobile" ? "mobile" : "desktop";
  const filename = VARIANT_FILES[variant];

  try {
    const file = await readFile(join(PORTAL_ASSET_DIR, filename));
    return new Response(file, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Failed to read portal background:", error);
    return new Response("Portal background not found", { status: 404 });
  }
}
