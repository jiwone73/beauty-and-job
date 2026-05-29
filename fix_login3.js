const fs = require('fs');
const lines = fs.readFileSync('app/login/page.tsx', 'utf8').split('\n');
lines.splice(73, 2);
fs.writeFileSync('app/login/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
