-- 1. `id` sütununu UUID türüne güvenli bir şekilde dönüştürün ve varsayılan değeri ayarlayın.
-- Eğer tabloda zaten 'default' metni bulunan hatalı kayıtlar varsa bunları otomatik olarak geçerli UUID'lere dönüştürür.
ALTER TABLE public.global_settings 
ALTER COLUMN id DROP DEFAULT;

ALTER TABLE public.global_settings 
ALTER COLUMN id SET DATA TYPE UUID USING (
  CASE 
    WHEN id = 'default' THEN gen_random_uuid()
    ELSE id::uuid 
  END
);

ALTER TABLE public.global_settings 
ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- 2. ORM/API önbelleğini tazeleyin ki yeni varsayılan değerler anında geçerli olsun
NOTIFY pgrst, 'reload schema';
