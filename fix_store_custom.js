const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// customAreas 렌더링 블록 + 직접입력 input/button 블록 제거
// 363~384번줄 (0-indexed: 362~383) 제거
lines.splice(362, 22);

// 안내 텍스트 수정
const joined = lines.join('\n').replace(
  '해당하는 시술 분야를 선택하거나 직접 입력해 주세요',
  '해당하는 시술 분야를 선택해 주세요'
);

fs.writeFileSync('app/profile/page.tsx', joined, 'utf8');
console.log('완료');
