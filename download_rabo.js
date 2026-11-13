const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://www.dba.org.uk/wp-content/uploads/2025/09/rabobank-apeldoorn-albatross-logo-clip-art-png-favpng-DPWpT9W5tY68MNK0JNzawZkTW-768x261.jpg';
const dest = path.join(__dirname, 'public/bank-logos/rabobank-detail.jpg');

https.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to get '${url}' (${res.statusCode})`);
    return;
  }
  const file = fs.createWriteStream(dest);
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log(`Downloaded: rabobank-detail.jpg`);
  });
}).on('error', (err) => {
  console.error(`Error downloading:`, err.message);
});
