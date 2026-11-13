const https = require('https');
const fs = require('fs');

const url = 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2560&auto=format&fit=crop';
const file = fs.createWriteStream('public/bg-modern.jpg');

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
  if (res.statusCode !== 200) {
    console.error('Failed:', res.statusCode);
    return;
  }
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Downloaded background!');
  });
}).on('error', (err) => {
  console.error(err);
});
