import fs from 'fs';
const a = fs.readFileSync('scripts/index-b64-a.txt','utf8').trim();
const b = fs.readFileSync('scripts/index-b64-b.txt','utf8').trim();
const html = Buffer.from(a+b,'base64').toString('utf8');
fs.writeFileSync('index.html', html);
console.log('assembled', html.length, 'TV', html.includes('bindBigChartHover'));
