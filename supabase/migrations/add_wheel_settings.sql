ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS wheel_settings JSONB DEFAULT '{}'::jsonb;
