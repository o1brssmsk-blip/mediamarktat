-- ================================================================
-- 2026-08-10: sessions.public_id'yi TEMIZDEN 1'den baslat
-- (mevcut tum public_id'leri 1, 2, 3, ... diye yeniden numaralandir
--  ve sequence'i bundan sonraki insertler icin dogru yerden baslat)
-- ================================================================

-- 1. Once eski sequence'i sifirla — yeniden olustur
DROP SEQUENCE IF EXISTS public.sessions_public_id_seq CASCADE;
CREATE SEQUENCE public.sessions_public_id_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

-- 2. (Eski public_id'leri UNIQUE olacak sekilde 1'den itibaren ata)
--    row_number() over created_at sirasiyla — eski kayitlar kucuk ID alsin
DO $$
DECLARE
  r RECORD;
  counter BIGINT := 0;
BEGIN
  FOR r IN SELECT id FROM public.sessions ORDER BY created_at ASC, id ASC LOOP
    counter := counter + 1;
    UPDATE public.sessions
    SET public_id = counter::TEXT
    WHERE id = r.id;
  END LOOP;

  -- 3. Sequence'i counter + 1'den baslat (bir sonraki insert devam etsin)
  IF counter IS NULL OR counter < 1 THEN
    PERFORM setval('public.sessions_public_id_seq', 1, false);
  ELSE
    PERFORM setval('public.sessions_public_id_seq', counter + 1, false);
  END IF;
END $$;

-- 4. Sutunun DEFAULT degerini sequence bagla
ALTER TABLE public.sessions
  ALTER COLUMN public_id SET DEFAULT nextval('public.sessions_public_id_seq')::TEXT;

-- 5. Ownership + index (idempotent)
ALTER SEQUENCE public.sessions_public_id_seq OWNED BY public.sessions.public_id;
CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_id_idx
  ON public.sessions (public_id);

-- 6. GUVENLIK: public_id'nin sayi oldugunu garanti eden CHECK constraint ekle
--    (ileride yanlislikla UUID yazilmasini onler)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_public_id_numeric_check'
  ) THEN
    ALTER TABLE public.sessions
      ADD CONSTRAINT sessions_public_id_numeric_check
      CHECK (public_id ~ '^[0-9]+$') NOT VALID;
  END IF;
END $$;
