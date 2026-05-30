const fs = require('fs');
const lines = fs.readFileSync('app/company/dashboard/page.tsx', 'utf8').split('\n');

// 68번줄 (const headers...) 다음에 companyType fetch 삽입
const idx = lines.findIndex(l => l.includes('const headers = { Authorization: `Bearer ${token}` };'));
if (idx === -1) { console.log('못찾음'); process.exit(1); }

lines.splice(idx + 1, 0,
  '    fetch("/api/company/me", { headers })',
  '      .then((r) => r.json())',
  '      .then((res) => { if (res.success) setCompanyType(res.data.company_type); })',
  '      .catch(console.error);'
);

fs.writeFileSync('app/company/dashboard/page.tsx', lines.join('\n'), 'utf8');
console.log('완료');
