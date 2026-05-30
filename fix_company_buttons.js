const fs = require('fs');
let content = fs.readFileSync('app/company/page.tsx', 'utf8');

// 1. 상단 카드 3개의 "시작하기" 버튼 제거 (store/corp/both 각각)
['store', 'corp', 'both'].forEach((type) => {
  content = content.replace(
    `                  <Link href="/company/signup?type=${type}" className="co-type-btn">
                    시작하기 <ArrowRight size={14} />
                  </Link>
`,
    ''
  );
});

// 2. 중간 매장 섹션 버튼 제거
content = content.replace(
  `            <Link href="/company/signup?type=store" className="co-btn-primary" style={{ marginTop: 24, display: "inline-flex" }}>
              매장 채용공고 등록하기 <ArrowRight size={15} style={{ marginLeft: 6 }} />
            </Link>
`,
  ''
);

// 3. 중간 기업 섹션 버튼 제거
content = content.replace(
  `            <Link href="/company/signup?type=corp" className="co-btn-primary purple" style={{ marginTop: 24, display: "inline-flex" }}>
              기업 채용공고 등록하기 <ArrowRight size={15} style={{ marginLeft: 6 }} />
            </Link>
`,
  ''
);

fs.writeFileSync('app/company/page.tsx', content, 'utf8');
console.log('완료');
