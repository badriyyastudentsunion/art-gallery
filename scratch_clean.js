const fs = require('fs');
const path = require('path');

const html = fs.readFileSync('public/Result files/01.html', 'utf8');
const clean = html.replace(/data:image\/[^;]+;base64,[^)"']+/g, 'BASE64_IMAGE_DATA');
fs.writeFileSync('temp_clean_01.html', clean);
console.log('Cleaned file written. Total lines:', clean.split('\n').length);
