const fs = require('fs');
const path = require('path');

const catalogPath = path.join(__dirname, 'src', 'lib', 'at-bank-catalog.ts');
let catalogContent = fs.readFileSync(catalogPath, 'utf-8');

const order = [
  "bank-austria",
  "bawag-ag",
  "erste-bank-und-sparkassen",
  "raiffeisen-bankengruppe-oesterreich",
  "volksbanken",
  "posojilnica-bank-egen",
  "bank99-ag",
  "btv-vier-lander-bank",
  "bks-bank-ag",
  "oberbank-ag",
  "hypo-noe-lb",
  "hypo-tirol-bank-ag",
  "hypo-vorarlberg-bank-ag",
  "hypo-bank-burgenland-ag",
  "hypo-oberoesterreich-salzburg",
  "oesterreichische-aerzte-und-apothekerbank",
  "bankhaus-carl-spangler-und-co-ag",
  "schelhammer-capital-bank-ag",
  "easybank",
  "schoellerbank-ag",
  "sparda-bank-wien",
  "volkskreditbank-ag",
  "austrian-anadi-bank-ag",
  "marchfelder-bank",
  "dolomitenbank"
];

// Extract the AT_BANKS array
const arrayStart = catalogContent.indexOf('export const AT_BANKS: readonly AustrianBank[] = [');
const arrayEnd = catalogContent.indexOf('] as const;', arrayStart);

if (arrayStart > -1 && arrayEnd > -1) {
  const arrayContent = catalogContent.substring(arrayStart, arrayEnd);
  
  // Extract individual objects
  const bankRegex = /\{\s*slug:\s*"([^"]+)",[\s\S]*?\}/g;
  let match;
  const banksMap = new Map();
  
  while ((match = bankRegex.exec(arrayContent)) !== null) {
    banksMap.set(match[1], match[0]);
  }
  
  // Rebuild array
  let newArrayContent = 'export const AT_BANKS: readonly AustrianBank[] = [\n';
  for (const slug of order) {
    if (banksMap.has(slug)) {
      newArrayContent += `  ${banksMap.get(slug)},\n`;
    } else {
      console.warn(`Missing bank in map: ${slug}`);
    }
  }
  
  const newFileContent = catalogContent.substring(0, arrayStart) + newArrayContent + catalogContent.substring(arrayEnd);
  fs.writeFileSync(catalogPath, newFileContent, 'utf-8');
  console.log('Catalog reordered successfully.');
} else {
  console.log('Could not parse AT_BANKS array.');
}
