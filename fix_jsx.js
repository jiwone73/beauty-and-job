const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// 325~329번줄 (0-indexed: 324~328) 잔재 코드 제거
// style={{padding:"6px 14px"...×</span></button>))} 블록
lines.splice(324, 6);

fs.writeFileSync('app/profile/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
