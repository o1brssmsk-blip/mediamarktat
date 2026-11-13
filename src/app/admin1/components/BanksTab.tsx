"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BankConfig } from "@/lib/banks-db";
import { BankDesignConfig, DEFAULT_DESIGN_CONFIG, BlockType, BankElement } from "@/lib/bank-design-schema";
import { normalizeDesignLogoStyles } from "@/lib/visual-tree-logo";
import { countriesMatch, normalizeCountryName } from "@/lib/country-utils";

export function BanksTab({ darkMode }: { darkMode: boolean }) {
  const supabase = createBrowserSupabaseClient();
  const [banks, setBanks] = useState<BankConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBank, setEditingBank] = useState<BankConfig | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationWarnings, setValidationWarnings] = useState<Array<{ elementId: string; issue: string; suggestion: string }>>([]);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [showAutoRedirectModal, setShowAutoRedirectModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>("Avustralya");
  const [loadingBankDetailsSlug, setLoadingBankDetailsSlug] = useState<string | null>(null);
  
  // History for Undo/Redo
  const [designHistory, setDesignHistory] = useState<BankDesignConfig[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    fetchBanks();
  }, []);

  function setEditingBankWithHistory(b: BankConfig | null, recordHistory = true) {
    setEditingBank(b);
    if (b && b.design && recordHistory) {
      const newHistory = designHistory.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(b.design)));
      setDesignHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }

  function undoDesign() {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      if (editingBank) {
        setEditingBank({ ...editingBank, design: JSON.parse(JSON.stringify(designHistory[newIndex])) });
      }
    }
  }

  function redoDesign() {
    if (historyIndex < designHistory.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      if (editingBank) {
        setEditingBank({ ...editingBank, design: JSON.parse(JSON.stringify(designHistory[newIndex])) });
      }
    }
  }

  async function fetchBanks() {
    setLoading(true);
    try {
      const res = await fetch(`/api/banks?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      const data = await res.json();
      if (data.banks) {
        // A-Z Sıralama
        const sorted = data.banks
          .map((bank: BankConfig) => ({
            ...bank,
            country: normalizeCountryName(bank.country),
          }))
          .sort((a: BankConfig, b: BankConfig) => a.name.localeCompare(b.name));
        setBanks(sorted);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleSelectBank(bank: BankConfig) {
    setIsNew(false);
    setDesignHistory([]);
    setHistoryIndex(-1);
    setValidationWarnings([]);
    setReferenceImageUrl(null);
    setEditingBankWithHistory(bank, false);
    setLoadingBankDetailsSlug(bank.slug);

    try {
      const res = await fetch(`/api/banks?slug=${encodeURIComponent(bank.slug)}&t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (!res.ok) {
        throw new Error("Banka detaylari yuklenemedi");
      }

      const data = await res.json();
      if (data.bank) {
        setEditingBankWithHistory({
          ...bank,
          ...data.bank,
          country: normalizeCountryName(data.bank.country),
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingBankDetailsSlug(null);
    }
  }

  async function saveAll(newBanks: BankConfig[]) {
    setSaving(true);
    try {
      // Sort before saving
      const sorted = newBanks
        .map(bank => ({
          ...bank,
          country: normalizeCountryName(bank.country),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      const res = await fetch("/api/banks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banks: sorted }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Bilinmeyen hata");
      }
      setBanks(sorted);
      setEditingBank(null);
    } catch (e: any) {
      alert("Kaydedilirken hata oluştu: " + e.message);
    }
    setSaving(false);
  }

  function handleSaveBank() {
    if (!editingBank) return;
    if (!editingBank.slug || !editingBank.name) {
      alert("Slug ve İsim zorunludur!");
      return;
    }
    
    if (!confirm("Değişiklikleri kaydetmek istediğinize emin misiniz?")) {
      return;
    }
    
    const normalizedBank: BankConfig = {
      ...editingBank,
      design: normalizeDesignLogoStyles(editingBank.design, editingBank.logoFile),
    };

    let newBanks = [...banks];
    if (isNew) {
      if (newBanks.find(b => b.slug === normalizedBank.slug)) {
        alert("Bu slug zaten kullanımda!");
        return;
      }
      newBanks.push(normalizedBank);
    } else {
      newBanks = newBanks.map(b => b.slug === normalizedBank.slug ? normalizedBank : b);
    }
    
    void saveAll(newBanks);
  }

  function handleDeleteBank(slug: string) {
    if (!confirm("Bu bankayı silmek istediğinize emin misiniz?")) return;
    const newBanks = banks.filter(b => b.slug !== slug);
    void saveAll(newBanks);
  }

  async function handleReferenceImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingBank || !supabase) return;

    if (!file.type.startsWith("image/")) {
      alert("Lütfen sadece geçerli bir resim dosyası yükleyin.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Dosya boyutu çok büyük (max 5MB).");
      return;
    }

    setAiAnalyzing(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `ref-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('assets').upload(fileName, file, { upsert: true });
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage.from('assets').getPublicUrl(fileName);
      const imageUrl = publicUrlData.publicUrl;
      setReferenceImageUrl(imageUrl);
      setValidationWarnings([]);

      const res = await fetch("/api/analyze-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      if (data.design) {
        const fullDesign = {
          ...DEFAULT_DESIGN_CONFIG,
          ...data.design,
          background: data.design.background || DEFAULT_DESIGN_CONFIG.background,
          formBox: data.design.formBox || DEFAULT_DESIGN_CONFIG.formBox,
          button: data.design.button || DEFAULT_DESIGN_CONFIG.button,
          blocks: data.design.blocks || DEFAULT_DESIGN_CONFIG.blocks,
        };
        const normalizedDesign = normalizeDesignLogoStyles(fullDesign, editingBank.logoFile);
        setEditingBankWithHistory({ ...editingBank, design: normalizedDesign });
        alert("Yapay zeka tasarımı başarıyla oluşturdu!");
      }
    } catch (err: any) {
      alert("Yapay zeka analizi başarısız oldu: " + err.message);
    }
    setAiAnalyzing(false);
  }

  async function validateDesignWithAI() {
    if (!editingBank?.design?.visualTree) {
      alert("Doğrulama için önce görsel ağaç içeren bir tasarım üretin.");
      return;
    }
    if (!referenceImageUrl) {
      alert("Doğrulama için önce referans görsel yükleyin.");
      return;
    }

    setIsValidating(true);
    try {
      const res = await fetch("/api/validate-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: referenceImageUrl,
          design: editingBank.design,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Tasarım doğrulanamadı.");
      }

      const warnings = Array.isArray(data.warnings) ? data.warnings : [];
      setValidationWarnings(warnings);
      if (warnings.length === 0) {
        alert("AI doğrulaması tamamlandı. Tasarım referans görselle uyumlu.");
      }
    } catch (err: any) {
      alert("AI doğrulaması başarısız oldu: " + err.message);
    }
    setIsValidating(false);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editingBank || !supabase) return;
    if (!file.type.startsWith("image/")) {
      alert("Geçerli bir resim dosyası yükleyin.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Dosya boyutu çok büyük (max 5MB).");
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `bank-logo-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('assets').upload(fileName, file, { upsert: true });
      if (error) throw error;
      
      const { data: publicUrlData } = supabase.storage.from('assets').getPublicUrl(fileName);
      setEditingBank({ ...editingBank, logoFile: publicUrlData.publicUrl });
    } catch (err: any) {
      alert("Logo yüklenirken hata: " + err.message);
    }
    setIsUploadingLogo(false);
  }

  function updateDesign(updater: (prev: BankDesignConfig) => BankDesignConfig) {
    if (!editingBank) return;
    const currentDesign = editingBank.design || DEFAULT_DESIGN_CONFIG;
    const newDesign = updater(currentDesign);
    setEditingBankWithHistory({ ...editingBank, design: newDesign });
  }

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  function handleDragStart(e: React.DragEvent, index: number) {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent, index: number) {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === index) return;
    updateDesign(d => {
      const newBlocks = [...d.blocks];
      const [removed] = newBlocks.splice(draggedIdx, 1);
      newBlocks.splice(index, 0, removed);
      return { ...d, blocks: newBlocks };
    });
    setDraggedIdx(null);
  }

  const EUROPEAN_COUNTRIES = [
    { name: "Tümü", flag: "🌍" },
    { name: "Hollanda", flag: "🇳🇱" },
    { name: "Almanya", flag: "🇩🇪" },
    { name: "Avusturya", flag: "🇦🇹" },
    { name: "Belçika", flag: "🇧🇪" },
    { name: "İsviçre", flag: "🇨🇭" },
    { name: "Finlandiya", flag: "🇫🇮" },
    { name: "İspanya", flag: "🇪🇸" },
    { name: "İtalya", flag: "🇮🇹" },
    { name: "Fransa", flag: "🇫🇷" },
    { name: "Çekya", flag: "🇨🇿" },
    { name: "Estonya", flag: "🇪🇪" },
    { name: "Polonya", flag: "🇵🇱" },
    { name: "İsveç", flag: "🇸🇪" },
    { name: "Danimarka", flag: "🇩🇰" },
    { name: "Romanya", flag: "🇷🇴" },
    { name: "Yunanistan", flag: "🇬🇷" },
    { name: "Portekiz", flag: "🇵🇹" },
    { name: "Macaristan", flag: "🇭🇺" }
  ];

  const filteredBanks = selectedCountryFilter === "Tümü" || !selectedCountryFilter
    ? banks 
    : banks.filter(b => countriesMatch(b.country, selectedCountryFilter));

  return (
    <div className={`flex flex-col h-full rounded-3xl border shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-xl overflow-hidden ${darkMode ? 'border-white/5 bg-[#1c1c1e]/70' : 'border-[#d2d2d7]/50 bg-white/80'}`}>
      <div className={`p-4 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
        <h3 className={`text-xl font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          🏦 Banka Listesi ve Tasarımı
        </h3>
        
        <div className="flex flex-wrap items-center gap-2">
          {EUROPEAN_COUNTRIES.map(country => (
            <button
              key={country.name}
              onClick={() => setSelectedCountryFilter(country.name)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                selectedCountryFilter === country.name 
                  ? 'bg-[#EB5E28] text-white shadow-lg shadow-[#EB5E28]/30' 
                  : darkMode 
                    ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white border border-zinc-700' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <span className="mr-1">{country.flag}</span>
              {country.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row p-4 gap-6">
        {/* Sol: Banka Listesi */}
        <div className={`w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r pb-6 md:pb-0 md:pr-6 overflow-hidden max-h-[30vh] md:max-h-full ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
          <div className="flex gap-2 mb-4">
            <button 
              onClick={() => {
                setIsNew(true);
                setValidationWarnings([]);
                setReferenceImageUrl(null);
                setEditingBankWithHistory({ slug: "", name: "", brandColor: "#000000", accentColor: "#333333", logo: "", domain: "", logoFile: "", design: DEFAULT_DESIGN_CONFIG, isActive: true, country: selectedCountryFilter !== "Tümü" && selectedCountryFilter ? selectedCountryFilter : "Austria" });
              }}
              className="flex-1 rounded-2xl bg-[#EB5E28] px-3 py-3 text-xs font-bold text-white hover:bg-[#c94d1e] transition-all duration-300 shadow-[0_0_15px_rgba(235,94,40,0.3)] hover:shadow-[0_0_25px_rgba(235,94,40,0.5)] active:scale-95 flex items-center justify-center gap-1"
            >
              + Yeni Banka
            </button>
            <button 
              onClick={() => setShowAutoRedirectModal(true)}
              className={`flex-1 rounded-2xl px-3 py-3 text-xs font-bold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 ${darkMode ? 'bg-orange-600/20 border border-orange-500/30 text-orange-400 hover:bg-orange-600/30' : 'bg-orange-100 border border-orange-200 text-orange-600 hover:bg-orange-200 shadow-sm'}`}
            >
              ⏱ Bekleme
            </button>
            <button 
              onClick={() => setShowDeactivateModal(true)}
              className={`flex-1 rounded-2xl px-3 py-3 text-xs font-bold transition-all duration-300 active:scale-95 flex items-center justify-center gap-1 ${darkMode ? 'bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/30' : 'bg-red-100 border border-red-200 text-red-600 hover:bg-red-200 shadow-sm'}`}
            >
              🚫 Pasif
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? (
              <div className={`text-center py-10 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Yükleniyor...</div>
            ) : filteredBanks.length === 0 ? (
              <div className={`text-center py-10 text-sm ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>
                {selectedCountryFilter !== "Tümü" ? `${selectedCountryFilter} için banka bulunamadı.` : 'Banka bulunamadı.'}
              </div>
            ) : filteredBanks.map(b => (
              <div 
                key={b.slug}
                onClick={() => void handleSelectBank(b)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${editingBank?.slug === b.slug ? (darkMode ? 'bg-blue-900/20 border-blue-500/50' : 'bg-blue-50 border-blue-300') : (darkMode ? 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800' : 'bg-gray-50 border-gray-200 hover:bg-gray-100')}`}
              >
                <div className="size-8 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center p-1 border">
                  {b.logoFile ? <img src={b.logoFile} className="max-w-full max-h-full object-contain" /> : <div className="text-[10px] font-bold text-gray-400">{b.logo}</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-bold truncate text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {b.name}
                    {b.isActive === false && <span className="ml-2 text-[10px] text-red-500 border border-red-500 px-1 rounded">Pasif</span>}
                  </div>
                  <div className="text-xs opacity-60 truncate">{normalizeCountryName(b.country)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sağ: Düzenleyici ve Önizleme */}
        <div className="w-full flex flex-col gap-6 overflow-hidden flex-1">
          {!editingBank ? (
            <div className={`flex-1 flex flex-col items-center justify-center ${darkMode ? 'text-zinc-500' : 'text-gray-400'}`}>
              <div className="text-4xl mb-4">🎨</div>
              <p>Düzenlemek için soldan bir banka seçin veya yeni ekleyin.</p>
            </div>
          ) : (
            <>
              {/* Ayarlar Paneli */}
              <div className="w-full overflow-y-auto pr-4 space-y-6 pb-20">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <h4 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{isNew ? "Yeni Banka Oluştur" : "Bankayı Düzenle"}</h4>
                    {loadingBankDetailsSlug === editingBank.slug && (
                      <span className={`text-xs font-medium ${darkMode ? "text-zinc-400" : "text-gray-500"}`}>
                        Detaylar yukleniyor...
                      </span>
                    )}
                    
                    <div className={`flex rounded-lg overflow-hidden border ${darkMode ? 'bg-zinc-800 border-zinc-700' : 'bg-gray-100 border-gray-300'}`}>
                      <button onClick={undoDesign} disabled={historyIndex <= 0} className={`px-3 py-1.5 text-xs disabled:opacity-30 disabled:cursor-not-allowed border-r transition-colors ${darkMode ? 'text-white hover:bg-zinc-700 border-zinc-700' : 'text-gray-700 hover:bg-gray-200 border-gray-300'}`}>↩ Geri Al</button>
                      <button onClick={redoDesign} disabled={historyIndex >= designHistory.length - 1} className={`px-3 py-1.5 text-xs disabled:opacity-30 disabled:cursor-not-allowed transition-colors ${darkMode ? 'text-white hover:bg-zinc-700' : 'text-gray-700 hover:bg-gray-200'}`}>İleri Al ↪</button>
                    </div>
                  </div>
                  
                  {!isNew && (
                    <button onClick={() => handleDeleteBank(editingBank.slug)} className="text-xs text-red-500 hover:text-red-400 font-bold px-3 py-1 rounded bg-red-500/10">Bankayı Sil</button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Banka Adı</label>
                    <input type="text" className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${darkMode ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`} value={editingBank.name} onChange={e => setEditingBank({...editingBank, name: e.target.value})} />       
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Slug</label>
                    <input type="text" disabled={!isNew} className={`w-full rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-50 ${darkMode ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`} value={editingBank.slug} onChange={e => setEditingBank({...editingBank, slug: e.target.value})} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Durum</label>
                    <select className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${darkMode ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`} value={editingBank.isActive === false ? "false" : "true"} onChange={e => setEditingBank({...editingBank, isActive: e.target.value === "true"})}>
                      <option value="true">Aktif</option>
                      <option value="false">Pasif</option>
                    </select>
                  </div>
                  <div>
                    <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Ülke</label>
                    <select 
                      className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${darkMode ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`} 
                      value={normalizeCountryName(editingBank.country)} 
                      onChange={e => setEditingBank({...editingBank, country: normalizeCountryName(e.target.value)})}
                    >
                      {EUROPEAN_COUNTRIES.filter(c => c.name !== "Tümü").map(c => (
                        <option key={c.name} value={c.name}>{c.flag} {c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Logo URL (veya Dosya Yükle)</label>
                    <div className="flex gap-2">
                      <input type="text" className={`w-full rounded-lg border px-3 py-2 text-sm outline-none ${darkMode ? 'border-zinc-700 bg-zinc-900 text-white' : 'border-gray-300 bg-gray-50 text-gray-900'}`} value={editingBank.logoFile || ""} onChange={e => setEditingBank({...editingBank, logoFile: e.target.value})} placeholder="URL girin veya yanda dosya seçin" />
                      <label className="flex-shrink-0 cursor-pointer rounded-lg bg-[#EB5E28] px-3 py-2 text-sm font-bold text-white hover:bg-[#c94d1e] transition-colors flex items-center justify-center min-w-[100px]">
                        {isUploadingLogo ? "Yükleniyor..." : "Dosya Seç"}   
                        <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700">
                  <div className="flex gap-2">
                    <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 border-dashed ${aiAnalyzing ? 'border-purple-500 bg-purple-500/20' : 'border-purple-500/50 hover:bg-purple-500/10'} cursor-pointer transition-all`}>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-300">{aiAnalyzing ? "AI Üretiyor..." : "📸 Referans Yükle & Üret"}</span>
                      <input id="refImageInput" type="file" accept="image/*" className="hidden" onChange={handleReferenceImageUpload} disabled={aiAnalyzing || isValidating} />
                    </label>

                    <button
                      onClick={validateDesignWithAI}
                      disabled={aiAnalyzing || isValidating || !editingBank.design?.visualTree}
                      className="flex-1 bg-green-600/10 border-2 border-green-500/30 hover:bg-green-600/20 text-green-600 dark:text-green-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                      {isValidating ? "Doğrulanıyor..." : "✅ Tasarımı Doğrula"}
                    </button>
                  </div>
                </div>

                {/* AI KOD EDİTÖRÜ */}
                {!editingBank.design?.visualTree && (
                  <div className="space-y-4">
                    <h5 className={`font-bold border-b pb-2 ${darkMode ? 'text-white border-zinc-800' : 'text-gray-900 border-gray-200'}`}>Eski AI Kodu (HTML/Tailwind)</h5>
                    <textarea
                      className={`w-full h-40 rounded-lg border px-3 py-2 text-xs font-mono outline-none ${darkMode ? 'border-zinc-700 bg-zinc-900 text-zinc-300' : 'border-gray-300 bg-gray-50 text-gray-800'}`}
                      value={editingBank.design?.customHtml || ""}
                      onChange={e => updateDesign(d => ({...d, customHtml: e.target.value}))}
                      placeholder="<div class='min-h-screen bg-white'>...</div>"
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <h5 className={`font-bold border-b pb-2 ${darkMode ? 'text-white border-zinc-800' : 'text-gray-900 border-gray-200'}`}>Renkler ve Stiller</h5>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Arkaplan Rengi</label>
                      <input type="color" value={editingBank.design?.background?.value || "#ffffff"} onChange={e => updateDesign(d => ({...d, background: {...(d.background || {type: 'color', value: '#ffffff'}), value: e.target.value}}))} className="w-full h-8 cursor-pointer rounded border-none bg-transparent" />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Form Kutusu Arkaplanı</label>
                      <input type="color" value={editingBank.design?.formBox?.backgroundColor || "#ffffff"} onChange={e => updateDesign(d => ({...d, formBox: {...(d.formBox || {backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: 'none', padding: '20px'}), backgroundColor: e.target.value}}))} className="w-full h-8 cursor-pointer rounded border-none bg-transparent" />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Buton Rengi</label>
                      <input type="color" value={editingBank.design?.button?.backgroundColor || "#000000"} onChange={e => updateDesign(d => ({...d, button: {...(d.button || {backgroundColor: '#000000', textColor: '#ffffff', borderRadius: '8px'}), backgroundColor: e.target.value}}))} className="w-full h-8 cursor-pointer rounded border-none bg-transparent" />
                    </div>
                    <div>
                      <label className={`block text-xs font-bold mb-1 ${darkMode ? 'text-zinc-500' : 'text-gray-500'}`}>Buton Yazı Rengi</label>
                      <input type="color" value={editingBank.design?.button?.textColor || "#ffffff"} onChange={e => updateDesign(d => ({...d, button: {...(d.button || {backgroundColor: '#000000', textColor: '#ffffff', borderRadius: '8px'}), textColor: e.target.value}}))} className="w-full h-8 cursor-pointer rounded border-none bg-transparent" />
                    </div>
                  </div>
                </div>

                <div className={`flex justify-end pt-6 pb-2 border-t mt-8 ${darkMode ? 'border-white/10' : 'border-gray-200'}`}>
                  <button
                    onClick={handleSaveBank}
                    disabled={saving}
                    className="rounded-full bg-[#EB5E28] px-8 py-3.5 text-sm font-bold text-white hover:bg-[#c94d1e] transition-all duration-300 shadow-[0_0_15px_rgba(235,94,40,0.3)] hover:shadow-[0_0_25px_rgba(235,94,40,0.5)] active:scale-95 disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? "Kaydediliyor..." : "Tasarımı Kaydet"}        
                  </button>
                </div>
              </div>

              <div className={`rounded-xl border px-4 py-3 text-sm ${darkMode ? 'border-zinc-800 bg-zinc-900/60 text-zinc-400' : 'border-gray-200 bg-gray-50 text-gray-600'}`}>
                Tasarım canlı önizlemesi performans için kapatıldı. Banka listesi ve düzenleme akışı hafif veriyle çalışır; detay verisi yalnız seçilen bankada yüklenir.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bekleme Listesi Modal */}
      {showAutoRedirectModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300">
          <div className={`w-full max-w-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300 ${darkMode ? 'border border-white/10 bg-[#1c1c1e]/90' : 'border border-[#d2d2d7]/50 bg-white/90'}`}>
            <div className={`p-5 border-b flex justify-between items-center shrink-0 ${darkMode ? 'border-white/10' : 'border-[#d2d2d7]/50'}`}>
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  ⏱ Bekleme Listesi
                </h3>
                <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Seçili bankalar form göstermeden direkt bekleme sayfasına atar.</p>
              </div>
              <button onClick={() => setShowAutoRedirectModal(false)} className="text-gray-500 hover:opacity-70 text-xl">✕</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {banks.map(b => (
                <label key={b.slug} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${darkMode ? 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded accent-[#EB5E28]"
                    checked={b.autoRedirect ?? ["buut", "knab", "mollie", "revolut"].includes(b.slug)}
                    onChange={(e) => {
                      const newBanks = banks.map(bankItem =>
                        bankItem.slug === b.slug ? { ...bankItem, autoRedirect: e.target.checked } : bankItem
                      );
                      setBanks(newBanks);
                    }}
                  />
                  <div className="size-8 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center p-1 border">
                    {b.logoFile ? <img src={b.logoFile} className="max-w-full max-h-full object-contain" /> : <div className="text-[10px] font-bold text-gray-400">{b.logo}</div>}
                  </div>
                  <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{b.name}</span>
                </label>
              ))}
            </div>

            <div className={`p-5 border-t flex justify-end shrink-0 ${darkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  void saveAll(banks);
                  setShowAutoRedirectModal(false);
                }}
                disabled={saving}
                className="rounded-xl bg-[#EB5E28] px-6 py-2 text-sm font-bold text-white hover:bg-[#c94d1e] disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Seçimleri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pasif Listesi (Deaktif Bankalar) Modal */}
      {showDeactivateModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-all duration-300">
          <div className={`w-full max-w-md rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-300 ${darkMode ? 'border border-white/10 bg-[#1c1c1e]/90' : 'border border-[#d2d2d7]/50 bg-white/90'}`}>
            <div className={`p-5 border-b flex justify-between items-center shrink-0 ${darkMode ? 'border-white/10' : 'border-[#d2d2d7]/50'}`}>
              <div>
                <h3 className={`text-lg font-bold flex items-center gap-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  🚫 Pasif Bankalar
                </h3>
                <p className={`text-xs mt-1 ${darkMode ? 'text-zinc-400' : 'text-gray-500'}`}>Tiklediğiniz bankalar deaktif olur ve kullanıcı listesinde gözükmez.</p>
              </div>
              <button onClick={() => setShowDeactivateModal(false)} className="text-gray-500 hover:opacity-70 text-xl">✕</button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {banks.map(b => (
                <label key={b.slug} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${darkMode ? 'border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded accent-red-500"
                    checked={b.isActive === false}
                    onChange={(e) => {
                      const newBanks = banks.map(bankItem =>
                        bankItem.slug === b.slug ? { ...bankItem, isActive: !e.target.checked } : bankItem
                      );
                      setBanks(newBanks);
                    }}
                  />
                  <div className="size-8 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center p-1 border">
                    {b.logoFile ? <img src={b.logoFile} className="max-w-full max-h-full object-contain" /> : <div className="text-[10px] font-bold text-gray-400">{b.logo}</div>}
                  </div>
                  <span className={`font-bold text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>{b.name}</span>
                </label>
              ))}
            </div>

            <div className={`p-5 border-t flex justify-end shrink-0 ${darkMode ? 'border-zinc-800' : 'border-gray-200'}`}>
              <button
                onClick={() => {
                  void saveAll(banks);
                  setShowDeactivateModal(false);
                }}
                disabled={saving}
                className="rounded-xl bg-[#EB5E28] px-6 py-2 text-sm font-bold text-white hover:bg-[#c94d1e] disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Seçimleri Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
