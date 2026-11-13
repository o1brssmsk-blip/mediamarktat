"use client";

import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";

export function ReceiptModal({ onClose }: { onClose: () => void }) {
  const [senderAccount, setSenderAccount] = useState("AT72 1200 0100 3803 9706");
  const [senderName, setSenderName] = useState("Ahmad Saleh");
  
  const [receiverName, setReceiverName] = useState("Barbara Maria Juen-Walder");
  const [receiverIban, setReceiverIban] = useState("AT74 2050 3033 0283 4456");
  
  const [amount, setAmount] = useState("390.00");
  const [reference, setReference] = useState("Rent sept 23");
  const [dueDate, setDueDate] = useState("04.09.2023");
  
  const [headerDate, setHeaderDate] = useState("Monday 04.09.2023 11:29:32");
  const [headerName, setHeaderName] = useState("Saleh Ahmad");

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdfRendered, setPdfRendered] = useState(false);

  useEffect(() => {
    const renderPdf = async () => {
      try {
        const pdfjsLib = await import("pdfjs-dist");
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

        const loadingTask = pdfjsLib.getDocument("/template.pdf");
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);

        const scale = 2; // Yüksek çözünürlük
        const viewport = page.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        // --- Orijinal yazıları Canvas üzerinde kendi arkaplan rengiyle silme ---
        // PDF'in o bölgesindeki arkaplan rengi beyazdır (#FFFFFF)
        context.fillStyle = "#FFFFFF";
        const erase = (x: number, y: number, w: number, h: number) => {
           const canvasX = (x / 595.28) * canvas.width;
           const canvasY = ((841.89 - y) / 841.89) * canvas.height;
           const canvasW = (w / 595.28) * canvas.width;
           const canvasH = (h / 841.89) * canvas.height;
           context.fillRect(canvasX - 5, canvasY - canvasH - 5, canvasW + 20, canvasH + 10);
        };

        // Orijinal yazıları temizliyoruz ki üst üste binmesin
        erase(450.5, 788.63, 120, 8);
        erase(500, 776.74, 80, 10);
        erase(220.31, 659.29, 150, 10);
        erase(220.31, 644.66, 150, 10);
        erase(220.31, 595.95, 180, 10);
        erase(220.31, 581.33, 150, 10);
        erase(220.31, 535.61, 80, 10);
        erase(220.31, 520.99, 150, 10);
        erase(220.31, 506.36, 100, 10);
        
        setPdfRendered(true);
      } catch (error) {
        console.error("PDF yüklenirken hata oluştu:", error);
      }
    };

    renderPdf();
  }, []);

  const generateImage = async () => {
    if (!receiptRef.current) return;
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(receiptRef.current!, {
          scale: 2,
          useCORS: true,
          logging: false
        });
        const imgData = canvas.toDataURL("image/png");
        setPreviewImage(imgData);
      } catch (err) {
        console.error("Resim oluşturulurken hata:", err);
      }
    }, 150);
  };

  const handlePrint = () => {
    window.print();
  };

  const getTextStyle = (x: number, y: number, fontSizePdf: number, isRightAligned = false, isBold = false) => {
    const leftPercent = (x / 595.28) * 100;
    const topPercent = ((841.89 - y) / 841.89) * 100;
    // PDF orijinal genişliğine (595.28) göre font boyutunun yüzde oranı
    const fontSizeCqw = (fontSizePdf / 595.28) * 100;
    
    return {
      position: "absolute" as const,
      left: `${leftPercent}%`,
      top: `${topPercent}%`,
      transform: "translateY(-88%)", // Baseline hizalamasını PDF'e göre hassaslaştırdık
      color: "#222222", // Tam siyah yerine PDF'e daha uygun çok koyu gri
      fontSize: `${fontSizeCqw}cqw`, // Container'ın genişliğine göre tam PDF font boyutu
      fontFamily: "Arial, Helvetica, sans-serif", // PDF fontuna en yakın standart font
      fontWeight: isBold ? "bold" : "normal",
      textAlign: isRightAligned ? "right" as const : "left" as const,
      pointerEvents: "none" as const, // Tıklamaları engelle, sadece görsel
      whiteSpace: "nowrap" as const,
      letterSpacing: "-0.01em", // PDF font sıkışıklığını simüle etmek için
    };
  };

  return (
    <div className="fixed inset-0 z-[300] flex flex-col md:flex-row bg-zinc-950 p-4 md:p-6 backdrop-blur-md overflow-hidden receipt-modal-container">
      {/* Print styles */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .receipt-print-area, .receipt-print-area * { visibility: visible; }
          .receipt-print-area { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 0; background: white !important; }
          .receipt-modal-container { background: white !important; }
          .no-print { display: none !important; }
        }
      `}} />

      {/* Control Panel (Sol Menü) */}
      <div className="w-full md:w-1/3 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 overflow-y-auto no-print text-white flex flex-col h-full max-h-full shadow-2xl">
        <div className="flex justify-between items-center mb-6 border-b border-zinc-800 pb-4">
          <h3 className="text-xl font-bold">Dekont Bilgileri</h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl">✕</button>
        </div>

        <div className="space-y-4 flex-1">
          <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-xs text-blue-300 mb-4 leading-relaxed">
            Bilgileri buradan düzenleyin. Sağdaki PDF anında güncellenecektir. PDF formatı gereği orijinal yazılar otomatik silinip yerine sizin yazdıklarınız orijinal fontla yerleştirilir.
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">Sağ Üst Tarih</label>
              <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors" value={headerDate} onChange={e => setHeaderDate(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 mb-1">Sağ Üst İsim</label>
              <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500 transition-colors" value={headerName} onChange={e => setHeaderName(e.target.value)} />
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h4 className="text-sm font-bold text-blue-500 mb-3">Originator (Gönderen)</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Hesap / IBAN</label>
                  <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" value={senderAccount} onChange={e => setSenderAccount(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">İsim</label>
                  <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" value={senderName} onChange={e => setSenderName(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h4 className="text-sm font-bold text-blue-500 mb-3">Payee (Alıcı)</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">İsim</label>
                  <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" value={receiverName} onChange={e => setReceiverName(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">IBAN</label>
                  <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" value={receiverIban} onChange={e => setReceiverIban(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="border-t border-zinc-800 pt-4">
              <h4 className="text-sm font-bold text-blue-500 mb-3">Ödeme Detayları</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Miktar</label>
                    <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" value={amount} onChange={e => setAmount(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Son Tarih</label>
                    <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Açıklama (Reference)</label>
                  <input type="text" className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500" value={reference} onChange={e => setReference(e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <button onClick={generateImage} className="w-full rounded-xl bg-blue-700 px-4 py-3.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors shadow-lg">
            🖼️ Resim Olarak Çıktı Al
          </button>
          <button onClick={handlePrint} className="w-full rounded-xl bg-zinc-700 px-4 py-3.5 text-sm font-bold text-white hover:bg-zinc-600 transition-colors">
            🖨️ Yazdır / PDF Kaydet
          </button>
        </div>
      </div>

      {/* Preview Area (Sağ PDF) */}
      <div className="w-full md:w-2/3 p-4 md:p-8 flex justify-center items-start overflow-y-auto">
        {previewImage && (
          <div className="w-full max-w-[700px] flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-blue-900/30 border border-blue-500/50 text-blue-400 px-4 py-3 rounded-xl mb-6 text-sm text-center w-full flex flex-col md:flex-row items-center justify-between gap-4">
              <span>✅ Çıktı hazır. Aşağıdaki resme sağ tıklayıp <strong>"Resmi Kopyala"</strong> diyebilirsiniz.</span>
              <button onClick={() => setPreviewImage(null)} className="underline font-bold text-white hover:text-blue-300 whitespace-nowrap">
                Düzenlemeye Dön
              </button>
            </div>
            <img src={previewImage} alt="Dekont" className="w-full shadow-2xl rounded-sm border border-zinc-800" />
          </div>
        )}

        <div
          ref={receiptRef}
          className={`receipt-print-area w-full max-w-[700px] bg-white text-black shadow-2xl relative select-none ${previewImage ? "hidden" : "block"}`}
          style={{ aspectRatio: "595.28 / 841.89", containerType: "inline-size" }}
        >
          {/* PDF Background Canvas */}
          <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full pointer-events-none" />

          {!pdfRendered && (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 z-10">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-zinc-500 font-bold">PDF Hazırlanıyor...</p>
              </div>
            </div>
          )}

          {/* TEXT OVERLAYS */}
          {pdfRendered && (
            <div className="relative z-20 w-full h-full">
              <div style={getTextStyle(450.5, 788.63, 8)}>{headerDate}</div>
              <div style={getTextStyle(500, 776.74, 10, false, true)}>{headerName}</div>
              
              <div style={getTextStyle(220.31, 659.29, 10)}>{senderAccount} {senderAccount && !senderAccount.includes("AUD") ? "AUD" : ""}</div>
              <div style={getTextStyle(220.31, 644.66, 10)}>{senderName}</div>
              
              <div style={getTextStyle(220.31, 595.95, 10)}>{receiverName}</div>
              <div style={getTextStyle(220.31, 581.33, 10)}>{receiverIban}</div>
              
              <div style={getTextStyle(220.31, 535.61, 10)}>{amount} {amount && !amount.includes("AUD") ? "AUD" : ""}</div>
              <div style={getTextStyle(220.31, 520.99, 10)}>{reference}</div>
              <div style={getTextStyle(220.31, 506.36, 10)}>{dueDate}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
