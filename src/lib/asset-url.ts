import { isRemoteUrl } from "./bank-logo-constants";

export function optimizeSupabaseImageUrl(
  source?: string | null,
  opts?: { width?: number; quality?: number; format?: "origin" | "webp" | "avif" },
) {
  if (!source) return "";

  if (isRemoteUrl(source)) {
    try {
      const url = new URL(source);
      const marker = "/storage/v1/object/public/";
      const markerIndex = url.pathname.indexOf(marker);

      if (markerIndex === -1) {
        return "";
      }

      const assetPath = url.pathname.slice(markerIndex + marker.length);
      url.pathname = `/storage/v1/render/image/public/${assetPath}`;

      if (opts?.width) {
        url.searchParams.set("width", String(Math.round(opts.width)));
      }
      if (opts?.quality) {
        url.searchParams.set("quality", String(Math.round(opts.quality)));
      }
      if (opts?.format && opts.format !== "origin") {
        url.searchParams.set("format", opts.format);
      }

      return url.toString();
    } catch {
      return "";
    }
  }

  if (source.startsWith("/")) {
    // Yerel asset'ler WebP'ye cevirildi (public/*.webp) — hiz icin webp sun.
    // Orijinal dosyalar da duruyor; webp yoksa tarayici zaten fallback'te degil
    // ama tum png/jpg public dosyalari convert edildi, guvenli.
    return source.replace(/\.(png|jpe?g)(\?.*)?$/i, ".webp$1");
  }

  return "";
}
