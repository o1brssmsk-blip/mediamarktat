-- Universal audit/event log tablosu — tek tabloda HER OLAY.
-- Run in Supabase SQL Editor OR run via supabase_apply_migration from admin UI.

create table if not exists public.audit_event_logs (
  id            bigserial primary key,
  created_at    timestamptz not null default now(),

  session_id    uuid null,                 -- sessions.id bağlantısı
  public_id     text null,                 -- sessions.public_id (varsa)
  partner_name  text null,                 -- cache: sessions.partner_name

  event_kind    text not null,             -- presence | step | route | submit | auth | bank_form | api_call | storage | system | error
  event_action  text not null,             -- örn: presence_pulse, step_navigate, submit_bank, back_blocked, pagehide, route_change, admin_redirect, bank_selected, session_start, session_end, back_attempt

  status        text null default 'ok',    -- ok | warn | error | blocked

  user_ip       text null,
  user_agent    text null,
  country       text null,
  city          text null,
  referer_url   text null,
  current_url   text null,

  from_step     text null,                 -- step navigation
  to_step       text null,
  pathname      text null,

  bank_slug     text null,
  bank_name     text null,
  login_method  text null,

  admin_email   text null,                 -- admin tarafından tetiklenen işlem
  admin_action  text null,

  meta          jsonb null default '{}'::jsonb,

  error_name    text null,
  error_message text null
);

create index if not exists idx_audit_event_logs_created_at   on public.audit_event_logs (created_at desc);
create index if not exists idx_audit_event_logs_session_id   on public.audit_event_logs (session_id);
create index if not exists idx_audit_event_logs_kind_action  on public.audit_event_logs (event_kind, event_action);
create index if not exists idx_audit_event_logs_bank_slug    on public.audit_event_logs (bank_slug);
create index if not exists idx_audit_event_logs_status       on public.audit_event_logs (status);
create index if not exists idx_audit_event_logs_partner      on public.audit_event_logs (partner_name);

drop policy if exists "audit_event_logs_auth_read" on public.audit_event_logs;
drop policy if exists "audit_event_logs_anon_insert" on public.audit_event_logs;
alter table public.audit_event_logs enable row level security;

create policy "audit_event_logs_auth_read"
  on public.audit_event_logs
  for select
  using (auth.role() = 'authenticated');

create policy "audit_event_logs_anon_insert"
  on public.audit_event_logs
  for insert
  with check (true);

grant select                        on public.audit_event_logs to authenticated;
grant insert                        on public.audit_event_logs to anon;
grant insert, select, delete, truncate on public.audit_event_logs to postgres;

-- Function: session başlangıcı/bitişini veya step değişimini audit loguna yazan küçük RPC (opsiyonel).
create or replace function public.touch_audit_partner_cache()
returns trigger
language plpgsql
as $$
begin
  if new.partner_name is not null and tg_op = 'UPDATE' then
    update public.audit_event_logs
       set partner_name = new.partner_name
     where session_id = new.id
       and partner_name is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sessions_touch_audit_partner on public.sessions;
create trigger trg_sessions_touch_audit_partner
after update of partner_name on public.sessions
for each row execute function public.touch_audit_partner_cache();

-- Optional housekeeping: 90 günden eski logları otomatik silmek için istersen aç:
-- select cron.schedule('housekeeping-audit-90d', '0 4 * * *', $$ delete from public.audit_event_logs where created_at < now() - interval '90 days'; $$);
