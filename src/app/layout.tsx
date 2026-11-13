import type { Metadata } from "next";
import { RootClientShell } from "@/components/RootClientShell";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import "./globals.css";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.PUBLIC_SITE_URL ||
  "https://localhost:3000";

const DEFAULT_TITLE = "MediaMarkt Prämien";
const DEFAULT_DESCRIPTION =
  "Exklusive MediaMarkt Praemienaktion! Versuche dein Glueck und gewinne exklusive Preise.";

// OG meta: admin panelindeki global_settings'ten dinamik (og_image_url + portal_name).
// 30 sn cache — admin ayari degistirince bir sure sonra crawler'lar yeni degeri gorur.
let cache: { at: number; title: string; description: string; image: string } | null = null;

async function getOgSettings() {
  if (cache && Date.now() - cache.at < 30_000) return cache;
  const fallback = {
    at: Date.now(),
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    image: `${SITE_URL}/og-image.jpg`,
  };
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return fallback;
    const { data } = await supabase
      .from("global_settings")
      .select("og_image_url, portal_name, support_center_name")
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
        ? (bgData.bg_url.startsWith("http") ? bgData.bg_url.trim() : `${SITE_URL}${bgData.bg_url.trim()}`)
        : `${SITE_URL}/og-image.jpg`;
    const image =
      typeof data?.og_image_url === "string" && data.og_image_url.trim() !== ""
        ? (data.og_image_url.startsWith("http") ? data.og_image_url.trim() : `${SITE_URL}${data.og_image_url.trim()}`)
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
  return {
    metadataBase: new URL(SITE_URL),
    title: og.title,
    description: og.description,
    openGraph: {
      type: "website",
      url: SITE_URL,
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
