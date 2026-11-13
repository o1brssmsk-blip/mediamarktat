-- =====================================================================
-- 2026-10-10  SITE KONTROL + OG IMAGE (Woolworths AU)
-- site_enabled: admin'den site ac/kapa (kapaliyken admin disi 503)
-- site_control (jsonb): block_bots, allowed_ips[], allowed_countries[],
--                       geo_redirect_url
-- og_image_url: sosyal medya paylasim onizleme gorseli
-- Idempotent — tekrar calistirilabilir.
-- =====================================================================

ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS site_enabled boolean DEFAULT true;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS site_control jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS og_image_url text;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS portal_name text;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS support_center_name text;

UPDATE public.global_settings SET site_enabled = true WHERE site_enabled IS NULL;
UPDATE public.global_settings SET site_control = '{}'::jsonb WHERE site_control IS NULL;

NOTIFY pgrst, 'reload schema';
