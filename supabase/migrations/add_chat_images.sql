alter table public.chat_messages add column if not exists image_url text;

insert into storage.buckets (id, name, public) 
values ('chat_images', 'chat_images', true) 
on conflict (id) do nothing;

drop policy if exists "chat_images_select" on storage.objects;
create policy "chat_images_select" on storage.objects for select using ( bucket_id = 'chat_images' );

drop policy if exists "chat_images_insert" on storage.objects;
create policy "chat_images_insert" on storage.objects for insert with check ( bucket_id = 'chat_images' );