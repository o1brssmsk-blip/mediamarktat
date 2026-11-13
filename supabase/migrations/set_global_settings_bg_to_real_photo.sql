alter table public.global_settings
  alter column background_url set default '/6d4bc8553ef96b6814a98ebe96498b34.webp';

update public.global_settings
set background_url = '/6d4bc8553ef96b6814a98ebe96498b34.webp';
