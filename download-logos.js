const fs = require('fs');
const path = require('path');
const https = require('https');

const banks = [
  { alt: "ABN AMRO", src: "https://pay.ideal.nl/static/ideal-assets/ABNANL2A.svg" },
  { alt: "Adyen", src: "https://pay.ideal.nl/static/ideal-assets/ADYBNL2A.svg" },
  { alt: "ASN Bank", src: "https://pay.ideal.nl/static/ideal-assets/ASNBNL21.svg" },
  { alt: "ASN Bank vh RegioBank", src: "https://pay.ideal.nl/static/ideal-assets/RBRBNL21.svg" },
  { alt: "ASN Bank voorheen SNS", src: "https://pay.ideal.nl/static/ideal-assets/SNSBNL2A.svg" },
  { alt: "bunq", src: "https://pay.ideal.nl/static/ideal-assets/BUNQNL2A.svg" },
  { alt: "BUUT", src: "https://pay.ideal.nl/static/ideal-assets/BUUTNL2A.svg" },
  { alt: "Finom", src: "https://pay.ideal.nl/static/ideal-assets/FNOMNL22.svg" },
  { alt: "ING", src: "https://pay.ideal.nl/static/ideal-assets/INGBNL2A.svg" },
  { alt: "Knab", src: "https://pay.ideal.nl/static/ideal-assets/KNABNL2H.svg" },
  { alt: "Mollie", src: "https://pay.ideal.nl/static/ideal-assets/MLLENL2A.svg" },
  { alt: "N26", src: "https://pay.ideal.nl/static/ideal-assets/NTSBDEB1.svg" },
  { alt: "Nationale-Nederlanden", src: "https://pay.ideal.nl/static/ideal-assets/NNBANL2G.svg" },
  { alt: "Rabobank", src: "https://pay.ideal.nl/static/ideal-assets/RABONL2U.svg" },
  { alt: "Revolut", src: "https://pay.ideal.nl/static/ideal-assets/REVOLT21.svg" },
  { alt: "Triodos Bank", src: "https://pay.ideal.nl/static/ideal-assets/TRIONL2U.svg" },
  { alt: "Van Lanschot Kempen", src: "https://pay.ideal.nl/static/ideal-assets/FVLBNL22.svg" },
  { alt: "Yoursafe", src: "https://pay.ideal.nl/static/ideal-assets/BITSNL2A.svg" }
];

const dir = path.join(__dirname, 'public', 'bank-logos');
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

async function download() {
  for (const bank of banks) {
    const slug = slugify(bank.alt);
    const file = path.join(dir, `${slug}.svg`);
    
    await new Promise((resolve, reject) => {
      https.get(bank.src, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download ${bank.src}`));
          return;
        }
        const stream = fs.createWriteStream(file);
        res.pipe(stream);
        stream.on('finish', () => {
          stream.close();
          console.log(`Downloaded ${slug}.svg`);
          resolve();
        });
      }).on('error', reject);
    });
  }
}

download().catch(console.error);
