const fs = require('fs');
let content = fs.readFileSync('app/jobs/page.tsx', 'utf8');

// 1. API 매핑 - BOTH 처리
content = content.replace(
  `            type: j.job_type === 'OFFICE' ? '기업' : '매장',`,
  `            type: j.job_type === 'OFFICE' ? '기업' : j.job_type === 'STORE' ? '매장' : 'both',`
);

// 2. 필터링 로직 - BOTH 공고는 기업/매장 탭 둘 다 노출
content = content.replace(
  `    const matchType = jobTypeFilter === "전체" || j.type === jobTypeFilter;`,
  `    const matchType = jobTypeFilter === "전체" || j.type === jobTypeFilter || j.type === "both";`
);

fs.writeFileSync('app/jobs/page.tsx', content, 'utf8');
console.log('완료');
