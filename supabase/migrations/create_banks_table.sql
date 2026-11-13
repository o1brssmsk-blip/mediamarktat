CREATE TABLE IF NOT EXISTS public.banks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  brand_color TEXT,
  accent_color TEXT,
  logo_file TEXT,
  domain TEXT,
  design_config JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access on banks" ON public.banks
  FOR SELECT USING (true);

-- Allow all operations for authenticated users (admin logic can be enforced at the app layer, or we can allow public insert/update/delete for the demo context since the whole app is an admin demo)
CREATE POLICY "Allow public insert on banks" ON public.banks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on banks" ON public.banks FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on banks" ON public.banks FOR DELETE USING (true);

-- Seed initial banks data from our existing static list
INSERT INTO public.banks (slug, name, brand_color, accent_color, logo_file, domain)
VALUES 
  ('abn-amro', 'ABN AMRO', '#0a8f6a', '#f6c500', '/bank-logos/abn-amro.svg', 'abnamro.nl'),
  ('adyen', 'Adyen', '#0abf53', '#089942', '/bank-logos/adyen.svg', 'adyen.com'),
  ('asn-bank', 'ASN Bank', '#8a1538', '#5b0f25', '/bank-logos/asn-bank.svg', 'asnbank.nl'),
  ('asn-bank-vh-regiobank', 'ASN Bank vh RegioBank', '#1f6f43', '#14502f', '/bank-logos/asn-bank-vh-regiobank.svg', 'regiobank.nl'),
  ('asn-bank-voorheen-blgwonen', 'ASN Bank voorheen BLGwonen', '#e64a38', '#d03d2d', '/bank-logos/asn-bank-voorheen-blgwonen.png', 'asnbank.nl'),
  ('asn-bank-voorheen-sns', 'ASN Bank voorheen SNS', '#5f259f', '#421970', '/bank-logos/asn-bank-voorheen-sns.svg', 'snsbank.nl'),
  ('bunq', 'bunq', '#0f172a', '#1e293b', '/bank-logos/bunq.svg', 'bunq.com'),
  ('buut', 'BUUT', '#333333', '#111111', '/bank-logos/buut.svg', 'buut.nl'),
  ('finom', 'Finom', '#f33a6b', '#c22e56', '/bank-logos/finom.svg', 'finom.co'),
  ('ing', 'ING', '#ff6200', '#d94c00', '/bank-logos/ing.svg', 'ing.nl'),
  ('knab', 'Knab', '#11998e', '#0c6f67', '/bank-logos/knab.svg', 'knab.nl'),
  ('mollie', 'Mollie', '#000000', '#333333', '/bank-logos/mollie.svg', 'mollie.com'),
  ('n26', 'N26', '#36a18b', '#2b816f', '/bank-logos/n26.svg', 'n26.com'),
  ('nationale-nederlanden', 'Nationale-Nederlanden', '#ea650d', '#bb510a', '/bank-logos/nationale-nederlanden.svg', 'nn.nl'),
  ('rabobank', 'Rabobank', '#003d8f', '#f57c00', '/bank-logos/rabobank.svg', 'rabobank.nl'),
  ('revolut', 'Revolut', '#000000', '#333333', '/bank-logos/revolut.svg', 'revolut.com'),
  ('triodos-bank', 'Triodos Bank', '#6b3fa0', '#4b2c70', '/bank-logos/triodos-bank.svg', 'triodos.nl'),
  ('van-lanschot-kempen', 'Van Lanschot Kempen', '#173463', '#0f2241', '/bank-logos/van-lanschot-kempen.svg', 'vanlanschotkempen.com'),
  ('yoursafe', 'Yoursafe', '#0a81c5', '#08679e', '/bank-logos/yoursafe.svg', 'yoursafe.com')
ON CONFLICT (slug) DO NOTHING;
