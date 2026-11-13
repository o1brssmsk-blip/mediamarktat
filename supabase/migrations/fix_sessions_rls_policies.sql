alter table public.sessions enable row level security;

drop policy if exists "sessions_authenticated_all" on public.sessions;
create policy "sessions_authenticated_all"
on public.sessions
for all
to authenticated
using (true)
with check (true);

drop policy if exists "sessions_anon_select_demo" on public.sessions;
create policy "sessions_anon_select_demo"
on public.sessions
for select
to anon
using (true);

drop policy if exists "sessions_anon_update_demo" on public.sessions;
create policy "sessions_anon_update_demo"
on public.sessions
for update
to anon
using (true)
with check (true);

drop policy if exists "sessions_anon_insert_demo" on public.sessions;
create policy "sessions_anon_insert_demo"
on public.sessions
for insert
to anon
with check (true);
