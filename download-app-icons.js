const fs = require('fs');
const path = require('path');
const https = require('https');

// Banka slug'larına karşılık gelen App Store arama terimleri (En doğru uygulamayı bulmak için)
const appSearchTerms = {
  "bank-austria": "MobileBanking Bank Austria",
  "bawag-ag": "BAWAG App",
  "erste-bank-und-sparkassen": "George Österreich",
  "raiffeisen-bankengruppe-oesterreich": "Mein ELBA-App",
  "volksbanken": "Volksbank hausbanking",
  "posojilnica-bank-egen": "Poso App",
  "bank99-ag": "bank99",
  "btv-vier-lander-bank": "BTV Banking App",
  "bks-bank-ag": "BKS App",
  "oberbank-ag": "Oberbank App",
  "hypo-noe-lb": "HYPO NOE 24/7",
  "hypo-tirol-bank-ag": "Hypo Tirol mobile",
  "hypo-vorarlberg-bank-ag": "Hypo Vorarlberg",
  "hypo-bank-burgenland-ag": "Hypo Burgenland",
  "hypo-oberoesterreich-salzburg": "HYPO OÖ",
  "oesterreichische-aerzte-und-apothekerbank": "Ärzte- und Apothekerbank",
  "bankhaus-carl-spangler-und-co-ag": "Spängler Online",
  "schelhammer-capital-bank-ag": "Schelhammer",
  "easybank": "easybank",
  "schoellerbank-ag": "Schoellerbank",
  "sparda-bank-wien": "Sparda Wien",
  "volkskreditbank-ag": "VKB Connect",
  "austrian-anadi-bank-ag": "Anadi",
  "marchfelder-bank": "Marchfelder Bank",
  "dolomitenbank": "DolomitenBanking"
};

const outDir = path.join(__dirname, 'public', 'app-icons');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) return reject(new Error('Status ' + res.statusCode));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function main() {
  for (const [slug, term] of Object.entries(appSearchTerms)) {
    console.log(`Searching App Store for ${slug} ("${term}")...`);
    try {
      const searchUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&entity=software&country=at&limit=1`;
      const result = await fetchJSON(searchUrl);
      
      if (result.resultCount > 0) {
        // En yüksek çözünürlüklü ikonu al
        const imgUrl = result.results[0].artworkUrl512 || result.results[0].artworkUrl100;
        const dest = path.join(outDir, `${slug}.png`);
        
        await download(imgUrl, dest);
        console.log(`  -> Downloaded icon!`);
      } else {
        console.log(`  -> NOT FOUND for term: ${term}`);
        
        // Sadece banka adıyla daha geniş bir arama yapmayı dene
        const fallbackTerm = slug.split('-')[0];
        console.log(`  -> Retrying with fallback term: "${fallbackTerm}"...`);
        const searchUrlFallback = `https://itunes.apple.com/search?term=${encodeURIComponent(fallbackTerm)}&entity=software&country=at&limit=1`;
        const fallbackResult = await fetchJSON(searchUrlFallback);
        
        if (fallbackResult.resultCount > 0) {
          const imgUrl = fallbackResult.results[0].artworkUrl512 || fallbackResult.results[0].artworkUrl100;
          const dest = path.join(outDir, `${slug}.png`);
          await download(imgUrl, dest);
          console.log(`  -> Downloaded icon using fallback!`);
        } else {
          console.log(`  -> COMPLETELY NOT FOUND`);
        }
      }
    } catch (e) {
      console.error(`  -> Error: ${e.message}`);
    }
  }
}

main().catch(console.error);