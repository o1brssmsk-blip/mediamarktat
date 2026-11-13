-- ================================================================
-- 2026-08-10: sessions.public_id icin auto-increment sequence bagla
-- (linkleri kisa tutmak icin UUID yerine 7-8 haneli sayisal ID kullan)
-- ================================================================

-- 1. Sequence olustur (idempotent)
CREATE SEQUENCE IF NOT EXISTS public.sessions_public_id_seq;

-- 2. Mevcut sessions tablosunda public_id NULL olanlari doldur
--    (Sequence'in su anki degerini max(publice_id number) dan yukari cek)
DO $$
DECLARE
  max_pid BIGINT;
BEGIN
  -- public_id icindeki en buyuk sayisal degeri bul
  SELECT COALESCE(MAX(public_id::BIGINT), 0) INTO max_pid
  FROM public.sessions
  WHERE public_id ~ '^[0-9]+$';

  -- Sequence'i bundan buyuk bir degere ayarla
  PERFORM setval('public.sessions_public_id_seq', max_pid + 1, false);
END $$;

-- 3. NULL public_id olan tum satirlara sequence'den yeni deger ata
UPDATE public.sessions
SET public_id = nextval('public.sessions_public_id_seq')::TEXT
WHERE public_id IS NULL OR public_id = '';

-- 4. Simdi public_id DEFAULT'ini sequence nextval olarak bagla
ALTER TABLE public.sessions
  ALTER COLUMN public_id SET DEFAULT nextval('public.sessions_public_id_seq')::TEXT;

-- 5. Sequence'i sessions tablosunun public_id sutununa bagla (temizlik icin)
ALTER SEQUENCE public.sessions_public_id_seq OWNED BY public.sessions.public_id;

-- 6. public_id UNIQUE index zaten var mi kontrol et yoksa ekle
CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_id_idx
  ON public.sessions (public_id);
