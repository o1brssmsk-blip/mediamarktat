-- Chat_messages tablosunda şema uyuşmazlığı giderilmesi:
-- 20260809000000_woolworths_au_full_bootstrap.sql tabloyu role + image_urls[] (array) ile oluşturur
-- Eski add_chat_messages.sql / add_chat_images.sql ise sender + image_url (tek) kullanır
-- Kod çoğunlukla sender / image_url bekliyor, bu yüzden "Could not find the 'image_url' column"
-- hatası PostgREST schema cache tarafından veriliyor.
-- Aşağıdaki değişiklikler HER İKİ şema versiyonu için çalışır (forward + backward compat).

alter table public.chat_messages add column if not exists sender text check (sender in ('user', 'admin'));
alter table public.chat_messages add column if not exists image_url text;
alter table public.chat_messages add column if not exists role text;
alter table public.chat_messages add column if not exists image_urls text[] default '{}'::text[];

-- Eski 'role' kolonundan yeni 'sender' kolonunu doldur (eğer role=user/admin ise)
update public.chat_messages
   set sender = case when lower(role) = 'user' then 'user' when lower(role) = 'admin' then 'admin' else sender end
 where sender is null and role is not null;

-- Eski 'sender' kolonundan yeni 'role' kolonunu doldur (ters yön, yeni kod eski şemayı bulursa)
update public.chat_messages
   set role = sender
 where role is null and sender is not null;

-- image_urls array[1]'den image_url tek değerini doldur
update public.chat_messages
   set image_url = image_urls[1]
 where image_url is null
   and image_urls is not null
   and coalesce(array_length(image_urls, 1), 0) > 0;

-- Tek image_url'den image_urls[] array doldur (ters yön)
update public.chat_messages
   set image_urls = array_append(coalesce(image_urls, '{}'::text[]), image_url)
 where (image_urls is null or coalesce(array_length(image_urls, 1), 0) = 0)
   and image_url is not null;

-- Supabase PostgREST schema cache yenile (refresh_postgrest_schema_cache.sql tekrar)
notify pgrst, 'reload schema';
