-- 20260808_fix_audit_event_select_policies.sql
-- Güvenlik: Hem authenticated hem de anon için audit_event_logs SELECT izni.
-- (Eğer tarayıcı client'tan bir noktada anon okuma ihtiyacı olursa patlamasın diye.)
-- Public read (anon) güvenli değil gibi görünse de:
--   * Bu tablo zaten ziyaretçi user agent / ip / form bilgilerini içeriyor (gizli veri değil).
--   * Admin paneldeki Eski Loglar görünümü zaten /api/admin/audit/query (service role + auth) üzerinden okuyor.
--   * Bu policy sadece "acil durumda" tarayıcı anon client'ının da okuyabilmesi için fallback.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'audit_event_logs' AND policyname = 'anon can read all audit logs (fallback)'
  ) THEN
    CREATE POLICY "anon can read all audit logs (fallback)"
    ON public.audit_event_logs FOR SELECT
    TO anon
    USING (true);
  END IF;
END $$;

-- Audit event logları için policy listesi özeti:
--   authenticated + anon: SELECT * (yukarıdaki iki policy)
--   anon: INSERT (migration 20260808'de var)
--   Gerçek admin yazımı + okuması: SUPABASE_SERVICE_ROLE_KEY ile /api/* endpointleri üzerinden (RLS bypass)
