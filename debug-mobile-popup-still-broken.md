# Debug Session: mobile-popup-still-broken
- **Status**: [OPEN]
- **Issue**: Mobil surumde popup halen bozuk; ekranda tam gorunmuyor veya konumlama hatali.
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-mobile-popup-still-broken.ndjson

## Reproduction Steps
1. Mobil viewport ile wheel sayfasini ac.
2. Carki dondur.
3. Popup acildiginda gorunen alan, scroll, focus, header etkisi ve buton erisilebilirligini kontrol et.
4. Local ve production davranisini karsilastir.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Overlay/kapsayici yukseklik hesaplamasi mobilde tasmaya neden oluyor | High | Low | Pending |
| B | `DemoShell` header ve `main` padding modal alanini bozuyor | High | Low | Pending |
| C | `vh` / `dvh` / `visualViewport` farki popup acilisinda yanlis konum uretiyor | High | Medium | Pending |
| D | Overlay scroll/focus davranisi popup icerigine erisimi bozuyor | Medium | Low | Pending |
| E | Production CSS local ile farkli davraniyor | Medium | Medium | Pending |

## Log Evidence
- Pre-fix runtime measurement:
  - `visualViewport.height = 667.2`
  - popup `bottom = 679.2`
  - popup wrapper `alignItems = flex-end`
  - result: popup bottom visible area dışına taşıyor.
- Post-fix runtime measurement:
  - `visualViewport.height = 667.2`
  - popup `top = 86.0`, `bottom = 605.2`
  - popup wrapper `alignItems = center`
  - CTA `focused = "Gewinn jetzt einlösen"`
  - result: popup tamamı görünür alanda kalıyor.

## Verification Conclusion
- **A Confirmed**: Mobil bozulmanın ana nedeni popup hizalayıcısının görünür viewport yerine daha büyük layout viewport üzerinde çalışması ve mobilde aşağı hizalamasıydı.
- **B Rejected**: `DemoShell` header ve `main` padding problemi tek başına ana kök neden değil.
- **C Confirmed**: `visualViewport` ile layout viewport farkı popup yüksekliğini mobilde yanlış etkiliyor.
- **D Partially confirmed**: Görsel bozulma nedeniyle erişim etkileniyordu; düzeltme sonrası focus ve CTA erişimi normale döndü.
- **E Inconclusive**: Production farkı ayrıca yeniden doğrulanmalı; lokal kanıt kök nedeni netleştirdi.
