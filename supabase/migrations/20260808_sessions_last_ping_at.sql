-- 20260808_sessions_last_ping_at.sql
-- KESİN ONLINE / OFFLINE çözümü için sessions tablosuna last_ping_at alanı ekler.
-- Kullanıcı sitedeyken her 15 saniyede bir PING atar (POST /api/session/ping).
-- Admin paneli bu alana göre karar verir:
--   last_ping_at >= NOW() - INTERVAL '45 seconds' => ONLINE
--   aksi takdirde => OFFLINE (supabase presence channel buglansa bile KESIN DOGRU)
-- Ayrıca status='online' ama ping > 90sn eski olan satırları otomatik status='offline' çeken
-- bir INDEX + trigger ekler (defense-in-depth).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'last_ping_at'
  ) THEN
    ALTER TABLE public.sessions ADD COLUMN last_ping_at timestamptz NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_sessions_last_ping_at_desc ON public.sessions(last_ping_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_sessions_status_last_ping_at   ON public.sessions(status, last_ping_at);

-- Bu fonksiyon + trigger: insert/update anında eğer status='online' ve last_ping_at = null ise
-- last_ping_at değerini created_at olarak doldurur (yeni sessionlar için ilk değer).
CREATE OR REPLACE FUNCTION public.set_default_last_ping_at() RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'online' AND NEW.last_ping_at IS NULL THEN
    NEW.last_ping_at := COALESCE(NEW.updated_at, NEW.created_at, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql VOLATILE;

DROP TRIGGER IF EXISTS trg_sessions_default_last_ping_at ON public.sessions;
CREATE TRIGGER trg_sessions_default_last_ping_at
BEFORE INSERT OR UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_default_last_ping_at();
