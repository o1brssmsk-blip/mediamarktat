-- 20260808_audit_event_session_id_text.sql
-- session_id ve public_id UUID kısıtlamasını KALDIR.
-- Bazı eski session id'ler UUID formatı DEĞİL (24 haneli hex / 32 haneli tire siz vb).
-- Bu yüzden backfill INSERT'leri "invalid input syntax for type uuid" hatasıyla düşüyordu.
-- Bu migration ile sütun tipleri UUID -> TEXT olarak değişir; index ve RLS değişmez.

DO $$
BEGIN
  -- session_id
  BEGIN
    ALTER TABLE public.audit_event_logs ALTER COLUMN session_id TYPE text USING session_id::text;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- public_id
  BEGIN
    ALTER TABLE public.audit_event_logs ALTER COLUMN public_id TYPE text USING public_id::text;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- Eski UUID indexleri varsa siliyoruz, text indexlerini tekrar oluşturuyoruz (performans)
DROP INDEX IF EXISTS idx_audit_event_logs_session_id;
DROP INDEX IF EXISTS idx_audit_event_logs_public_id;
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_session_id ON public.audit_event_logs(session_id text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_public_id  ON public.audit_event_logs(public_id  text_pattern_ops);
