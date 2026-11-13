ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS target_country TEXT DEFAULT 'Hollanda';

ALTER TABLE public.banks
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Hollanda';