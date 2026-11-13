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
