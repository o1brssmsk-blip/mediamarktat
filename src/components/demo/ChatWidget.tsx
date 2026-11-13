"use client";

import { useEffect, useState, useRef } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

import { usePathname } from "next/navigation";

type ChatMessage = {
  id: string;
  session_id: string;
  sender: "user" | "admin";
  content: string;
  image_url?: string | null;
  created_at: string;
};

const SUPPORT_AVATAR = "/avatars/support-sarah.webp";
const SUPPORT_AGENT_NAME = "Kadri Tamm";
const SUPPORT_AGENT_ROLE = "Customer Support";
const CLOSE_BUTTON_TITLE = "Close";
const EMPTY_CHAT_TEXT = "No messages yet. How can we help you?";
const CHAT_INPUT_PLACEHOLDER = "Write a message...";

export function ChatWidget({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const isOpenRef = useRef(isOpen);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const supabase = createBrowserSupabaseClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  

  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener("open-live-chat", handleOpenChat);
    return () => window.removeEventListener("open-live-chat", handleOpenChat);
  }, []);

  // Eğer kullanıcı live-support sayfasına gelirse sohbeti otomatik aç
  // (Artık otomatik açılmıyor, butona basması gerekiyor)
  // useEffect(() => {
  //   if (pathname?.includes("/live-support")) {
  //     setIsOpen(true);
  //   }
  // }, [pathname]);

  useEffect(() => {
    isOpenRef.current = isOpen;
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  useEffect(() => {
    if (!supabase) return;

    if (isOpen) {
      supabase
        .from("chat_messages")
        .select("id,session_id,sender,content,image_url,created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true })
        .limit(50)
        .then(({ data }) => {
          if (data) setMessages(data as ChatMessage[]);
        });
    }

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
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
          
          if (!isOpenRef.current && newMsg.sender === "admin") {
            // Unread count tracking removed as part of cleanup
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isOpen, sessionId, supabase]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !supabase || !sessionId) return;

    const msg = newMessage.trim();
    setNewMessage("");

    // ⭐ CANLI DESTEK FIX: role + sender IKISINI BIRDEN gonder.
    //   4 katman fallback: withBoth → sadece role (legacy) → sadece sender (modern) → minimal
    let res = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        role: "user",
        sender: "user",
        content: msg,
        image_url: null,
        image_urls: [],
      } as any)
      .select("id,session_id,sender,role,content,image_url,image_urls,created_at")
      .single();

    if (res.error) {
      // 2. Deneme: sadece role (legacy schema: role + image_urls)
      res = await supabase
        .from("chat_messages")
        .insert({ session_id: sessionId, role: "user", content: msg, image_urls: [] } as any)
        .select("*")
        .single();
    }
    if (res.error) {
      // 3. Deneme: sadece sender (modern schema: sender + image_url)
      res = await supabase
        .from("chat_messages")
        .insert({ session_id: sessionId, sender: "user", content: msg, image_url: null } as any)
        .select("*")
        .single();
    }
    if (res.error) {
      // 4. Son guvence: SADECE zorunlu (role + sender beraber, image kolonlari yok)
      res = await supabase
        .from("chat_messages")
        .insert({ session_id: sessionId, role: "user", sender: "user", content: msg } as any)
        .select("*")
        .single();
    }

    const { data, error } = res;

    if (error) {
      console.error("chat send error:", error);
      setNewMessage(msg);
      return;
    }

    if (data) {
      setMessages((prev) => {
        if (prev.find((m) => m.id === data.id)) return prev;
        return [...prev, data as ChatMessage];
      });
    }
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-3 pt-[16vh] sm:p-6 sm:pt-[26vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="flex w-full max-w-[650px] h-[75vh] max-h-[650px] flex-col overflow-hidden rounded-[24px] bg-[#141416] border border-[#DF0000] shadow-[0_0_40px_rgba(223,0,0,0.3)] animate-in zoom-in-95 duration-300">
            
            <div className="flex items-center justify-between px-6 py-5 border-b border-[#DF0000]/30 bg-white/5">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img 
                  src={SUPPORT_AVATAR}
                  alt="Support" 
                  className="size-12 rounded-full object-cover border-2 border-[#DF0000] shadow-sm"
                />
                <div className="absolute bottom-0 right-0 size-3.5 rounded-full bg-green-500 border-2 border-[#141416]"></div>
              </div>
              <div className="flex flex-col">
                <h3 className="font-bold text-white text-[16px] leading-tight">{SUPPORT_AGENT_NAME}</h3>
                <span className="text-[13px] text-gray-400">{SUPPORT_AGENT_ROLE}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={() => setIsOpen(false)} title={CLOSE_BUTTON_TITLE} className="flex size-10 items-center justify-center rounded-full bg-white/10 text-gray-300 hover:text-white hover:bg-white/20 transition-colors shadow-sm border border-white/5">
                  <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-transparent custom-scrollbar">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center opacity-50">
                  <svg className="size-12 text-[#DF0000] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm text-gray-300">{EMPTY_CHAT_TEXT}</p>
                </div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-5 py-3.5 text-[15px] shadow-sm ${m.sender === "user" ? "bg-gradient-to-r from-[#DF0000] to-[#FF453A] text-white rounded-br-sm shadow-[0_0_15px_rgba(223,0,0,0.3)]" : "bg-white/10 text-white rounded-bl-sm border border-white/10 backdrop-blur-md"}`}>
                      {m.image_url && (
                        <div 
                          className="mb-3 overflow-hidden rounded-xl cursor-pointer hover:opacity-90 transition-opacity" 
                          onClick={() => setZoomedImage(m.image_url!)}
                        >
                          <img src={m.image_url} alt="Chat Attachment" className="max-h-52 w-full object-cover rounded-xl" />
                        </div>
                      )}
                      {m.content && <p className="leading-relaxed">{m.content}</p>}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex items-center gap-3 p-4 bg-white/5 backdrop-blur-md border-t border-[#DF0000]/30">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={CHAT_INPUT_PLACEHOLDER}
                className="flex-1 bg-white/10 rounded-xl px-5 py-4 text-[15px] text-white outline-none placeholder:text-gray-400 border border-transparent focus:border-[#DF0000]/50 focus:bg-white/15 transition-all shadow-sm"
              />
              <button type="submit" disabled={!newMessage.trim()} className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-[#DF0000] to-[#FF453A] text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:grayscale shadow-[0_0_15px_rgba(223,0,0,0.4)]">
                <svg className="size-6 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Image Zoom Overlay */}
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
