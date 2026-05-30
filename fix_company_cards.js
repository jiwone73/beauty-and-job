const fs = require('fs');
let c = fs.readFileSync('app/company/page.tsx', 'utf8');

// 1. 제목 카피 (C안)
c = c.replace(
  `              <h2 className="co-combined-title">어떤 유형으로 시작하시나요?</h2>
              <p className="co-combined-sub">가입 유형에 따라 맞춤 서비스를 제공합니다</p>`,
  `              <h2 className="co-combined-title">하나의 플랫폼에서<br />매장과 기업 채용을 한번에</h2>
              <p className="co-combined-sub">매장, 기업, 기업+매장 — 운영 형태에 맞춰 자유롭게 채용하세요</p>`
);

// 2. 매장회원 혜택 (무료 공고 강조)
c = c.replace(
  `                    <p className="co-type-desc">헤어샵·네일샵·피부관리실·에스테틱·왁싱샵·속눈썹샵 운영자</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 무료 채용공고 등록</li>
                      <li><CheckCircle2 size={13} /> 현장직 지원자 매칭</li>
                    </ul>`,
  `                    <p className="co-type-desc">헤어·네일·피부·메이크업 등 뷰티 매장 운영자</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 채용공고 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 상단 노출로 더 많은 지원자</li>
                    </ul>`
);

// 3. 기업회원 (병원·클리닉 제거, 무료공고+인재검색)
c = c.replace(
  `                    <p className="co-type-desc">화장품 브랜드·프랜차이즈·병원·클리닉·교육기관·유통사</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 무료 공고 + 프리미엄 서비스</li>
                      <li><CheckCircle2 size={13} /> 광고·노출 상품 이용 가능</li>
                    </ul>`,
  `                    <p className="co-type-desc">화장품 브랜드·프랜차이즈·교육기관·유통사</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 채용공고 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 인재 검색·추천 서비스</li>
                    </ul>`
);

// 4. 기업+매장 (무료공고 강조 추가)
c = c.replace(
  `                    <p className="co-type-desc">본사와 직영·가맹 매장을 함께 운영하는 브랜드</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 사무직·현장직 동시 채용</li>
                      <li><CheckCircle2 size={13} /> 통합 대시보드 관리</li>
                    </ul>`,
  `                    <p className="co-type-desc">본사와 직영·가맹 매장을 함께 운영하는 브랜드</p>
                    <ul className="co-type-list">
                      <li><CheckCircle2 size={13} /> 사무직·현장직 무료 등록</li>
                      <li><CheckCircle2 size={13} /> 통합 대시보드로 한번에 관리</li>
                    </ul>`
);

fs.writeFileSync('app/company/page.tsx', c, 'utf8');
console.log('완료');
