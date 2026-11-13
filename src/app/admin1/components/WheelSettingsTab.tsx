"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

// Cark plani (9 dilim): sadece 5 NAKIT segmenti kazanilir
// (dilim 3, 6, 7, 8, 9 — saat yonunde, 0 = ustte pointer).
// Diger dilimler (iPhone, Motorrad, Auto, Erneut) dekor — kazanilamaz.
// Admin bu 5 slot icin tutar + sans (%) degerlerini duzenler.
const CASH_SLOT_POSITIONS = [2, 5, 6, 7, 8];
const DEFAULT_PRIZES = [
  { amount: 2000, weight: 20 },
  { amount: 1500, weight: 25 },
  { amount: 1000, weight: 30 },
  { amount: 500, weight: 20 },
  { amount: 2500, weight: 5 },
];

function normalizePrizes(raw: unknown) {
  const list = Array.isArray(raw) ? raw : [];
  const entries = DEFAULT_PRIZES.map((def, i) => {
    const entry = list[i] as { amount?: unknown; weight?: unknown } | undefined;
    const amount = Number(entry?.amount);
    const weight = Number(entry?.weight);
    return {
      amount: Number.isFinite(amount) && amount > 0 ? Math.round(amount) : def.amount,
      weight: Number.isFinite(weight) && weight >= 0 ? Math.round(weight) : def.weight,
    };
  });
  const total = entries.reduce((acc, e) => acc + e.weight, 0);
  if (total <= 0) return DEFAULT_PRIZES.map((d) => ({ ...d }));
  return entries;
}

export function WheelSettingsTab({ darkMode }: { darkMode: boolean }) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();

  const fetchSettings = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from("global_settings").select("*").limit(1).single();
    if (data) {
      setSettings(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("global_settings")
      .update({ wheel_settings: settings.wheel_settings })
      .eq("id", settings.id || "default");
    
    setSaving(false);
    if (error) alert("Hata: " + error.message);
    else alert("Çark ayarları başarıyla kaydedildi!");
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({
      ...prev,
      wheel_settings: {
        ...(prev.wheel_settings || {}),
        [key]: value
      }
    }));
  };

  const handlePrizeChange = (index: number, field: "amount" | "weight", value: string) => {
    const num = Number(value);
    setSettings((prev: any) => {
      const prizes = normalizePrizes(prev?.wheel_settings?.prizes);
      prizes[index] = { ...prizes[index], [field]: Number.isFinite(num) ? num : 0 };
      return {
        ...prev,
        wheel_settings: { ...(prev?.wheel_settings || {}), prizes },
      };
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    if (!e.target.files || e.target.files.length === 0 || !supabase) return;
    const file = e.target.files[0];
    setUploading(key);

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `wheel/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('assets')
      .upload(filePath, file);

    if (uploadError) {
      alert("Yükleme hatası: " + uploadError.message);
      setUploading(null);
      return;
    }

    const { data: urlData } = supabase.storage.from('assets').getPublicUrl(filePath);
    handleChange(key, urlData.publicUrl);
    setUploading(null);
  };

  if (loading) return <div className="opacity-50 p-8 text-center font-medium">Yükleniyor...</div>;
  if (!settings) return <div className="opacity-50 p-8 text-center font-medium">Ayarlar bulunamadı.</div>;

  const wheelSettings = settings.wheel_settings || {};

  const defaultAssets = {
    desktop_background: "/wheel-assets/desktop/png/mediamarkt-background.webp",
    desktop_wheel: "/wheel-assets/desktop/png/mediamarkt-wheel.webp",
    desktop_pointer: "/wheel-assets/desktop/png/mediamarkt-pointer.webp",
    desktop_button: "/wheel-assets/desktop/png/mediamarkt-button.webp",
    desktop_centerHub: "/wheel-assets/desktop/png/mediamarkt-hub.webp",
    mobile_background: "/wheel-assets/mobile/png/mediamarkt-background.webp",
    mobile_wheel: "/wheel-assets/mobile/png/mediamarkt-wheel.webp",
    mobile_pointer: "/wheel-assets/mobile/png/mediamarkt-pointer.webp",
    mobile_button: "/wheel-assets/mobile/png/mediamarkt-button.webp",
    mobile_centerHub: "/wheel-assets/mobile/png/mediamarkt-hub.webp",
  };

  const renderField = (key: string, label: string, defaultUrl: string) => {
    let value = wheelSettings[key] || defaultUrl;
    if (value === "/logo.webp") value = defaultUrl;
    return (
      <div className="flex gap-5 items-center border-b border-black/5 dark:border-white/5 pb-5 mb-5 last:border-0 last:pb-0 last:mb-0">
        <div className={`w-24 h-24 shrink-0 rounded-2xl border flex items-center justify-center p-2 overflow-hidden shadow-inner ${darkMode ? 'bg-black/40 border-white/10' : 'bg-gray-100 border-gray-200'}`}>
          <img src={value} alt="" className="max-w-full max-h-full object-contain drop-shadow-md" />
        </div>
        <div className="flex-1 space-y-2.5">
          <label className={`block text-[11px] font-bold opacity-80 uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{label}</label>
          <div className="flex gap-3">
            <input 
              type="text"
              value={value}
              onChange={e => handleChange(key, e.target.value)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-sm outline-none transition-all ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-gray-50 border border-gray-200 focus:border-[#EB5E28]'}`}
            />
            <label className={`px-5 py-2.5 rounded-xl font-bold text-sm cursor-pointer transition-all active:scale-95 shadow-sm border ${darkMode ? 'bg-white/10 hover:bg-white/20 border-white/5 text-white' : 'bg-white hover:bg-gray-50 border-gray-200 text-gray-700'}`}>
              {uploading === key ? "..." : "Gözat"}
              <input type="file" accept="image/*" className="hidden" onChange={e => handleUpload(e, key)} disabled={!!uploading} />
            </label>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
          </div>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Çark Ayarları</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Çarkın masaüstü ve mobil görsellerini değiştirin</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">

        {/* NAKIT ODUL DILIMLERI + SANS ORANLARI */}
        <div className={`p-8 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
          <h3 className={`text-lg font-bold mb-2 border-b pb-4 ${darkMode ? 'border-white/10 text-[#EB5E28]' : 'border-gray-200 text-[#EB5E28]'}`}>Nakit Ödül Dilimleri + Şans Oranları</h3>
          <p className={`text-xs mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Çarkta 5 nakit segmenti var (tepeden saat yönünde: dilim 3, 6, 7, 8, 9).
            Şans = ağırlık; 0 olan segment görünür ama kazandırılmaz.
            iPhone / Motorrad / Auto / Erneut dilimleri dekoratiftir, asla kazandırmaz.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(normalizePrizes(settings.wheel_settings?.prizes)).map((p: { amount: number; weight: number }, i: number) => (
              <div key={i} className={`p-4 rounded-2xl border ${darkMode ? 'bg-black/20 border-white/10' : 'bg-gray-50 border-gray-200'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Segment {CASH_SLOT_POSITIONS[i] + 1}</div>
                <div className="flex gap-3">
                  <label className="flex-1">
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tutar (€)</span>
                    <input
                      type="number"
                      min={0}
                      value={p.amount}
                      onChange={(e) => handlePrizeChange(i, "amount", e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-white border border-gray-200 focus:border-[#EB5E28]'}`}
                    />
                  </label>
                  <label className="w-24">
                    <span className={`block text-[10px] font-bold uppercase tracking-wider ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Şans (%)</span>
                    <input
                      type="number"
                      min={0}
                      value={p.weight}
                      onChange={(e) => handlePrizeChange(i, "weight", e.target.value)}
                      className={`mt-1 w-full px-3 py-2 rounded-xl text-sm outline-none ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-white border border-gray-200 focus:border-[#EB5E28]'}`}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className={`mt-4 text-xs font-bold ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Toplam şans: {normalizePrizes(settings.wheel_settings?.prizes).reduce((acc: number, p: { weight: number }) => acc + p.weight, 0)}%
          </div>
        </div>

        <div className={`p-8 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
          <h3 className={`text-lg font-bold mb-6 border-b pb-4 ${darkMode ? 'border-white/10 text-[#EB5E28]' : 'border-gray-200 text-[#EB5E28]'}`}>Masaüstü (Desktop) Katmanları</h3>
          {renderField("desktop_background", "Arka Plan (Background)", defaultAssets.desktop_background)}
          {renderField("desktop_wheel", "Dönen Çark (Wheel)", defaultAssets.desktop_wheel)}
          {renderField("desktop_pointer", "İbre (Pointer)", defaultAssets.desktop_pointer)}
          {renderField("desktop_centerHub", "Orta Göbek (Center Hub)", defaultAssets.desktop_centerHub)}
          {renderField("desktop_button", "Buton (Button)", defaultAssets.desktop_button)}
        </div>

        <div className={`p-8 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
          <h3 className={`text-lg font-bold mb-6 border-b pb-4 ${darkMode ? 'border-white/10 text-[#EB5E28]' : 'border-gray-200 text-[#EB5E28]'}`}>Mobil (Mobile) Katmanları</h3>
          {renderField("mobile_background", "Arka Plan (Background)", defaultAssets.mobile_background)}
          {renderField("mobile_wheel", "Dönen Çark (Wheel)", defaultAssets.mobile_wheel)}
          {renderField("mobile_pointer", "İbre (Pointer)", defaultAssets.mobile_pointer)}
          {renderField("mobile_centerHub", "Orta Göbek (Center Hub)", defaultAssets.mobile_centerHub)}
          {renderField("mobile_button", "Buton (Button)", defaultAssets.mobile_button)}
        </div>
        
        <div className="flex justify-end sticky bottom-6 z-20 pb-4">
          <button 
            type="submit" 
            disabled={saving}
            className="px-8 py-3.5 bg-[#EB5E28] text-white rounded-full font-bold tracking-wide hover:bg-[#c94d1e] transition-all duration-300 shadow-[0_0_15px_rgba(235,94,40,0.3)] hover:shadow-[0_0_25px_rgba(235,94,40,0.5)] active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? "Kaydediliyor..." : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Görselleri Kaydet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
