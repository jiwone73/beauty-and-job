const fs = require('fs');
let content = fs.readFileSync('app/globals.css', 'utf8');
content = content.replace(
  '.company-logo-name { font-size: 13px; font-weight: 700; color: #1a1a1a; }',
  '.company-logo-name { font-size: 15px; font-weight: 700; color: #1a1a1a; }'
);
content = content.replace(
  '.company-logo-category { font-size: 11px; color: #aaa; }',
  '.company-logo-category { font-size: 13px; color: #888; }'
);
fs.writeFileSync('app/globals.css', content, 'utf8');
console.log('완료');
