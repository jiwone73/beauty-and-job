const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// 218~228번줄 (0-indexed: 217~227) addCustomOfficeArea 함수 제거
lines.splice(217, 11);

fs.writeFileSync('app/profile/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
