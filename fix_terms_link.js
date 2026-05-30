const fs = require('fs');
let content = fs.readFileSync('app/login/page.tsx', 'utf8');
content = content
  .replace('href="/terms"', 'href="/support/terms"')
  .replace('href="/privacy"', 'href="/support/privacy"');
fs.writeFileSync('app/login/page.tsx', content, 'utf8');
console.log('완료');
