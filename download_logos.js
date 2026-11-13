const fs = require('fs');
const https = require('https');
const path = require('path');

const logos = [
  { url: 'https://mijn.ing.nl/login/assets/images/svg/ing-logo.svg', dest: 'public/bank-logos/ing-detail.svg' },
  { url: 'https://www.nn.nl/nn-static/static/responsivepresentation/img/logo-nn.svg', dest: 'public/bank-logos/nationale-nederlanden-detail.svg' },
  { url: 'https://bankieren.triodos.nl/ib-seam/angularIB/assets/images/triodos-logo.svg', dest: 'public/bank-logos/triodos-bank-detail.svg' },
  { url: 'https://bankieren.rabobank.nl/s-t-a-t-i-c/msp/authentication/v2/vrs_23291945/assets/images/rabobank-white.svg', dest: 'public/bank-logos/rabobank-detail.svg' },
  { url: 'https://accounts.yoursafe.com/account/static/my_bitsafe/images/yoursafe/logo.svg', dest: 'public/bank-logos/yoursafe-detail.svg' },
  { url: 'https://auth.private.vanlanschotkempen.com/media/vlklogo-4F225YXH.svg', dest: 'public/bank-logos/van-lanschot-kempen-detail.svg' }
];

logos.forEach(logo => {
  https.get(logo.url, (res) => {
    const filePath = path.join(__dirname, logo.dest);
    const file = fs.createWriteStream(filePath);
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded: ${logo.dest}`);
    });
  }).on('error', (err) => {
    console.error(`Error downloading ${logo.url}:`, err.message);
  });
});
