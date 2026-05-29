const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');
const lines = content.split('\n');

// 1. customAreaInput state 제거 (75번줄, 0-indexed: 74)
const stateIdx = lines.findIndex(l => l.includes('const [customAreaInput, setCustomAreaInput]'));
if (stateIdx >= 0) lines.splice(stateIdx, 1);

// 2. addCustomArea 함수 + customAreas 변수 제거 (131~142번줄 근처)
let joined = lines.join('\n');

joined = joined.replace(
  /\n  const addCustomArea = \(\) => \{[\s\S]*?\n  \};\n  const customAreas = skillAreas\.filter\(\(a\) => !PRESET_SKILL_AREAS\.includes\(a\)\);/,
  ''
);

// 3. 363번줄 근처 잔여 버튼 스타일 + 추가 버튼 제거
joined = joined.replace(
  /\s*style=\{\{padding:"0 14px",borderRadius:"8px",border:"none",background: customAreaInput\.trim\(\)[\s\S]*?추가\s*<\/button>\s*<\/div>/,
  '\n                  </div>'
);

fs.writeFileSync('app/profile/page.tsx', joined, 'utf8');
console.log('완료');
