# Debug Session: mobile-bank-bg
- **Status**: [OPEN]
- **Issue**: Mobil bankalar sayfasinda arka plan beyaz gorunuyor ve istenen logo alani yerine yanlis kisim gorunebiliyor.
- **Debug Server**: Pending
- **Log File**: .dbg/trae-debug-log-mobile-bank-bg.ndjson

## Reproduction Steps
1. Mobil viewport ile banka listesi sayfasini ac.
2. Sayfa arka plan rengini ve arka plan gorselinin konumunu kontrol et.
3. `body`, `main` ve sayfa kapsayicilarinin computed stillerini karsilastir.
4. Local ve production davranisini incele.

## Hypotheses & Verification
| ID | Hypothesis | Likelihood | Effort | Evidence |
|----|------------|------------|--------|----------|
| A | `body.ah-theme` bankalar sayfasinda uygulanmiyor | High | Low | Pending |
| B | Sayfa kapsayicisi beyaz arka plan ile body arka planini ortuyor | High | Low | Pending |
| C | Mobilde `background-attachment: fixed` beyaz fallback uretiyor | Medium | Low | Pending |
| D | Medya sorgusu/konumlandirma gorseli yanlis bolgeye kirpiyor | High | Low | Pending |
| E | Production CSS yukleme sirasi localden farkli | Medium | Medium | Pending |

## Log Evidence
- Pending

## Verification Conclusion
- Pending
