const fs = require('fs');
let content = fs.readFileSync('app/company/page.tsx', 'utf8');

// 1. 채용성공형 매칭 버튼 제거 (광고 버튼만 남김)
content = content.replace(
  `            <Link href="/company/matching" className="co-cta-product-btn green">
              🤝 채용성공형 매칭 알아보기
            </Link>
`,
  ''
);

// 2. FAQ 채용성공형 항목 제거
content = content.replace(
  `  { q: "채용성공형 서비스도 가능한가요?", a: "네. 채용 성사 시에만 수수료가 발생하는 성과형 인재 매칭 서비스도 운영 중입니다. 별도 상담 후 진행됩니다." },\n`,
  ''
);

fs.writeFileSync('app/company/page.tsx', content, 'utf8');
console.log('완료');
