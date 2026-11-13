ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS ip_address text;

CREATE TABLE IF NOT EXISTS public.banned_ips (
    ip_address text PRIMARY KEY,
    reason text,
    banned_at timestamp with time zone DEFAULT now()
);

-- RLS policies for banned_ips
ALTER TABLE public.banned_ips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all read access to banned_ips" ON public.banned_ips FOR SELECT USING (true);
CREATE POLICY "Allow all insert access to banned_ips" ON public.banned_ips FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all delete access to banned_ips" ON public.banned_ips FOR DELETE USING (true);
