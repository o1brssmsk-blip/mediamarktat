# Debug Session: vanlanschot-logo-bug

- Status: OPEN
- Symptom: AI ile olusturulan tasarimda vanlanschotkempen logosu bozulmus gorunuyor.
- Goal: Koku nedeni runtime kaniti ile bulmak, kalici duzeltmek ve tekrarini onlemek.
- Notes: Ilk asamada sadece hipotez, gozlem ve enstrumantasyon uygulanacak.

## Hypotheses

| ID | Hypothesis | Likelihood | Effort | Expected Signal |
|----|------------|------------|--------|-----------------|
| A | Placeholder logo, en-boy orani korumayan stillerle gercek logo URL'sine basiliyor | High | Low | Logo image node logunda sabit width/height ve guvensiz stiller gorunur |
| B | AI visualTree logo dugumu objectFit/maxWidth/maxHeight olmadan kaydediliyor | High | Low | Preview image-node logunda bozuk stiller yakalanir |
| C | customHtml yolunda placeholder swap sonrasi logo icin koruyucu stil uygulanmiyor | Medium | Low | Live customHtml placeholder swap logu gelir |
| D | Canli sayfa AI visualTree'yi hic render etmiyor; farkli fallback yola dusuyor | High | Medium | Live page logu visualTree var ama renderer path yok sinyali verir |
| E | van-lanschot-kempen slug'i AI tasarim olsa bile ozel client'a zorlandigi icin farkli UI gosteriyor | High | Low | Route/preview logu custom client override sinyali verir |

## Evidence

| ID | Status | Evidence |
|----|--------|----------|
| E | CONFIRMED | `.dbg/trae-debug-log-vanlanschot-logo-bug.ndjson` line 1: live route `van-lanschot-kempen` icin custom client override aktif |
| A | INCONCLUSIVE | Gercek bozuk logo image node verisi henuz toplanmadi |
| B | INCONCLUSIVE | Preview tarafinda bozuk logo dugumu icin runtime veri henuz toplanmadi |
| C | INCONCLUSIVE | customHtml swap logu henuz uretilmedi |
| D | PARTIAL | Kod yolu bank-login-client icinde visualTree renderer eksikligini gosteriyor; runtime kanit eksik |
