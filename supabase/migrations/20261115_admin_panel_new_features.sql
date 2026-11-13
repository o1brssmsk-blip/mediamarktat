-- ============================================================================
-- ADMIN PANELI YENI SURUM — TEK SEFERLIK DELTA SQL
-- Supabase SQL Editor'e yapistir -> Run. Idempotent (tekrar calistirilabilir).
-- Icerik: push_subscriptions + site control/OG kolonlari + sessions delta kolonlari
-- ============================================================================

-- 1) PUSH SUBSCRIPTIONS (admin push bildirim abonelikleri)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint TEXT PRIMARY KEY,
  keys JSONB NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_service_all" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_service_all" ON public.push_subscriptions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2) SITE KONTROLU + OG KOLONLARI (global_settings)
ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS site_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS site_control JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT;

-- 3) SESSIONS DELTA KOLONLARI (cop log / gecmis log / online takip / public_id)
ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS public_id BIGINT,
  ADD COLUMN IF NOT EXISTS ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- public_id sequence (yoksa olustur, varsa dokunma)
CREATE SEQUENCE IF NOT EXISTS public.sessions_public_id_seq;
ALTER TABLE public.sessions
  ALTER COLUMN public_id SET DEFAULT nextval('public.sessions_public_id_seq');

-- mevcut kayitlarda public_id NULL ise doldur
UPDATE public.sessions SET public_id = nextval('public.sessions_public_id_seq')
WHERE public_id IS NULL;

-- 4) REALTIME — yeni tablo publication'a ekle (varsa hata verir, guard'li)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'push_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'sessions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
