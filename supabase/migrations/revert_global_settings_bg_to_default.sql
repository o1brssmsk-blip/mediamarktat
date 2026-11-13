alter table public.global_settings
  alter column background_url set default '/albert-heijn-bg.svg';

update public.global_settings
set background_url = '/albert-heijn-bg.svg';
