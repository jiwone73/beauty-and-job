const fs = require('fs');
let content = fs.readFileSync('app/api/auth/company/signup/route.ts', 'utf8');
content = content.replace(
  "if (!['OFFICE', 'STORE'].includes(company_type)) {",
  "if (!['OFFICE', 'STORE', 'BOTH'].includes(company_type)) {"
);
fs.writeFileSync('app/api/auth/company/signup/route.ts', content, 'utf8');
console.log('완료');
