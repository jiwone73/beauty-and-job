const fs = require('fs');
let c = fs.readFileSync('app/company/page.tsx', 'utf8');

// 매장회원
c = c.replace(
  `                      <li><CheckCircle2 size={13} /> 채용공고 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 상단 노출로 더 많은 지원자</li>`,
  `                      <li><CheckCircle2 size={13} /> 채용공고 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 상단 노출로 더 많은 지원자</li>
                      <li><CheckCircle2 size={13} /> 지원자 연락처 무료 확인</li>
                      <li><CheckCircle2 size={13} /> 간편한 현장직 공고 관리</li>`
);

// 기업회원
c = c.replace(
  `                      <li><CheckCircle2 size={13} /> 채용공고 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 인재 검색·추천 서비스</li>`,
  `                      <li><CheckCircle2 size={13} /> 채용공고 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 인재 검색·추천 서비스</li>
                      <li><CheckCircle2 size={13} /> 지원자 연락처 무료 확인</li>
                      <li><CheckCircle2 size={13} /> 프리미엄 상단 노출</li>`
);

// 기업+매장
c = c.replace(
  `                      <li><CheckCircle2 size={13} /> 사무직·현장직 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 통합 대시보드로 한번에 관리</li>`,
  `                      <li><CheckCircle2 size={13} /> 사무직·현장직 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 통합 대시보드로 한번에 관리</li>
                      <li><CheckCircle2 size={13} /> 매장·기업 지원자 통합 관리</li>
                      <li><CheckCircle2 size={13} /> 인재 검색·추천 서비스</li>`
);

fs.writeFileSync('app/company/page.tsx', c, 'utf8');
console.log('완료');
