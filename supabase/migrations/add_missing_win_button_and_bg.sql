ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS win_button text DEFAULT 'Bonus claimen',
ADD COLUMN IF NOT EXISTS bg_url text DEFAULT '/6d4bc8553ef96b6814a98ebe96498b34.webp';

-- Şema önbelleğini (schema cache) yenileyelim ki API hemen bu sütunları tanısın
NOTIFY pgrst, 'reload schema';
