const fs = require('fs');
const { createCanvas } = require('canvas');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

async function convert() {
  const data = new Uint8Array(fs.readFileSync('public/template.pdf'));
  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDocument = await loadingTask.promise;
  const page = await pdfDocument.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  
  const canvas = createCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext('2d');
  
  const renderContext = {
    canvasContext: ctx,
    viewport: viewport
  };
  
  await page.render(renderContext).promise;
  
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('public/template.png', buffer);
  console.log('Done!');
}
convert().catch(console.error);