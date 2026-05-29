const fs = require('fs');
let content = fs.readFileSync('app/company/dashboard/jobs/new/page.tsx', 'utf8');
content = content.replace(
  'const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | null>(null);',
  'const [companyType, setCompanyType] = useState<"OFFICE" | "STORE" | "BOTH" | null>(null);'
);
fs.writeFileSync('app/company/dashboard/jobs/new/page.tsx', content, 'utf8');
console.log('완료');
