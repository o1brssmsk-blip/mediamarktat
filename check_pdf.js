const fs = require('fs');
import('pdfjs-dist/legacy/build/pdf.mjs').then(async (pdfjsLib) => {
  const data = new Uint8Array(fs.readFileSync('public/template.pdf'));
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  textContent.items.forEach(item => {
    if (item.str.trim()) {
      console.log(`Text: "${item.str}", x: ${item.transform[4]}, y: ${item.transform[5]}, height: ${item.height}, width: ${item.width}`);
    }
  });
});