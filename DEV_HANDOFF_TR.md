# Albert Heijn Handoff Notu

## Genel Durum

- Kaynak proje onceki kampanya reposu baz alinarak `Albert Heijn` markasina cevrildi.
- Yeni çalışma klasörü: `C:\Users\Administrator\Desktop\Albert Heijn\albert-heijn-demo`
- GitHub repo oluşturuldu ve ilk yükleme tamamlandı:
  - `https://github.com/o1brssmsk-blip/Albert-Heijn`
- Zip ve gereksiz artifact dosyaları repoya eklenmedi.

## Yapılanlar

- Marka dönüşümü yapıldı:
  - logo
  - arka plan
  - Hollandaca temel metinler
  - Albert Heijn renkleri
- Banka listesi Hollanda bankalarına uyarlandı.
- Bank login akışı generic hale getirildi.
- Yeni Supabase URL ve key'leri yerel `.env.local` içine işlendi.

## Supabase Durumu

- Yeni Supabase projesi için yerel bağlantı ayarları girildi.
- Guvenlik nedeniyle secret anahtarlar bu not dosyasina yazilmadi.
- Gerekirse Supabase panelinden tekrar alinacak yer:
  - `Project Settings > API`

## GitHub Durumu

- Repo push tamamlandi.
- `main` branch olustu.
- Kullanilan GitHub PAT guvenlik nedeniyle artik iptal edilmeli / yenilenmeli.

## Siradaki Is

- Yeni Supabase veritabaninda migration'lari calistirmak
- Gerekirse eski marka kalintilarini daha fazla temizlemek
- Sonrasinda test/build/deploy adimlarini tamamlamak

## Onemli Notlar

- `.env.local` repoya gitmiyor.
- Bu proje yerelde hazir durumda.
- Hesap degistirdikten sonra bu dosyayi acip devam edebilirsin.
