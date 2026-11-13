# Debug Session: mobile-popup-a11y
- **Status**: [OPEN]
- **Issue**: Mobil cihazlarda popup ekraninin tam gorunmemesi, etkileşim/erişilebilirlik akışının bozulması ve çark sesi davranışının tutarsız olması.
- **Debug Server**: Browser-side fallback instrumentation via `window.__wheelPopupDebug`
- **Log File**: .dbg/trae-debug-log-mobile-popup-a11y.ndjson

## Reproduction Steps
1. Mobil görünümde çark sayfasını aç.
2. Çarkı döndür.
3. Popup açıldığında görünür alanı, scroll davranışını, odak sırasını ve buton erişimini kontrol et.
4. iOS/Android benzeri viewportlarda popup açma-kapama ve banka sayfasına geçiş akışını doğrula.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | Popup konteyneri küçük mobil ekranlarda görünür yüksekliği aşıyor | High | Low | Inconclusive before fix; guarded with `100dvh` max-height and safe-area padding |
| B | `fixed` overlay ve blur katmanı mobil tarayıcılarda scroll/focus davranışını bozuyor | High | Medium | Confirmed pre-fix, fixed with body scroll lock and overscroll containment |
| C | Dialog için erişilebilir rol/etiket/focus yönetimi eksik | Medium | Low | Confirmed pre-fix, fixed with dialog semantics and CTA focus |
| D | Buton ve içerik blokları dar ekranlarda güvenli dokunma alanı üretmiyor | Medium | Low | Rejected for CTA; close control added to improve dismissibility |
| E | Çark sesi zamanlaması popup açılışıyla çakışıp render akışını etkiliyor | Low | Medium | Rejected; popup render follows spin normally |

## Log Evidence
- Pre-fix runtime inspection on mobile-width viewport showed `bodyOverflow: "visible"` and no dialog semantics on the popup container.
- Pre-fix accessibility snapshot exposed only the CTA button; popup had no dedicated close control and focus stayed on the page body.
- Post-fix runtime inspection showed `role="dialog"`, `aria-modal="true"`, `aria-labelledby="wheel-result-title"`, `bodyOverflow: "hidden"`, `bodyOverscroll: "contain"`.
- Post-fix snapshot showed both `Popup schließen` and `Gewinn jetzt einlösen`, with the CTA in focused state.
- Post-fix geometry from `window.__wheelPopupDebug` reported `popupHeight: 519.17` vs `visualViewportHeight: 667.2`, `overflowsViewport: false`.
- Post-fix interaction test verified both close button and CTA navigate to `/banken?session=...`.

## Verification Conclusion
- Root cause was primarily popup semantics and mobile overlay behavior, not wheel timing.
- The popup now uses safe-area-aware padding, viewport-bounded height, internal scrolling, body scroll locking, dialog semantics, and deterministic focus.
- Mobile validation completed on a narrow integrated-browser viewport with runtime geometry checks and accessibility snapshot inspection.
