ALTER TABLE public.sessions
ADD COLUMN IF NOT EXISTS sms_custom_text text DEFAULT NULL;