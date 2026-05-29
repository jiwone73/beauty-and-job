const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// 326번줄 (0-indexed: 325) 잔재 ))} 제거
lines.splice(325, 1);

fs.writeFileSync('app/profile/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
