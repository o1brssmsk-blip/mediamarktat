create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.sessions(id) on delete cascade,
  sender text not null check (sender in ('user', 'admin')),
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "chat_messages_anon_all"
on public.chat_messages
for all
to anon
using (true)
with check (true);

create policy "chat_messages_auth_all"
on public.chat_messages
for all
to authenticated
using (true)
with check (true);

alter publication supabase_realtime add table public.chat_messages;