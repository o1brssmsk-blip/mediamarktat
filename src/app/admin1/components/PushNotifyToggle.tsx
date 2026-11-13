"use client";

import { useEffect, useState } from "react";

const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BJbDOEdrqlGB05nxWOuc-7AM72XU1ePZwaLBa78dEVxupeKqsL_pvsbeH1CJUTyTa0xwwchdK6SxEOaGLrgut7k";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

type State = "unsupported" | "off" | "on" | "denied";

export function PushNotifyToggle({ darkMode }: { darkMode: boolean }) {
  const [state, setState] = useState<State>("off");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "on" : "off"))
      .catch(() => {});
  }, []);

  const enable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setState(perm === "denied" ? "denied" : "off");
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      setState("on");
    } catch {
      setState("off");
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("off");
    } catch {
      /* sessiz */
    } finally {
      setBusy(false);
    }
  };

  if (state === "unsupported") return null;

  const on = state === "on";
  return (
    <button
      onClick={() => void (on ? disable() : enable())}
      disabled={busy || state === "denied"}
      title={state === "denied" ? "Bildirim izni tarayicida engellenmis" : "Yeni ziyaretci bildirimleri"}
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
        on
          ? "bg-green-500/15 text-green-500 border border-green-500/30"
          : darkMode
            ? "bg-white/10 text-gray-300 border border-white/10 hover:bg-white/20"
            : "bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
      } ${state === "denied" ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {busy ? "..." : on ? "Bildirimler Açık" : state === "denied" ? "Bildirim Engelli" : "Bildirimleri Aç"}
    </button>
  );
}
