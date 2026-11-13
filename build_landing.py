# -*- coding: utf-8 -*-
import re, io, os, sys

SRC = r"C:\Users\XENOTIC\Downloads\MediaMarkt： Let's go! ｜ MediaMarkt (14.11.2026 00：00：01).html"
OUT = "public/landing/index.html"

s = io.open(SRC, encoding="utf-8", errors="replace").read()

body_start = s.index("<body")
header_end = s.index("</header") + len("</header")
main_start = s.index("<main")
main_end   = s.index("</main")
footer_end = s.index("</footer") + len("</footer")

head_part   = s[:body_start]
body_tag    = s[body_start:s.index(">", body_start) + 1]
header_part = s[s.index("<header"):header_end]
main_tag    = s[main_start:s.index(">", main_start) + 1]
footer_part = s[s.index("<footer"):footer_end]

def prize_card(img, title, text):
    return (
        '<div style="border:1px solid #eee;border-radius:14px;padding:14px;background:#fff;'
        'box-shadow:0 2px 10px rgba(0,0,0,.05);text-align:center;">'
        f'<img src="/landing/prizes/{img}" alt="{title}" '
        'style="width:100%;max-width:180px;border-radius:10px;display:block;margin:0 auto;">'
        f'<p style="margin:10px 0 4px;font-weight:800;color:#1b1b1b;">{title}</p>'
        f'<p style="margin:0;font-size:13px;color:#777;">{text}</p></div>'
    )

campaign = """
<div style="max-width:1200px;margin:0 auto;padding:16px;font-family:'MM Text',Helvetica,Arial,sans-serif;">

  <!-- HERO -->
  <div style="background:linear-gradient(135deg,#df0000 0%,#8b0000 55%,#5c0000 100%);border-radius:16px;padding:40px 24px;text-align:center;color:#fff;box-shadow:0 12px 40px rgba(223,0,0,.35);">
    <span style="display:inline-block;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.4);border-radius:999px;padding:6px 18px;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Gewinnspiel</span>
    <h1 style="margin:18px 0 8px;font-size:clamp(26px,5vw,46px);font-weight:800;line-height:1.1;">MediaMarkt Gewinnaktion</h1>
    <p style="margin:0 auto;max-width:560px;font-size:clamp(14px,2.4vw,18px);opacity:.92;">Drehen Sie das Gluecksrad und sichern Sie sich Bargeldpreise im Wert von bis zu <b>2.500&nbsp;&euro;</b> sowie tolle Sachpreise.</p>
    <div style="margin-top:22px;display:flex;flex-wrap:wrap;justify-content:center;gap:10px;">
      <span style="background:#fff;color:#df0000;border-radius:12px;padding:8px 16px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(0,0,0,.25);">500&nbsp;&euro;</span>
      <span style="background:#fff;color:#df0000;border-radius:12px;padding:8px 16px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(0,0,0,.25);">1.000&nbsp;&euro;</span>
      <span style="background:#fff;color:#df0000;border-radius:12px;padding:8px 16px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(0,0,0,.25);">1.500&nbsp;&euro;</span>
      <span style="background:#fff;color:#df0000;border-radius:12px;padding:8px 16px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(0,0,0,.25);">2.000&nbsp;&euro;</span>
      <span style="background:#fff;color:#df0000;border-radius:12px;padding:8px 16px;font-weight:800;font-size:16px;box-shadow:0 4px 14px rgba(0,0,0,.25);">2.500&nbsp;&euro;</span>
    </div>
    <button class="mm-cta" style="margin-top:26px;background:#fff;color:#df0000;border:none;border-radius:12px;padding:16px 44px;font-size:19px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.3);transition:transform .15s,box-shadow .15s;" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">Jetzt teilnehmen</button>
    <p style="margin:14px 0 0;font-size:12px;opacity:.75;">Nur fuer begrenzte Zeit &middot; Teilnahme ab 18 Jahren &middot; Pro Person eine Drehung</p>
  </div>

  <!-- WAS SIE GEWINNEN KOENNEN -->
  <h2 style="margin:36px 0 14px;font-size:clamp(20px,3.5vw,28px);font-weight:800;color:#1b1b1b;">Das koennen Sie gewinnen</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;">
    __CARD_CASH__
    __CARD_IPHONE__
    __CARD_MOTORRAD__
    __CARD_AUTO__
  </div>

  <!-- SO FUNKTIONIERTS -->
  <h2 style="margin:36px 0 14px;font-size:clamp(20px,3.5vw,28px);font-weight:800;color:#1b1b1b;">So einfach geht&rsquo;s</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
    <div style="display:flex;gap:14px;align-items:flex-start;border:1px solid #eee;border-radius:14px;padding:18px;background:#fafafa;">
      <span style="flex:none;width:38px;height:38px;border-radius:50%;background:#df0000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;">1</span>
      <div><p style="margin:0 0 3px;font-weight:800;color:#1b1b1b;">Teilnehmen</p><p style="margin:0;font-size:13px;color:#777;">Geben Sie Ihren Namen und Ihre Telefonnummer ein.</p></div>
    </div>
    <div style="display:flex;gap:14px;align-items:flex-start;border:1px solid #eee;border-radius:14px;padding:18px;background:#fafafa;">
      <span style="flex:none;width:38px;height:38px;border-radius:50%;background:#df0000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;">2</span>
      <div><p style="margin:0 0 3px;font-weight:800;color:#1b1b1b;">Rad drehen</p><p style="margin:0;font-size:13px;color:#777;">Drehen Sie das MediaMarkt Gluecksrad und gewinnen Sie.</p></div>
    </div>
    <div style="display:flex;gap:14px;align-items:flex-start;border:1px solid #eee;border-radius:14px;padding:18px;background:#fafafa;">
      <span style="flex:none;width:38px;height:38px;border-radius:50%;background:#df0000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:17px;">3</span>
      <div><p style="margin:0 0 3px;font-weight:800;color:#1b1b1b;">Gewinn sichern</p><p style="margin:0;font-size:13px;color:#777;">Sichern Sie Ihren Bargeldpreis in wenigen Schritten.</p></div>
    </div>
  </div>

  <!-- KAZANANLAR -->
  <h2 style="margin:36px 0 14px;font-size:clamp(20px,3.5vw,28px);font-weight:800;color:#1b1b1b;">Aktuelle Gewinner</h2>
  <div style="border:1px solid #eee;border-radius:14px;background:#fff;overflow:hidden;">
    <div style="display:flex;align-items:center;gap:10px;background:#f6f6f6;border-bottom:1px solid #eee;padding:10px 16px;">
      <span style="width:9px;height:9px;border-radius:50%;background:#16a34a;display:inline-block;box-shadow:0 0 0 4px rgba(22,163,74,.18);"></span>
      <span style="font-size:13px;font-weight:700;color:#444;">Live &mdash; soeben gewonnen</span>
    </div>
    <div id="mm-winner" style="padding:16px;font-size:15px;color:#1b1b1b;font-weight:600;min-height:24px;"></div>
  </div>

  <!-- CTA ALTI -->
  <div style="text-align:center;margin:34px 0 10px;">
    <button class="mm-cta" style="background:#df0000;color:#fff;border:none;border-radius:12px;padding:16px 52px;font-size:18px;font-weight:800;cursor:pointer;box-shadow:0 8px 24px rgba(223,0,0,.4);">Jetzt teilnehmen</button>
  </div>
</div>
<script>
(function(){
  var W=[["Markus H.","Wien","500 &euro;"],["Stefanie K.","Graz","1.000 &euro;"],["Thomas B.","Linz","1.500 &euro;"],["Julia M.","Salzburg","2.000 &euro;"],["Andreas P.","Innsbruck","500 &euro;"],["Sabrina W.","Klagenfurt","1.000 &euro;"],["Martin S.","Wien","2.500 &euro;"],["Lisa F.","Graz","500 &euro;"]];
  var i=0,el=document.getElementById("mm-winner");
  function show(){var w=W[i%W.length];el.innerHTML='<b style="color:#df0000">'+w[0]+'</b> aus '+w[1]+' hat <b style="color:#16a34a">'+w[2]+'</b> gewonnen!';i++;}
  show();setInterval(show,3500);
  function go(){var p=new URLSearchParams(location.search);p.set("form","1");try{top.location.href="/?"+p.toString();}catch(e){location.href="/?"+p.toString();}}
  var btns=document.querySelectorAll(".mm-cta");
  for(var k=0;k<btns.length;k++) btns[k].onclick=go;
})();
</script>
"""

campaign = campaign.replace("__CARD_CASH__", prize_card("cash.png", "Bargeldpreise", "500 &euro; bis 2.500 &euro; direkt auf dem Gluecksrad"))
campaign = campaign.replace("__CARD_IPHONE__", prize_card("iphone.png", "iPhone 18 Pro Max", "Das neueste iPhone als Hauptgewinn"))
campaign = campaign.replace("__CARD_MOTORRAD__", prize_card("motorrad.png", "Motorrad", "Ein nagelneues Motorrad"))
campaign = campaign.replace("__CARD_AUTO__", prize_card("auto.png", "Auto f&uuml;r 1 Jahr", "Ein Auto f&uuml;r ein ganzes Jahr"))

# --- Kampanyaya ozel ince footer: guven + yasal + odul bilgisi (dis link yok) ---
campaign_footer = """
<footer style="background:#1b1b1b;color:#999;font-family:'MM Text',Helvetica,Arial,sans-serif;margin-top:40px;">
  <div style="max-width:1200px;margin:0 auto;padding:28px 16px;">
    <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:18px;">
      <span style="border:1px solid #444;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;color:#ccc;">&#x1F512; SSL-gesicherte Verbindung</span>
      <span style="border:1px solid #444;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;color:#ccc;">&#x2713; Verifizierte Gewinnaktion</span>
      <span style="border:1px solid #444;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;color:#ccc;">18+ Nur fuer Erwachsene</span>
      <span style="border:1px solid #444;border-radius:8px;padding:7px 14px;font-size:12px;font-weight:700;color:#ccc;">&#x1F3C6; Echte Gewinner taeglich</span>
    </div>
    <div style="text-align:center;font-size:12px;line-height:1.7;color:#888;">
      <p style="margin:0 0 6px;">MediaMarkt Gewinnaktion &middot; Teilnahmebedingungen &middot; Datenschutzhinweise &middot; Impressum</p>
      <p style="margin:0;color:#666;">Nur fuer begrenzte Zeit gueltig. Pro Person eine Drehung. Gewinne werden nach Verifizierung ausgezahlt. Die Aktion steht in keinem Zusammenhang mit Meta, Apple oder Google.</p>
    </div>
  </div>
</footer>
"""

out = head_part + body_tag + header_part + main_tag + campaign + "</main>" + campaign_footer + "</body></html>"

out = re.sub(r"<script></script>", "", out)
out = re.sub(r"<div data-ad-curtain.*?</div></div></div>", "", out, flags=re.S)

# --- DIS BAGLANTILARI OLDUR: tum harici linkler/formlar devre disi ---
out = re.sub(r'href="?https?://[^" >]*"?', 'href="#" onclick="return false"', out)
out = re.sub(r'action="?[^" >]*"?', 'action="javascript:void(0)"', out)
out = re.sub(r'target="_?blank"', "", out, flags=re.I)
# ic linkler de gezmesin
out = re.sub(r'href="?/de/[^" >]*"?', 'href="#" onclick="return false"', out)

os.makedirs("public/landing", exist_ok=True)
io.open(OUT, "w", encoding="utf-8").write(out)
print("yazildi:", len(out), "byte")
