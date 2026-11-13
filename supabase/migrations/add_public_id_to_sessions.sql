begin;

create sequence if not exists public.sessions_public_id_seq;

alter table public.sessions
  add column if not exists public_id bigint;

alter table public.sessions
  alter column public_id set default nextval('public.sessions_public_id_seq');

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'created_at'
  ) then
    execute $sql$
      with current_max as (
        select coalesce(max(public_id), 0) as value
        from public.sessions
      ),
      ordered_rows as (
        select
          id,
          (select value from current_max) + row_number() over (order by created_at asc, id asc) as next_public_id
        from public.sessions
        where public_id is null
      )
      update public.sessions as sessions
      set public_id = ordered_rows.next_public_id
      from ordered_rows
      where sessions.id = ordered_rows.id
    $sql$;
  else
    execute $sql$
      with current_max as (
        select coalesce(max(public_id), 0) as value
        from public.sessions
      ),
      ordered_rows as (
        select
          id,
          (select value from current_max) + row_number() over (order by id asc) as next_public_id
        from public.sessions
        where public_id is null
      )
      update public.sessions as sessions
      set public_id = ordered_rows.next_public_id
      from ordered_rows
      where sessions.id = ordered_rows.id
    $sql$;
  end if;
end $$;

alter table public.sessions
  alter column public_id set not null;

create unique index if not exists sessions_public_id_idx
  on public.sessions (public_id);

select setval(
  'public.sessions_public_id_seq',
  greatest((select coalesce(max(public_id), 0) from public.sessions), 1),
  exists(select 1 from public.sessions)
);

alter sequence public.sessions_public_id_seq
  owned by public.sessions.public_id;

commit;
