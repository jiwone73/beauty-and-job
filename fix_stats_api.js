const fs = require('fs');
let content = fs.readFileSync('app/api/company/dashboard/stats/route.ts', 'utf8');

// 1. companyId 다음에 job_type 파라미터 추출 + 필터 조건 추가
content = content.replace(
  `  const companyId = auth!.sub`,
  `  const companyId = auth!.sub
  const jobTypeParam = req.nextUrl.searchParams.get('job_type') // OFFICE | STORE | null
  const jobTypeFilter = jobTypeParam === 'OFFICE' || jobTypeParam === 'STORE'
    ? \` AND jp.job_type = '\${jobTypeParam}'\`
    : ''
  // job_postings 단독 쿼리용 (별칭 없음)
  const jobTypeFilterNoAlias = jobTypeParam === 'OFFICE' || jobTypeParam === 'STORE'
    ? \` AND job_type = '\${jobTypeParam}'\`
    : ''`
);

// 2. active_jobs 쿼리에 필터 추가
content = content.replace(
  `      \`SELECT COUNT(*)::int AS cnt FROM job_postings 
       WHERE company_id = $1 AND status = 'ACTIVE'\`,`,
  `      \`SELECT COUNT(*)::int AS cnt FROM job_postings 
       WHERE company_id = $1 AND status = 'ACTIVE'\${jobTypeFilterNoAlias}\`,`
);

// 3. total_applications 쿼리에 필터 추가
content = content.replace(
  `      \`SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1\`,`,
  `      \`SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1\${jobTypeFilter}\`,`
);

// 4. today_applications 쿼리에 필터 추가
content = content.replace(
  `      \`SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.applied_at::date = CURRENT_DATE\`,`,
  `      \`SELECT COUNT(*)::int AS cnt FROM applications a
       JOIN job_postings jp ON jp.id = a.job_posting_id
       WHERE jp.company_id = $1 AND a.applied_at::date = CURRENT_DATE\${jobTypeFilter}\`,`
);

// 5. trends 쿼리에 필터 추가
content = content.replace(
  `       AND a.job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1)`,
  `       AND a.job_posting_id IN (SELECT id FROM job_postings WHERE company_id = $1\${jobTypeFilterNoAlias})`
);

fs.writeFileSync('app/api/company/dashboard/stats/route.ts', content, 'utf8');
console.log('완료');
