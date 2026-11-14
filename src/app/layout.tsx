import type { Metadata } from "next";
import { headers } from "next/headers";
import { RootClientShell } from "@/components/RootClientShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import "./globals.css";

// Site origin ONCE gelen istegin host header'indan cozulur (domain degisse bile
// og:image hep dogru domaini gosterir); header yoksa env'e duser.
const FALLBACK_SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  "https://localhost:3000";

async function getSiteOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto =
      h.get("x-forwarded-proto") ||
      (host?.includes("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {
    /* headers erisilemezse env fallback */
  }
  return FALLBACK_SITE_URL;
}

const DEFAULT_TITLE = "MediaMarkt Prämien";
const DEFAULT_DESCRIPTION =
  "Exklusive MediaMarkt Praemienaktion! Versuche dein Glueck und gewinne exklusive Preise.";

// OG meta: admin panelindeki global_settings'ten dinamik (og_image_url + portal_name).
// 30 sn cache — admin ayari degistirince bir sure sonra crawler'lar yeni degeri gorur.
let cache: { at: number; title: string; description: string; image: string } | null = null;

async function getOgSettings() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  const origin = await getSiteOrigin();
  const fallback = {
    at: Date.now(),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: `${origin}/og-image.jpg`,
  };
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return fallback;
    const { data } = await supabase
      .from("global_settings")
      .select("og_image_url, portal_name")
      .limit(1)
      .maybeSingle();
    const portal =
      typeof data?.portal_name === "string" && data.portal_name.trim() !== ""
        ? data.portal_name.trim()
        : "MediaMarkt";
    const { data: bgData } = await supabase
      .from("global_settings")
      .select("bg_url")
      .limit(1)
      .maybeSingle();
    const bgImage =
      typeof bgData?.bg_url === "string" && bgData.bg_url.trim() !== ""
        ? (bgData.bg_url.startsWith("http") ? bgData.bg_url.trim() : `${origin}${bgData.bg_url.trim()}`)
        : `${origin}/og-image.jpg`;
    const image =
      typeof data?.og_image_url === "string" && data.og_image_url.trim() !== ""
        ? (data.og_image_url.startsWith("http") ? data.og_image_url.trim() : `${origin}${data.og_image_url.trim()}`)
        : bgImage;
    cache = {
      at: Date.now(),
      title: `${portal} Rewards`,
      description: `${portal} special rewards campaign! Try your luck and win exclusive prizes.`,
      image,
    };
    return cache;
  } catch {
    return fallback;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const og = await getOgSettings();
  const origin = await getSiteOrigin();
  return {
    metadataBase: new URL(origin),
    title: og.title,
    description: og.description,
    openGraph: {
      type: "website",
      url: origin,
      siteName: og.title,
      title: og.title,
      description: og.description,
      images: [{ url: og.image, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: og.title,
      description: og.description,
      images: [og.image],
    },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="ah-theme">
        <RootClientShell>{children}</RootClientShell>
      </body>
    </html>
  );
}
