-- ⭐ Admin SMS Belirsiz Hane (unknown digits) icin 2 duzeltme:
--   1) sessions tablosuna sms_mode kolonu EKLE (fixed / unknown). Default fixed (eski sessionlar bozulmasin).
--   2) sms_digits CHECK constraintini DEGISTIR: eski kural sms_digits 4..12 arasi idi.
--      Bilinmeyen hane modunda sms_digits = 0 da kaydedilebilmeli (admin belirsiz hane sectiginde).
--      Yeni kural: sms_digits = 0 OR (sms_digits >= 4 AND sms_digits <= 12)

ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS sms_mode text DEFAULT 'fixed'::text;

ALTER TABLE public.sessions
DROP CONSTRAINT IF EXISTS sessions_sms_digits_check;

ALTER TABLE public.sessions
ADD CONSTRAINT sessions_sms_digits_check
CHECK ((sms_digits = 0) OR ((sms_digits >= 4) AND (sms_digits <= 12)))
NOT VALID;
