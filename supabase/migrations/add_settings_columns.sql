ALTER TABLE public.global_settings
ADD COLUMN IF NOT EXISTS code_title text DEFAULT 'Welkom!',
ADD COLUMN IF NOT EXISTS code_subtitle text DEFAULT 'Geben Sie den Teilnahme-Code ein, den {partner} Ihnen gesendet hat, um Ihre Belohnung zu erhalten.',
ADD COLUMN IF NOT EXISTS code_button text DEFAULT 'Code Bestätigen',
ADD COLUMN IF NOT EXISTS live_support_title text DEFAULT 'Live-Support',
ADD COLUMN IF NOT EXISTS live_support_subtitle text DEFAULT 'Om verder te gaan, dien je contact op te nemen met onze klantenservice.\n\nKlik op de onderstaande knop om het gesprek te starten.',
ADD COLUMN IF NOT EXISTS live_support_button text DEFAULT 'Chat starten',
ADD COLUMN IF NOT EXISTS profile_title_small text DEFAULT 'Gewinnbestätigung',
ADD COLUMN IF NOT EXISTS profile_title_main text DEFAULT 'Ihr Prämienvolumen',
ADD COLUMN IF NOT EXISTS profile_subtitle text DEFAULT 'Bevestig je gegevens voor verdere verwerking.',
ADD COLUMN IF NOT EXISTS profile_button text DEFAULT 'Weiter';
