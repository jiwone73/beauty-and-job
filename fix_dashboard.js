const fs = require('fs');
let content = fs.readFileSync('app/company/dashboard/page.tsx', 'utf8');

// 1. 헤더 우측 "공고 등록" → "전체 보기" 링크 (관리 페이지로)
content = content.replace(
  `          <h2 className="company-card-title">내 채용공고</h2>
          <Link href="/company/dashboard/jobs/new" className="company-primary-btn">
            <Plus size={15} /> 공고 등록
          </Link>`,
  `          <h2 className="company-card-title">내 채용공고</h2>
          <Link href="/company/dashboard/jobs" className="company-text-link">
            전체 보기 →
          </Link>`
);

// 2. 유형 표시 BOTH 대응 (STORE 외에는 기업으로 안 가게)
content = content.replace(
  `<td className="company-td-sub">{job.job_type === "OFFICE" ? "기업" : "매장"}</td>`,
  `<td className="company-td-sub">{job.job_type === "STORE" ? "매장" : "기업"}</td>`
);

fs.writeFileSync('app/company/dashboard/page.tsx', content, 'utf8');
console.log('완료');
