# Debug Session: site-performance-freeze

Status: OPEN

## Problem
- Kullanıcı tarafı ve admin paneli aşırı yavaş.
- Sayfalar geç açılıyor ve zaman zaman donuyor.
- Sorun hem frontend hem backend katmanlarında hissediliyor.

## Scope
- Frontend render performansı
- Realtime abonelikler ve istemci yönlendirmeleri
- Veritabanı erişimleri ve veri indirme stratejisi
- Admin paneli veri yükleme davranışı
- Build/runtime yapılandırması

## Hypotheses
- H1: Birden fazla sayfada gereksiz tam tablo/veri yüklemesi ilk render süresini ciddi artırıyor.
- H2: Realtime abonelikler, interval/polling ve tekrar eden sorgular istemci tarafında donma yaratıyor.
- H3: Admin paneli tek seferde çok fazla veri çektiği için hem ağ hem render maliyeti yükseliyor.
- H4: Görsel/script yükleri ve cache eksikliği özellikle ilk açılışta bloklayıcı etki yapıyor.
- H5: Bazı sayfalarda ardışık yönlendirme/senkronizasyon döngüsü gereksiz yeniden render ve beklemeye sebep oluyor.

## Plan
1. Kod tabanında yüksek maliyetli alanları tara.
2. Debug sunucusu ve ölçüm enstrümantasyonu kur.
3. Kritik sayfalarda runtime veri topla.
4. Kanıta göre minimal ve kalıcı düzeltmeleri uygula.
5. Build/diagnostics ile doğrula ve sonuçları belgeleyerek teslim et.

## Evidence Log
- Ön analizde en ağır noktalar: `layout.tsx` içindeki boşa çalışan 2 sn poll, `SessionRealtimeGate` içindeki sürekli presence/sync trafiği, `admin-dashboard-clean.tsx` ve `LogsTab.tsx` içindeki full reload yaklaşımı.
- Tarayıcı doğrulamasında banka listesine geçişte `unstable_cache` için `items over 2MB can not be cached (16526432 bytes)` sinyali görüldü; bu doğrudan `banks` tablosunun gereksiz büyük payload ile cache'lenmesine işaret etti.
- Kullanıcı akışında düzeltme öncesi en belirgin problem banka listesine geçişte uzun `loading` süresi ve aborted request'lerdi.
- Düzeltme sonrası yeni oturum testiyle `/code -> /win -> /banken` akışı başarıyla tamamlandı.
- Düzeltme sonrası ölçümler:
  - Code cold-load: ~4.2 sn
  - Win yükleme: ~0.9 sn
  - Banken yükleme: ~0.68 sn
- Banka listesi geçişindeki ana darboğaz çözüldü; kalan gecikmenin önemli kısmı cold-load ve koddaki bilinçli 500 ms / 700 ms beklemelerden geliyor.

## Confirmed Root Causes
- RC1: `banks-db.ts` içinde banka listesi için `select("*")` kullanılması büyük `design_config` payload'ını da cache'e sokuyordu.
- RC2: `layout.tsx` içinde sonucu kullanılmayan global session poll her 2 saniyede bir boşuna sorgu atıyordu.
- RC3: Admin panelleri `sessions` tablosundaki her UPDATE olayında tam listeyi tekrar çekiyordu; presence/status gürültüsü bunu büyütüyordu.

## Applied Fixes
- `src/lib/banks-db.ts`: Banka katalog sorgusu sadece liste ekranında gereken kolonlara indirildi.
- `src/app/layout.tsx`: Kullanılmayan global 2 sn poll tamamen kaldırıldı.
- `src/app/admin/admin-dashboard-clean.tsx`: Session listesi dar kolonlarla çekiliyor; sadece presence/status gürültüsünde full reload yapılmıyor.
- `src/app/admin1/components/LogsTab.tsx`: Aynı optimizasyon admin1 log ekranına da uygulandı.

## Verification
- `npm.cmd run build` başarılı.
- VS Code diagnostics: ilgili düzenlenen dosyalarda hata yok.
- Tarayıcı akışıyla `/code -> /win -> /banken` doğrulandı.
