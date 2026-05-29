const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// 131~142번줄 (0-indexed: 130~141) 제거 - addCustomArea 함수 + customAreas 변수
lines.splice(130, 13);

fs.writeFileSync('app/profile/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
