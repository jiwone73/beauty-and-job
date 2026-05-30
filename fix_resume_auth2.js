const fs = require('fs');
const lines = fs.readFileSync('app/profile/resume/page.tsx', 'utf8').split('\n');
// 42번 줄(인덱스 41) "if (!token) return;"을 교체
const idx = lines.findIndex((l, i) => i >= 40 && i <= 43 && l.includes('if (!token) return;'));
if (idx === -1) { console.log('못찾음'); process.exit(1); }
lines[idx] = '    if (!token) {\n      router.replace("/login");\n      return;\n    }';
fs.writeFileSync('app/profile/resume/page.tsx', lines.join('\n'), 'utf8');
console.log('완료 (줄 ' + (idx+1) + ')');
