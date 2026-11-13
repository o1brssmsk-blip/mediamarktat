-- RLS (Row-Level Security) Politikalarını Tamamen Permissive (İzin Verici) Hale Getirme
-- Bu işlem, admin panelinden ayarları kaydederken alınan "new row violates row-level security policy" hatasını kalıcı olarak çözer.

ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Eski olası politikaları temizle
DROP POLICY IF EXISTS "Allow public read access on global_settings" ON public.global_settings;
DROP POLICY IF EXISTS "Allow all for authenticated users on global_settings" ON public.global_settings;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.global_settings;
DROP POLICY IF EXISTS "Enable insert for all users" ON public.global_settings;
DROP POLICY IF EXISTS "Enable update for all users" ON public.global_settings;
DROP POLICY IF EXISTS "Enable delete for all users" ON public.global_settings;

-- Yeni ve kapsayıcı politikaları oluştur (Hem okuma hem yazma/güncelleme işlemleri için)
CREATE POLICY "Enable read access for all users" ON public.global_settings FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON public.global_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON public.global_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Enable delete for all users" ON public.global_settings FOR DELETE USING (true);

-- API önbelleğini tazele
NOTIFY pgrst, 'reload schema';
