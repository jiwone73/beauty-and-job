const fs = require('fs');
let content = fs.readFileSync('app/profile/page.tsx', 'utf8');

// 1. customOfficeAreaInput state 제거
content = content.replace(
  /\n  const \[customOfficeAreaInput, setCustomOfficeAreaInput\] = useState\(""\);/g, ''
);

// 2. addCustomOfficeArea 함수 제거
content = content.replace(
  /\n  const addCustomOfficeArea = \(\) => \{[\s\S]*?\n  \};(\n  const handleCareerComplete)/,
  '\n  const handleCareerComplete'
);

// 3. customOfficeAreas 변수 제거
content = content.replace(
  /\n  const customOfficeAreas = officeJobAreas\.filter\(\(a\) => !PRESET_OFFICE_JOB_AREAS\.includes\(a\)\);/g, ''
);

// 4. 안내 텍스트 수정
content = content.replace(
  '해당하는 직군 영역을 선택하거나 직접 입력해 주세요 (1~3개 권장)',
  '해당하는 직군 영역을 선택해 주세요 (1~3개 권장)'
);

// 5. customOfficeAreas 렌더링 블록 제거
content = content.replace(
  /\s*\{customOfficeAreas\.map\(\(area\) => \([\s\S]*?\)\)\}/,
  ''
);

// 6. 직접 입력 input + 버튼 블록 제거
content = content.replace(
  /\s*<div style=\{\{display:"flex",gap:"6px"\}\}>\s*<input[\s\S]*?추가\s*<\/button>\s*<\/div>/,
  ''
);

fs.writeFileSync('app/profile/page.tsx', content, 'utf8');
console.log('완료');
