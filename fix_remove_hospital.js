const fs = require('fs');
let c = fs.readFileSync('app/company/page.tsx', 'utf8');

// 1. 히어로
c = c.replace(
  '헤어·네일·피부·메이크업 매장부터 화장품 브랜드, 병원·클리닉, 교육기관까지',
  '헤어·네일·피부·메이크업 매장부터 화장품 브랜드, 교육기관까지'
);

// 2. split 섹션
c = c.replace(
  '화장품 브랜드, 프랜차이즈, 병원·클리닉, 교육기관 등 뷰티 관련 기업의 전문직 채용을 지원합니다.',
  '화장품 브랜드, 프랜차이즈, 교육기관, 유통사 등 뷰티 관련 기업의 전문직 채용을 지원합니다.'
);

fs.writeFileSync('app/company/page.tsx', c, 'utf8');
console.log('완료');
