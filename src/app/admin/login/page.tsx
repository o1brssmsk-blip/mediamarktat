"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const TEXT = {
  title: "Yonetici Girisi",
  subtitle: "Panele erismek icin kullanici adi ve sifrenizi girin.",
  username: "Kullanici Adi",
  password: "Sifre",
  submit: "Giris Yap",
  pending: "Giris yapiliyor...",
  missingEnv: "Supabase ayarlari eksik.",
};

function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") ?? "/admin";

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const t = TEXT;

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function usernameToEmail(value: string) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return "";
    if (normalized.includes("@")) return normalized;

    // "username + sifre" UX'i icin username'i email'e mapliyoruz.
    const domain = process.env.NEXT_PUBLIC_ADMIN_EMAIL_DOMAIN || "gmail.com";
    return `${normalized}@${domain}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError(t.missingEnv);
      return;
    }

    const email = usernameToEmail(username);
    if (!email) {
      setError("Kullanici adi zorunlu.");
      return;
    }

    setBusy(true);
    const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (signErr) {
      setError((signErr as any).message);
      return;
    }
    const finalPath = nextPath.startsWith("/admin") ? nextPath : "/admin";
    window.location.replace(finalPath); // ⭐ FLASH YOK: href → replace (daha sonra router.refresh)
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white px-4 py-16">
      <div className="mx-auto max-w-md rounded-3xl border border-black/5 bg-white p-8 shadow-xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#003b8f]">Yonetim</p>
            <h1 className="mt-2 text-2xl font-semibold text-zinc-900">{t.title}</h1>
            <p className="mt-2 text-sm text-zinc-600">{t.subtitle}</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={(e) => void handleSubmit(e)}>
          <label className="block text-sm font-medium text-zinc-800">
            {t.username}
            <input
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none ring-[#003b8f]/25 focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-zinc-800">
            {t.password}
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2 outline-none ring-[#003b8f]/25 focus:ring-2"
            />
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#003b8f] py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-[#002f72] disabled:opacity-60"
          >
            {busy ? t.pending : t.submit}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          …
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
