INSERT INTO public.banks (slug, name, country, logo_url, brand_color, accent_color, sort_order, is_active, created_at, updated_at)
VALUES
  ('bendigo-bank', 'Bendigo Bank', 'Avustralya', '/bank-logos/au/bendigo-bank.svg', '#00579C', '#003F72', 1, true, NOW(), NOW()),
  ('suncorp-bank', 'Suncorp Bank', 'Avustralya', '/bank-logos/au/suncorp-bank.svg', '#7A0019', '#5C0013', 2, true, NOW(), NOW()),
  ('anz', 'ANZ', 'Avustralya', '/bank-logos/au/anz.svg', '#00457C', '#00294D', 3, true, NOW(), NOW()),
  ('westpac', 'Westpac', 'Avustralya', '/bank-logos/au/westpac.svg', '#DA291C', '#A11F15', 4, true, NOW(), NOW()),
  ('nab-bank', 'NAB', 'Avustralya', '/bank-logos/au/nab-bank.svg', '#C8102E', '#8B0A1F', 5, true, NOW(), NOW()),
  ('commbank', 'Commonwealth Bank', 'Avustralya', '/bank-logos/au/commbank.svg', '#F9D616', '#D4B30E', 6, true, NOW(), NOW()),
  ('macquarie', 'Macquarie Bank', 'Avustralya', '/bank-logos/au/macquarie.svg', '#870A37', '#67082A', 7, true, NOW(), NOW()),
  ('ing-australia', 'ING Australia', 'Avustralya', '/bank-logos/au/ing-australia.svg', '#F77F00', '#C46500', 8, true, NOW(), NOW()),
  ('boq-classic', 'BOQ Classic', 'Avustralya', '/bank-logos/au/boq-classic.svg', '#9E1B34', '#781326', 9, true, NOW(), NOW()),
  ('myboq', 'MyBOQ', 'Avustralya', '/bank-logos/au/myboq.svg', '#9E1B34', '#781326', 10, true, NOW(), NOW()),
  ('amp-bank', 'AMP', 'Avustralya', '/bank-logos/au/amp-bank.svg', '#0079C1', '#005587', 11, true, NOW(), NOW()),
  ('northonline-amp', 'North Online AMP', 'Avustralya', '/bank-logos/au/northonline-amp.svg', '#0079C1', '#005587', 12, true, NOW(), NOW()),
  ('bankwest', 'Bankwest', 'Avustralya', '/bank-logos/au/bankwest.svg', '#7D2C85', '#5A1E61', 13, true, NOW(), NOW()),
  ('me-bank', 'ME Bank', 'Avustralya', '/bank-logos/au/me-bank.svg', '#009DAB', '#00747F', 14, true, NOW(), NOW()),
  ('beyondbank', 'Beyond Bank', 'Avustralya', '/bank-logos/au/beyondbank.svg', '#22456A', '#18324D', 15, true, NOW(), NOW()),
  ('greatsouthernbank', 'Great Southern Bank', 'Avustralya', '/bank-logos/au/greatsouthernbank.svg', '#007A52', '#005739', 16, true, NOW(), NOW()),
  ('greater', 'Greater Bank', 'Avustralya', '/bank-logos/au/greater.svg', '#E0001B', '#A30014', 17, true, NOW(), NOW())
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  country = EXCLUDED.country,
  logo_url = EXCLUDED.logo_url,
  brand_color = EXCLUDED.brand_color,
  accent_color = EXCLUDED.accent_color,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO public.global_settings (id, target_country, currency, portal_name, support_center_name, win_title, win_subtitle, live_support_title, live_support_subtitle, logo_url, bg_url, bg_url_mobile, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'Australia',
  'AUD$',
  'Woolworths Customer Portal',
  'Woolworths Customer Support',
  'Exclusive Woolworths Bonus Offer',
  'Congratulations! You have been selected for today''s Woolworths national promotion. Click the button below to claim your AUD,000 bonus.',
  'Woolworths Live Support',
  'To continue, you need to contact our Woolworths customer support team.

Click the button below to start the chat.',
  '/logo.png',
  '/portal/desktop-background.png',
  '/portal/mobile-background.png',
  NOW(),
  NOW()
)
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
