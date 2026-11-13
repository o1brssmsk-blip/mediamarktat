import type { Metadata } from "next";
import { headers } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  brandify,
  DEFAULT_CAMPAIGN_NAME,
  getCampaignNameFromSettings,
} from "@/lib/brand";

const FALLBACK_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.tesco.ie";

async function getSiteOrigin(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto = h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
    if (host) return `${proto}://${host}`;
  } catch {
    /* headers erisilemezse env fallback */
  }
  return FALLBACK_SITE_URL;
}

async function getShareSettings(): Promise<{ ogImageUrl: string | null; campaignName: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return { ogImageUrl: null, campaignName: DEFAULT_CAMPAIGN_NAME };
    const { data } = await supabase
      .from("global_settings")
      .select("og_image_url, wheel_settings")
      .limit(1)
      .single();
    return {
      ogImageUrl:
        typeof data?.og_image_url === "string" && data.og_image_url.trim() !== ""
          ? data.og_image_url.trim()
          : null,
      campaignName: getCampaignNameFromSettings(data),
    };
  } catch {
    return { ogImageUrl: null, campaignName: DEFAULT_CAMPAIGN_NAME };
  }
}

function resolveOgImage(ogImageUrl: string | null, origin: string): string {
  if (ogImageUrl) {
    // Relative path ise ayni domain uzerinden absolutize et
    if (ogImageUrl.startsWith("/")) return `${origin}${ogImageUrl}`;
    return ogImageUrl;
  }
  return `${origin}/og-image.jpg`;
}

export async function getCampaignNameServer(): Promise<string> {
  const { campaignName } = await getShareSettings();
  return campaignName;
}

export async function buildShareMetadata(opts: {
  title: string;
  description: string;
  canonical: string;
}): Promise<Metadata> {
  const origin = await getSiteOrigin();
  const { ogImageUrl, campaignName } = await getShareSettings();
  const imageUrl = resolveOgImage(ogImageUrl, origin);
  const imageType = /\.png($|\?)/i.test(imageUrl)
    ? "image/png"
    : /\.webp($|\?)/i.test(imageUrl)
      ? "image/webp"
      : "image/jpeg";

  const title = brandify(opts.title, campaignName);
  const description = brandify(opts.description, campaignName);
  const siteName = brandify("Tesco — Spin to Win", campaignName);

  return {
    title,
    description,
    icons: { icon: "/favicon.ico" },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    metadataBase: new URL(origin),
    alternates: { canonical: opts.canonical },
    openGraph: {
      type: "website",
      determiner: "auto",
      locale: "en_IE",
      alternateLocale: ["en_US", "en_GB"],
      url: origin,
      siteName,
      title,
      description,
      images: [
        {
          url: imageUrl,
          secureUrl: imageUrl,
          alt: siteName,
          type: imageType,
          width: 1200,
          height: 1200,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      site: origin,
      title,
      description,
      images: [imageUrl],
    },
    appLinks: {
      web: {
        url: origin,
        should_fallback: true,
      },
    },
  };
}
