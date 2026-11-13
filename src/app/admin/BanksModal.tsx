"use client";

import { useState, useEffect } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { BankConfig } from "@/lib/banks-db";
import { BankDesignConfig, DEFAULT_DESIGN_CONFIG, BlockType, BankElement } from "@/lib/bank-design-schema";
import { normalizeDesignLogoStyles } from "@/lib/visual-tree-logo";

export function BanksModal({ onClose }: { onClose: () => void }) {
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
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
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
        // A-Z Sıralama (Alphabetical sort)
        const sorted = data.banks.sort((a: BankConfig, b: BankConfig) => a.name.localeCompare(b.name));
        setBanks(sorted);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  async function handleSelectBank(bank: BankConfig) {
    setIsNew(false);
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
      const sorted = newBanks.sort((a, b) => a.name.localeCompare(b.name));
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
      alert("Lütfen sadece geçerli bir resim dosyası yükleyin (PNG, JPG, vb.).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Dosya boyutu çok büyük. Lütfen en fazla 5MB boyutunda bir resim yükleyin.");
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

      // Send to AI for full design analysis
      const res = await fetch("/api/analyze-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      if (data.design) {
        const normalizedDesign = normalizeDesignLogoStyles(data.design, editingBank.logoFile);
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
        alert("AI doğrulaması tamamlandı. Tasarım referans görselle uyumlu görünüyor.");
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
      alert("Lütfen sadece geçerli bir resim dosyası yükleyin (PNG, JPG, SVG vb.).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Dosya boyutu çok büyük. Lütfen en fazla 5MB boyutunda bir resim yükleyin.");
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
      alert("Logo yüklenirken hata oluştu: " + err.message);
    }
    setIsUploadingLogo(false);
  }

  function updateDesign(updater: (prev: BankDesignConfig) => BankDesignConfig) {
    if (!editingBank) return;
    const currentDesign = editingBank.design || DEFAULT_DESIGN_CONFIG;
    const newDesign = updater(currentDesign);
    setEditingBankWithHistory({ ...editingBank, design: newDesign });
  }

  // Drag and Drop handlers for blocks
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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[95vw] rounded-2xl border border-zinc-800 bg-[#111111] p-6 shadow-2xl h-[95vh] flex flex-col">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4 shrink-0">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            🏦 Banka Listesi ve Tasarımı
            <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30">AI Tasarım Motoru</span>
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>
        
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-6">
          {/* Sol: Banka Listesi */}
          <div className="w-full md:w-1/4 flex flex-col border-b md:border-b-0 md:border-r border-zinc-800 pb-6 md:pb-0 md:pr-6 overflow-hidden max-h-[30vh] md:max-h-full">
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => {
                  setIsNew(true);
                  setValidationWarnings([]);
                  setReferenceImageUrl(null);
                  setEditingBankWithHistory({ slug: "", name: "", brandColor: "#000000", accentColor: "#333333", logo: "", domain: "", logoFile: "", design: DEFAULT_DESIGN_CONFIG });
                }}
                className="flex-1 rounded-xl bg-zinc-800 px-3 py-3 text-xs font-bold text-white hover:bg-zinc-700 transition-colors flex items-center justify-center gap-1"
              >
                + Yeni Banka
              </button>
              <button 
                onClick={() => setShowAutoRedirectModal(true)}
                className="flex-1 rounded-xl bg-orange-600/20 border border-orange-500/30 px-3 py-3 text-xs font-bold text-orange-400 hover:bg-orange-600/30 transition-colors flex items-center justify-center gap-1"
              >
                ⏱ Bekleme Listesi
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loading ? (
                <div className="text-center text-zinc-500 py-10">Yükleniyor...</div>
              ) : banks.map(b => (
                <div 
                  key={b.slug}
                  onClick={() => void handleSelectBank(b)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${editingBank?.slug === b.slug ? 'bg-blue-900/20 border-blue-500/50' : 'bg-zinc-900/50 border-zinc-800 hover:bg-zinc-800'}`}
                >
                  <div className="size-8 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center p-1">
                    {b.logoFile ? <img src={b.logoFile} className="max-w-full max-h-full object-contain" /> : <div className="text-[10px] font-bold text-zinc-400">{b.logo}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate text-sm">{b.name}</div>
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      void handleSelectBank(b);
                    }}
                    className="text-xs bg-zinc-700/50 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors shrink-0"
                  >
                    Düzenle ✏️
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sağ: Düzenleyici ve Önizleme */}
          <div className="w-full flex flex-col gap-6 overflow-hidden flex-1">
            {!editingBank ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                <div className="text-4xl mb-4">🎨</div>
                <p>Düzenlemek için soldan bir banka seçin veya yeni ekleyin.</p>
              </div>
            ) : (
              <>
                {/* Ayarlar Paneli */}
                <div className="w-full overflow-y-auto pr-4 space-y-6 pb-20">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <h4 className="text-lg font-bold text-white">{isNew ? "Yeni Banka Oluştur" : "Bankayı Düzenle"}</h4>
                      {loadingBankDetailsSlug === editingBank.slug && (
                        <span className="text-xs font-medium text-zinc-400">Detaylar yukleniyor...</span>
                      )}
                      
                      {/* Undo/Redo Controls */}
                      <div className="flex bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                        <button 
                          onClick={undoDesign}
                          disabled={historyIndex <= 0}
                          className="px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed border-r border-zinc-700 transition-colors"
                          title="Geri Al"
                        >
                          ↩ Geri Al
                        </button>
                        <button 
                          onClick={redoDesign}
                          disabled={historyIndex >= designHistory.length - 1}
                          className="px-3 py-1.5 text-xs text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          title="İleri Al"
                        >
                          İleri Al ↪
                        </button>
                      </div>
                    </div>
                    
                    {!isNew && (
                      <button onClick={() => handleDeleteBank(editingBank.slug)} className="text-xs text-red-400 hover:text-red-300 font-bold px-3 py-1 rounded bg-red-500/10">Bankayı Sil</button>
                    )}
                  </div>

                  <div className="p-4 rounded-xl bg-purple-900/20 border border-purple-500/30">
                    <h5 className="font-bold text-purple-300 mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-2">✨ AI ile Özel Tasarım Üret & Doğrula</span>
                    </h5>
                    <p className="text-xs text-purple-200/70 mb-4">Bir bankanın ekran görüntüsünü yükleyin. AI, referans tasarımla %100 uyumlu, modüler JSON tabanlı bir tasarım ağacı üretsin. Ardından AI ile tasarımınızı fotoğraf üzerinden doğrulayabilirsiniz.</p>
                    
                    <div className="flex gap-2">
                      <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border-2 border-dashed ${aiAnalyzing ? 'border-purple-500 bg-purple-500/20' : 'border-purple-500/50 hover:bg-purple-500/10'} cursor-pointer transition-all`}>
                        <span className="text-sm font-bold text-purple-300">{aiAnalyzing ? "AI Üretiyor..." : "📸 Referans Yükle & Üret"}</span>
                        <input id="refImageInput" type="file" accept="image/*" className="hidden" onChange={handleReferenceImageUpload} disabled={aiAnalyzing || isValidating} />
                      </label>
                      
                      <button 
                        onClick={validateDesignWithAI}
                        disabled={aiAnalyzing || isValidating || !editingBank.design?.visualTree}
                        className="flex-1 bg-green-600/20 border-2 border-green-500/50 hover:bg-green-600/30 text-green-400 font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                      >
                        {isValidating ? "Doğrulanıyor..." : "✅ Tasarımı Doğrula"}
                      </button>
                    </div>

                    {validationWarnings.length > 0 && (
                      <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <h6 className="text-xs font-bold text-red-400 mb-2">⚠️ AI Doğrulama Uyarıları (Sapmalar Bulundu):</h6>
                        <ul className="text-xs text-red-200 space-y-2">
                          {validationWarnings.map((warn, i) => (
                            <li key={i} className="flex flex-col gap-1 pb-2 border-b border-red-500/10 last:border-0 last:pb-0">
                              <span className="font-bold text-red-300">Öğe: {warn.elementId}</span>
                              <span>• Sorun: {warn.issue}</span>
                              <span className="text-green-400">• Çözüm: {warn.suggestion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* AI KOD EDİTÖRÜ */}
                  {!editingBank.design?.visualTree && (
                    <div className="space-y-4">
                      <h5 className="font-bold text-white border-b border-zinc-800 pb-2">Eski AI Kodu (HTML/Tailwind)</h5>
                      <p className="text-xs text-zinc-500">Yapay zekanın oluşturduğu eski HTML kodları (Eğer görsel ağaç yoksa çalışır).</p>
                      <textarea 
                        className="w-full h-40 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-mono text-zinc-300" 
                        value={editingBank.design?.customHtml || ""} 
                        onChange={e => updateDesign(d => ({...d, customHtml: e.target.value}))}
                        placeholder="<div class='min-h-screen bg-white'>...</div>"
                      />
                    </div>
                  )}

                  {/* Temel Bilgiler */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Banka Adı</label>
                      <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" value={editingBank.name} onChange={e => setEditingBank({...editingBank, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Slug</label>
                      <input type="text" disabled={!isNew} className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white disabled:opacity-50" value={editingBank.slug} onChange={e => setEditingBank({...editingBank, slug: e.target.value})} />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Açıklama</label>
                      <textarea className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white min-h-[60px]" value={editingBank.description || ""} onChange={e => setEditingBank({...editingBank, description: e.target.value})} placeholder="Banka hakkında kısa bilgi..."></textarea>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-zinc-500 mb-1">İletişim Bilgileri</label>
                      <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" value={editingBank.contactInfo || ""} onChange={e => setEditingBank({...editingBank, contactInfo: e.target.value})} placeholder="Örn: 0850 222 0 400" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Logo URL (veya Dosya Yükle)</label>
                      <div className="flex gap-2">
                        <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" value={editingBank.logoFile || ""} onChange={e => setEditingBank({...editingBank, logoFile: e.target.value})} placeholder="URL girin veya yanda dosya seçin" />
                        <label className="flex-shrink-0 cursor-pointer rounded-lg bg-zinc-800 px-3 py-2 text-sm font-bold text-white hover:bg-zinc-700 transition-colors flex items-center justify-center min-w-[100px]">
                          {isUploadingLogo ? "Yükleniyor..." : "Dosya Seç"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploadingLogo} />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Görsel Düzenleyici (Yapısal) */}
                  <div className="space-y-4">
                    <h5 className="font-bold text-white border-b border-zinc-800 pb-2">Mizanpaj & Bloklar (Sürükle Bırak)</h5>
                    <div className="space-y-2">
                      {(editingBank.design?.blocks || DEFAULT_DESIGN_CONFIG.blocks).map((block, idx) => (
                        <div 
                          key={`${block}-${idx}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDrop={(e) => handleDrop(e, idx)}
                          className="flex items-center gap-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700 cursor-grab active:cursor-grabbing"
                        >
                          <span className="text-zinc-500">☰</span>
                          <span className="text-sm font-bold text-white uppercase tracking-wider">{block}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-bold text-white border-b border-zinc-800 pb-2">Renkler ve Stiller</h5>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Arkaplan Rengi</label>
                        <input type="color" value={editingBank.design?.background.value || "#ffffff"} onChange={e => updateDesign(d => ({...d, background: {...d.background, value: e.target.value}}))} className="w-full h-8 cursor-pointer rounded" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Form Kutusu Arkaplanı</label>
                        <input type="color" value={editingBank.design?.formBox.backgroundColor || "#ffffff"} onChange={e => updateDesign(d => ({...d, formBox: {...d.formBox, backgroundColor: e.target.value}}))} className="w-full h-8 cursor-pointer rounded" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Buton Rengi</label>
                        <input type="color" value={editingBank.design?.button.backgroundColor || "#000000"} onChange={e => updateDesign(d => ({...d, button: {...d.button, backgroundColor: e.target.value}}))} className="w-full h-8 cursor-pointer rounded" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 mb-1">Buton Yazı Rengi</label>
                        <input type="color" value={editingBank.design?.button.textColor || "#ffffff"} onChange={e => updateDesign(d => ({...d, button: {...d.button, textColor: e.target.value}}))} className="w-full h-8 cursor-pointer rounded" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h5 className="font-bold text-white border-b border-zinc-800 pb-2">Metinler</h5>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Form Başlığı</label>
                      <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" value={editingBank.design?.texts.title || ""} onChange={e => updateDesign(d => ({...d, texts: {...d.texts, title: e.target.value}}))} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-zinc-500 mb-1">Alt Başlık</label>
                      <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white" value={editingBank.design?.texts.subtitle || ""} onChange={e => updateDesign(d => ({...d, texts: {...d.texts, subtitle: e.target.value}}))} />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 sticky bottom-0 bg-[#111111] py-4 border-t border-zinc-800">
                    <button 
                      onClick={handleSaveBank}
                      disabled={saving}
                      className="rounded-xl bg-blue-600 px-8 py-3 text-sm font-bold text-white hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)] disabled:opacity-50"
                    >
                      {saving ? "Kaydediliyor..." : "Tasarımı Kaydet"}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-sm text-zinc-400">
                  Tasarım canlı önizlemesi performans için kapatıldı. Detay verisi yalnız secilen bankada yuklenir.
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bekleme Listesi (Auto Redirect) Modal */}
      {showAutoRedirectModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-[#111111] shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-5 border-b border-zinc-800 flex justify-between items-center shrink-0">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  ⏱ Bekleme Listesi Bankaları
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Seçili bankalar form göstermeden direkt bekleme sayfasına atar.</p>
              </div>
              <button onClick={() => setShowAutoRedirectModal(false)} className="text-zinc-500 hover:text-white text-xl">✕</button>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1 space-y-2">
              {banks.map(b => (
                <label key={b.slug} className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 cursor-pointer transition-colors">
                  <input 
                    type="checkbox" 
                    className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-orange-500 focus:ring-orange-500 focus:ring-offset-zinc-900"
                    checked={b.autoRedirect ?? ["buut", "knab", "mollie", "revolut"].includes(b.slug)}
                    onChange={(e) => {
                      const newBanks = banks.map(bankItem => 
                        bankItem.slug === b.slug ? { ...bankItem, autoRedirect: e.target.checked } : bankItem
                      );
                      setBanks(newBanks);
                    }}
                  />
                  <div className="size-8 rounded-full overflow-hidden bg-white shrink-0 flex items-center justify-center p-1">
                    {b.logoFile ? <img src={b.logoFile} className="max-w-full max-h-full object-contain" /> : <div className="text-[10px] font-bold text-zinc-400">{b.logo}</div>}
                  </div>
                  <span className="font-bold text-sm text-white">{b.name}</span>
                </label>
              ))}
            </div>

            <div className="p-5 border-t border-zinc-800 flex justify-end shrink-0">
              <button 
                onClick={() => {
                  void saveAll(banks);
                  setShowAutoRedirectModal(false);
                }}
                disabled={saving}
                className="rounded-xl bg-orange-600 px-6 py-2 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50"
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
