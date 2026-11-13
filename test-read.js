const fs = require('fs');
const text = fs.readFileSync('public/estonian-banks/bigbank/1.html', 'utf8');
const match = text.match(/.{0,300}<input.{0,300}/i);
if (match) console.log(match[0]);
