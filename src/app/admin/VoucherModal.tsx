"use client";

import { useState, useRef } from "react";
import html2canvas from "html2canvas";

export function VoucherModal({ onClose }: { onClose: () => void }) {
  const [winnerName, setWinnerName] = useState("");
  const [fontSizePx, setFontSizePx] = useState(56);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const voucherRef = useRef<HTMLDivElement>(null);

  const generateImage = async () => {
    if (!voucherRef.current) return;
    try {
      const canvas = await html2canvas(voucherRef.current, {
        scale: 2, // Yüksek kalite
        useCORS: true,
        backgroundColor: null,
      });
      const imgData = canvas.toDataURL("image/png");
      setPreviewImage(imgData);
    } catch (err) {
      console.error("Resim oluşturulurken hata:", err);
      alert("Resim oluşturulurken bir hata meydana geldi.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col bg-zinc-950 p-4 md:p-8 backdrop-blur-md overflow-hidden receipt-modal-container">
      {/* Özel Fontlar ve Yazdırma Stilleri */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .receipt-print-area, .receipt-print-area * { visibility: visible; }
          .receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white !important; }
          .receipt-modal-container { background: white !important; }
          .no-print { display: none !important; }
        }

        .voucher-input {
          background: transparent;
          border: none;
          outline: none;
        }
        .voucher-input:focus {
          outline: none;
        }
        .voucher-input::placeholder {
          color: transparent;
        }
      `}} />

      {/* Üst Bar */}
      <div className="w-full max-w-4xl mx-auto flex flex-col md:flex-row justify-between items-center mb-6 no-print bg-zinc-900 border border-zinc-800 p-4 rounded-2xl shadow-xl gap-4">
        <div>
          <h3 className="text-xl font-bold text-white">Hediye Çeki Oluştur</h3>
          <p className="text-xs text-zinc-400 mt-1">
            Kazanan ismini yandaki kutuya yazın.
          </p>
        </div>
        
        <div className="flex-1 max-w-sm w-full mx-4 flex flex-col gap-3">
          <input 
            type="text" 
            className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-bold text-white outline-none focus:border-blue-500 transition-colors" 
            placeholder="Kazanan İsmi (Örn: AHMAD SALEH)"
            value={winnerName} 
            onChange={e => setWinnerName(e.target.value.toUpperCase())} 
          />
          
          <div className="flex items-center gap-3 bg-zinc-800/50 p-2 rounded-lg border border-zinc-700/50">
            <label className="text-xs text-zinc-400 font-bold whitespace-nowrap">Yazı Boyutu:</label>
            <input 
              type="range" 
              min="20" 
              max="56" 
              value={fontSizePx} 
              onChange={e => setFontSizePx(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <span className="text-xs text-zinc-300 font-bold w-8 text-right">{fontSizePx}px</span>
          </div>
        </div>

        <div className="flex gap-3">
          {!previewImage && (
            <button onClick={generateImage} className="rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-lg">
              🖼️ Resim Olarak Çıktı Al
            </button>
          )}
          <button onClick={handlePrint} className="rounded-xl bg-zinc-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-zinc-600 transition-colors">
            🖨️ Yazdır
          </button>
          <button onClick={onClose} className="rounded-xl bg-red-900/30 border border-red-500/30 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-900/50 transition-colors">
            Kapat
          </button>
        </div>
      </div>

      {/* Önizleme ve Düzenleme Alanı */}
      <div className="flex-1 w-full flex justify-center items-start overflow-y-auto pb-20">
        {previewImage && (
          <div className="w-full max-w-[800px] flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-blue-900/30 border border-blue-500/50 text-blue-400 px-4 py-3 rounded-xl mb-6 text-sm text-center w-full flex flex-col md:flex-row items-center justify-between gap-4">
              <span>✅ Çıktı hazır. Aşağıdaki resme sağ tıklayıp <strong>"Resmi Kopyala"</strong> diyebilirsiniz.</span>
              <button onClick={() => setPreviewImage(null)} className="underline font-bold text-white hover:text-blue-300 whitespace-nowrap">
                Düzenlemeye Dön
              </button>
            </div>
            <img src={previewImage} alt="Hediye Çeki" className="w-full shadow-2xl rounded-xl border border-zinc-800" />
          </div>
        )}

        <div
          ref={voucherRef}
          className={`receipt-print-area w-full max-w-[800px] relative select-none ${previewImage ? "hidden" : "block"}`}
          style={{ containerType: "inline-size" }}
        >
          {/* Arkaplan Resmi */}
          <img 
            src="/voucher-template.webp" 
            alt="Hediye Çeki" 
            className="w-full h-auto block pointer-events-none rounded-xl"
          />

          {/* FÜR İsim Alanı (Sadece Yazı, Arkaplan Yok) */}
          <div 
            className="absolute pointer-events-none overflow-hidden flex items-center"
            style={{
              // Konumlandırma: Kutu artık tam olarak "FÜR:" metninin dibinden başlıyor
              left: "18.5%", // FÜR yazısının bittiği noktaya milimetrik ayarlandı (üstüne binmez)
              top: "58.2%", 
              transform: "translate(0, -50%)", 
              width: "64.5%", // Sağ taraftaki beyazlık bitiminden önce durması için ayarlandı
              height: "10%", 
              paddingTop: "0.5%", 
              
              fontFamily: "\"Segoe UI\", Arial, sans-serif",
              fontWeight: 800,
              fontStyle: "italic",
              // Responsive davranışı koruyarak, px cinsinden slider'dan gelen değeri cqw formatına çeviriyoruz
              fontSize: `${fontSizePx / 8}cqw`, 
              color: "#E31E24",
              letterSpacing: "1.5px",
              textShadow: "0px 3px 8px rgba(0,0,0,0.25)",
              textTransform: "uppercase",
              
              // Sola tam hizalama garantisi:
              justifyContent: "flex-start",
              textAlign: "left",
              whiteSpace: "nowrap",
            }}
          >
            {winnerName}
          </div>
        </div>
      </div>
    </div>
  );
}
